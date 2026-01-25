
"use client";

import React from 'react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Download, Loader2, Settings2, Bell, Shield, Database, Sparkles, Layout, Monitor } from "lucide-react";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { doc, updateDoc, collection, query, where } from "firebase/firestore";
import { User, UserSettings, Session } from "@/lib/definitions";
import { useToast } from "@/hooks/use-toast";
import LoadingScreen from "@/components/app/loading-screen";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const userDocRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userData, loading: docLoading } = useDoc<User>(userDocRef);

    const sessionsQuery = useMemo(() => (user && firestore ? query(collection(firestore, 'sessions'), where('userId', '==', user.uid)) : null), [user, firestore]);
    const { data: sessions } = useCollection<Session>(sessionsQuery);

    const [settings, setSettings] = useState<UserSettings>({
        pomodoroDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessionEndAlert: true,
        breakReminder: true,
        studyTargetHours: 2,
        dashboardDensity: 'relaxed',
        minimalMode: false
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login');
        }
    }, [user, userLoading, router]);

    useEffect(() => {
        if (userData?.settings) {
            setSettings({
                ...settings,
                ...userData.settings
            });
        }
    }, [userData]);

    if (userLoading || docLoading || !user) {
        return <LoadingScreen />;
    }

    const handleSaveChanges = async () => {
        if (!userDocRef) return;
        setIsSaving(true);
        try {
            await updateDoc(userDocRef, { settings });
            toast({
                title: "Settings updated",
                description: "Your focus preferences have been saved.",
            });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({
                title: "Error",
                description: "Failed to save settings. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }

    const exportData = (format: 'csv' | 'json') => {
        if (!sessions || sessions.length === 0) {
            toast({
                title: "No rituals to export",
                description: "You haven't recorded any study sessions yet.",
                variant: "destructive",
            });
            return;
        }

        let content = "";
        let fileName = `fenrir-study-ritual-export-${new Date().toISOString().split('T')[0]}`;
        let mimeType = "";

        if (format === 'json') {
            content = JSON.stringify(sessions, null, 2);
            fileName += ".json";
            mimeType = "application/json";
        } else {
            const headers = "id,subjectId,mode,startTime,endTime,duration,status,focusScore\n";
            const rows = sessions.map(s =>
                `${s.id},${s.subjectId},${s.mode},${s.startTime},${s.endTime},${s.duration},${s.status},${s.focusScore}`
            ).join('\n');
            content = headers + rows;
            fileName += ".csv";
            mimeType = "text/csv";
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
            title: "Export complete",
            description: `Historical data archived as ${format.toUpperCase()}.`,
        });
    }

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight text-gradient mb-2">Settings</h1>
                <p className="text-muted-foreground">Tailor your study environment to your personal ritual.</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12 items-start">
                <div className="lg:col-span-8 space-y-8">
                    {/* Timer Configuration */}
                    <Card className="glass border-white/10 shadow-xl overflow-hidden group">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em]">
                                <Settings2 className="h-4 w-4 text-primary" /> Ritual Timing
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                                <div className="space-y-3">
                                    <Label htmlFor="pomodoro" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pomodoro</Label>
                                    <div className="relative">
                                        <Input
                                            id="pomodoro"
                                            type="number"
                                            value={settings.pomodoroDuration}
                                            onChange={(e) => setSettings({ ...settings, pomodoroDuration: parseInt(e.target.value) || 0 })}
                                            className="bg-white/5 border-white/10 pr-12 focus:border-primary/50 transition-colors"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30">MIN</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="short-break" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Short Break</Label>
                                    <div className="relative">
                                        <Input
                                            id="short-break"
                                            type="number"
                                            value={settings.shortBreakDuration}
                                            onChange={(e) => setSettings({ ...settings, shortBreakDuration: parseInt(e.target.value) || 0 })}
                                            className="bg-white/5 border-white/10 pr-12"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30">MIN</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="long-break" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Long Break</Label>
                                    <div className="relative">
                                        <Input
                                            id="long-break"
                                            type="number"
                                            value={settings.longBreakDuration}
                                            onChange={(e) => setSettings({ ...settings, longBreakDuration: parseInt(e.target.value) || 0 })}
                                            className="bg-white/5 border-white/10 pr-12"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30">MIN</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Preference Toggles */}
                    <Card className="glass border-white/10 shadow-xl overflow-hidden">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em]">
                                <Sparkles className="h-4 w-4 text-primary" /> Preferences
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between p-1">
                                <div className="space-y-0.5">
                                    <Label className="flex items-center gap-2"><Bell className="h-4 w-4 text-muted-foreground" /> Audio Signals</Label>
                                    <p className="text-xs text-muted-foreground">Chime when a timer session completes.</p>
                                </div>
                                <Switch
                                    checked={settings.sessionEndAlert}
                                    onCheckedChange={(checked) => setSettings({ ...settings, sessionEndAlert: checked })}
                                />
                            </div>
                            <Separator className="bg-white/5" />
                            <div className="flex items-center justify-between p-1">
                                <div className="space-y-0.5">
                                    <Label className="flex items-center gap-2"><Layout className="h-4 w-4 text-muted-foreground" /> Dashboard Density</Label>
                                    <p className="text-xs text-muted-foreground">Adjust the visual density of your insights.</p>
                                </div>
                                <Select
                                    value={settings.dashboardDensity}
                                    onValueChange={(val: 'compact' | 'relaxed') => setSettings({ ...settings, dashboardDensity: val })}
                                >
                                    <SelectTrigger className="w-[120px] bg-white/5 border-white/10 h-8 text-xs font-bold uppercase">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="glass border-white/10">
                                        <SelectItem value="compact" className="text-xs font-bold">COMPACT</SelectItem>
                                        <SelectItem value="relaxed" className="text-xs font-bold">RELAXED</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="w-full md:w-auto px-8 shadow-xl hover:scale-105 transition-transform"
                        >
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            SAVE PREFERENCES
                        </Button>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    {/* Data Sovereignty */}
                    <Card className="glass border-white/10 shadow-xl overflow-hidden">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em]">
                                <Database className="h-4 w-4 text-primary" /> Data Sovereignty
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4 text-center">
                            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 mb-2">
                                <Shield className="h-8 w-8 text-primary mx-auto mb-2 opacity-50" />
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">End-to-End Persistence</p>
                            </div>
                            <p className="text-xs text-muted-foreground mb-4">You own your focus data. Export your rituals anytime.</p>
                            <Button variant="outline" className="w-full justify-start h-12 bg-white/5 border-white/10 font-bold text-xs uppercase tracking-wider group" onClick={() => exportData('csv')}>
                                <Download className="mr-3 h-4 w-4 group-hover:translate-y-0.5 transition-transform" /> Export Rituals (.CSV)
                            </Button>
                            <Button variant="outline" className="w-full justify-start h-12 bg-white/5 border-white/10 font-bold text-xs uppercase tracking-wider group" onClick={() => exportData('json')}>
                                <Download className="mr-3 h-4 w-4 group-hover:translate-y-0.5 transition-transform" /> Export Archive (.JSON)
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="p-6 glass border-white/10 rounded-xl space-y-2 opacity-50 grayscale hover:grayscale-0 transition-all cursor-default">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">FENRIR.OS</div>
                        <div className="text-xs font-mono">v2.1.0-evolution</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
