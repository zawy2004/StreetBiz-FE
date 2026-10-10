import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { BrandLogo, Icon, IconButton } from '@/components/common';
import { ThemeSwitchButton } from '@/components/layout';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { AuthPavement, type AuthScene } from './AuthPavement';
import { AuthSteps, type AuthProgress } from './AuthSteps';
import { usePaintIn } from './paint-in';

type Props = {
  title: string;
  /** Read out exactly as written; a node so a screen can set part of it as a plate (a phone number). */
  subtitle?: ReactNode;
  back?: boolean;
  /** Which small sign the pavement plan shows for this step. */
  scene?: AuthScene;
  progress?: AuthProgress;
  /** `wide` gives the longer sign-up form 480px instead of 440px. */
  width?: 'default' | 'wide';
  children: ReactNode;
};

const SCENE_LINE: Record<AuthScene, string> = {
  'sign-in': 'Quán có giấy phép, ô có số, phường duyệt online.',
  'register-customer': 'Tìm quán vỉa hè có giấy phép gần bạn, đặt món và trả tiền online.',
  'register-vendor': 'Nhận một ô vỉa hè có số, nộp hồ sơ online, phường duyệt và cấp QR.',
  verify: 'Mã được gửi tới số điện thoại bạn vừa nhập.',
  reset: 'Đặt lại mật khẩu qua mã gửi tới số đã đăng ký.',
};

const PANEL_WASH =
  'bg-[linear-gradient(165deg,#FFF3E8_0%,#FFF8F2_45%,#FFFFFF_100%)] dark:bg-none dark:bg-card';

/**
 * The front door shared by sign-in, sign-up, OTP and password reset. On a
 * desktop the street is on the left (a pavement plan whose stalls light up)
 * and a painted kerb runs down the threshold to the form; on phones and
 * tablets the street shrinks to a bright band above the form.
 */
export function AuthShell({
  title,
  subtitle,
  back,
  scene = 'sign-in',
  progress,
  width = 'default',
  children,
}: Props) {
  const navigate = useNavigate();
  const shown = usePaintIn();
  // Only the layout in use is rendered, so a phone never downloads the panel's photos.
  const isDesktop = useIsDesktop();

  const backOrHome = back ? (
    <IconButton icon="arrow-left" accessibilityLabel="Quay lại" onPress={() => navigate(-1)} />
  ) : (
    <Link
      to="/"
      className="inline-flex h-11 items-center gap-xs rounded-full px-sm text-label text-muted transition-colors hover:bg-sunken hover:text-text"
    >
      <Icon name="home-outline" size={18} color="currentColor" />
      Trang chủ
    </Link>
  );

  return (
    <div className="flex min-h-full flex-1 bg-card">
      {isDesktop ? (
        <aside
          className={`relative hidden w-[46%] max-w-[680px] shrink-0 flex-col justify-between gap-xl self-start overflow-hidden py-2xl pl-2xl pr-[72px] lg:sticky lg:top-0 lg:flex lg:h-screen ${PANEL_WASH}`}
        >
          <Link to="/" className="flex w-fit items-center gap-sm rounded-[12px]">
            <BrandLogo size={32} />
            <span className="font-sign text-[22px] font-bold tracking-[-0.01em] text-text [font-stretch:108%]">
              StreetBiz
            </span>
          </Link>

          <div>
            <p className="font-editorial text-[40px] font-semibold leading-[44px] tracking-[-0.02em] text-text [font-variation-settings:'opsz'_72] xl:text-[48px] xl:leading-[52px]">
              <span className="block">Vỉa hè có trật tự,</span>
              <span className="block">quán có khách.</span>
            </p>
            <p
              key={scene}
              className="sb-rise mt-md max-w-[42ch] text-body-lg text-muted"
              style={{ animationDuration: '200ms' }}
            >
              {SCENE_LINE[scene]}
            </p>
          </div>

          <AuthPavement scene={scene} />

          {/* The threshold: a kerb painted down the edge, running in from the top once. */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 right-0 w-[10px] origin-top"
            style={{
              background:
                'repeating-linear-gradient(180deg, rgb(var(--c-kerb)) 0 28px, rgb(var(--c-kerb-paint)) 28px 56px)',
              boxShadow: 'inset 3px 0 0 rgb(0 0 0 / 0.1)',
              transform: shown ? 'scaleY(1)' : 'scaleY(0)',
              transition: 'transform 600ms var(--ease-out)',
            }}
          />
        </aside>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col bg-card">
        {isDesktop ? (
          <div className="hidden items-center justify-between px-lg py-md lg:flex">
            {backOrHome}
            <ThemeSwitchButton />
          </div>
        ) : (
          <AuthBand scene={scene} backOrHome={backOrHome} />
        )}

        <div
          className={`mx-auto flex w-full flex-1 flex-col px-md pb-[136px] pt-lg md:px-0 md:pt-xl lg:justify-center lg:pb-[112px] lg:pt-2xl ${width === 'wide' ? 'max-w-[480px] md:max-w-[480px]' : 'max-w-[440px]'}`}
        >
          {progress ? <AuthSteps {...progress} /> : null}
          <h1 className="font-sign text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-text md:text-[32px] md:leading-[38px]">
            {title}
          </h1>
          {subtitle ? <p className="mt-xs text-body-lg text-muted">{subtitle}</p> : null}
          <div className="mt-lg flex flex-col gap-md">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Phones and tablets: the street as a bright band over the form, the kerb along its foot. */
function AuthBand({ scene, backOrHome }: { scene: AuthScene; backOrHome: ReactNode }) {
  return (
    <div className={`relative lg:hidden ${PANEL_WASH}`}>
      <div className="flex h-[132px] flex-col justify-between px-sm pb-sm pt-xs md:h-[168px] md:px-lg md:pb-md md:pt-sm">
        <div className="flex items-center justify-between">
          {backOrHome}
          <ThemeSwitchButton />
        </div>
        <div className="flex items-end justify-between gap-sm">
          <Link
            to="/"
            aria-label="Trang chủ StreetBiz"
            className="mb-1 flex min-w-0 items-center gap-xs rounded-[12px]"
          >
            <BrandLogo size={32} />
            <span className="font-sign text-[20px] font-bold tracking-[-0.01em] text-text [font-stretch:108%] max-[359px]:hidden md:text-[22px]">
              StreetBiz
            </span>
          </Link>
          <AuthPavement scene={scene} variant="band" />
        </div>
      </div>
      <span
        aria-hidden="true"
        className="block h-2"
        style={{
          background:
            'repeating-linear-gradient(90deg, rgb(var(--c-kerb)) 0 28px, rgb(var(--c-kerb-paint)) 28px 56px)',
          boxShadow: 'inset 0 -2px 0 rgb(0 0 0 / 0.12)',
        }}
      />
    </div>
  );
}
