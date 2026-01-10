"use client";

import React from 'react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Download, Loader2 } from "lucide-react";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { doc, updateDoc, collection, query, where } from "firebase/firestore";
import { User, UserSettings, Session } from "@/lib/definitions";
import { useToast } from "@/hooks/use-toast";

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
        breakReminder: true
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login');
        }
    }, [user, userLoading, router]);

    useEffect(() => {
        if (userData?.settings) {
            setSettings(userData.settings);
        }
    }, [userData]);

    if (userLoading || docLoading || !user) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleSaveChanges = async () => {
        if (!userDocRef) return;
        setIsSaving(true);
        try {
            await updateDoc(userDocRef, { settings });
            toast({
                title: "Settings saved",
                description: "Your preferences have been updated successfully.",
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
                title: "No data to export",
                description: "You haven't recorded any sessions yet.",
                variant: "destructive",
            });
            return;
        }

        let content = "";
        let fileName = `fenrir-study-export-${new Date().toISOString().split('T')[0]}`;
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
            title: "Export successful",
            description: `Your data has been exported as ${format.toUpperCase()}.`,
        });
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="mb-6 text-3xl font-bold tracking-tight">Settings</h1>
            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Timer Settings</CardTitle>
                            <CardDescription>Customize your Pomodoro and break durations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="pomodoro">Pomodoro (minutes)</Label>
                                    <Input
                                        id="pomodoro"
                                        type="number"
                                        value={settings.pomodoroDuration}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings({ ...settings, pomodoroDuration: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="short-break">Short Break (minutes)</Label>
                                    <Input
                                        id="short-break"
                                        type="number"
                                        value={settings.shortBreakDuration}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings({ ...settings, shortBreakDuration: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="long-break">Long Break (minutes)</Label>
                                    <Input
                                        id="long-break"
                                        type="number"
                                        value={settings.longBreakDuration}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings({ ...settings, longBreakDuration: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-4">
                                <h3 className="font-medium">Notifications</h3>
                                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <Label>End of Session Alert</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Receive a notification when a timer session ends.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.sessionEndAlert}
                                        onCheckedChange={(checked: boolean) => setSettings({ ...settings, sessionEndAlert: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <Label>Break Reminder</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Get a reminder when your break is over.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.breakReminder}
                                        onCheckedChange={(checked: boolean) => setSettings({ ...settings, breakReminder: checked })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <Button onClick={handleSaveChanges} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Export</CardTitle>
                            <CardDescription>Download your study session history.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button variant="outline" className="w-full" onClick={() => exportData('csv')}>
                                <Download className="mr-2 h-4 w-4" /> Export as CSV
                            </Button>
                            <Button variant="outline" className="w-full" onClick={() => exportData('json')}>
                                <Download className="mr-2 h-4 w-4" /> Export as JSON
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
