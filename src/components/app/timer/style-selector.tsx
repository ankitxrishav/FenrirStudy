
"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button";

interface StyleSelectorProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const styles = [
    { id: 'default', name: 'Default', light: { primary: '215 85% 55%'}, dark: { primary: '215 85% 55%'} },
    { id: 'forest', name: 'Forest', light: { primary: '158 64% 52%'}, dark: { primary: '158 64% 52%'} },
    { id: 'ocean', name: 'Ocean', light: { primary: '205 90% 55%'}, dark: { primary: '205 90% 55%'} },
    { id: 'sunset', name: 'Sunset', light: { primary: '20 90% 60%'}, dark: { primary: '20 90% 60%'} },
    { id: 'matrix', name: 'Matrix', light: { primary: '130 100% 40%'}, dark: { primary: '130 100% 50%'} },
];

export function StyleSelector({ isOpen, onOpenChange }: StyleSelectorProps) {

  const handleStyleChange = (styleId: string) => {
      document.documentElement.setAttribute('data-theme', styleId);
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Select Timer Style</SheetTitle>
          <SheetDescription>
            Choose a visual theme for your timer. These styles adapt to light and dark mode.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
            {styles.map(style => (
                <Button key={style.id} variant="outline" className="w-full justify-start h-14" onClick={() => handleStyleChange(style.id)}>
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                           <div className="h-8 w-8 rounded-full border" style={{backgroundColor: `hsl(${style.light.primary})`}}></div>
                           <div className="h-8 w-8 rounded-full border" style={{backgroundColor: `hsl(${style.dark.primary})`}}></div>
                        </div>
                        <span>{style.name}</span>
                    </div>
                </Button>
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
