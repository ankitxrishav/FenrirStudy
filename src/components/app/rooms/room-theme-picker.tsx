"use client";

import { cn } from "@/lib/utils";
import { CHAT_THEMES, ChatThemeId } from "@/hooks/use-room-theme";
import { Check } from "lucide-react";

interface RoomThemePickerProps {
  current: ChatThemeId;
  onChange: (theme: ChatThemeId) => void;
}

export function RoomThemePicker({ current, onChange }: RoomThemePickerProps) {
  const activeTheme = CHAT_THEMES.find((t) => t.id === current) ?? CHAT_THEMES[0];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-ink">Chat Palette</p>
        <p className="text-xs text-ink-muted mt-0.5">
          Sets the chat paper tint and outgoing message tone for this room.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {CHAT_THEMES.map((t) => {
          const isActive = current === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={cn(
                "relative flex flex-col items-start gap-2 p-2.5 rounded-xl border text-left transition-colors min-h-[44px]",
                isActive
                  ? "border-line bg-highlight/60"
                  : "border-line/20 bg-surface-soft hover:border-line/50"
              )}
            >
              <div
                className="w-full h-9 rounded-lg border border-line/15 relative overflow-hidden bg-surface"
              >
                <div
                  className="absolute inset-0"
                  style={{ background: t.chatBg }}
                />
                <div
                  className="absolute left-2 top-2 h-2.5 w-8 rounded-full bg-surface-muted border border-line/15"
                />
                <div
                  className="absolute right-2 bottom-2 h-2.5 w-9 rounded-full border border-line/20"
                  style={{ background: t.swatch }}
                />
              </div>

              <div className="flex items-center justify-between w-full px-0.5">
                <span className={cn("text-xs font-medium", isActive ? "text-ink" : "text-ink-muted")}>
                  {t.label}
                </span>
                {isActive && (
                  <span className="h-4 w-4 rounded-full border border-line bg-surface flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-ink" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl overflow-hidden border border-line bg-surface">
        <div className="p-4 space-y-2.5" style={{ background: activeTheme.chatBg }}>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Preview</p>
          <div className="flex items-end gap-2">
            <div className="h-6 w-6 rounded-full border border-line/20 bg-surface-soft shrink-0" />
            <div className="px-3 py-2 rounded-2xl rounded-tl-sm border border-line/20 bg-surface-soft text-xs text-ink max-w-[70%]">
              Starting a 25m focus block now.
            </div>
          </div>
          <div className="flex items-end gap-2 flex-row-reverse">
            <div
              className="h-6 w-6 rounded-full border border-line shrink-0"
              style={{ background: activeTheme.ownBubbleBg }}
            />
            <div
              className="px-3 py-2 rounded-2xl rounded-tr-sm border border-line text-xs max-w-[70%] font-medium"
              style={{
                background: activeTheme.ownBubbleBg,
                color: activeTheme.ownBubbleText,
              }}
            >
              Joined. See you at break.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
