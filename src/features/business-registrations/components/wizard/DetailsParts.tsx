import { useEffect, useId, useRef, type ReactNode } from 'react';

import { Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { VENDOR_TYPE, type ApiVendorType } from '@/core/api';
import { useWards } from '@/core/auth/useWards';
import { FrontageMiniArt } from '../registration-art';
import { playOnce } from '../ui-motion';

/** Name size steps down as it grows, then wraps to two lines, so the sign never overflows. */
function nameSize(length: number) {
  if (length <= 14) return 'text-[24px] md:text-[28px] xl:text-[34px]';
  if (length <= 24) return 'text-[20px] md:text-[24px] xl:text-[28px]';
  return 'text-[17px] md:text-[20px] xl:text-[22px]';
}

type SignProps = {
  vendorType: ApiVendorType;
  displayName: string;
  declaredAddress: string;
  wardName: string | null;
};

/**
 * "Treo biển cho quán": the shop name appears on its sign as it is typed, the
 * ward on the cart (itinerant) or the address on a house plate (storefront).
 * The sign swings once, from its top edge, the first time a name lands on it.
 * Decorative: it repeats what the fields say, so it is hidden from readers.
 */
export function SignboardPreview({
  vendorType,
  displayName,
  declaredAddress,
  wardName,
}: SignProps) {
  const signRef = useRef<HTMLDivElement>(null);
  const hadName = useRef(displayName.trim().length > 0);
  const name = displayName.trim();

  useEffect(() => {
    if (name && !hadName.current) {
      hadName.current = true;
      playOnce(
        signRef.current,
        [
          { transform: 'rotate(-2deg)' },
          { transform: 'rotate(1deg)' },
          { transform: 'rotate(0deg)' },
        ],
        { duration: 700 },
      );
    }
  }, [name]);

  const fixed = vendorType === VENDOR_TYPE.fixedStorefront;
  const nameEl = (
    <span
      className={`line-clamp-2 break-words font-sign font-extrabold leading-[1.05] tracking-[-0.01em] [font-stretch:80%] ${
        name
          ? `text-[#111C2B] ${nameSize(name.length)}`
          : 'text-[20px] text-[#566173] md:text-[24px]'
      }`}
    >
      {name || 'Tên quán của bạn'}
    </span>
  );

  return (
    <div
      aria-hidden="true"
      className="relative flex h-[132px] flex-col items-center justify-end overflow-hidden rounded-[20px] bg-[#FFF3E8] ring-1 ring-brand/20 md:h-[148px] xl:h-[220px] dark:bg-[#2A2420]"
    >
      {fixed ? (
        <>
          <div className="flex w-full flex-1 items-center justify-center px-md pt-sm">
            <div
              ref={signRef}
              style={{ transformOrigin: '50% 0%' }}
              className="w-full max-w-[300px] rounded-[10px] bg-white px-sm py-xs text-center shadow-card ring-[3px] ring-brand"
            >
              {nameEl}
            </div>
          </div>
          <svg
            viewBox="0 0 320 18"
            preserveAspectRatio="none"
            className="block h-[14px] w-full xl:h-[18px]"
          >
            {Array.from({ length: 16 }, (_, i) => (
              <path
                key={i}
                d={`M${i * 20} 0 h20 v9 a10 9 0 0 1 -20 0 z`}
                className={i % 2 ? 'fill-white' : 'fill-brand'}
              />
            ))}
          </svg>
          <div className="flex h-[38px] w-full items-center justify-between gap-sm bg-card px-md ring-1 ring-border xl:h-[56px]">
            <span className="h-full w-10 shrink-0 border-x-2 border-t-2 border-text/70 bg-[#DDEBF7] xl:w-14 dark:bg-[#203142]" />
            <span
              title={declaredAddress}
              className="min-w-0 max-w-[220px] truncate rounded-[6px] bg-sign px-2 py-1 font-sign text-[13px] font-bold tracking-[0.02em] text-on-sign xl:text-[14px]"
            >
              {declaredAddress.trim() || 'Số nhà, đường'}
            </span>
          </div>
        </>
      ) : (
        <div className="flex w-full flex-1 flex-col items-center justify-end px-md pb-sm">
          <div
            ref={signRef}
            style={{ transformOrigin: '50% 100%' }}
            className="relative z-10 w-full max-w-[260px] rounded-t-[999px] rounded-b-[10px] bg-white px-md pb-1 pt-sm text-center shadow-card ring-[3px] ring-brand"
          >
            {nameEl}
          </div>
          <svg
            viewBox="0 0 260 14"
            preserveAspectRatio="none"
            className="block h-[12px] w-full max-w-[280px]"
          >
            {Array.from({ length: 13 }, (_, i) => (
              <path
                key={i}
                d={`M${i * 20} 0 h20 v7 a10 7 0 0 1 -20 0 z`}
                className={i % 2 ? 'fill-white' : 'fill-brand'}
              />
            ))}
          </svg>
          <div className="mt-1 flex h-[30px] w-full max-w-[220px] items-center justify-center rounded-[6px] bg-accent px-sm ring-2 ring-text xl:h-[40px]">
            <span className="truncate text-[12px] font-bold text-on-accent xl:text-[13px]">
              {wardName ?? 'Chọn phường quản lý'}
            </span>
          </div>
          <div className="mt-0.5 flex w-full max-w-[180px] justify-between px-sm">
            <span className="h-3 w-3 rounded-full bg-card ring-2 ring-text" />
            <span className="h-3 w-3 rounded-full bg-card ring-2 ring-text" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * "Hồ sơ sẽ tới cán bộ {phường}" with the ward's seal drawn dashed: it is
 * waiting, it will only be stamped when the ward decides. Reads the same ward
 * list query as the picker (no extra request).
 */
export function WardDestinationCard({ wardUnitId }: { wardUnitId: number | null }) {
  const { wards, loading, error } = useWards();
  const sealRef = useRef<SVGSVGElement>(null);
  const first = useRef(true);
  const ringId = `ward-ring-${useId().replace(/:/g, '')}`;
  const ward = wards.find((w) => w.unitId === wardUnitId);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (wardUnitId) {
      playOnce(
        sealRef.current,
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(8deg)' },
          { transform: 'rotate(0deg)' },
        ],
        {
          duration: 220,
        },
      );
    }
  }, [wardUnitId]);

  if (error) return null;

  return (
    <div
      aria-live="polite"
      className={`flex min-h-[72px] items-center gap-sm rounded-[16px] p-sm ${
        ward ? 'bg-[#E6F6EC] dark:bg-[#10301F]' : 'bg-sunken/70'
      }`}
    >
      {loading ? (
        <>
          <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </>
      ) : (
        <>
          <svg
            ref={sealRef}
            viewBox="0 0 64 64"
            aria-hidden="true"
            className={`h-16 w-16 shrink-0 ${ward ? 'text-[#0B5D33] dark:text-[#8BE3B0]' : 'text-muted'}`}
          >
            <defs>
              <path id={ringId} d="M32 32 m-22 0 a22 22 0 1 1 44 0 a22 22 0 1 1 -44 0" />
            </defs>
            <circle
              cx="32"
              cy="32"
              r="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
            <circle
              cx="32"
              cy="32"
              r="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <text
              fill="currentColor"
              fontSize="7.5"
              fontWeight="800"
              letterSpacing="1.6"
              className="font-sign"
            >
              <textPath href={`#${ringId}`}>PHƯỜNG ★ PHƯỜNG ★ PHƯỜNG ★</textPath>
            </text>
            <path
              d="M25 37 v-8 l7 -5 l7 5 v8 z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          {ward ? (
            <p className="min-w-0 text-[15px] leading-[22px] text-[#0B5D33] dark:text-[#8BE3B0]">
              Hồ sơ sẽ tới cán bộ <strong className="font-bold">{ward.unitName}</strong>
              {ward.parentName ? (
                <span className="block text-body-sm text-text/70">{ward.parentName}</span>
              ) : null}
            </p>
          ) : (
            <p className="min-w-0 text-[15px] leading-[22px] text-muted">
              Chọn phường để xem hồ sơ sẽ tới đâu.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** "{n}/180", warming to mango near the limit and red at it. */
export function CharCounter({ length, max }: { length: number; max: number }) {
  const tone =
    length >= max ? 'text-error' : length >= max - 20 ? 'text-on-secondary' : 'text-muted';
  return (
    <p className={`-mt-xs text-right text-body-sm font-semibold font-tabular ${tone}`}>
      <span className="sr-only">Đã nhập </span>
      {length}/{max}
      <span className="sr-only"> ký tự</span>
    </p>
  );
}

const COORD_STEPS = [
  'Mở bản đồ trên điện thoại, nhấn giữ đúng vị trí cửa hàng.',
  'Sao chép hai số hiện ra: số đầu là vĩ độ, số sau là kinh độ.',
  'Dán từng số vào ô tương ứng bên dưới.',
];

/**
 * For a fixed storefront: why the address matters (the ward checks the slot
 * right in front of the shop, BR-11) and how to fetch coordinates by copy and
 * paste, which is what the coordinate fields accept best. Holds those fields.
 */
export function AddressPurposeBox({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-md rounded-[20px] bg-[#FFF3E8] p-md ring-1 ring-brand/20 dark:bg-[#2A2420]">
      <div className="flex items-start gap-sm">
        <FrontageMiniArt className="h-[60px] w-[80px] shrink-0" />
        <div className="min-w-0">
          <h3 className="text-headline-md text-text">Địa chỉ dùng để làm gì</h3>
          <p className="mt-1 text-body-md text-text/80">
            Phường dùng địa chỉ này để xét ô vỉa hè liền kề mặt tiền cửa hàng của bạn.
          </p>
        </div>
      </div>
      <div>
        <p className="flex items-center gap-1.5 text-label text-text">
          <Icon name="crosshairs-gps" size={16} color="currentColor" className="text-primary" />
          Cách lấy toạ độ (không bắt buộc)
        </p>
        <ol className="mt-xs flex flex-col gap-xs">
          {COORD_STEPS.map((text, i) => (
            <li key={text} className="flex items-start gap-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-sign text-[13px] font-bold text-on-primary">
                {i + 1}
              </span>
              <span className="pt-0.5 text-body-md text-text">{text}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="grid grid-cols-2 gap-sm">{children}</div>
    </section>
  );
}
