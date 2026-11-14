import { Icon } from '@/components/common';
import type { VendorReportType } from '@/core/api/ai-api';
import {
  REPORT_TYPE_ICONS,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_LABELS_EN,
} from '@/features/vendor-reports/report-kinds';
import { cityFeedbackUrl, cityPhoneHref, cityPhoneLabel } from '../price-board-format';

type Props = {
  /** The buttons to offer, in order; the first is drawn as the main one. */
  types: VendorReportType[];
  onPick: (type: VendorReportType) => void;
  bilingual?: boolean;
};

/**
 * The ways to complain about this stall, each one a large button with the words it files
 * the report under. Sending needs a buyer account (D3); the city's 1022 line below is for
 * anyone who would rather not have one.
 */
export function ComplaintActions({ types, onPick, bilingual }: Props) {
  if (types.length === 0) return null;
  return (
    <div className="flex flex-col gap-sm">
      <p className="text-label text-text">
        Có vấn đề với quầy này?
        {bilingual ? (
          <span lang="en" className="font-normal text-muted">
            {' '}
            · Something wrong at this stall?
          </span>
        ) : null}
      </p>
      <div className="grid gap-sm sm:grid-cols-2">
        {types.map((type, i) => (
          <button
            key={type}
            type="button"
            onClick={() => onPick(type)}
            className={[
              'flex min-h-14 items-center gap-sm rounded-[14px] px-md py-xs text-left transition-[background-color,box-shadow,transform] duration-150 active:translate-y-px',
              i === 0 && type === 'OVERCHARGE'
                ? 'bg-error text-white shadow-[0_12px_24px_-14px_rgb(var(--c-error)/0.9)] hover:brightness-95 dark:text-[#1A0604] sm:col-span-2'
                : 'bg-card text-text ring-1 ring-inset ring-text/20 hover:bg-sunken',
            ].join(' ')}
          >
            <Icon
              name={REPORT_TYPE_ICONS[type]}
              size={22}
              color="currentColor"
              className="shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-[16px] font-semibold leading-snug">
                {REPORT_TYPE_LABELS[type]}
              </span>
              {bilingual ? (
                <span lang="en" className="block text-body-sm opacity-80">
                  {REPORT_TYPE_LABELS_EN[type]}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
      <p className="text-body-sm text-muted">
        Gửi phản ánh cần tài khoản người mua, để phường báo kết quả cho bạn.
        {bilingual ? (
          <span lang="en" className="block">
            Sending a report needs a buyer account, so the ward can tell you the outcome.
          </span>
        ) : null}
      </p>
    </div>
  );
}

/**
 * Đà Nẵng's own feedback channel (1022), for people who do not want a StreetBiz account.
 * StreetBiz points to it and never replaces it.
 */
export function CityFeedbackLink({ bilingual }: { bilingual?: boolean }) {
  const url = cityFeedbackUrl();
  const host = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return (
    <aside
      aria-label="Kênh góp ý 1022 của thành phố"
      className="flex flex-col gap-xs rounded-[20px] bg-tint-indigo p-md ring-1 ring-indigo/15"
    >
      <p className="flex items-center gap-xs text-label text-text">
        <Icon name="phone-outline" size={18} color="currentColor" className="text-indigo" />
        Không muốn tạo tài khoản?
        {bilingual ? (
          <span lang="en" className="font-normal text-muted">
            {' '}
            · No account?
          </span>
        ) : null}
      </p>
      <p className="text-body-md text-text/85">
        Phản ánh qua kênh 1022 của thành phố Đà Nẵng: gọi{' '}
        <a
          href={cityPhoneHref()}
          className="font-sign text-[17px] font-bold text-indigo underline-offset-2 hover:underline font-tabular"
        >
          {cityPhoneLabel()}
        </a>{' '}
        hoặc góp ý tại{' '}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-indigo underline-offset-2 hover:underline"
        >
          {host}
        </a>
        .
        {bilingual ? (
          <span lang="en" className="mt-0.5 block text-body-sm text-muted">
            Report through Da Nang&apos;s 1022 citizen line: call {cityPhoneLabel()} or write at{' '}
            {host}.
          </span>
        ) : null}
      </p>
    </aside>
  );
}
