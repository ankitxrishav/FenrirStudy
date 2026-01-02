
import { Card, CardContent } from "@/components/ui/card";

interface TimerDisplayProps {
  time: number;
  subjectName?: string;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export function TimerDisplay({ time, subjectName }: TimerDisplayProps) {
  return (
    <Card className="w-full max-w-md border-2 shadow-lg">
        <CardContent className="p-8 flex flex-col items-center justify-center">
            <span 
              className="font-mono font-bold text-8xl md:text-9xl text-foreground tracking-tighter"
            >
              {formatTime(time)}
            </span>
            <span className="mt-4 text-lg font-medium text-muted-foreground truncate max-w-full px-4 text-center">
              {subjectName || "No Subject"}
            </span>
        </CardContent>
    </Card>
  );
}
