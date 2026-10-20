import { Icon } from '@/components/common';
import { ModeGlyph } from './ModePalette';
import type { GridMode } from './placement';

/** The ward has no official boundary yet: always visible while that holds, on a mango wash. */
export function BoundaryStrip() {
  return (
    <div className="flex items-start gap-sm rounded-[14px] bg-[#FFF3D1] px-md py-sm text-[#6B4100] ring-1 ring-[#C98A04]/30 dark:bg-[#3A2A08] dark:text-[#FFD27A]">
      <Icon
        name="alert-circle-outline"
        size={22}
        color="currentColor"
        weight="fill"
        className="mt-px shrink-0"
      />
      <p className="text-body-md font-medium">
        Chưa cấu hình ranh giới phường chính thức, tọa độ ô sạp chỉ được ghi nhận theo vị trí cắm
        pin.
      </p>
    </div>
  );
}

/**
 * What to do next in the current mode, in large type, then the map key in
 * words and what the address search does (and does not do).
 */
export function GuidanceCard({
  mode,
  bulk,
  text,
}: {
  mode: GridMode;
  bulk: boolean;
  text: string;
}) {
  return (
    <div className="flex flex-col gap-xs rounded-[20px] bg-[#FFF3E8] p-md ring-1 ring-brand/20 dark:bg-[#2A2420]">
      <div className="flex items-start gap-sm">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-card text-primary shadow-card"
        >
          {bulk ? (
            <Icon name="check-circle-outline" size={22} color="currentColor" />
          ) : (
            <ModeGlyph mode={mode} />
          )}
        </span>
        <p aria-live="polite" className="pt-1 text-[16px] font-semibold leading-snug text-text">
          {text}
        </p>
      </div>
      <p className="text-body-sm text-text/75">
        Điểm đỏ: chướng ngại vật cấm kinh doanh; điểm vàng: chướng ngại vật khác; vòng xanh dương:
        vị trí của bạn.
      </p>
      <p className="flex items-start gap-1.5 text-body-sm text-muted">
        <Icon name="magnify" size={15} color="currentColor" className="mt-0.5 shrink-0" />
        Tìm địa chỉ chỉ để di chuyển bản đồ tới gần khu vực, không tự đặt ô.
      </p>
    </div>
  );
}

/**
 * Field-survey advice, folded to one line. The text stays in the DOM (a
 * native `details`), it is only collapsed.
 */
export function SurveyTips() {
  return (
    <details className="group rounded-[16px] bg-card ring-1 ring-border [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-sm rounded-[16px] px-md text-label font-semibold text-text hover:bg-sunken">
        <Icon
          name="ruler-square"
          size={18}
          color="currentColor"
          className="shrink-0 text-primary"
        />
        <span className="flex-1">Mẹo khảo sát thực địa</span>
        <Icon
          name="chevron-down"
          size={18}
          color="currentColor"
          className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <p className="px-md pb-md text-body-md text-text">
        Bản đồ và ảnh vệ tinh chỉ để định vị gần đúng (sai số vài mét). Hãy khảo sát thực địa, đo bề
        rộng vỉa hè và chiều dài ô bằng thước, rồi đứng tại vị trí ô bấm{' '}
        <strong>Vị trí của tôi</strong> để ghi tọa độ GPS thay vì chấm tay trên ảnh.
      </p>
    </details>
  );
}

/**
 * Nothing chosen yet in "Đặt ô": an unpainted slot outline waiting, and the
 * two ways in (tap the map, or pick a slot from the register below).
 */
export function IdleInspector() {
  return (
    <div className="flex items-center gap-md rounded-[20px] bg-card p-md shadow-card ring-1 ring-border">
      <svg aria-hidden="true" viewBox="0 0 88 64" className="h-16 w-[88px] shrink-0">
        <rect x="0" y="54" width="88" height="10" className="fill-[#FFF8F2]" />
        {Array.from({ length: 4 }, (_, i) => (
          <rect key={i} x={i * 22} y="54" width="11" height="10" className="fill-brand" />
        ))}
        <rect
          x="14"
          y="8"
          width="60"
          height="38"
          rx="6"
          strokeWidth="2.5"
          strokeDasharray="7 5"
          className="fill-[rgb(var(--c-brand)/0.08)] stroke-brand"
        />
        <path
          d="M44 18v18M35 27h18"
          strokeWidth="3"
          strokeLinecap="round"
          className="stroke-primary"
        />
      </svg>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-sign text-[19px] font-extrabold leading-tight text-text [font-stretch:90%]">
          Chưa chọn ô nào
        </p>
        <p className="text-body-sm text-muted">
          Chạm chỗ trống trên bản đồ để thêm ô mới, hoặc chạm một ô (trên bản đồ hay trong danh sách
          bên dưới) để sửa.
        </p>
      </div>
    </div>
  );
}
