import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { Icon, type IconName } from '@/components/common';
import { GUEST_HOME_ROUTE } from '@/core/auth/role-routes';
import { AuthPavement } from '@/features/authentication/components/AuthPavement';
import {
  motionDelay,
  prefersReducedMotion,
  usePaintIn,
} from '@/features/authentication/components/paint-in';
import { ctaClass } from './link-styles';

const street = (w: number) => `${import.meta.env.BASE_URL}images/hero/hanoi-street-${w}.webp`;

const TRUST: { icon: IconName; label: string }[] = [
  { icon: 'qrcode', label: 'Giấy phép QR' },
  { icon: 'shield-check-outline', label: 'Xác minh CCCD' },
  { icon: 'wallet-outline', label: 'Thanh toán MoMo, ZaloPay' },
];

/**
 * "Painting order onto a real street": the owner's photo of a busy Hanoi
 * pavement as it is, with StreetBiz painting a kerb line and numbered slots
 * over it. One frame says the product's name: diners at their stalls, a free
 * slot waiting for a vendor, and the ward's order underneath.
 */
export function StreetHero() {
  return (
    <section aria-labelledby="landing-title" className="relative bg-card">
      <div className="mx-auto grid max-w-[1304px] gap-xl px-md pb-xl pt-lg md:px-lg md:pb-2xl md:pt-xl lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-[40px] lg:px-xl lg:pb-2xl lg:pt-2xl xl:grid-cols-[minmax(0,1fr)_600px] xl:gap-2xl min-[1400px]:grid-cols-[minmax(0,1fr)_640px] min-[1400px]:gap-[40px]">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-xs rounded-full bg-tint-tertiary py-1 pl-2 pr-sm text-label text-[#0B5D33] dark:text-[#8BE3B0]">
            <span aria-hidden="true" className="relative flex h-2 w-2">
              <span className="sb-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-tertiary" />
            </span>
            Nền tảng quản lý vỉa hè số
          </p>

          {/* Two set lines (not a ch-based width): the break stays put when Newsreader arrives. */}
          <h1
            id="landing-title"
            className="mt-md font-editorial text-[36px] font-semibold leading-[40px] tracking-[-0.025em] text-text [font-variation-settings:'opsz'_72] min-[360px]:text-[40px] min-[360px]:leading-[44px] md:text-[52px] md:leading-[56px] lg:text-[60px] lg:leading-[64px] xl:text-[64px] xl:leading-[68px] min-[1400px]:text-[72px] min-[1400px]:leading-[76px]"
          >
            <span className="block">Vỉa hè có trật tự,</span>
            <span className="block">quán có khách.</span>
          </h1>

          <p className="mt-md max-w-[50ch] text-[16px] leading-[26px] text-muted md:text-[17px] md:leading-[28px]">
            Người mua tìm quán có giấy phép. Hộ kinh doanh thuê ô đúng chỗ. Phường duyệt hồ sơ, tất
            cả trên cùng một nơi.
          </p>

          <div className="mt-lg flex flex-col gap-sm sm:flex-row sm:flex-wrap">
            <Link to={GUEST_HOME_ROUTE} className={ctaClass('primary', 'lg')}>
              Tìm quán quanh đây
            </Link>
            <Link
              to="/auth/register"
              state={{ role: 'VENDOR' }}
              className={ctaClass('outline', 'lg')}
            >
              <Icon name="storefront-outline" size={20} color="currentColor" />
              Đăng ký bán hàng
            </Link>
          </div>

          <ul className="mt-lg flex flex-wrap gap-x-lg gap-y-xs">
            {TRUST.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5 text-[15px] text-text">
                <span className="text-tertiary">
                  <Icon name={item.icon} size={19} color="currentColor" weight="fill" />
                </span>
                {item.label}
              </li>
            ))}
          </ul>

          <a
            href="#vai-tro"
            aria-label="Cuộn xuống"
            className="mt-xl hidden min-h-11 items-center gap-xs rounded-full text-label text-muted transition-colors hover:text-text md:inline-flex"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-border">
              <Icon name="chevron-down" size={16} color="currentColor" />
            </span>
            Khám phá
          </a>
        </div>

        <StreetFrame />
      </div>
    </section>
  );
}

/** The photo frame: shimmer until the photo is in, then the paint goes on once. */
function StreetFrame() {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const painted = usePaintIn(loaded);
  const reduced = prefersReducedMotion();

  // A cached photo can finish before React attaches onLoad.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <figure className="relative isolate aspect-[8/7] w-full overflow-hidden rounded-[28px] bg-sunken shadow-sheet ring-1 ring-border/70 md:aspect-[4/3] md:rounded-[36px] lg:aspect-auto lg:h-[440px] xl:h-[540px] min-[1400px]:h-[560px]">
      {failed ? (
        <div className="absolute inset-0 flex items-center bg-[#FFF3E8] p-md dark:bg-sunken">
          <AuthPavement scene="sign-in" className="w-full" />
        </div>
      ) : (
        <>
          {!loaded ? <span aria-hidden="true" className="sb-shimmer absolute inset-0" /> : null}
          <img
            ref={imgRef}
            src={street(1440)}
            srcSet={`${street(960)} 960w, ${street(1440)} 1440w, ${street(1672)} 1672w`}
            sizes="(min-width: 1024px) 640px, 100vw"
            width={1672}
            height={941}
            alt=""
            fetchPriority="high"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <PaintedSlots painted={painted} reduced={reduced} />
          <LicenseCard shown={painted} reduced={reduced} />
          <figcaption className="absolute left-sm top-sm rounded-full bg-white/85 px-2.5 py-1 text-[12px] font-medium text-[#2B3640] backdrop-blur">
            Ảnh minh họa
          </figcaption>
        </>
      )}
    </figure>
  );
}

/* ------------------------------------------------------------------------- *
 * The paint, in the photo's own coordinates (1672 × 941). The SVG is cut to
 * the frame exactly like the photo (`slice` + centre = `object-cover` +
 * centre), so the lines stay on the kerb and the strip beside it at every
 * frame shape. Labels stay inside x 1000–1300, which every frame shows.
 * ------------------------------------------------------------------------- */

/** Kerb top surface: left edge and right edge, from the foot of the photo up the street. */
const KERB_LEFT: [number, number, number, number] = [1016, 941, 1122, 540];
const KERB_RIGHT: [number, number, number, number] = [1074, 941, 1143, 540];

function lerp(line: [number, number, number, number], t: number): [number, number] {
  return [line[0] + (line[2] - line[0]) * t, line[1] + (line[3] - line[1]) * t];
}

/** Painted kerb blocks, shorter as they recede, alternating orange and white. */
const KERB_BLOCKS = Array.from({ length: 10 }, (_, i) => {
  const at = (k: number) => 1 - Math.pow(1 - k / 10, 1.35);
  const [t0, t1] = [at(i), at(i + 1)];
  const points = [
    lerp(KERB_LEFT, t0),
    lerp(KERB_RIGHT, t0),
    lerp(KERB_RIGHT, t1),
    lerp(KERB_LEFT, t1),
  ];
  return {
    d: `M${points.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join(' L')} Z`,
    orange: i % 2 === 0,
  };
});

const SLOTS = [
  { code: 'A-01', d: 'M1084 935 L1230 935 L1203 786 L1110 786 Z' },
  { code: 'A-02', d: 'M1112 758 L1202 758 L1184 660 L1129 660 Z' },
] as const;
const FREE_SLOT = 'M1131 642 L1182 642 L1171 575 L1141 575 Z';

function PaintedSlots({ painted, reduced }: { painted: boolean; reduced: boolean }) {
  const draw = (start: number, duration = 420): CSSProperties => ({
    strokeDasharray: 1,
    strokeDashoffset: painted ? 0 : 1,
    transition: `stroke-dashoffset ${duration}ms var(--ease-out) ${motionDelay(start, reduced)}`,
  });
  const pop = (start: number): CSSProperties => ({
    opacity: painted ? 1 : 0,
    transform: painted ? 'scale(1)' : 'scale(0.6)',
    transformBox: 'fill-box',
    transformOrigin: 'center',
    transition: `opacity 200ms ease ${motionDelay(start, reduced)}, transform 320ms var(--ease-out) ${motionDelay(start, reduced)}`,
  });

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1672 941"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <clipPath id="landing-kerb-reveal">
          <rect
            x="0"
            y="500"
            width="1672"
            height="441"
            style={{
              transform: painted ? 'translateY(0)' : 'translateY(441px)',
              transition: `transform 600ms var(--ease-out)`,
            }}
          />
        </clipPath>
      </defs>

      {/* The kerb, painted up the street. */}
      <g clipPath="url(#landing-kerb-reveal)" opacity="0.92">
        {KERB_BLOCKS.map((block) => (
          <path
            key={block.d}
            d={block.d}
            fill={block.orange ? 'rgb(255 106 31)' : 'rgb(255 248 242)'}
          />
        ))}
      </g>

      {/* Two taken slots, outlined one after the other. */}
      {SLOTS.map((slot, i) => (
        <path
          key={slot.code}
          d={slot.d}
          pathLength={1}
          fill="rgb(255 106 31 / 0.14)"
          stroke="rgb(255 106 31)"
          strokeWidth="6"
          strokeLinejoin="round"
          style={draw(160 + i * 160)}
        />
      ))}

      {/* The free one: dashed, glowing three times, then still. */}
      <path
        d={FREE_SLOT}
        fill="rgb(255 106 31 / 0.16)"
        stroke="rgb(255 106 31)"
        strokeWidth="5"
        strokeDasharray="12 9"
        strokeLinejoin="round"
        className={painted && !reduced ? 'sb-slot-beacon' : undefined}
        style={{
          opacity: painted ? 1 : 0,
          transition: `opacity 420ms ease ${motionDelay(480, reduced)}`,
          animationDelay: '900ms',
          animationIterationCount: 3,
        }}
      />

      {/* Slot plates. */}
      <g style={pop(620)}>
        <SignPlate x={1093} y={860} width={128} label="Ô A-01" />
      </g>
      <g style={pop(700)}>
        <SignPlate x={1196} y={683} width={104} label="Ô A-02" fontSize={34} />
      </g>
      <g style={pop(780)}>
        <SignPlate x={1096} y={460} width={112} label="Ô A-03" fontSize={36} />
        <rect x="1096" y="516" width="172" height="46" rx="23" fill="rgb(255 255 255 / 0.94)" />
        <text
          x="1182"
          y="547"
          textAnchor="middle"
          fontSize="27"
          fontWeight="700"
          fill="rgb(207 74 11)"
          className="font-sans"
        >
          Còn trống
        </text>
      </g>
    </svg>
  );
}

function SignPlate({
  x,
  y,
  width,
  label,
  fontSize = 38,
}: {
  x: number;
  y: number;
  width: number;
  label: string;
  fontSize?: number;
}) {
  const height = fontSize * 1.42;
  return (
    <>
      <rect x={x} y={y} width={width} height={height} rx="9" fill="rgb(19 32 46)" />
      <rect
        x={x + 3.5}
        y={y + 3.5}
        width={width - 7}
        height={height - 7}
        rx="6.5"
        fill="none"
        stroke="rgb(255 255 255 / 0.9)"
        strokeWidth="3"
      />
      <text
        x={x + width / 2}
        y={y + height / 2 + fontSize * 0.36}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="750"
        fill="#FFFFFF"
        className="font-sign"
        style={{ fontStretch: '72%', letterSpacing: '0.03em' }}
      >
        {label}
      </text>
    </>
  );
}

/** "Licensed": the card beside slot A-01, lifting in once the paint is down. */
function LicenseCard({ shown, reduced }: { shown: boolean; reduced: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="absolute bottom-[6%] right-[31%] flex items-center gap-xs rounded-[14px] bg-card/95 py-1.5 pl-1.5 pr-sm shadow-sheet ring-1 ring-black/5 backdrop-blur md:gap-sm md:py-2 md:pl-2 md:pr-md"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity 320ms ease ${motionDelay(900, reduced)}, transform 320ms var(--ease-out) ${motionDelay(900, reduced)}`,
      }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-tint-tertiary text-tertiary md:h-10 md:w-10">
        <Icon name="qrcode" size={20} color="currentColor" weight="fill" />
      </span>
      <span className="flex flex-col">
        <span className="whitespace-nowrap text-[13px] font-bold leading-tight text-text md:text-[14px]">
          Có giấy phép
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-[#0B5D33] dark:text-[#8BE3B0] md:text-[12px]">
          <Icon name="check-circle" size={13} color="currentColor" />
          Phường đã duyệt
        </span>
      </span>
    </div>
  );
}
