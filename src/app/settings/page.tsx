"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Loader2,
  Settings2,
  Bell,
  Database,
  Layout,
  Compass,
  Cat,
  Clock,
  Volume2,
  Palette,
} from "lucide-react";
import { doc, updateDoc, collection, query, where } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import {
  User,
  UserSettings,
  Session,
  TimerFaceStyle,
  StartPagePreference,
} from "@/lib/definitions";
import { useToast } from "@/hooks/use-toast";
import { usePewCat } from "@/hooks/use-pewcat";
import { useTimerStyle } from "@/hooks/use-timer-style";
import { setStartPageCookie } from "@/lib/routing-cookies";
import LoadingScreen from "@/components/app/loading-screen";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { pewCatEnabled, setPewCatEnabled } = usePewCat();
  const { timerStyle, setTimerStyle } = useTimerStyle();

  const userDocRef = useMemo(
    () => (user && firestore ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );
  const { data: userData, loading: docLoading } = useDoc<User>(userDocRef);

  const sessionsQuery = useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, "sessions"), where("userId", "==", user.uid))
        : null,
    [user, firestore]
  );
  const { data: sessions } = useCollection<Session>(sessionsQuery);

  const [settings, setSettings] = useState<UserSettings>({
    pomodoroDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    cyclesBeforeLongBreak: 4,
    autoStartNextPhase: false,
    focusSound: true,
    sessionEndAlert: true,
    breakReminder: true,
    studyTargetHours: 2,
    dashboardDensity: "relaxed",
    minimalMode: false,
    pewCatEnabled: true,
    timerFace: "flip",
    startPage: "rooms",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (userData?.settings) {
      setSettings((prev) => ({
        ...prev,
        ...userData.settings,
        pewCatEnabled: userData.settings?.pewCatEnabled ?? pewCatEnabled,
        timerFace: userData.settings?.timerFace ?? timerStyle,
        startPage: userData.settings?.startPage ?? "rooms",
        cyclesBeforeLongBreak: userData.settings?.cyclesBeforeLongBreak ?? 4,
        autoStartNextPhase: userData.settings?.autoStartNextPhase ?? false,
        focusSound: userData.settings?.focusSound ?? true,
      }));
    }
  }, [userData, pewCatEnabled, timerStyle]);

  if (userLoading || docLoading || !user) {
    return <LoadingScreen />;
  }

  const handleSaveChanges = async () => {
    if (!userDocRef) return;
    setIsSaving(true);
    try {
      await updateDoc(userDocRef, { settings });
      if (settings.pewCatEnabled !== undefined) {
        await setPewCatEnabled(settings.pewCatEnabled);
      }
      if (settings.timerFace) {
        await setTimerStyle(settings.timerFace);
      }
      if (settings.startPage) {
        setStartPageCookie(settings.startPage);
      }
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const exportData = (fmt: "csv" | "json") => {
    if (!sessions || sessions.length === 0) {
      toast({
        title: "No sessions to export",
        description: "Record a focus session first before exporting.",
        variant: "destructive",
      });
      return;
    }

    let content = "";
    let fileName = `fenrirstudy-export-${new Date().toISOString().split("T")[0]}`;
    let mimeType = "";

    if (fmt === "json") {
      content = JSON.stringify(sessions, null, 2);
      fileName += ".json";
      mimeType = "application/json";
    } else {
      const headers =
        "id,subjectId,mode,startTime,endTime,duration,status,focusScore\n";
      const rows = sessions
        .map(
          (s) =>
            `${s.id},${s.subjectId},${s.mode},${s.startTime},${s.endTime},${s.duration},${s.status},${s.focusScore}`
        )
        .join("\n");
      content = headers + rows;
      fileName += ".csv";
      mimeType = "text/csv";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: `Sessions exported as ${fmt.toUpperCase()}.`,
    });
  };

  return (
    <div className="space-y-7 pb-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
          Preferences
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Configure Pomodoro intervals, display style, routing, and backups.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-line bg-surface rounded-3xl">
            <CardHeader className="pb-3 border-b border-line/15">
              <CardTitle className="font-mono text-xs uppercase tracking-[0.14em] flex items-center gap-2 text-ink">
                <Settings2 className="h-4 w-4 text-clay" />
                Pomodoro Timing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pomodoro" className="text-xs text-ink-muted">
                    Focus (min)
                  </Label>
                  <Input
                    id="pomodoro"
                    type="number"
                    min={1}
                    max={180}
                    value={settings.pomodoroDuration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pomodoroDuration: parseInt(e.target.value, 10) || 25,
                      })
                    }
                    className="h-11 font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="short-break" className="text-xs text-ink-muted">
                    Short Break
                  </Label>
                  <Input
                    id="short-break"
                    type="number"
                    min={1}
                    max={60}
                    value={settings.shortBreakDuration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        shortBreakDuration: parseInt(e.target.value, 10) || 5,
                      })
                    }
                    className="h-11 font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="long-break" className="text-xs text-ink-muted">
                    Long Break
                  </Label>
                  <Input
                    id="long-break"
                    type="number"
                    min={1}
                    max={90}
                    value={settings.longBreakDuration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        longBreakDuration: parseInt(e.target.value, 10) || 15,
                      })
                    }
                    className="h-11 font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cycles-before-long" className="text-xs text-ink-muted">
                    Cycles
                  </Label>
                  <Input
                    id="cycles-before-long"
                    type="number"
                    min={1}
                    max={10}
                    value={settings.cyclesBeforeLongBreak ?? 4}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cyclesBeforeLongBreak: parseInt(e.target.value, 10) || 4,
                      })
                    }
                    className="h-11 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="divide-y divide-line/15 pt-2 border-t border-line/15">
                <div className="flex items-center justify-between gap-4 py-3.5">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2 text-sm text-ink">
                      <Bell className="h-4 w-4 text-ink-muted" /> Session End Alert
                    </Label>
                    <p className="text-xs text-ink-muted">
                      Trigger completion alert when a focus block finishes.
                    </p>
                  </div>
                  <Switch
                    checked={settings.sessionEndAlert}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, sessionEndAlert: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-4 py-3.5">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2 text-sm text-ink">
                      <Volume2 className="h-4 w-4 text-ink-muted" /> Focus Chime Sound
                    </Label>
                    <p className="text-xs text-ink-muted">
                      Play audio chime on phase transitions.
                    </p>
                  </div>
                  <Switch
                    checked={settings.focusSound ?? true}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, focusSound: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-4 py-3.5">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2 text-sm text-ink">
                      <Clock className="h-4 w-4 text-ink-muted" /> Auto-start Next Phase
                    </Label>
                    <p className="text-xs text-ink-muted">
                      Automatically advance between work and break blocks.
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoStartNextPhase ?? false}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, autoStartNextPhase: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-line bg-surface rounded-3xl">
            <CardHeader className="pb-3 border-b border-line/15">
              <CardTitle className="font-mono text-xs uppercase tracking-[0.14em] flex items-center gap-2 text-ink">
                <Palette className="h-4 w-4 text-clay" />
                Workspace & Companion
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 divide-y divide-line/15">
              <div className="flex items-center justify-between gap-4 pb-4">
                <div className="space-y-0.5">
                  <Label className="text-sm text-ink">Color Theme</Label>
                  <p className="text-xs text-ink-muted">
                    Switch between warm paper light mode and charcoal dark mode.
                  </p>
                </div>
                <ThemeToggle />
              </div>

              <div className="flex items-center justify-between gap-4 py-4">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2 text-sm text-ink">
                    <Cat className="h-4 w-4 text-ink-muted" /> PewCat Companion
                  </Label>
                  <p className="text-xs text-ink-muted">
                    Show or completely hide the corner study cat across pages.
                  </p>
                </div>
                <Switch
                  checked={settings.pewCatEnabled ?? pewCatEnabled}
                  onCheckedChange={(checked) => {
                    setSettings({ ...settings, pewCatEnabled: checked });
                    void setPewCatEnabled(checked);
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2 text-sm text-ink">
                    <Clock className="h-4 w-4 text-ink-muted" /> Default Timer Style
                  </Label>
                  <p className="text-xs text-ink-muted">
                    Used on the timer card and full-screen focus mode.
                  </p>
                </div>
                <Select
                  value={settings.timerFace ?? timerStyle}
                  onValueChange={(val: TimerFaceStyle) => {
                    setSettings({ ...settings, timerFace: val });
                    void setTimerStyle(val);
                  }}
                >
                  <SelectTrigger className="w-[150px] h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flip">Flip Clock</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="progress">Progress Ring</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2 text-sm text-ink">
                    <Compass className="h-4 w-4 text-ink-muted" /> Fallback Start Page
                  </Label>
                  <p className="text-xs text-ink-muted">
                    Used when you have not joined a study room yet.
                  </p>
                </div>
                <Select
                  value={settings.startPage ?? "rooms"}
                  onValueChange={(val: StartPagePreference) => {
                    setSettings({ ...settings, startPage: val });
                    setStartPageCookie(val);
                  }}
                >
                  <SelectTrigger className="w-[150px] h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rooms">Rooms</SelectItem>
                    <SelectItem value="overview">Overview</SelectItem>
                    <SelectItem value="timer">Timer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2 text-sm text-ink">
                    <Layout className="h-4 w-4 text-ink-muted" /> Dashboard Density
                  </Label>
                  <p className="text-xs text-ink-muted">
                    Spacing preference for cards and tables.
                  </p>
                </div>
                <Select
                  value={settings.dashboardDensity ?? "relaxed"}
                  onValueChange={(val: "compact" | "relaxed") =>
                    setSettings({ ...settings, dashboardDensity: val })
                  }
                >
                  <SelectTrigger className="w-[150px] h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relaxed">Relaxed</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="w-full sm:w-auto min-h-[48px] px-8 rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Preferences
            </Button>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-line bg-surface rounded-3xl">
            <CardHeader className="pb-3 border-b border-line/15">
              <CardTitle className="font-mono text-xs uppercase tracking-[0.14em] flex items-center gap-2 text-ink">
                <Database className="h-4 w-4 text-clay" />
                Session Backups
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <p className="text-xs text-ink-muted leading-relaxed">
                Download your complete recorded session history as CSV or JSON anytime.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start min-h-[44px] gap-2.5"
                onClick={() => exportData("csv")}
              >
                <Download className="h-4 w-4" />
                <span>Export Sessions (.csv)</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start min-h-[44px] gap-2.5"
                onClick={() => exportData("json")}
              >
                <Download className="h-4 w-4" />
                <span>Export Archive (.json)</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
