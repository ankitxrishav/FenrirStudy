
import { type TimerFaceId } from "@/hooks/use-timer";
import { DigitalFace } from "./faces/digital-face";
import { RingFace } from "./faces/ring-face";
import { AnalogFace } from "./faces/analog-face";
import { RadialFace } from "./faces/radial-face";
import { RetroFace } from "./faces/retro-face";
import { cn } from "@/lib/utils";

interface TimerDisplayProps {
  time: number;
  face: TimerFaceId;
  mode: 'pomodoro' | 'stopwatch';
  isActive: boolean;
  initialDuration: number;
  color?: string;
}

export function TimerDisplay({
  time,
  face,
  mode,
  isActive,
  initialDuration,
  color
}: TimerDisplayProps) {

  const renderFace = () => {
    switch (face) {
      case 'ring':
        return <RingFace duration={time} initialDuration={initialDuration} mode={mode} isActive={isActive} color={color} />;
      case 'analog':
        return <AnalogFace duration={time} initialDuration={initialDuration} mode={mode} isActive={isActive} color={color} />;
      case 'radial':
        return <RadialFace duration={time} initialDuration={initialDuration} mode={mode} isActive={isActive} color={color} />;
      case 'retro':
        return <RetroFace duration={time} initialDuration={initialDuration} mode={mode} isActive={isActive} color={color} />;
      case 'digital':
      default:
        return <DigitalFace duration={time} mode={mode} isActive={isActive} />;
    }
  };

  return (
    <div className={cn(
      "relative w-full flex items-center justify-center transition-all duration-700 ease-out-expo",
      isActive && "scale-105"
    )}>
      {renderFace()}
    </div>
  );
}
