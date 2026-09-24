import type { CSSProperties, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MdOutlineStorefront, MdOutlineVerified } from 'react-icons/md';

import { BrandLogo, IconButton } from '@/components/common';
import { DotMatrixField } from '@/components/effects';
import { ThemeSwitchButton } from '@/components/layout';

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  children: ReactNode;
};

/** A stretch of pavement drawn as painted slots; some taken, some free and waiting. */
const PAVEMENT: { code: string; taken: boolean }[] = [
  { code: 'A-01', taken: true },
  { code: 'A-02', taken: true },
  { code: 'A-03', taken: false },
  { code: 'A-04', taken: true },
  { code: 'B-01', taken: false },
  { code: 'B-02', taken: true },
  { code: 'B-03', taken: true },
  { code: 'B-04', taken: false },
];

const POINTS = [
  'Quán có giấy phép, xem trên bản đồ',
  'Thuê ô, nộp hồ sơ online',
  'Phường duyệt và cấp QR',
];

export function AuthShell({ title, subtitle, back, children }: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-full flex-1 bg-bg">
      <aside className="relative hidden w-[46%] max-w-[680px] flex-col justify-between overflow-hidden bg-[#0E1013] p-2xl text-white lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgb(228_68_31/0.35),transparent_65%)] blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -right-32 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgb(245_160_0/0.22),transparent_65%)] blur-2xl"
        />
        <DotMatrixField cellSize={26} opacity={0.5} />

        <Link to="/" className="relative flex w-fit items-center gap-sm">
          <span className="rounded-md bg-white p-1.5 shadow-[0_0_24px_rgb(228_68_31/0.35)]">
            <BrandLogo size={28} />
          </span>
          <span className="text-headline-lg text-white">StreetBiz</span>
        </Link>

        <div className="relative">
          <p className="sb-rise max-w-[15ch] text-[40px] font-extrabold leading-[1.1] tracking-[-0.03em]">
            Vỉa hè có trật tự, <span className="sb-gradient-text">quán có khách.</span>
          </p>
          <ul className="mt-lg flex flex-col gap-sm">
            {POINTS.map((point, index) => (
              <li
                key={point}
                className="sb-rise flex items-center gap-sm text-body-lg text-white/80"
                style={{ '--delay': `${150 + index * 90}ms` } as CSSProperties}
              >
                <MdOutlineVerified
                  className="shrink-0 text-[20px] text-[#FFB547]"
                  aria-hidden="true"
                />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div
          aria-hidden="true"
          className="relative rounded-lg border border-white/10 bg-[#15181C]/90 p-md backdrop-blur-md"
        >
          <div className="mb-sm flex items-center justify-between text-body-sm text-white/60">
            <span>Tuyến phố mẫu</span>
            <span className="flex items-center gap-md">
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-[#E4441F]" /> Đang bán
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full border border-[#FFB547]" /> Còn trống
              </span>
            </span>
          </div>
          <div className="grid grid-cols-4 gap-sm">
            {PAVEMENT.map((slot, index) =>
              slot.taken ? (
                <div
                  key={slot.code}
                  className="flex h-16 flex-col justify-between rounded-sm border border-[#E4441F]/50 bg-[linear-gradient(160deg,rgb(228_68_31/0.35),rgb(228_68_31/0.12))] p-xs"
                >
                  <MdOutlineStorefront className="text-[18px] text-white/90" />
                  <span className="text-body-xs font-bold text-white/90">Ô {slot.code}</span>
                </div>
              ) : (
                <div
                  key={slot.code}
                  className="sb-slot-free flex h-16 items-end rounded-sm border-2 border-dashed p-xs text-body-xs font-bold text-white/60"
                  style={{ '--delay': `${index * 350}ms` } as CSSProperties}
                >
                  Ô {slot.code}
                </div>
              ),
            )}
          </div>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgb(var(--c-primary)/0.08),transparent)]"
        />
        <div className="relative flex items-center justify-between p-md">
          {back ? (
            <IconButton
              icon="arrow-left"
              accessibilityLabel="Quay lại"
              onPress={() => navigate(-1)}
            />
          ) : (
            <Link to="/" className="text-label text-muted hover:text-text">
              ← Trang chủ
            </Link>
          )}
          <ThemeSwitchButton />
        </div>
        <div className="relative mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-lg pb-2xl">
          <div className="sb-rise mb-lg flex flex-col items-center text-center lg:items-start lg:text-left">
            <Link to="/" className="lg:hidden" aria-label="Trang chủ StreetBiz">
              <BrandLogo size={48} />
            </Link>
            <h1 className="mt-sm text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em] text-text lg:mt-0">
              {title}
            </h1>
            {subtitle ? <p className="mt-1.5 text-body-lg text-muted">{subtitle}</p> : null}
          </div>
          <div
            className="sb-rise flex flex-col gap-md"
            style={{ '--delay': '120ms' } as CSSProperties}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
