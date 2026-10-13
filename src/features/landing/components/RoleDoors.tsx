import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Icon, type IconName } from '@/components/common';
import { GUEST_HOME_ROUTE } from '@/core/auth/role-routes';
import { FoodPhoto } from '@/features/authentication/components/FoodPhoto';
import { textLinkClass } from './link-styles';

const DISHES = [
  { key: 'com-tam', name: 'Cơm tấm' },
  { key: 'chao', name: 'Cháo' },
  { key: 'banh-mi', name: 'Bánh mì' },
];

/**
 * One platform, three doors of different sizes: the buyer's is the largest and
 * is all food; the vendor's shows a slot waiting with its permit; the ward's a
 * review inbox. Each door has its own way in.
 */
export function RoleDoors() {
  return (
    <section id="vai-tro" aria-labelledby="vai-tro-title" className="scroll-mt-[88px] bg-bg">
      <div className="mx-auto max-w-[1304px] px-md py-2xl md:px-lg md:py-[72px] xl:px-xl xl:py-[96px]">
        <div className="max-w-[640px]">
          <h2
            id="vai-tro-title"
            className="font-editorial text-[32px] font-semibold leading-[38px] tracking-[-0.02em] text-text [font-variation-settings:'opsz'_60] md:text-[40px] md:leading-[46px] xl:text-[44px] xl:leading-[52px]"
          >
            Một nền tảng, ba vai trò
          </h2>
          <p className="mt-sm text-body-lg text-muted">
            Mỗi người thấy đúng việc của mình, dữ liệu dùng chung một nơi.
          </p>
        </div>

        <div className="mt-xl grid gap-md md:grid-cols-2 xl:grid-cols-12 xl:grid-rows-[auto_auto]">
          <BuyerDoor />
          <Door
            className="bg-[#FFF8F2] dark:bg-card xl:col-span-5"
            art={<VendorArt />}
            title="Hộ kinh doanh"
            body="Thuê ô vỉa hè hợp lệ, mở gian hàng online và nhận đơn ngay tại quầy."
            points={[
              'Chọn ô trống trên bản đồ',
              'Nộp hồ sơ không cần lên phường',
              'Nhận đơn theo thời gian thực',
            ]}
            link={
              <Link to="/auth/register" state={{ role: 'VENDOR' }} className={textLinkClass}>
                <Icon name="storefront-outline" size={18} color="currentColor" />
                Mở gian hàng
              </Link>
            }
          />
          <Door
            className="bg-[#F3FAF6] dark:bg-card xl:col-span-5"
            art={<WardArt />}
            title="Cán bộ phường"
            body="Duyệt hồ sơ, cấp giấy phép số và theo dõi vỉa hè trên một bảng."
            points={[
              'Hộp duyệt hồ sơ tập trung',
              'Giấy phép QR khó làm giả',
              'Ghi nhận và xử lý vi phạm',
            ]}
            link={
              <a href="#cho-phuong" className={textLinkClass}>
                <Icon name="chevron-down" size={18} color="currentColor" />
                Xem cách phường làm việc
              </a>
            }
          />
        </div>
      </div>
    </section>
  );
}

function Points({ items }: { items: string[] }) {
  return (
    <ul className="mt-md flex flex-col gap-xs">
      {items.map((point) => (
        <li key={point} className="flex items-start gap-xs text-body-lg text-text">
          <span className="mt-[3px] shrink-0 text-tertiary">
            <Icon name="check-circle" size={18} color="currentColor" />
          </span>
          {point}
        </li>
      ))}
    </ul>
  );
}

function BuyerDoor() {
  return (
    <article className="flex flex-col overflow-hidden rounded-[28px] bg-card shadow-card ring-1 ring-border md:col-span-2 xl:col-span-7 xl:row-span-2">
      {/* Phones: a swipeable strip; wider: three photos side by side. */}
      <div className="no-scrollbar flex snap-x snap-mandatory gap-xs overflow-x-auto p-xs md:grid md:grid-cols-3 md:overflow-visible">
        {DISHES.map((dish) => (
          <figure
            key={dish.key}
            className="relative h-[200px] w-[72%] shrink-0 snap-start overflow-hidden rounded-[22px] md:h-[220px] md:w-auto xl:h-[300px]"
          >
            <FoodPhoto
              dish={dish.key}
              alt={`${dish.name}, ảnh minh họa`}
              glyphSize={32}
              className="h-full w-full"
            />
            <figcaption
              aria-hidden="true"
              className="absolute bottom-xs left-xs rounded-full bg-black/50 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-md"
            >
              {dish.name}, ảnh minh họa
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="flex flex-1 flex-col p-md md:p-lg xl:p-xl">
        <h3 className="text-[22px] font-bold leading-[28px] tracking-[-0.01em] text-text">
          Người mua
        </h3>
        <p className="mt-xs max-w-[52ch] text-body-lg text-muted">
          Tìm quán có giấy phép quanh bạn, đặt món trước và trả tiền online.
        </p>
        <Points
          items={['Bản đồ quán gần bạn', 'Đặt món, không chờ lâu', 'Đánh giá từ người thật']}
        />
        <div className="mt-auto pt-md">
          <Link to={GUEST_HOME_ROUTE} className={textLinkClass}>
            <Icon name="compass-outline" size={18} color="currentColor" />
            Xem quán có phép
          </Link>
        </div>
      </div>
    </article>
  );
}

function Door({
  className,
  art,
  title,
  body,
  points,
  link,
}: {
  className: string;
  art: ReactNode;
  title: string;
  body: string;
  points: string[];
  link: ReactNode;
}) {
  return (
    <article
      className={`flex flex-col rounded-[28px] p-md shadow-card ring-1 ring-border md:p-lg ${className}`}
    >
      {art}
      <h3 className="mt-md text-[22px] font-bold leading-[28px] tracking-[-0.01em] text-text">
        {title}
      </h3>
      <p className="mt-xs text-body-lg text-muted">{body}</p>
      <Points items={points} />
      <div className="mt-auto pt-md">{link}</div>
    </article>
  );
}

/** A free slot with its permit already waiting: what a vendor walks away with. */
function VendorArt() {
  return (
    <div aria-hidden="true" className="relative flex h-[112px] items-center gap-md">
      <div className="relative flex h-full w-[150px] shrink-0 items-end rounded-[14px] border-[2.5px] border-dashed border-brand bg-white/70 p-xs dark:bg-sunken">
        <span className="kerb-tag">Ô A-04</span>
        <span className="absolute right-xs top-xs text-[12px] font-semibold text-primary">
          Còn trống
        </span>
      </div>
      <div className="relative w-[124px] -rotate-3 overflow-hidden rounded-[12px] bg-card shadow-sheet ring-1 ring-border">
        <span className="sb-kerb sb-kerb-thin block" />
        <div className="flex items-center gap-xs p-xs">
          <span className="grid h-10 w-10 shrink-0 grid-cols-4 gap-[2px] rounded-[4px] bg-card p-[3px] ring-1 ring-border">
            {[1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1].map((on, i) => (
              <span key={i} className={on ? 'rounded-[1px] bg-text' : ''} />
            ))}
          </span>
          <span className="flex flex-col">
            <span className="text-[11px] font-bold leading-tight text-text">Giấy phép</span>
            <span className="text-[10px] font-semibold text-[#0B5D33] dark:text-[#8BE3B0]">
              Có hiệu lực
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

const INBOX: { code: string; label: string; tone: string; icon: IconName }[] = [
  {
    code: 'B-02',
    label: 'Chờ duyệt',
    tone: 'bg-[#FFF3D1] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]',
    icon: 'clock-outline',
  },
  {
    code: 'A-04',
    label: 'Đã cấp phép',
    tone: 'bg-[#E6F6EC] text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]',
    icon: 'check-circle',
  },
  {
    code: 'C-07',
    label: 'Vi phạm',
    tone: 'bg-[#FDEBEA] text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]',
    icon: 'alert-circle-outline',
  },
];

/** The ward's inbox: three files, three states, read at a glance. */
function WardArt() {
  return (
    <div
      aria-hidden="true"
      className="flex h-[112px] flex-col justify-center gap-1.5 rounded-[16px] bg-card p-xs shadow-card ring-1 ring-border"
    >
      {INBOX.map((row) => (
        <div key={row.code} className="flex items-center gap-xs rounded-[10px] px-1.5 py-[3px]">
          <span className="kerb-tag origin-left scale-90">Ô {row.code}</span>
          <span className="h-1.5 flex-1 rounded-full bg-sunken" />
          <span
            className={`inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[11px] font-bold ${row.tone}`}
          >
            <Icon name={row.icon} size={12} color="currentColor" />
            {row.label}
          </span>
        </div>
      ))}
    </div>
  );
}
