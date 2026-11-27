"use client";

import Link from "next/link";
import { Download, ExternalLink, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ANDROID_APK_URL =
  "https://github.com/ankitxrishav/FenrirStudy-App/releases/latest/download/FenrirStudy-v1.3.0.apk";
export const ANDROID_RELEASES_URL =
  "https://github.com/ankitxrishav/FenrirStudy-App/releases/latest";
export const ANDROID_REPO_URL =
  "https://github.com/ankitxrishav/FenrirStudy-App";
export const ANDROID_APK_SHA256 =
  "5d30d8983e751ebd81615755232491fe3bd7d2a189af26a0e22fab06ba6798a4";

export function AndroidDownloadCard({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="rounded-[14px] border border-line bg-surface-soft p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface">
              <Smartphone className="h-3.5 w-3.5 text-ink" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink truncate">FenrirStudy for Android</p>
              <p className="text-[11px] text-ink-muted truncate">Live Firebase sync · v1.3.0 APK</p>
            </div>
          </div>
          <a
            href={ANDROID_APK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-clay px-3 py-1.5 text-[11px] font-semibold text-ink hover:bg-clay/90 transition-colors"
          >
            <Download className="h-3 w-3" strokeWidth={2} />
            <span>APK</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-line bg-surface rounded-3xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-line/15 bg-surface-soft">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-mono text-xs uppercase tracking-[0.14em] flex items-center gap-2 text-ink">
            <Smartphone className="h-4 w-4 text-clay" />
            Android App
          </CardTitle>
          <span className="rounded-full border border-line bg-highlight px-2.5 py-0.5 font-mono text-[10px] font-semibold text-ink">
            v1.3.0 · RELEASE
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-ink">Take FenrirStudy on Android</h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            Use Web and Android together seamlessly. All rooms, chat, shared timers, subjects,
            sessions, and daily habits sync live over your Firebase account.
          </p>
        </div>

        <div className="space-y-2 text-xs text-ink-muted">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 text-ink shrink-0" />
            <span>Real-time Web & Android bidirectional sync</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-ink shrink-0" />
            <span>Allowed-Apps Focus Guard & Home-Screen Widgets</span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <Button
            asChild
            className="w-full min-h-[44px] rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold"
          >
            <a href={ANDROID_APK_URL} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" />
              Download Android APK
            </a>
          </Button>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Link
              href="/download"
              className="text-xs font-medium text-ink underline underline-offset-4 hover:text-clay"
            >
              Install guide
            </Link>
            <a
              href={ANDROID_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
            >
              <span>GitHub Source</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
