import { useRef } from 'react';

import { Icon, KerbTag, type IconName } from '@/components/common';
import { SlotPlate } from '@/features/buyer-discovery/components/storefront/SlotPlate';
import { OffSlotIllustration } from '@/features/vendor-map/components/StreetArt';
import type { PublicVendorProfile } from '@/features/vendor-map/community-api';

/**
 * The head of the report, set like an official letter: who it goes to (the
 * ward), what it is about (the stall, its slot at signboard size), and, when
 * the buyer came from a permit check, the note that the check goes with it.
 */
export function ReportSheetHead({
  vendor,
  scannedPermitId,
  scannedSlotId,
}: {
  vendor: PublicVendorProfile;
  scannedPermitId?: number;
  scannedSlotId?: number;
}) {
  return (
    <div className="flex flex-col gap-sm">
      <p className="font-sign text-[20px] font-bold leading-tight text-text [font-stretch:92%]">
        Kính gửi: {vendor.wardName ?? 'Phường sở tại'}
      </p>
      <p className="font-editorial text-[26px] font-semibold leading-tight tracking-[-0.01em] text-text md:text-[28px]">
        Về: {vendor.displayName}
      </p>
      <div className="flex flex-wrap items-center gap-sm">
        <SlotPlate code={vendor.slotCode} />
        <span className="text-body-md font-semibold text-text">{vendor.zoneName}</span>
      </div>
      {scannedPermitId ? (
        <p className="flex w-fit flex-wrap items-center gap-xs rounded-full bg-tint-primary py-1 pl-2.5 pr-1.5 text-body-sm font-semibold text-primary">
          <Icon name="qrcode-scan" size={16} color="currentColor" />
          Gắn với lần kiểm tra giấy phép #{scannedPermitId}
          {scannedSlotId != null && scannedSlotId === vendor.slotId ? (
            <KerbTag code={vendor.slotCode} />
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

const CORNERS = [
  'left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-[12px]',
  'right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-[12px]',
  'left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-[12px]',
  'right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-[12px]',
];

/**
 * The photo of the evidence in a 4:3 frame with orange viewfinder corners. With
 * no photo yet, a drawing of a stall standing outside its slot invites one;
 * picked, it drops into the frame like a print clipped to a file, tilted a
 * little. Keeps the picker's contract: hidden input named "Ảnh minh chứng"
 * (photos only), "Xoá ảnh Ảnh minh chứng", and the input reset so the same
 * file can be picked again.
 */
export function EvidenceFrame({
  uri,
  onChange,
  onRemove,
  uploading,
}: {
  uri?: string;
  onChange: (uri: string, file: File) => void;
  onRemove: () => void;
  /** The report is being sent and a photo goes with it. */
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pick = () => inputRef.current?.click();

  return (
    <div className="flex flex-col gap-sm">
      <p className="text-label text-text">
        Ảnh minh chứng <span className="font-normal text-muted">(không bắt buộc)</span>
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Ảnh minh chứng"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(URL.createObjectURL(file), file);
          // Allow picking the same file again after removing it.
          e.target.value = '';
        }}
      />
      <div className="relative aspect-[4/3] w-full max-w-[360px]">
        {CORNERS.map((corner) => (
          <span
            key={corner}
            aria-hidden="true"
            className={`pointer-events-none absolute z-10 h-7 w-7 border-brand ${corner}`}
          />
        ))}
        {uri ? (
          <button
            key={uri}
            type="button"
            onClick={pick}
            className="sb-pop absolute inset-[10px] -rotate-[1.5deg] overflow-hidden rounded-[14px] bg-card p-1.5 shadow-sheet ring-1 ring-border"
          >
            <img
              src={uri}
              alt="Ảnh minh chứng"
              className="h-full w-full rounded-[10px] object-cover"
            />
            {uploading ? (
              <span className="absolute inset-1.5 flex items-center justify-center rounded-[10px] bg-card/60 text-body-md font-semibold text-text backdrop-blur-[1px]">
                Đang tải ảnh lên…
              </span>
            ) : null}
          </button>
        ) : (
          <button
            type="button"
            onClick={pick}
            aria-label="Chọn ảnh minh chứng"
            className="absolute inset-[10px] flex flex-col items-center justify-center gap-xs overflow-hidden rounded-[14px] bg-[#FFF3E8] ring-1 ring-[#F5DCC6] transition-colors hover:bg-[#FFEBDA] dark:bg-sunken dark:ring-border"
          >
            <OffSlotIllustration className="h-[62%] w-auto" />
            <span className="flex items-center gap-1.5 text-body-md font-semibold text-primary">
              <Icon name="camera-plus-outline" size={20} color="currentColor" />
              Chạm để chọn ảnh
            </span>
          </button>
        )}
      </div>
      {uri ? (
        <div className="flex flex-wrap gap-sm">
          <button
            type="button"
            onClick={pick}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-card px-md text-label font-semibold text-text shadow-card ring-1 ring-border hover:ring-text/25"
          >
            <Icon name="swap-horizontal" size={16} color="currentColor" />
            Đổi ảnh
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Xoá ảnh Ảnh minh chứng"
            className="inline-flex h-11 items-center gap-1.5 rounded-full px-md text-label font-semibold text-error hover:bg-tint-error"
          >
            <Icon name="trash-can-outline" size={16} color="currentColor" />
            Xoá ảnh
          </button>
        </div>
      ) : (
        <p className="text-body-sm text-muted">Chụp rõ quầy và vạch ô vỉa hè; ảnh JPG hoặc PNG.</p>
      )}
    </div>
  );
}

const STEPS: { icon: IconName; title: string }[] = [
  { icon: 'inbox-outline', title: 'Phường tiếp nhận' },
  { icon: 'magnify', title: 'Cán bộ kiểm tra tại chỗ' },
  { icon: 'gavel', title: 'Phường xử lý theo quy định' },
];

/**
 * What happens after sending, in three stages joined by a thin painted kerb
 * (down the side in a column, across on a wide sheet). No promise of a deadline.
 */
export function AfterSubmitSteps({ across = false }: { across?: boolean }) {
  return (
    <section aria-labelledby="after-submit-title" className="flex flex-col gap-md">
      <h2 id="after-submit-title" className="font-editorial text-[22px] font-semibold text-text">
        Sau khi gửi
      </h2>
      <div className="relative">
        <span
          aria-hidden="true"
          className={`absolute rounded-full ${across ? 'bottom-6 left-[18px] top-6 w-1 md:bottom-auto md:left-6 md:right-6 md:top-[18px] md:h-1 md:w-auto md:[--kerb-dir:90deg]' : 'bottom-6 left-[18px] top-6 w-1'}`}
          style={{
            background:
              'repeating-linear-gradient(var(--kerb-dir, 180deg), rgb(var(--c-kerb)) 0 12px, rgb(var(--c-kerb-paint)) 12px 24px)',
          }}
        />
        <ol className={`relative flex gap-md ${across ? 'flex-col md:flex-row' : 'flex-col'}`}>
          {STEPS.map((step) => (
            <li
              key={step.title}
              className={`relative flex items-center gap-sm ${across ? 'md:flex-1 md:flex-col md:items-start' : ''}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-tertiary shadow-card ring-1 ring-border">
                <Icon name={step.icon} size={20} color="currentColor" weight="duotone" />
              </span>
              <span className="text-body-md font-semibold text-text">{step.title}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="text-body-sm text-muted">Bạn sẽ nhận mã phản ánh ngay khi gửi.</p>
    </section>
  );
}

/** How to take a photo the ward can act on. */
export function PhotoTips() {
  return (
    <section
      aria-labelledby="photo-tips-title"
      className="flex flex-col gap-sm rounded-[20px] bg-[#FFF3E8] p-md ring-1 ring-[#F5DCC6] dark:bg-card dark:ring-border"
    >
      <h2
        id="photo-tips-title"
        className="flex items-center gap-xs font-editorial text-[20px] font-semibold text-text"
      >
        <Icon name="camera-plus-outline" size={20} color="currentColor" className="text-primary" />
        Mẹo chụp ảnh
      </h2>
      <ul className="flex flex-col gap-1.5 text-body-md text-text/85">
        <li>Chụp rõ quầy và vạch ô vỉa hè trong cùng khung.</li>
        <li>Đứng ở lối đi để thấy phần bị lấn.</li>
        <li>Ảnh JPG hoặc PNG, đủ sáng, không cần thấy mặt người.</li>
      </ul>
    </section>
  );
}
