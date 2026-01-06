"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Download } from "lucide-react";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return <div>Loading...</div>; // Or a proper loading skeleton
    }

    // A real implementation would save these to a user settings collection in Firestore
    const handleSaveChanges = () => {
        console.log("Saving settings...");
        // Here you would typically get the values and save them
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
                                    <Input id="pomodoro" type="number" defaultValue="25" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="short-break">Short Break (minutes)</Label>
                                    <Input id="short-break" type="number" defaultValue="5" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="long-break">Long Break (minutes)</Label>
                                    <Input id="long-break" type="number" defaultValue="15" />
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
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <Label>Break Reminder</Label>
                                         <p className="text-xs text-muted-foreground">
                                            Get a reminder when your break is over.
                                        </p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <Button onClick={handleSaveChanges}>Save Changes</Button>
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
                            <Button variant="outline" className="w-full">
                                <Download className="mr-2 h-4 w-4" /> Export as CSV
                            </Button>
                            <Button variant="outline" className="w-full">
                                <Download className="mr-2 h-4 w-4" /> Export as JSON
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
