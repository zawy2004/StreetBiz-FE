import { Skeleton } from '@/components/feedback';

/** Six dish tiles in the shape of the real ones (square photo, two lines). */
export function DishTilesSkeleton({ columnsClass }: { columnsClass: string }) {
  return (
    <div role="status" aria-label="Đang tìm…" className={`grid gap-x-md gap-y-lg ${columnsClass}`}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex flex-col gap-sm">
          <Skeleton className="aspect-square w-full !rounded-[20px]" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** Two stall cards (4:3 photo, name, price). */
export function StallCardsSkeleton({ columnsClass }: { columnsClass: string }) {
  return (
    <div aria-hidden="true" className={`grid gap-lg ${columnsClass}`}>
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-sm">
          <Skeleton className="aspect-[4/3] w-full !rounded-[22px]" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
