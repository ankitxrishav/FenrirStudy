
"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener("beforeinstallprompt", handler);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                setDeferredPrompt(null);
            }
        } else {
            toast({
                title: "How to Install",
                description: "Tap the 'Share' icon in your browser and select 'Add to Home Screen' to install Fenrir Study.",
                duration: 5000,
            });
        }
    };

    if (isStandalone) return null;

    return (
        <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10 shadow-sm transition-all hover:bg-white/10 active:scale-95 group relative">
            <Button
                variant="ghost"
                size="icon"
                onClick={handleInstallClick}
                className="h-9 w-9 text-primary hover:text-primary transition-colors hover:bg-transparent"
            >
                <Download className={deferredPrompt ? "h-4 w-4 animate-bounce" : "h-4 w-4"} />
            </Button>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 glass border border-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                <span className="text-[8px] font-bold uppercase tracking-widest text-primary">
                    {deferredPrompt ? "Install App" : "App Setup"}
                </span>
            </div>
        </div>
    );
}
