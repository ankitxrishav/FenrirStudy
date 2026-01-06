
'use client';

interface DigitalFaceProps {
  time: number;
  subjectName?: string;
}

const formatTime = (totalSeconds: number) => {
  const roundedSeconds = Math.floor(totalSeconds);
  const seconds = roundedSeconds % 60;
  const minutes = Math.floor(roundedSeconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function DigitalFace({ time, subjectName }: DigitalFaceProps) {
  return (
    <div className="w-full h-full flex items-center justify-center">
        <div className="relative w-full max-w-md">
            <span className="font-mono font-bold text-8xl md:text-9xl text-foreground tracking-tighter block text-center">
                {formatTime(time)}
            </span>
            <span className="mt-4 text-lg font-medium text-muted-foreground truncate max-w-full px-4 text-center block">
                {subjectName || "No Subject"}
            </span>
        </div>
    </div>
  );
}
