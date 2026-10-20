import type { ReactNode } from 'react';

import { Icon } from '@/components/common';

const KERB_ACROSS =
  'repeating-linear-gradient(90deg, rgb(var(--c-kerb)) 0 44px, rgb(var(--c-kerb-paint)) 44px 88px)';
const KERB_DOWN =
  'repeating-linear-gradient(180deg, rgb(var(--c-kerb)) 0 28px, rgb(var(--c-kerb-paint)) 28px 56px)';

const STEPS: { title: string; body: string; art: ReactNode }[] = [
  {
    title: 'Tạo tài khoản',
    body: 'Đăng ký bằng số điện thoại, xác minh bằng mã OTP.',
    art: <OtpArt />,
  },
  {
    title: 'Chọn ô, nộp hồ sơ',
    body: 'Chọn ô trống trên bản đồ, gửi CCCD và ảnh quầy hàng.',
    art: <GridArt />,
  },
  {
    title: 'Nhận QR, lên phố',
    body: 'Phường duyệt xong, giấy phép QR dán ngay tại quầy.',
    art: <PermitArt />,
  },
];

/**
 * Three steps really are a sequence, so they are numbered: three round posts
 * standing on a painted kerb, each with a small picture of its job. The kerb
 * runs across on wide screens and down the left edge on narrower ones.
 */
export function KerbSteps() {
  return (
    <section
      id="cach-hoat-dong"
      aria-labelledby="cach-hoat-dong-title"
      className="scroll-mt-[88px] bg-[#FFF3E8] dark:bg-sunken"
    >
      <div className="mx-auto max-w-[1304px] px-md py-2xl md:px-lg md:py-[72px] xl:px-xl xl:py-[96px]">
        <div className="max-w-[640px]">
          <h2
            id="cach-hoat-dong-title"
            className="font-editorial text-[32px] font-semibold leading-[38px] tracking-[-0.02em] text-text [font-variation-settings:'opsz'_60] md:text-[40px] md:leading-[46px] xl:text-[44px] xl:leading-[52px]"
          >
            Ba bước để lên phố
          </h2>
          <p className="mt-sm text-body-lg text-muted">
            Từ lúc đăng ký đến khi dán giấy phép tại quầy, mọi thứ đều online.
          </p>
        </div>

        <div className="relative mt-xl">
          {/* The kerb the posts stand on. */}
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-[23px] top-0 w-[10px] rounded-full lg:hidden"
            style={{ background: KERB_DOWN, boxShadow: 'inset -2px 0 0 rgb(0 0 0 / 0.1)' }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-[23px] hidden h-[10px] rounded-full lg:block"
            style={{ background: KERB_ACROSS, boxShadow: 'inset 0 -3px 0 rgb(0 0 0 / 0.12)' }}
          />
          <ol className="relative grid gap-xl lg:grid-cols-3 lg:gap-lg">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-md lg:grid-cols-1"
              >
                <span
                  aria-hidden="true"
                  className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-card font-sign text-[24px] font-bold text-primary shadow-[0_0_0_4px_rgb(var(--c-brand)),0_10px_22px_-10px_rgb(207_74_11/0.6)]"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 lg:mt-md">
                  <h3 className="text-[20px] font-bold leading-[26px] text-text">{step.title}</h3>
                  <p className="mt-xs max-w-[36ch] text-body-lg text-muted">{step.body}</p>
                  <div className="mt-md">{step.art}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function ArtCard({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-[104px] max-w-[320px] items-center justify-center rounded-[18px] bg-card px-md shadow-card ring-1 ring-[#F0D9C9] dark:ring-border"
    >
      {children}
    </div>
  );
}

function OtpArt() {
  return (
    <ArtCard>
      <span className="flex gap-1.5">
        {['4', '8', '1', '', '', ''].map((digit, i) => (
          <span
            key={i}
            className={`relative flex h-11 w-8 items-center justify-center rounded-[7px] font-sign text-[20px] font-semibold text-text ${digit ? 'bg-card ring-1 ring-border' : 'border-2 border-dashed border-brand/55 bg-[#FFF8F2] dark:bg-sunken'}`}
          >
            {digit}
            {digit ? (
              <span className="absolute inset-x-1 bottom-[3px] h-[3px] rounded-full bg-brand" />
            ) : null}
          </span>
        ))}
      </span>
    </ArtCard>
  );
}

function GridArt() {
  return (
    <ArtCard>
      <span className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) =>
          i === 4 ? (
            <span
              key={i}
              className="flex h-9 w-14 items-center justify-center rounded-[7px] bg-brand/15 text-primary ring-2 ring-brand"
            >
              <Icon name="map-marker" size={18} color="currentColor" />
            </span>
          ) : (
            <span
              key={i}
              className={`h-9 w-14 rounded-[7px] ${i === 1 ? 'border-2 border-dashed border-brand/50' : 'bg-sunken ring-1 ring-border'}`}
            />
          ),
        )}
      </span>
    </ArtCard>
  );
}

function PermitArt() {
  return (
    <ArtCard>
      <span className="w-[176px] -rotate-2 overflow-hidden rounded-[12px] bg-card shadow-sheet ring-1 ring-border">
        <span className="sb-kerb sb-kerb-thin block" />
        <span className="flex items-center gap-xs p-xs">
          <span className="grid h-11 w-11 shrink-0 grid-cols-4 gap-[2px] rounded-[4px] p-[3px] ring-1 ring-border">
            {[1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1].map((on, i) => (
              <span key={i} className={on ? 'rounded-[1px] bg-text' : ''} />
            ))}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="kerb-tag w-fit origin-left scale-[0.8]">Ô A-04</span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-[#0B5D33] dark:text-[#8BE3B0]">
              <Icon name="check-circle" size={12} color="currentColor" />
              Có hiệu lực
            </span>
          </span>
        </span>
      </span>
    </ArtCard>
  );
}
