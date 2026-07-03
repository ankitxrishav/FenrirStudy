import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// Initialize Firebase Admin SDK exactly once, supporting environment variable (Vercel) and local file fallback
if (!getApps().length) {
  try {
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // For Vercel production deployment: Read credentials from environment variable
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log("Firebase Admin initialized using process.env.FIREBASE_SERVICE_ACCOUNT");
    } else {
      // For local development: Read credentials from root JSON file
      const jsonPath = path.join(process.cwd(), "fenrirstudyx-firebase-adminsdk-fbsvc-c457901450.json");
      if (fs.existsSync(jsonPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        console.log("Firebase Admin initialized using local credentials JSON file");
      } else {
        throw new Error("Missing both process.env.FIREBASE_SERVICE_ACCOUNT and local credentials file.");
      }
    }

    initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { roomId, senderId, senderName, text } = await req.json();

    if (!roomId || !senderId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getFirestore();
    const messaging = getMessaging();

    // 1. Get room document to find all members
    const roomRef = db.collection("rooms").doc(roomId);
    const roomSnap = await roomRef.get();

    if (!roomSnap.exists) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const roomData = roomSnap.data();
    const memberIds: string[] = roomData?.memberIds || [];
    const roomName = roomData?.name || "Study Room";

    // 2. Filter out the sender
    const recipientIds = memberIds.filter(id => id !== senderId);

    if (recipientIds.length === 0) {
      return NextResponse.json({ message: "No other recipients in this room." });
    }

    // 3. Retrieve FCM tokens for each recipient
    const tokens: string[] = [];
    const userDocs = await Promise.all(
      recipientIds.map(id => db.collection("users").doc(id).get())
    );

    userDocs.forEach((snap: any) => {
      if (snap.exists) {
        const userData = snap.data();
        const userTokens: string[] = userData?.fcmTokens || [];
        userTokens.forEach(tok => {
          if (tok && !tokens.includes(tok)) {
            tokens.push(tok);
          }
        });
      }
    });

    if (tokens.length === 0) {
      return NextResponse.json({ message: "No active notification tokens found for recipients." });
    }

    // 4. Send multicast message
    const message = {
      notification: {
        title: `${senderName} in #${roomName}`,
        body: text,
      },
      data: {
        roomId,
      },
      webpush: {
        notification: {
          icon: "/icon/icon-192.png",
          badge: "/icon/icon-192.png",
          click_action: `${req.nextUrl.origin}/rooms/${roomId}`,
        },
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} notifications out of ${tokens.length}`);

    // Clean up dead/unregistered tokens in the background
    const deadTokensByUser: Record<string, string[]> = {};
    
    response.responses.forEach((resp: any, idx: number) => {
      if (!resp.success && resp.error?.code === "messaging/registration-token-not-registered") {
        const deadToken = tokens[idx];
        userDocs.forEach((snap: any) => {
          if (snap.exists) {
            const userId = snap.id;
            const userData = snap.data();
            const userTokens: string[] = userData?.fcmTokens || [];
            if (userTokens.includes(deadToken)) {
              if (!deadTokensByUser[userId]) {
                deadTokensByUser[userId] = [];
              }
              deadTokensByUser[userId].push(deadToken);
            }
          }
        });
      }
    });

    // Remove dead tokens from users in Firestore
    if (Object.keys(deadTokensByUser).length > 0) {
      const batch = db.batch();
      Object.entries(deadTokensByUser).forEach(([userId, deadToks]) => {
        const userRef = db.collection("users").doc(userId);
        batch.update(userRef, {
          fcmTokens: FieldValue.arrayRemove(...deadToks),
        });
      });
      await batch.commit();
      console.log(`Cleaned up ${Object.values(deadTokensByUser).flat().length} stale FCM tokens.`);
    }

    return NextResponse.json({
      success: true,
      sentCount: response.successCount,
    });
  } catch (error: any) {
    console.error("FCM room broadcast error:", error);
    return NextResponse.json({ error: error.message || "Failed to broadcast notifications" }, { status: 500 });
  }
}
