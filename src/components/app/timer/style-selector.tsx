"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button";
import { Check, Clock, Donut, CircleDot, Monitor, Smartphone, Layers, Palette, Wand2 } from "lucide-react";
import { TimerFaceId } from "./timer";
import { cn } from "@/lib/utils";

interface StyleSelectorProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activeFace: TimerFaceId;
  onFaceChange: (faceId: TimerFaceId) => void;
}

const themes = [
  { id: 'default', name: 'Default', colors: ['#3b82f6', '#1d4ed8'] },
  { id: 'forest', name: 'Forest', colors: ['#10b981', '#047857'] },
  { id: 'ocean', name: 'Ocean', colors: ['#0ea5e9', '#0369a1'] },
  { id: 'sunset', name: 'Sunset', colors: ['#f59e0b', '#d97706'] },
  { id: 'matrix', name: 'Matrix', colors: ['#22c55e', '#15803d'] },
];

const faces: { id: TimerFaceId, name: string, icon: typeof Clock, description: string }[] = [
  { id: 'digital', name: 'Elite Digital', icon: Clock, description: 'Precision typography' },
  { id: 'ring', name: 'Solar Ring', icon: Donut, description: 'Orbital progress' },
  { id: 'radial', name: 'Zen Radial', icon: CircleDot, description: 'Circular calm' },
  { id: 'analog', name: 'Classic Ritual', icon: Clock, description: 'Tactile heritage' },
  { id: 'retro', name: 'Cyber Retro', icon: Monitor, description: 'Vintage terminal' },
]

export function StyleSelector({ isOpen, onOpenChange, activeFace, onFaceChange }: StyleSelectorProps) {

  const handleThemeChange = (themeId: string) => {
    document.documentElement.setAttribute('data-theme', themeId);
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-[#09090b]/95 dark:bg-[#09090b]/95 bg-white/95 backdrop-blur-2xl border-l border-black/10 dark:border-white/10 w-full sm:max-w-sm p-0 overflow-hidden shadow-[-20px_0_50px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-8 pb-4 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="flex items-center gap-2 text-primary mb-2 relative z-10">
              <Wand2 className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Personalization</span>
            </div>
            <SheetTitle className="text-3xl font-black tracking-tighter relative z-10">Visual Rituals</SheetTitle>
            <SheetDescription className="text-muted-foreground/40 text-xs relative z-10 uppercase font-medium tracking-widest">
              Craft your focus environment.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar relative z-10">
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary/40 dark:text-muted-foreground/30" />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/40 dark:text-muted-foreground/40">Watch Faces</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {faces.map(face => (
                  <button
                    key={face.id}
                    onClick={() => onFaceChange(face.id)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 text-left group relative overflow-hidden",
                      activeFace === face.id
                        ? "bg-primary/5 border-primary/50 shadow-[0_0_30px_-10px_rgba(var(--primary),0.2)]"
                        : "bg-slate-100/50 dark:bg-white/[0.02] border-black/5 dark:border-white/5 hover:border-primary/20"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500",
                      activeFace === face.id ? "bg-primary text-primary-foreground scale-110" : "bg-primary/10 dark:bg-white/5 text-primary/60 dark:text-muted-foreground group-hover:text-primary dark:group-hover:text-white"
                    )}>
                      <face.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-sm tracking-tight text-foreground">{face.name}</div>
                      <div className="text-[9px] text-muted-foreground/60 dark:text-muted-foreground/40 font-bold uppercase tracking-widest mt-0.5">{face.description}</div>
                    </div>
                    {activeFace === face.id && (
                      <div className="absolute top-0 right-0 w-1 h-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-6">
                <Palette className="h-4 w-4 text-primary/40 dark:text-muted-foreground/30" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/40 dark:text-muted-foreground/40">Spectral Moods</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {themes.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-100/50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 hover:border-primary/20 transition-all group overflow-hidden relative"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-3">
                        <div className="h-8 w-8 rounded-full border-2 border-background shadow-2xl relative z-10" style={{ backgroundColor: theme.colors[0] }}></div>
                        <div className="h-8 w-8 rounded-full border-2 border-background shadow-2xl relative z-0" style={{ backgroundColor: theme.colors[1] }}></div>
                      </div>
                      <span className="font-black text-xs uppercase tracking-widest group-hover:translate-x-1 transition-transform text-foreground">{theme.name}</span>
                    </div>
                    <div className="h-6 w-6 rounded-full border border-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="p-8 border-t border-white/5 bg-white/[0.02]">
            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.4em] text-center">Ritual Identity System v2.0</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
