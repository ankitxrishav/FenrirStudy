"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Layers,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  ANDROID_APK_URL,
  ANDROID_RELEASES_URL,
  ANDROID_REPO_URL,
} from "@/components/app/android-download-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DownloadAndroidPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <Card className="border-line bg-surface rounded-[24px] overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-highlight px-3 py-1 font-mono text-[11px] font-semibold text-ink">
              <Smartphone className="h-3.5 w-3.5" />
              FENRIRSTUDY ANDROID · v1.1.0
            </span>
            <span className="font-mono text-xs text-ink-muted">OPEN SOURCE · MIT LICENSE</span>
          </div>

          <div className="space-y-2.5 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">
              Study seamlessly across Web and Android.
            </h1>
            <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
              Sign in with the same account on your phone and browser. Shared study rooms, live
              member timers, inline room chat, subjects, daily routines, and streaks sync in
              real time via Firebase.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="min-h-[48px] px-6 rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold"
            >
              <a href={ANDROID_APK_URL} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download Release APK (v1.1.0)
              </a>
            </Button>

            <Button asChild variant="outline" className="min-h-[48px] px-5 rounded-full">
              <a href={ANDROID_RELEASES_URL} target="_blank" rel="noopener noreferrer">
                <span>All GitHub Releases</span>
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>

            <Button asChild variant="outline" className="min-h-[48px] px-5 rounded-full">
              <a href={ANDROID_REPO_URL} target="_blank" rel="noopener noreferrer">
                <span>Android Source Code</span>
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-line bg-surface rounded-2xl">
          <CardContent className="p-5 space-y-2">
            <RefreshCw className="h-5 w-5 text-clay" />
            <h2 className="text-base font-bold text-ink">Web + Android Sync</h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Start a timer on your laptop or join a room chat on Android — state updates live
              everywhere without manual import/export.
            </p>
          </CardContent>
        </Card>

        <Card className="border-line bg-surface rounded-2xl">
          <CardContent className="p-5 space-y-2">
            <ShieldCheck className="h-5 w-5 text-clay" />
            <h2 className="text-base font-bold text-ink">Allowed-Apps Focus Guard</h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Block distracting apps only while your study timer is running, using Android Usage
              Access and Display Over Other Apps.
            </p>
          </CardContent>
        </Card>

        <Card className="border-line bg-surface rounded-2xl">
          <CardContent className="p-5 space-y-2">
            <Layers className="h-5 w-5 text-clay" />
            <h2 className="text-base font-bold text-ink">Home-Screen Widgets</h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Pin Today Focus Time, Daily Routine Habits, and Study Room Members directly to your
              Android home screen.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-line bg-surface-soft rounded-2xl">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-[0.12em] text-ink font-semibold">
            Quick Install & Sync Steps
          </h2>
          <div className="space-y-2 text-sm text-ink">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span>1. Download the signed release APK (<code className="font-mono text-xs bg-surface px-1.5 py-0.5 rounded border border-line/30">FenrirStudy-v1.1.0.apk</code>) on Android 8.0+ (API 26+).</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span>2. Open the APK file and allow installation from your browser/files app when prompted.</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span>
                3. Sign in with the exact same Google/Email account you use on{" "}
                <Link href="/rooms" className="underline font-semibold">
                  FenrirStudy Web
                </Link>{" "}
                to sync immediately.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
