"use client";

import { cn } from "@/lib/utils";
import { CHAT_THEMES, ChatThemeId } from "@/hooks/use-room-theme";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface RoomThemePickerProps {
  current: ChatThemeId;
  onChange: (theme: ChatThemeId) => void;
}

export function RoomThemePicker({ current, onChange }: RoomThemePickerProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold">Chat Theme</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Changes the chat background & bubble colors — just for you.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {CHAT_THEMES.map((t) => {
          const isActive = current === t.id;
          return (
            <motion.button
              key={t.id}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onChange(t.id)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200 overflow-hidden",
                isActive
                  ? "border-white/30 shadow-lg"
                  : "border-white/10 hover:border-white/20"
              )}
              style={{
                background: isActive
                  ? `${t.swatch}, rgba(255,255,255,0.03)`
                  : "rgba(255,255,255,0.03)",
              }}
            >
              {/* Gradient swatch (simulates chat background glimpse) */}
              <div
                className="w-full h-10 rounded-xl relative overflow-hidden"
                style={{
                  background: t.id === "default"
                    ? "rgba(255,255,255,0.05)"
                    : t.chatBg,
                }}
              >
                {/* Mini bubbles inside */}
                <div
                  className="absolute right-2 bottom-2 w-5 h-5 rounded-full"
                  style={{ background: t.ownBubbleBg, opacity: 0.9 }}
                />
                <div
                  className="absolute left-2 top-2 w-5 h-5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                />
              </div>

              {/* Emoji + Label */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-base leading-none">{t.emoji}</span>
                <span className={cn(
                  "text-[10px] font-bold leading-none",
                  isActive ? "text-white" : "text-white/50"
                )}>
                  {t.label}
                </span>
              </div>

              {/* Active check */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-white flex items-center justify-center shadow-md"
                >
                  <Check className="h-2.5 w-2.5 text-black" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Live preview strip */}
      <div className="rounded-2xl overflow-hidden border border-white/8 p-4 space-y-2"
        style={{ background: current === "default" ? "rgba(255,255,255,0.03)" : CHAT_THEMES.find(t => t.id === current)?.chatBg ?? "transparent" }}>
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Preview</p>
        {/* Other person's bubble */}
        <div className="flex items-end gap-2">
          <div className="h-6 w-6 rounded-full bg-white/10 shrink-0" />
          <div className="px-3 py-2 rounded-2xl rounded-tl-sm text-xs text-white/80 max-w-[60%]"
            style={{ background: "rgba(255,255,255,0.09)", backdropFilter: "blur(8px)" }}>
            Let&apos;s study 🎯
          </div>
        </div>
        {/* Own bubble */}
        <div className="flex items-end gap-2 flex-row-reverse">
          <div className="h-6 w-6 rounded-full shrink-0" style={{ background: CHAT_THEMES.find(t => t.id === current)?.ownBubbleBg ?? "#3b82f6" }} />
          <div className="px-3 py-2 rounded-2xl rounded-tr-sm text-xs max-w-[60%] font-medium"
            style={{
              background: CHAT_THEMES.find(t => t.id === current)?.ownBubbleBg ?? "hsl(var(--primary))",
              color: CHAT_THEMES.find(t => t.id === current)?.ownBubbleText ?? "#fff",
            }}>
            Ready! 💪🔥
          </div>
        </div>
      </div>
    </div>
  );
}
