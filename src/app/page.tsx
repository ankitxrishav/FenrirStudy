import Timer from '@/components/app/timer/timer';
import { PihuCat } from '@/components/app/rooms/pihu-cat';

export default function Home() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <Timer />
      <PihuCat greetingMode={true} />
    </div>
  );
}
