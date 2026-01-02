
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useTimer } from '@/hooks/use-timer';
import { TimerDisplay } from './timer-display';
import { TimerControls } from './timer-controls';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Subject, Session } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle, Palette, PanelLeft, PanelTop } from 'lucide-react';
import { AddSubjectDialog } from './add-subject-dialog';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { addDoc, collection, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { StyleSelector } from './style-selector';

type TimerMode = 'pomodoro' | 'stopwatch';
type LayoutMode = 'side' | 'bottom';

const modeSettings: { [key in TimerMode]: { defaultDuration: number; label: string } } = {
  pomodoro: { defaultDuration: 25 * 60, label: 'Pomodoro' },
  stopwatch: { defaultDuration: 0, label: 'Stopwatch' },
};

export default function Timer() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [layout, setLayout] = useState<LayoutMode>('bottom');
  const [customDuration, setCustomDuration] = useState(modeSettings.pomodoro.defaultDuration / 60);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [isAddSubjectOpen, setAddSubjectOpen] = useState(false);
  const [isStyleSelectorOpen, setStyleSelectorOpen] = useState(false);
  const { toast } = useToast();

  const subjectsQuery = useMemo(() => {
      return user && firestore ? query(collection(firestore, 'subjects'), where('userId', '==', user.uid), where('archived', '==', false)) : null;
  }, [user, firestore]);
  const { data: subjects, loading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

  const selectedSubject = useMemo(() => {
    if (!subjects || !selectedSubjectId) return null;
    return subjects.find(s => s.id === selectedSubjectId) || null;
  }, [subjects, selectedSubjectId]);

  const handleSessionEnd = async (sessionData: { duration: number; pauseCount: number, startTime: number | null }) => {
    if (!user || !selectedSubjectId || !sessionData.startTime || sessionData.duration < 5 || !firestore) return;
    
    // Calculate a simple focus score. 100 is perfect, reduced by pauses.
    const focusScore = Math.max(0, 100 - (sessionData.pauseCount * 5));

    try {
      const sessionPayload: Omit<Session, 'id' | 'endTime'> & {endTime: any} = {
        userId: user.uid,
        subjectId: selectedSubjectId,
        mode: mode,
        startTime: new Date(sessionData.startTime).toISOString(),
        duration: sessionData.duration,
        pauseCount: sessionData.pauseCount,
        status: 'completed',
        focusScore: focusScore,
        endTime: serverTimestamp(),
      }

      await addDoc(collection(firestore, 'sessions'), sessionPayload);

      toast({
        title: "Session Saved!",
        description: `You studied ${selectedSubject?.name} for ${Math.round(sessionData.duration / 60)} minutes.`,
      });
    } catch (error) {
      console.error("Error saving session: ", error);
      toast({
        title: 'Error',
        description: 'Could not save your session.',
        variant: 'destructive'
      })
    }
  };

  const timerDuration = mode === 'pomodoro' ? customDuration * 60 : modeSettings.stopwatch.defaultDuration;

  const {
    time,
    isActive,
    isPaused,
    start,
    pause,
    reset,
  } = useTimer({ 
    initialDuration: timerDuration, 
    onEnd: handleSessionEnd, 
    timerType: mode === 'stopwatch' ? 'stopwatch' : 'countdown' 
  });
  
  useEffect(() => {
    if (!isActive) {
        reset(timerDuration);
    }
  }, [customDuration, mode, isActive, reset, timerDuration]);


  const handleStart = () => {
    if (user && !selectedSubjectId) {
      toast({
        title: 'No Subject Selected',
        description: 'Please select a subject before starting the timer to save your session.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) {
        toast({
            title: "You're not logged in",
            description: 'Your session will not be saved. Log in to track your progress.',
            action: <Button onClick={() => router.push('/login')}>Login</Button>
        });
    }
    start();
  };

  const handleModeChange = (newMode: string) => {
    if (isActive) return;
    const modeKey = newMode as TimerMode;
    setMode(modeKey);
  };
  
  const handleSubjectChange = (subjectId: string) => {
    if (isActive) return;
    setSelectedSubjectId(subjectId);
  };

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

  const layoutIcon = layout === 'side' ? <PanelTop /> : <PanelLeft />;

  const controlPanel = (
    <div className="flex w-full flex-col items-center justify-center gap-6">
        <Tabs value={mode} onValueChange={handleModeChange} className="w-full max-w-sm">
            <TabsList className={cn("grid w-full grid-cols-2", isActive && "pointer-events-none opacity-50")}>
            {Object.entries(modeSettings).map(([key, value]) => (
                <TabsTrigger key={key} value={key} disabled={isActive}>
                {value.label}
                </TabsTrigger>
            ))}
            </TabsList>
        </Tabs>

        {mode === 'pomodoro' && (
            <div className='flex items-center justify-center gap-2'>
            <label htmlFor="custom-duration" className='text-sm font-medium text-muted-foreground'>Duration:</label>
            <Input
                id="custom-duration"
                type="number"
                value={customDuration}
                onChange={(e) => setCustomDuration(Number(e.target.value))}
                className="w-20 h-9"
                disabled={isActive}
            />
                <span className="text-sm text-muted-foreground">min</span>
            </div>
        )}
        <div className="flex gap-2 w-full max-w-sm">
            <Select onValueChange={handleSubjectChange} disabled={isActive || !user} value={selectedSubjectId || ""}>
                <SelectTrigger>
                <SelectValue placeholder={user ? (subjectsLoading ? "Loading subjects..." : "Select a subject") : "Login to see subjects"} />
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
            <Button variant="outline" size="icon" onClick={() => setAddSubjectOpen(true)} disabled={isActive}>
                <PlusCircle className="h-4 w-4" />
            </Button>
        </div>

        <TimerControls
        isActive={isActive}
        isPaused={isPaused}
        onStart={handleStart}
        onPause={pause}
        onReset={() => {
            reset();
        }}
        />
    </div>
  );


  return (
    <>
        <div className={cn("relative flex h-full w-full flex-col items-center justify-center gap-8 md:gap-12 p-4", {
            "md:flex-row": layout === 'side',
            "md:flex-col": layout === 'bottom'
        })}>
            <div className="absolute top-4 right-4 flex items-center">
                <Button variant="ghost" size="icon" onClick={() => setStyleSelectorOpen(true)} className="hidden md:inline-flex">
                    <Palette />
                </Button>
                 <Button variant="ghost" size="icon" onClick={() => setLayout(prev => prev === 'side' ? 'bottom' : 'side')} className="hidden md:inline-flex">
                    {layoutIcon}
                </Button>
            </div>
        
            <TimerDisplay time={time} subjectName={selectedSubject?.name || (user ? 'Select Subject' : 'Login to save session')} />
            
            <div className={cn("flex w-full items-center justify-center md:w-auto", {
                "md:max-w-sm": layout === 'side'
            })}>
               {controlPanel}
            </div>
        </div>
        <AddSubjectDialog
            isOpen={isAddSubjectOpen}
            onOpenChange={setAddSubjectOpen}
            onAddSubject={handleAddSubject}
        />
        <StyleSelector
            isOpen={isStyleSelectorOpen}
            onOpenChange={setStyleSelectorOpen}
        />
    </>
  );
}
