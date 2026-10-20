import { useNavigate } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';

/**
 * Zones or grid still loading (first time, and again on every zone filter
 * change): the desk's outline, map block with its survey grid, the three mode
 * boards and a sheet. The status sentence is kept as the screen's only text.
 */
export function GridLoading() {
  return (
    <Screen width="wide">
      <p role="status" className="text-body-md font-medium text-muted">
        Đang tải lưới ô…
      </p>
      <div aria-hidden="true" className="flex flex-col gap-md">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-md xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-x-lg">
          <div className="grid grid-cols-3 gap-1 xl:col-start-2 xl:row-start-1">
            <Skeleton className="h-12 rounded-[12px]" />
            <Skeleton className="h-12 rounded-[12px]" />
            <Skeleton className="h-12 rounded-[12px]" />
          </div>
          <div
            className="relative -mx-md h-[58dvh] min-h-[320px] overflow-hidden bg-sunken md:mx-0 md:h-[400px] md:min-h-0 md:rounded-[20px] lg:h-[440px] xl:col-start-1 xl:row-span-2 xl:row-start-1 xl:h-[calc(100dvh-160px)] xl:min-h-[520px]"
            style={{
              backgroundImage:
                'linear-gradient(rgb(var(--c-border)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-border)) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          >
            <div className="sb-shimmer absolute inset-0 opacity-60" />
          </div>
          <div className="flex flex-col gap-sm rounded-[20px] bg-card p-md ring-1 ring-border xl:col-start-2 xl:row-start-2 xl:self-start">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-3/4" />
          </div>
        </div>
      </div>
    </Screen>
  );
}

/** Loading failed: the title, the message on a pale red sheet, and "Thử lại". */
export function GridError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Screen width="wide">
      <AppHeader title="Lưới ô sạp" back />
      <div className="flex max-w-[640px] flex-col gap-md rounded-[20px] bg-[#FDEBEA] p-md ring-1 ring-[#8F1717]/20 md:p-lg dark:bg-[#3A1414]">
        <div className="flex items-start gap-sm text-[#8F1717] dark:text-[#FF9A90]">
          <Icon
            name="alert-octagon-outline"
            size={26}
            color="currentColor"
            className="mt-0.5 shrink-0"
          />
          <p role="alert" className="text-[17px] font-semibold leading-snug">
            {message}
          </p>
        </div>
        <div className="sm:w-fit">
          <Button label="Thử lại" onPress={onRetry} />
        </div>
      </div>
    </Screen>
  );
}

/**
 * The ward has no zones: a blank pavement plan with no slots painted on it,
 * the sentence, and the way to the zone settings (an existing route).
 */
export function NoZones() {
  const navigate = useNavigate();
  return (
    <Screen width="wide">
      <AppHeader title="Lưới ô sạp" back />
      <div className="flex flex-col items-start gap-lg overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border md:flex-row md:items-center">
        <svg
          aria-hidden="true"
          viewBox="0 0 320 180"
          preserveAspectRatio="xMidYMid slice"
          className="block h-[180px] w-full shrink-0 md:w-[320px]"
        >
          <rect width="320" height="70" className="fill-[#E9EDF1] dark:fill-[#1D2833]" />
          <path
            d="M0 35 H320"
            strokeDasharray="18 14"
            strokeWidth="3"
            className="stroke-white/90 dark:stroke-white/25"
          />
          {Array.from({ length: 15 }, (_, i) => (
            <rect
              key={i}
              x={i * 22}
              y="70"
              width="22"
              height="9"
              className={i % 2 ? 'fill-[#FFF8F2]' : 'fill-brand'}
            />
          ))}
          <rect y="79" width="320" height="101" className="fill-[#FFF3E8] dark:fill-[#2A2420]" />
          <rect
            x="40"
            y="96"
            width="240"
            height="66"
            rx="12"
            strokeWidth="2.5"
            strokeDasharray="10 8"
            className="fill-none stroke-[rgb(var(--c-primary)/0.45)]"
          />
          <path
            d="M160 114v30M145 129h30"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="stroke-primary"
          />
        </svg>
        <div className="flex flex-col gap-md px-md pb-lg md:py-lg md:pr-xl">
          <p className="font-sign text-[24px] font-extrabold leading-tight text-text [font-stretch:90%]">
            Chưa có khu vực
          </p>
          <p className="max-w-[52ch] text-body-lg text-text">
            Phường chưa có khu vực nào. Hãy tạo khu vực ở mục Giá & khung giờ trước khi vẽ ô.
          </p>
          <div className="sm:w-fit">
            <Button label="Mở Giá & khung giờ" onPress={() => navigate('/ward/settings/pricing')} />
          </div>
        </div>
      </div>
    </Screen>
  );
}
