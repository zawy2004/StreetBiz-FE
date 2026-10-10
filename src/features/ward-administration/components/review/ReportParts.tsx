import { useEffect, useState, type ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';
import { VERDICT_TONES } from '@/components/illustrations';
import type { Vendor } from '@/mocks/types';
import { formatAgoVi } from './format';

/** Honest about the demo: these actions only change the in-browser mock data. */
export function MockDataNotice() {
  const t = VERDICT_TONES.neutral;
  return (
    <p
      className={`flex items-start gap-xs rounded-[14px] px-md py-sm text-[14px] leading-[22px] ${t.wash} ${t.ink}`}
    >
      <Icon name="information-outline" size={18} color="currentColor" className="mt-0.5 shrink-0" />
      Dữ liệu giả lập trong trình duyệt: thao tác ở đây không gửi lên máy chủ và không lưu lý do.
    </p>
  );
}

/** The citizen's words, pinned to the ward board: large, quoted, with when it came in. */
export function CitizenReportSlip({ reason, createdAt }: { reason: string; createdAt: string }) {
  const long = reason.length > 280;
  const ago = formatAgoVi(createdAt);
  return (
    <figure className="sb-pop relative overflow-hidden rounded-[20px] bg-card p-md pl-lg shadow-sheet ring-1 ring-border md:p-lg md:pl-xl">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[6px] bg-error" />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-2 h-3 w-3 -translate-x-1/2 rounded-full bg-brand shadow-[0_2px_4px_rgb(0_0_0/0.25)]"
      />
      <svg viewBox="0 0 48 40" aria-hidden="true" className="h-10 w-12 fill-brand">
        <path d="M0 40V22C0 9.5 6 2.6 18 0l2.6 5.2C13.4 7.6 10 12 10 18h9v22zm27 0V22C27 9.5 33 2.6 45 0l2.6 5.2C40.4 7.6 37 12 37 18h9v22z" />
      </svg>
      <blockquote
        className={`mt-sm font-semibold text-text ${long ? 'text-[19px] leading-[28px]' : 'text-[19px] leading-[28px] md:text-[22px] md:leading-[32px]'}`}
      >
        {reason}
      </blockquote>
      <figcaption className="mt-md flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[14px] leading-[22px] text-muted">
        <Icon name="clock-outline" size={16} color="currentColor" />
        Gửi lúc {new Date(createdAt).toLocaleString('vi-VN')}
        {ago ? <span>· {ago}</span> : null}
      </figcaption>
    </figure>
  );
}

/** The scene photo the reporter sent, or an honest empty frame. */
export function ReportPhoto({ uri, vendorName }: { uri?: string; vendorName?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [uri]);
  const frame =
    'relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[14px] bg-sunken ring-1 ring-border';
  return (
    <figure className="flex flex-col gap-xs">
      {uri && !broken ? (
        <a href={uri} target="_blank" rel="noreferrer" className={`group ${frame}`}>
          <img
            src={uri}
            alt={`Ảnh người phản ánh gửi về ${vendorName ?? 'hộ kinh doanh'}`}
            loading="lazy"
            onError={() => setBroken(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </a>
      ) : (
        <div className={`${frame} flex-col gap-xs text-muted`}>
          <Icon name="camera-plus-outline" size={32} color="currentColor" className="opacity-70" />
          <span className="text-body-sm">Không có ảnh kèm theo</span>
        </div>
      )}
      <figcaption className="text-body-sm text-muted">Ảnh người phản ánh gửi</figcaption>
    </figure>
  );
}

/** Who the report is about (mock vendor record). */
export function ReportedVendorCard({ vendor }: { vendor?: Vendor }) {
  if (!vendor)
    return (
      <div className="flex items-start gap-xs rounded-[20px] border-2 border-dashed border-border bg-card p-md text-body-md text-muted">
        <Icon
          name="storefront-outline"
          size={20}
          color="currentColor"
          className="mt-0.5 shrink-0"
        />
        Phản ánh chưa gắn với hộ kinh doanh nào
      </div>
    );
  const rows: { icon: IconName; value: ReactNode }[] = [
    { icon: 'account-circle-outline', value: vendor.owner_name },
    {
      icon: 'phone-outline',
      value: <span className="font-sign font-semibold font-tabular">{vendor.phone}</span>,
    },
  ];
  if (vendor.address) rows.push({ icon: 'map-marker-outline', value: vendor.address });
  return (
    <section
      aria-label="Hộ bị phản ánh"
      className="flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border"
    >
      <p className="text-body-sm font-semibold text-muted">Hộ bị phản ánh</p>
      <div className="flex items-center gap-sm">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-tint-primary text-primary">
          <Icon name="storefront-outline" size={24} color="currentColor" weight="duotone" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-text">{vendor.business_name}</p>
          <p className="text-body-sm text-muted">
            {vendor.vendor_type === 'FIXED_STOREFRONT' ? 'Cửa hàng cố định' : 'Hàng rong lưu động'}
          </p>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5 border-t border-border pt-sm">
        {rows.map((row, i) => (
          <li key={i} className="flex items-start gap-xs text-[16px] text-text">
            <Icon
              name={row.icon}
              size={17}
              color="currentColor"
              className="mt-1 shrink-0 text-muted"
            />
            <span className="min-w-0 break-words">{row.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One way out of the report, with what it will do written above the button (wide screens). */
export function ResolutionPath({
  id,
  note,
  children,
}: {
  id: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <div className="group flex flex-1 flex-col gap-1">
      <p
        id={id}
        className="hidden text-body-sm text-muted transition-colors group-hover:text-text md:block"
      >
        {note}
      </p>
      {children}
    </div>
  );
}
