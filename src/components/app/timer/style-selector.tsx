
"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button";
import { Check, Clock, Donut, CircleDot } from "lucide-react";
import { TimerFaceId } from "./timer";

interface StyleSelectorProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activeFace: TimerFaceId;
  onFaceChange: (faceId: TimerFaceId) => void;
}

const themes = [
    { id: 'default', name: 'Default', light: { primary: '215 85% 55%'}, dark: { primary: '215 85% 55%'} },
    { id: 'forest', name: 'Forest', light: { primary: '158 64% 52%'}, dark: { primary: '158 64% 52%'} },
    { id: 'ocean', name: 'Ocean', light: { primary: '205 90% 55%'}, dark: { primary: '205 90% 55%'} },
    { id: 'sunset', name: 'Sunset', light: { primary: '20 90% 60%'}, dark: { primary: '20 90% 60%'} },
    { id: 'matrix', name: 'Matrix', light: { primary: '130 100% 40%'}, dark: { primary: '130 100% 50%'} },
];

const faces: {id: TimerFaceId, name: string, icon: React.ReactNode}[] = [
    { id: 'digital', name: 'Digital', icon: <Clock /> },
    { id: 'ring', name: 'Progress Ring', icon: <Donut /> },
]

export function StyleSelector({ isOpen, onOpenChange, activeFace, onFaceChange }: StyleSelectorProps) {

  const handleThemeChange = (themeId: string) => {
      document.documentElement.setAttribute('data-theme', themeId);
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Customize Timer</SheetTitle>
          <SheetDescription>
            Choose a visual style for your timer. Changes adapt to light and dark mode.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 py-6">
            <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Watch Face</h3>
                 <div className="grid grid-cols-3 gap-2">
                    {faces.map(face => (
                        <button key={face.id} onClick={() => onFaceChange(face.id)} className="flex flex-col items-center justify-center gap-2 p-2 border rounded-lg transition-colors data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:border-primary" data-active={activeFace === face.id}>
                            {face.icon}
                            <span className="text-xs">{face.name}</span>
                        </button>
                    ))}
                </div>
            </div>
             <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Color Theme</h3>
                <div className="grid grid-cols-1 gap-2">
                    {themes.map(theme => (
                        <Button key={theme.id} variant="outline" className="w-full justify-start h-14" onClick={() => handleThemeChange(theme.id)}>
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-2">
                                <div className="h-8 w-8 rounded-full border" style={{backgroundColor: `hsl(${theme.light.primary})`}}></div>
                                <div className="h-8 w-8 rounded-full border" style={{backgroundColor: `hsl(${theme.dark.primary})`}}></div>
                                </div>
                                <span>{theme.name}</span>
                            </div>
                        </Button>
                    ))}
                </div>
            </div>
        </div>

      </SheetContent>
    </Sheet>
  );
}
