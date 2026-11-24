"use client";

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
  roomBg: string;
  primaryHsl: string;
  ringHsl: string;
  chatBg: string;
  ownBubbleBg: string;
  ownBubbleText: string;
  swatch: string;
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: "default",
    label: "Clay",
    emoji: "",
    roomBg: "",
    primaryHsl: "18 89% 57%",
    ringHsl: "18 89% 57%",
    chatBg: "transparent",
    ownBubbleBg: "#F36B32",
    ownBubbleText: "#171513",
    swatch: "#F36B32",
  },
  {
    id: "midnight",
    label: "Charcoal",
    emoji: "",
    roomBg: "",
    primaryHsl: "30 9% 14%",
    ringHsl: "30 9% 14%",
    chatBg: "rgba(36, 32, 27, 0.04)",
    ownBubbleBg: "#24201B",
    ownBubbleText: "#FFF9EF",
    swatch: "#24201B",
  },
  {
    id: "rose",
    label: "Rosewood",
    emoji: "",
    roomBg: "",
    primaryHsl: "352 31% 42%",
    ringHsl: "352 31% 42%",
    chatBg: "rgba(139, 74, 82, 0.05)",
    ownBubbleBg: "#8B4A52",
    ownBubbleText: "#FFF9EF",
    swatch: "#8B4A52",
  },
  {
    id: "aurora",
    label: "Plum",
    emoji: "",
    roomBg: "",
    primaryHsl: "266 19% 40%",
    ringHsl: "266 19% 40%",
    chatBg: "rgba(100, 83, 122, 0.05)",
    ownBubbleBg: "#64537A",
    ownBubbleText: "#FFF9EF",
    swatch: "#64537A",
  },
  {
    id: "sunset",
    label: "Terracotta",
    emoji: "",
    roomBg: "",
    primaryHsl: "18 70% 50%",
    ringHsl: "18 70% 50%",
    chatBg: "rgba(216, 92, 39, 0.05)",
    ownBubbleBg: "#D85C27",
    ownBubbleText: "#FFF9EF",
    swatch: "#D85C27",
  },
  {
    id: "ocean",
    label: "Slate",
    emoji: "",
    roomBg: "",
    primaryHsl: "204 33% 34%",
    ringHsl: "204 33% 34%",
    chatBg: "rgba(57, 91, 114, 0.05)",
    ownBubbleBg: "#395B72",
    ownBubbleText: "#FFF9EF",
    swatch: "#395B72",
  },
  {
    id: "emerald",
    label: "Sage",
    emoji: "",
    roomBg: "",
    primaryHsl: "134 15% 40%",
    ringHsl: "134 15% 40%",
    chatBg: "rgba(86, 116, 93, 0.06)",
    ownBubbleBg: "#56745D",
    ownBubbleText: "#FFF9EF",
    swatch: "#56745D",
  },
  {
    id: "galaxy",
    label: "Indigo",
    emoji: "",
    roomBg: "",
    primaryHsl: "246 13% 32%",
    ringHsl: "246 13% 32%",
    chatBg: "rgba(73, 71, 91, 0.05)",
    ownBubbleBg: "#49475B",
    ownBubbleText: "#FFF9EF",
    swatch: "#49475B",
  },
];
