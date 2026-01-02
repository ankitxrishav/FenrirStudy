"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

type UseTimerProps = {
  initialDuration: number;
  onEnd: (sessionData: { duration: number; pauseCount: number, startTime: number | null }) => void;
  timerType?: 'countdown' | 'stopwatch';
};

export function useTimer({
  initialDuration,
  onEnd,
  timerType = 'countdown',
}: UseTimerProps) {
  const [duration, setDuration] = useState(initialDuration);
  const [time, setTime] = useState(initialDuration);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseCount, setPauseCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset timer state when the key properties change, but only if not active
    if (!isActive) {
        setTime(initialDuration);
        setDuration(initialDuration);
    }
  }, [initialDuration, timerType, isActive]);
  
  const handleTick = useCallback(() => {
     if (timerType === 'countdown') {
        setTime((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(intervalRef.current!);
            setIsActive(false);
            onEnd({ duration: duration, pauseCount, startTime: startTimeRef.current });
            return 0;
          }
          return prevTime - 1;
        });
      } else { // Stopwatch
        setTime((prevTime) => prevTime + 1);
      }
  }, [timerType, onEnd, duration, pauseCount]);

  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(handleTick, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, handleTick]);
  
  const start = useCallback(() => {
    setIsActive(true);
    setIsPaused(false);
    if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
    }
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
    if(isActive) {
        setPauseCount((p) => p + 1);
    }
  }, [isActive]);

  const reset = useCallback((newDuration?: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    // Only trigger onEnd if the timer was actually running and some time has passed
    if (isActive) {
        const studiedDuration = timerType === 'countdown' ? duration - time : time;
        // Only save if more than a few seconds have passed to avoid saving empty sessions
        if (studiedDuration > 5) {
            onEnd({ duration: studiedDuration, pauseCount, startTime: startTimeRef.current });
        }
    }

    const finalDuration = newDuration !== undefined ? newDuration : initialDuration;

    setIsActive(false);
    setIsPaused(false);
    setPauseCount(0);
    setTime(finalDuration);
    if(timerType === 'countdown') {
        setDuration(finalDuration);
    }
    startTimeRef.current = null;
  }, [duration, time, isActive, pauseCount, onEnd, timerType, initialDuration]);

  return { time, isActive, isPaused, start, pause, reset, duration };
}
