"use client";

// ── Room + Chat Theme System ─────────────────────────────────────────────────
// Each theme controls:
//   roomBg       → subtle gradient overlay applied to the ENTIRE room page
//   primaryHsl   → overrides --primary CSS variable room-wide (buttons, pills, etc.)
//   ringHsl      → overrides --ring
//   chatBg       → more intense gradient in the chat messages area
//   ownBubbleBg  → CSS gradient for own message bubbles
//   ownBubbleText→ text color on own bubbles
//   swatch       → tiny preview gradient for the picker

export type ChatThemeId =
  | "default"
  | "midnight"
  | "rose"
  | "aurora"
  | "sunset"
  | "ocean"
  | "emerald"
  | "galaxy";

export interface ChatTheme {
  id: ChatThemeId;
  label: string;
  emoji: string;
  /** Subtle CSS gradient applied as fixed overlay on the WHOLE room */
  roomBg: string;
  /** HSL values (no hsl() wrapper) for --primary CSS var override room-wide */
  primaryHsl: string;
  /** Same for --ring */
  ringHsl: string;
  /** More vivid gradient for the chat messages area */
  chatBg: string;
  ownBubbleBg: string;
  ownBubbleText: string;
  /** Small preview swatch */
  swatch: string;
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: "default",
    label: "Default",
    emoji: "💬",
    roomBg: "",
    primaryHsl: "215 85% 55%",
    ringHsl: "215 85% 55%",
    chatBg: "transparent",
    ownBubbleBg: "hsl(215 85% 55%)",
    ownBubbleText: "#fff",
    swatch: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
  },
  {
    id: "midnight",
    label: "Midnight",
    emoji: "🌌",
    roomBg:
      "radial-gradient(ellipse at 15% 0%,   rgba(71,118,230,0.09) 0%,transparent 52%)," +
      "radial-gradient(ellipse at 85% 100%, rgba(142,84,233,0.06) 0%,transparent 52%)",
    primaryHsl: "252 80% 63%",
    ringHsl: "252 80% 63%",
    chatBg: "linear-gradient(160deg,#060714 0%,#0e1a45 55%,#1a0635 100%)",
    ownBubbleBg: "linear-gradient(135deg,#4776E6 0%,#8E54E9 100%)",
    ownBubbleText: "#fff",
    swatch: "linear-gradient(135deg,#4776E6,#8E54E9)",
  },
  {
    id: "rose",
    label: "Rose",
    emoji: "🌹",
    roomBg:
      "radial-gradient(ellipse at 15% 0%,   rgba(249,83,198,0.09) 0%,transparent 52%)," +
      "radial-gradient(ellipse at 85% 100%, rgba(185,29,115,0.06) 0%,transparent 52%)",
    primaryHsl: "330 75% 60%",
    ringHsl: "330 75% 60%",
    chatBg: "linear-gradient(160deg,#1a0410 0%,#2d0a1a 55%,#160008 100%)",
    ownBubbleBg: "linear-gradient(135deg,#f953c6 0%,#b91d73 100%)",
    ownBubbleText: "#fff",
    swatch: "linear-gradient(135deg,#f953c6,#b91d73)",
  },
  {
    id: "aurora",
    label: "Aurora",
    emoji: "🔮",
    roomBg:
      "radial-gradient(ellipse at 15% 0%,   rgba(127,0,255,0.09) 0%,transparent 52%)," +
      "radial-gradient(ellipse at 85% 100%, rgba(225,0,255,0.05) 0%,transparent 52%)",
    primaryHsl: "275 90% 65%",
    ringHsl: "275 90% 65%",
    chatBg: "linear-gradient(160deg,#0b0010 0%,#1a0030 45%,#001520 100%)",
    ownBubbleBg: "linear-gradient(135deg,#7F00FF 0%,#E100FF 100%)",
    ownBubbleText: "#fff",
    swatch: "linear-gradient(135deg,#7F00FF,#E100FF)",
  },
  {
    id: "sunset",
    label: "Sunset",
    emoji: "🌅",
    roomBg:
      "radial-gradient(ellipse at 15% 0%,   rgba(247,151,30,0.09) 0%,transparent 52%)," +
      "radial-gradient(ellipse at 85% 100%, rgba(232,57,90,0.06) 0%,transparent 52%)",
    primaryHsl: "22 90% 58%",
    ringHsl: "22 90% 58%",
    chatBg: "linear-gradient(160deg,#1a0800 0%,#2d1000 50%,#200005 100%)",
    ownBubbleBg: "linear-gradient(135deg,#f7971e 0%,#e8395a 100%)",
    ownBubbleText: "#fff",
    swatch: "linear-gradient(135deg,#f7971e,#e8395a)",
  },
  {
    id: "ocean",
    label: "Ocean",
    emoji: "🌊",
    roomBg:
      "radial-gradient(ellipse at 15% 0%,   rgba(41,128,185,0.09) 0%,transparent 52%)," +
      "radial-gradient(ellipse at 85% 100%, rgba(109,213,250,0.05) 0%,transparent 52%)",
    primaryHsl: "205 85% 52%",
    ringHsl: "205 85% 52%",
    chatBg: "linear-gradient(160deg,#00020f 0%,#001a30 55%,#00080f 100%)",
    ownBubbleBg: "linear-gradient(135deg,#2980B9 0%,#6DD5FA 100%)",
    ownBubbleText: "#fff",
    swatch: "linear-gradient(135deg,#2980B9,#6DD5FA)",
  },
  {
    id: "emerald",
    label: "Emerald",
    emoji: "💚",
    roomBg:
      "radial-gradient(ellipse at 15% 0%,   rgba(17,153,142,0.09) 0%,transparent 52%)," +
      "radial-gradient(ellipse at 85% 100%, rgba(56,239,125,0.05) 0%,transparent 52%)",
    primaryHsl: "160 75% 42%",
    ringHsl: "160 75% 42%",
    chatBg: "linear-gradient(160deg,#001a08 0%,#002d14 55%,#001a00 100%)",
    ownBubbleBg: "linear-gradient(135deg,#11998e 0%,#38ef7d 100%)",
    ownBubbleText: "#0a1a0a",
    swatch: "linear-gradient(135deg,#11998e,#38ef7d)",
  },
  {
    id: "galaxy",
    label: "Galaxy",
    emoji: "✨",
    roomBg:
      "radial-gradient(ellipse at 15% 0%,   rgba(218,68,83,0.09)  0%,transparent 52%)," +
      "radial-gradient(ellipse at 85% 100%, rgba(137,33,107,0.06) 0%,transparent 52%)",
    primaryHsl: "345 78% 55%",
    ringHsl: "345 78% 55%",
    chatBg: "linear-gradient(160deg,#08001a 0%,#18003a 50%,#000a18 100%)",
    ownBubbleBg: "linear-gradient(135deg,#DA4453 0%,#89216B 100%)",
    ownBubbleText: "#fff",
    swatch: "linear-gradient(135deg,#DA4453,#89216B)",
  },
];
