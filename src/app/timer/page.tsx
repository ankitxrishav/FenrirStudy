"use client";

import Timer from "@/components/app/timer/timer";

export default function TimerPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full items-center justify-center py-4 sm:py-8">
      <Timer />
    </div>
  );
}
