import { lazy, Suspense, useCallback, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { IconType } from 'react-icons';
import {
  MdArrowForward,
  MdCheck,
  MdOutlineAccountBalance,
  MdOutlineFaceRetouchingNatural,
  MdOutlinePayments,
  MdOutlineQrCode2,
  MdOutlineRestaurant,
  MdOutlineStorefront,
  MdOutlineVerified,
} from 'react-icons/md';

import { BrandLogo } from '@/components/common';
import { DotMatrixField, GlowLink, SpotlightCard, useReveal } from '@/components/effects';
import { ThemeSwitchButton } from '@/components/layout';
import { GUEST_HOME_ROUTE } from '@/core/auth/role-routes';

const StreetScene3D = lazy(() => import('@/components/effects/street-scene/StreetScene3D'));

const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

function hasWebGL() {
  if (typeof window === 'undefined' || typeof WebGLRenderingContext === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

const NAV = [
  { href: '#vai-tro', label: 'Vai trò' },
  { href: '#cach-hoat-dong', label: 'Cách hoạt động' },
  { href: '#cho-phuong', label: 'Cho phường' },
];

const TRUST: { icon: IconType; label: string }[] = [
  { icon: MdOutlineQrCode2, label: 'Giấy phép QR' },
  { icon: MdOutlineFaceRetouchingNatural, label: 'Xác minh CCCD' },
  { icon: MdOutlinePayments, label: 'MoMo · ZaloPay' },
];

const ROLES: {
  id?: string;
  icon: IconType;
  title: string;
  body: string;
  points: string[];
  tone: string;
}[] = [
  {
    icon: MdOutlineRestaurant,
    title: 'Người mua',
    body: 'Tìm quán có giấy phép quanh bạn, đặt món trước và trả tiền online.',
    points: ['Bản đồ quán gần bạn', 'Đặt món, không chờ lâu', 'Đánh giá từ người thật'],
    tone: 'bg-tint-primary text-primary',
  },
  {
    icon: MdOutlineStorefront,
    title: 'Hộ kinh doanh',
    body: 'Thuê ô vỉa hè hợp lệ, mở gian hàng online và nhận đơn ngay tại quầy.',
    points: [
      'Chọn ô trống trên bản đồ',
      'Nộp hồ sơ không cần lên phường',
      'Nhận đơn theo thời gian thực',
    ],
    tone: 'bg-tint-secondary text-on-secondary',
  },
  {
    id: 'cho-phuong',
    icon: MdOutlineAccountBalance,
    title: 'Cán bộ phường',
    body: 'Duyệt hồ sơ, cấp giấy phép số và theo dõi vỉa hè trên một bảng.',
    points: ['Hộp duyệt hồ sơ tập trung', 'Giấy phép QR khó làm giả', 'Ghi nhận và xử lý vi phạm'],
    tone: 'bg-tint-tertiary text-tertiary',
  },
];

const STEPS = [
  { title: 'Tạo tài khoản', body: 'Đăng ký bằng số điện thoại, xác minh bằng mã OTP.' },
  { title: 'Chọn ô, nộp hồ sơ', body: 'Chọn ô trống trên bản đồ, gửi CCCD và ảnh quầy hàng.' },
  { title: 'Nhận QR, lên phố', body: 'Phường duyệt xong, giấy phép QR dán ngay tại quầy.' },
];

/** Public front door for guests at `/`. Signed-in users are redirected to their role home. */
export function LandingScreen() {
  const revealRef = useReveal<HTMLDivElement>();

  return (
    <div ref={revealRef} className="min-h-full bg-bg">
      <Header />
      <Hero />

      <section id="vai-tro" className="scroll-mt-20 px-lg py-[88px] md:py-[112px]">
        <div className="mx-auto max-w-[1160px]">
          <SectionHeading
            eyebrow="Vai trò"
            title="Một nền tảng, ba vai trò"
            body="Mỗi người thấy đúng việc của mình, dữ liệu dùng chung một nơi."
          />
          <div className="mt-2xl grid gap-md md:grid-cols-3">
            {ROLES.map((role, index) => (
              <div
                key={role.title}
                id={role.id}
                className="sb-reveal scroll-mt-24"
                style={delay(index * 110)}
              >
                <SpotlightCard className="flex h-full flex-col rounded-lg p-lg">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-md ${role.tone}`}
                  >
                    <role.icon className="text-[26px]" aria-hidden="true" />
                  </span>
                  <h3 className="mt-md text-[20px] font-bold tracking-[-0.01em] text-text">
                    {role.title}
                  </h3>
                  <p className="mt-xs text-body-md text-muted">{role.body}</p>
                  <ul className="mt-md flex flex-col gap-xs border-t border-border pt-md">
                    {role.points.map((point) => (
                      <li key={point} className="flex items-center gap-xs text-body-md text-text">
                        <MdCheck
                          className="shrink-0 text-[18px] text-tertiary"
                          aria-hidden="true"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                </SpotlightCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="cach-hoat-dong"
        className="sb-dot-grid relative scroll-mt-16 overflow-hidden bg-[#0E1013] px-lg py-[88px] text-white md:py-[112px]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(228_68_31/0.22),transparent)] blur-2xl"
        />
        <div className="relative mx-auto max-w-[1160px]">
          <SectionHeading
            dark
            eyebrow="Cách hoạt động"
            title="Ba bước để lên phố"
            body="Từ lúc đăng ký đến khi dán giấy phép tại quầy, mọi thứ đều online."
          />
          <div className="relative mt-2xl">
            <div
              aria-hidden="true"
              className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-transparent via-[#E4441F]/60 to-transparent md:block"
            />
            <ol className="relative grid gap-lg md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="sb-reveal relative flex flex-col items-center text-center"
                  style={delay(index * 140)}
                >
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-[#16191D] text-[20px] font-extrabold shadow-[0_0_0_6px_#0E1013,0_0_30px_rgb(228_68_31/0.35)]">
                    <span className="sb-gradient-text">{index + 1}</span>
                  </span>
                  <h3 className="mt-md text-[19px] font-bold">{step.title}</h3>
                  <p className="mt-xs max-w-[30ch] text-body-md text-white/65">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="px-lg py-[88px] md:py-[112px]">
        <div className="sb-reveal relative mx-auto max-w-[1160px] overflow-hidden rounded-[28px] bg-[#0E1013] px-lg py-[72px] text-center text-white md:px-2xl">
          <DotMatrixField cellSize={22} opacity={0.4} />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 left-1/2 h-[380px] w-[680px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(228_68_31/0.4),transparent)] blur-2xl"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-[18ch] text-[clamp(30px,4.4vw,48px)] font-extrabold leading-[1.1] tracking-[-0.03em]">
              Sẵn sàng <span className="sb-gradient-text">lên phố</span> cùng StreetBiz?
            </h2>
            <p className="mx-auto mt-md max-w-[46ch] text-body-lg text-white/70">
              Tạo tài khoản miễn phí trong một phút. Hộ kinh doanh chọn vai trò bán hàng khi đăng
              ký.
            </p>
            <div className="mt-xl flex flex-wrap items-center justify-center gap-sm">
              <GlowLink to="/auth/register" size="lg">
                Tạo tài khoản
              </GlowLink>
              <GlowLink to="/auth/sign-in" variant="glass" size="lg">
                Đăng nhập
              </GlowLink>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-lg py-lg">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-md text-body-sm text-muted">
          <span className="flex items-center gap-xs">
            <BrandLogo size={22} />
            <span className="font-semibold text-text">StreetBiz</span>
            <span>· Vỉa hè có trật tự, quán có khách.</span>
          </span>
          <span>© {new Date().getFullYear()} StreetBiz</span>
        </div>
      </footer>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0E1013]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1160px] items-center justify-between gap-md px-lg">
        <Link to="/" className="flex items-center gap-sm">
          <span className="rounded-[10px] bg-white p-1">
            <BrandLogo size={26} />
          </span>
          <span className="text-headline-lg text-white">StreetBiz</span>
        </Link>
        <nav aria-label="Trang chủ" className="hidden items-center gap-xs md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-md py-xs text-label text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-xs">
          <span className="hidden sm:block">
            <ThemeSwitchButton onDark />
          </span>
          <Link
            to="/auth/sign-in"
            className="rounded-full px-md py-xs text-label font-semibold text-white/85 hover:text-white"
          >
            Đăng nhập
          </Link>
          <GlowLink to="/auth/register" className="hidden sm:inline-flex">
            Đăng ký
          </GlowLink>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  // three.js is fetched only when this browser can actually draw it.
  const [scene3d, setScene3d] = useState(hasWebGL);
  const fallBack = useCallback(() => setScene3d(false), []);

  return (
    <section className="relative -mt-16 flex min-h-[100svh] items-center overflow-hidden bg-[#0E1013] px-lg pb-[96px] pt-[136px] text-white md:pt-[150px]">
      {scene3d ? (
        <Suspense fallback={null}>
          <StreetScene3D onUnsupported={fallBack} />
        </Suspense>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-48 -top-24 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgb(228_68_31/0.32),transparent_62%)] blur-2xl"
          />
          <DotMatrixField />
        </>
      )}

      {/* Keeps the headline readable over the lit street. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#0E1013]/55 lg:bg-transparent lg:bg-[linear-gradient(90deg,#0E1013_0%,rgb(14_16_19/0.88)_32%,rgb(14_16_19/0.25)_58%,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0E1013] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[#0E1013]"
      />

      <div
        className={`relative mx-auto grid w-full max-w-[1160px] items-center gap-2xl ${scene3d ? '' : 'lg:grid-cols-[1.1fr_0.9fr]'}`}
      >
        <div className="max-w-[600px]">
          <span className="sb-rise inline-flex items-center gap-xs rounded-full border border-white/10 bg-white/[0.05] py-1.5 pl-2 pr-3 text-label text-white/80 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FFB547] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FFB547]" />
            </span>
            Nền tảng quản lý vỉa hè số
          </span>

          <h1
            className="sb-rise mt-lg text-[clamp(40px,6.2vw,72px)] font-extrabold leading-[1.04] tracking-[-0.04em]"
            style={delay(80)}
          >
            Vỉa hè có trật tự,
            <br />
            <span className="sb-gradient-text">quán có khách.</span>
          </h1>

          <p
            className="sb-rise mt-lg max-w-[50ch] text-[17px] leading-[1.65] text-white/70"
            style={delay(160)}
          >
            Người mua tìm quán có giấy phép. Hộ kinh doanh thuê ô đúng chỗ. Phường duyệt hồ sơ, tất
            cả trên cùng một nơi.
          </p>

          <div className="sb-rise mt-xl flex flex-wrap items-center gap-sm" style={delay(240)}>
            <GlowLink to={GUEST_HOME_ROUTE} size="lg">
              Tìm quán quanh đây
            </GlowLink>
            <GlowLink to="/auth/register" state={{ role: 'VENDOR' }} variant="glass" size="lg">
              Đăng ký bán hàng
              <MdArrowForward aria-hidden="true" className="text-[18px]" />
            </GlowLink>
          </div>

          <ul className="sb-rise mt-xl flex flex-wrap gap-x-lg gap-y-xs" style={delay(320)}>
            {TRUST.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5 text-body-md text-white/55">
                <item.icon aria-hidden="true" className="text-[18px] text-white/70" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        {scene3d ? null : <StreetPreview />}
      </div>

      {scene3d ? <HeroBadges /> : null}

      <a
        href="#vai-tro"
        aria-label="Cuộn xuống"
        className="absolute bottom-lg left-1/2 hidden -translate-x-1/2 flex-col items-center gap-xs text-body-xs text-white/45 hover:text-white/80 md:flex"
      >
        <span className="flex h-9 w-6 justify-center rounded-full border border-white/25 pt-1.5">
          <span className="sb-scroll-dot h-2 w-1 rounded-full bg-white/70" />
        </span>
        Khám phá
      </a>
    </section>
  );
}

/** Glass labels floating over the 3D street; they name what the scene shows. */
function HeroBadges() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
      <div className="mx-auto h-full max-w-[1160px] px-lg">
        <div className="relative h-full">
          <div
            className="sb-rise sb-float absolute right-[4%] top-[24%] flex items-center gap-xs rounded-full border border-white/10 bg-[#16191D]/80 py-1.5 pl-1.5 pr-3 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.9)] backdrop-blur-md"
            style={delay(900)}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B8A4B] text-white">
              <MdCheck className="text-[17px]" />
            </span>
            <span className="text-label text-white/90">Phường đã duyệt hồ sơ</span>
          </div>

          <div
            className="sb-rise sb-float absolute bottom-[9%] right-0 w-[240px] rounded-lg border border-white/10 bg-[#16191D]/80 p-sm shadow-[0_24px_50px_-20px_rgb(0_0_0/0.9)] backdrop-blur-md"
            style={delay(1100)}
          >
            <div className="flex items-center gap-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[linear-gradient(140deg,#E4441F,#F5A000)] text-white">
                <MdOutlineRestaurant className="text-[22px]" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-headline-sm text-white">Bánh mì Cô Ba</p>
                <p className="text-body-xs text-white/55">Ô A-04 · mở đến 21:00</p>
              </div>
            </div>
            <div className="mt-sm flex items-center justify-between rounded-sm bg-white/[0.05] px-xs py-1.5">
              <span className="flex items-center gap-1 text-badge text-[#5FE0A0]">
                <MdOutlineVerified className="text-[15px]" /> Có giấy phép
              </span>
              <MdOutlineQrCode2 className="text-[20px] text-white/80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Illustration of one block: a road, a pavement of slots, and a licensed stall's card. */
function StreetPreview() {
  const slots = ['taken', 'taken', 'free', 'taken', 'free', 'taken'] as const;

  return (
    <div
      aria-hidden="true"
      className="sb-rise relative mx-auto w-full max-w-[480px] lg:mr-0"
      style={delay(200)}
    >
      <div className="rounded-[24px] border border-white/10 bg-[#15181C]/90 p-md shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)] backdrop-blur-xl">
        <div className="mb-sm flex items-center justify-between">
          <span className="text-body-sm font-semibold text-white/80">Tuyến phố mẫu</span>
          <span className="rounded-full bg-[#0B8A4B]/20 px-2 py-0.5 text-badge text-[#5FE0A0]">
            2 ô trống
          </span>
        </div>

        <div className="grid grid-cols-3 gap-xs">
          {slots.map((state, index) =>
            state === 'taken' ? (
              <div
                key={index}
                className="flex h-[72px] flex-col justify-between rounded-md border border-[#E4441F]/45 bg-[linear-gradient(160deg,rgb(228_68_31/0.32),rgb(228_68_31/0.08))] p-xs"
              >
                <MdOutlineStorefront className="text-[18px] text-white/90" />
                <span className="text-body-xs font-bold text-white/85">Ô A-0{index + 1}</span>
              </div>
            ) : (
              <div
                key={index}
                className="sb-slot-free flex h-[72px] items-end rounded-md border-2 border-dashed p-xs text-body-xs font-bold text-white/55"
                style={delay(index * 500)}
              >
                Ô A-0{index + 1}
              </div>
            ),
          )}
        </div>

        <div className="relative mt-sm h-14 overflow-hidden rounded-md bg-[#1A1D22]">
          <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.35)_0_18px,transparent_18px_34px)]" />
        </div>
      </div>

      <div
        className="sb-float absolute -bottom-10 -left-4 w-[230px] rounded-lg border border-white/10 bg-[#16191D]/95 p-sm shadow-[0_24px_50px_-20px_rgb(0_0_0/0.9)] backdrop-blur sm:-left-10"
        style={delay(0)}
      >
        <div className="flex items-center gap-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[linear-gradient(140deg,#E4441F,#F5A000)] text-white">
            <MdOutlineRestaurant className="text-[22px]" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-headline-sm text-white">Bánh mì Cô Ba</p>
            <p className="text-body-xs text-white/55">Ô A-02 · mở đến 21:00</p>
          </div>
        </div>
        <div className="mt-sm flex items-center justify-between rounded-sm bg-white/[0.05] px-xs py-1.5">
          <span className="flex items-center gap-1 text-badge text-[#5FE0A0]">
            <MdOutlineVerified className="text-[15px]" /> Có giấy phép
          </span>
          <MdOutlineQrCode2 className="text-[20px] text-white/80" />
        </div>
      </div>

      <div
        className="sb-float absolute -right-2 -top-6 flex items-center gap-xs rounded-full border border-white/10 bg-[#16191D]/95 py-1.5 pl-1.5 pr-3 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.9)] backdrop-blur sm:-right-6"
        style={delay(1800)}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B8A4B] text-white">
          <MdCheck className="text-[17px]" />
        </span>
        <span className="text-label text-white/90">Phường đã duyệt hồ sơ</span>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  dark,
}: {
  eyebrow: string;
  title: string;
  body: string;
  dark?: boolean;
}) {
  return (
    <div className="sb-reveal mx-auto max-w-[640px] text-center">
      <span
        className={`text-label font-semibold uppercase tracking-[0.14em] ${dark ? 'text-[#FFB547]' : 'text-primary'}`}
      >
        {eyebrow}
      </span>
      <h2
        className={`mt-sm text-[clamp(28px,3.6vw,42px)] font-extrabold leading-[1.12] tracking-[-0.03em] ${dark ? 'text-white' : 'text-text'}`}
      >
        {title}
      </h2>
      <p className={`mt-sm text-body-lg ${dark ? 'text-white/65' : 'text-muted'}`}>{body}</p>
    </div>
  );
}
