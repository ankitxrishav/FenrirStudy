
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useTimer } from '@/hooks/use-timer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings2 } from 'lucide-react';
import { AddSubjectDialog } from './add-subject-dialog';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { addDoc, collection, query, serverTimestamp, where } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import type { Subject } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { TimerDisplay } from './timer-display';
import { TimerControls } from './timer-controls';
import { Card, CardContent } from '@/components/ui/card';
import { StyleSelector } from './style-selector';

export type TimerFaceId = 'digital' | 'ring' | 'analog' | 'radial' | 'retro';

const modeSettings: { [key in 'pomodoro' | 'stopwatch']: { label: string } } = {
  pomodoro: { label: 'Pomodoro' },
  stopwatch: { label: 'Stopwatch' },
};

export default function Timer() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isAddSubjectOpen, setAddSubjectOpen] = useState(false);

  const subjectsQuery = useMemo(() => {
    return user && firestore ? query(collection(firestore, 'subjects'), where('userId', '==', user.uid), where('archived', '==', false)) : null;
  }, [user, firestore]);
  const { data: subjects, loading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

  const {
    displayTime,
    selectedSubjectId,
    mode,
    customDuration,
    isActive,
    isPaused,
    isIdle,
    start,
    pause,
    stop,
    reset,
    handleModeChange,
    handleSubjectChange,
    handleDurationChange,
    setSelectedSubjectId,
    activeFace
  } = useTimer();

  const selectedSubject = useMemo(() => {
    if (!subjects || !selectedSubjectId) return null;
    return subjects.find(s => s.id === selectedSubjectId) || null;
  }, [subjects, selectedSubjectId]);

  const handleAddSubject = async (newSubject: Omit<Subject, 'id' | 'archived' | 'userId' | 'createdAt'>) => {
    if (!user) {
      toast({
        title: 'Please Log In',
        description: 'You need to be logged in to add subjects.',
        action: <Button onClick={() => router.push('/login')}>Login</Button>
      });
      return;
    }
    if (!firestore) return;

    try {
      const docRef = await addDoc(collection(firestore, "subjects"), {
        ...newSubject,
        userId: user.uid,
        archived: false,
        createdAt: serverTimestamp()
      });
      setSelectedSubjectId(docRef.id);
      setAddSubjectOpen(false);
    } catch (e) {
      console.error("Error adding document: ", e);
      toast({
        title: 'Error',
        description: 'Could not add subject.',
        variant: 'destructive'
      })
    }
  };

  return (
    <>
      <Card className="w-full max-w-lg border-2 shadow-lg">
        <CardContent className="p-6 md:p-8 flex flex-col items-center justify-center gap-8">

          <Tabs value={mode} onValueChange={(val) => handleModeChange(val as 'pomodoro' | 'stopwatch')} className="w-full max-w-xs">
            <TabsList className={cn("grid w-full grid-cols-2", !isIdle && "pointer-events-none opacity-50")}>
              {Object.entries(modeSettings).map(([key, value]) => (
                <TabsTrigger key={key} value={key} disabled={!isIdle}>
                  {value.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-col items-center gap-2 w-full">
            <TimerDisplay
              time={displayTime}
              face={activeFace}
              mode={mode}
              isActive={isActive}
              initialDuration={mode === 'pomodoro' ? customDuration * 60 : 0}
              color={selectedSubject?.color}
            />
            <div className="flex gap-2 items-center w-full max-w-xs">
              <Select onValueChange={handleSubjectChange} disabled={!isIdle || !user} value={selectedSubjectId || ""}>
                <SelectTrigger className="shadow-sm">
                  <SelectValue placeholder={user ? (subjectsLoading ? "Loading..." : "Select subject") : "Login to select subject"} />
                </SelectTrigger>
                <SelectContent>
                  {user && subjects && subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color }}></span>
                        {subject.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setAddSubjectOpen(true)} disabled={!isIdle} className="shadow-sm flex-shrink-0">
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {mode === 'pomodoro' && (
            <div className='flex items-center justify-center gap-2'>
              <label htmlFor="custom-duration" className='text-sm font-medium text-muted-foreground'>Duration:</label>
              <Input
                id="custom-duration"
                type="number"
                value={customDuration}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                className="w-20 h-9"
                disabled={!isIdle}
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          )}

          <TimerControls
            isActive={isActive}
            isPaused={isPaused}
            onStart={start}
            onPause={pause}
            onStop={() => stop('stopped')}
            onReset={reset}
          />
        </CardContent>
      </Card>
      <AddSubjectDialog
        isOpen={isAddSubjectOpen}
        onOpenChange={setAddSubjectOpen}
        onAddSubject={handleAddSubject}
      />
    </>
  );
}
