import { Spinner } from '@/components/common/Spinner';

/** Shown in the content area while a lazily loaded screen's chunk downloads. */
export function ScreenFallback() {
  return (
    <div className="flex h-full min-h-[40vh] items-center justify-center text-primary">
      <Spinner size={28} />
    </div>
  );
}
