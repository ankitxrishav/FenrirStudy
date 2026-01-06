
interface TimerDisplayProps {
  time: number;
}

const formatTime = (totalSeconds: number) => {
  const roundedSeconds = Math.floor(totalSeconds);
  const seconds = roundedSeconds % 60;
  const minutes = Math.floor(roundedSeconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${String(hours)}:${String(minutes % 60).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function TimerDisplay({ time }: TimerDisplayProps) {
  return (
    <div 
        className="font-mono font-bold text-8xl md:text-9xl text-foreground tracking-tighter"
    >
        {formatTime(time)}
    </div>
  );
}
