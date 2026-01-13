"use client";

import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
    return (
        <div className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
            <span className="mt-2 text-xs font-medium text-muted-foreground/40 tracking-wider uppercase">
                Loading
            </span>
        </div>
    );
}
