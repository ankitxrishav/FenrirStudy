import { Button } from '@/components/ui/button';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';

interface TimerControlsProps {
  isActive: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export function TimerControls({
  isActive,
  isPaused,
  onStart,
  onPause,
  onReset,
}: TimerControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={onReset} aria-label="Reset Timer">
        <RotateCcw className="h-5 w-5" />
      </Button>
      
      {!isActive || isPaused ? (
        <Button size="icon" className="h-20 w-20 rounded-full shadow-lg" onClick={onStart} aria-label="Start or Resume Timer">
          <Play className="h-8 w-8 fill-current" />
        </Button>
      ) : (
        <Button size="icon" className="h-20 w-20 rounded-full shadow-lg" onClick={onPause} aria-label="Pause Timer">
          <Pause className="h-8 w-8 fill-current" />
        </Button>
      )}

      <Button variant="destructive" size="icon" className="h-12 w-12 rounded-full" onClick={onReset} aria-label="Stop Timer">
        <Square className="h-5 w-5 fill-current" />
      </Button>
    </div>
  );
}
