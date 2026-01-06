
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const auth = useAuth();

    const handleGoogleSignIn = async () => {
        if (!auth) {
             toast({
                title: "Authentication service is not ready",
                description: "Please try again in a moment.",
                variant: "destructive",
            });
            return;
        }

        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            toast({
                title: "Login Successful",
                description: "Welcome back!",
            });
            router.push('/dashboard');
        } catch (error: any) {
            if (error.code === 'auth/popup-closed-by-user') {
                return;
            }

            console.error("Error during sign-in:", error);
            toast({
                title: "Uh oh! Something went wrong.",
                description: error.message || "Could not sign in with Google. Please try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex h-full items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Welcome Back!</CardTitle>
                    <CardDescription>
                        Sign in to access your dashboard and track your study progress.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={!auth}>
                           {auth ? <FcGoogle className="mr-2 h-4 w-4" /> : <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-primary"></div>}
                            Sign in with Google
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
