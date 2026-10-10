import { useEffect, useRef, type ReactNode } from 'react';

import { Icon } from '@/components/common';
import { FoodPhoto } from './FoodPhoto';
import { motionDelay, playOnce, prefersReducedMotion, usePaintIn } from './paint-in';

export type AuthScene = 'sign-in' | 'register-customer' | 'register-vendor' | 'verify' | 'reset';

type Slot = { code: string; dish?: string; dishName?: string };

/** Two rows of painted slots: five stalls open for the morning, three still free. */
const SLOTS: Slot[] = [
  { code: 'A-01', dish: 'banh-mi', dishName: 'Bánh mì' },
  { code: 'A-02', dish: 'ca-phe', dishName: 'Cà phê' },
  { code: 'A-03' },
  { code: 'A-04', dish: 'xoi-ga', dishName: 'Xôi gà' },
  { code: 'B-01' },
  { code: 'B-02', dish: 'com-tam', dishName: 'Cơm tấm' },
  { code: 'B-03', dish: 'bun-cha', dishName: 'Bún chả' },
  { code: 'B-04' },
];

/** The three slots the phone/tablet band has room for. */
const BAND_SLOTS: Slot[] = [SLOTS[0]!, SLOTS[2]!, SLOTS[3]!];

const KERB_STRIPE =
  'repeating-linear-gradient(90deg, rgb(var(--c-kerb)) 0 28px, rgb(var(--c-kerb-paint)) 28px 56px)';
const TILE_GRID =
  'linear-gradient(rgb(var(--c-border) / 0.7) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-border) / 0.7) 1px, transparent 1px)';

type Props = {
  scene: AuthScene;
  /** `panel` is the large plan beside the form; `band` the three-slot strip on phones and tablets. */
  variant?: 'panel' | 'band';
  className?: string;
};

/**
 * A stretch of pavement seen from above: the road with its dashed centre line,
 * the painted kerb, and slots on a tiled pavement. Stalls light up one by one
 * as the page opens, like a street opening for business; each auth scene adds
 * one small sign of what this step is about. Decoration only.
 */
export function AuthPavement({ scene, variant = 'panel', className = '' }: Props) {
  const lit = usePaintIn();
  const reduced = prefersReducedMotion();

  if (variant === 'band') {
    return <PavementBand scene={scene} lit={lit} reduced={reduced} className={className} />;
  }

  let opened = 0;
  return (
    <div
      aria-hidden="true"
      className={`relative h-[260px] overflow-hidden rounded-[28px] bg-[#F4F6F8] shadow-[0_34px_64px_-40px_rgb(207_74_11/0.55)] ring-1 ring-[#E6EAEE] dark:bg-sunken dark:ring-border xl:h-[320px] ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-[26%] bg-[#E9EDF2] dark:bg-[#1D2833]">
        <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-[repeating-linear-gradient(90deg,#FFFFFF_0_26px,transparent_26px_48px)] dark:opacity-30" />
        <SceneLayer active={scene === 'verify' && lit}>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <MessageBubble />
          </div>
        </SceneLayer>
        <SceneLayer active={scene === 'register-customer' && lit}>
          <span className="absolute left-[37.5%] top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-card px-2.5 py-1 text-body-xs font-semibold text-text shadow-card ring-1 ring-border">
            <Icon
              name="shield-check-outline"
              size={14}
              color="rgb(var(--c-tertiary))"
              weight="fill"
            />
            Quán có phép gần bạn
          </span>
        </SceneLayer>
      </div>
      <div
        className="absolute inset-x-0 top-[26%] h-[10px]"
        style={{ background: KERB_STRIPE, boxShadow: 'inset 0 -3px 0 rgb(0 0 0 / 0.12)' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 top-[calc(26%+10px)] p-sm"
        style={{ backgroundImage: TILE_GRID, backgroundSize: '24px 24px' }}
      >
        <div className="grid h-full grid-cols-4 grid-rows-2 gap-[10px]">
          {SLOTS.map((slot) => {
            const order = slot.dish ? opened++ : 0;
            return slot.dish ? (
              <StallSlot
                key={slot.code}
                slot={slot}
                lit={lit}
                delay={motionDelay(order * 120, reduced)}
                pinned={scene === 'register-customer' && slot.code === 'A-02'}
                locked={scene === 'reset' && slot.code === 'A-04'}
                ready={lit}
              />
            ) : (
              <FreeSlot
                key={slot.code}
                code={slot.code}
                yours={scene === 'register-vendor' && slot.code === 'A-03'}
              />
            );
          })}
        </div>
      </div>
      <span className="absolute bottom-2 right-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-[#2B3640]">
        Ảnh minh họa
      </span>
    </div>
  );
}

function SceneLayer({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 transition-opacity duration-200"
      style={{ opacity: active ? 1 : 0 }}
    >
      {children}
    </div>
  );
}

function MessageBubble() {
  return (
    <span className="sb-float flex items-center gap-sm rounded-[16px] bg-card px-sm py-1.5 shadow-sheet ring-1 ring-border">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tint-primary text-primary">
        <Icon name="chat-outline" size={16} color="currentColor" weight="fill" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[12px] font-bold text-text">StreetBiz</span>
        <span className="whitespace-nowrap font-sign text-[12px] font-semibold tracking-[0.04em] text-muted">
          Mã xác thực: ● ● ● ● ● ●
        </span>
      </span>
    </span>
  );
}

function StallSlot({
  slot,
  lit,
  delay,
  pinned,
  locked,
  ready,
}: {
  slot: Slot;
  lit: boolean;
  delay: string;
  pinned: boolean;
  locked: boolean;
  ready: boolean;
}) {
  const transition = `opacity 460ms var(--ease-out) ${delay}, transform 460ms var(--ease-out) ${delay}`;
  return (
    <div
      className="relative min-w-0 rounded-[14px] bg-card shadow-[0_8px_18px_-12px_rgb(255_106_31/0.55)] ring-1 ring-[#F0D9C9] dark:ring-border"
      style={{
        opacity: lit ? 1 : 0.35,
        transform: lit ? 'scale(1)' : 'scale(0.96)',
        transition,
      }}
    >
      <FoodPhoto
        dish={slot.dish!}
        loading="eager"
        width={56}
        height={56}
        glyphSize={18}
        className="absolute right-1.5 top-1.5 h-10 w-10 rounded-full ring-2 ring-card xl:right-2 xl:top-2 xl:h-14 xl:w-14"
        style={{ transform: lit ? 'translateY(0)' : 'translateY(4px)', transition }}
      />
      <span className="kerb-tag absolute bottom-1.5 left-1.5 origin-bottom-left scale-[0.86] xl:bottom-2 xl:left-2 xl:scale-100">
        Ô {slot.code}
      </span>
      <PinDrop active={pinned && ready} />
      <LockBadge active={locked} />
    </div>
  );
}

function FreeSlot({ code, yours }: { code: string; yours: boolean }) {
  return (
    <div className="relative flex min-w-0 flex-col justify-end rounded-[14px] border-2 border-dashed border-brand/80 bg-white/50 p-1.5 dark:bg-card/40 xl:p-2">
      {yours ? <Beacon radius="rounded-[14px]" /> : null}
      <span className="relative font-sign text-[11px] font-bold tracking-[0.03em] text-muted [font-stretch:80%]">
        Ô {code}
      </span>
      <span className="relative text-[12px] font-semibold leading-tight text-primary">
        {yours ? 'Ô của bạn' : 'Còn trống'}
      </span>
    </div>
  );
}

/** "This one is yours": the free slot glows three times, then holds still. */
function Beacon({ radius }: { radius: string }) {
  return (
    <span
      className={`sb-slot-beacon pointer-events-none absolute -inset-[2px] bg-brand/15 ring-2 ring-brand ${radius}`}
      style={{ animationIterationCount: 3 }}
    />
  );
}

function PinDrop({ active, small }: { active: boolean; small?: boolean }) {
  return (
    <span
      className={`pointer-events-none absolute left-1/2 flex items-center justify-center ${small ? '-top-3' : '-top-4 xl:-top-5'}`}
      style={{
        opacity: active ? 1 : 0,
        transform: `translateX(-50%) translateY(${active ? 0 : -24}px)`,
        transition: 'opacity 200ms ease, transform 460ms var(--ease-out)',
      }}
    >
      <Icon
        name="map-marker"
        size={small ? 24 : 32}
        color="rgb(var(--c-primary))"
        className="drop-shadow-[0_6px_6px_rgb(207_74_11/0.35)]"
      />
    </span>
  );
}

function LockBadge({ active, small }: { active: boolean; small?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);

  // The lock gives one small shake when the reset scene appears, as if waiting for its key.
  useEffect(() => {
    if (!active) return;
    playOnce(
      ref.current,
      [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(-6deg)' },
        { transform: 'rotate(6deg)' },
        { transform: 'rotate(-3deg)' },
        { transform: 'rotate(0deg)' },
      ],
      { duration: 360, delay: 420, easing: 'ease-in-out' },
    );
  }, [active]);

  return (
    <span
      ref={ref}
      className={`pointer-events-none absolute flex items-center justify-center rounded-full bg-card text-primary shadow-card ring-2 ring-brand transition-opacity duration-200 ${small ? '-left-1.5 -top-1.5 h-6 w-6' : '-left-2 -top-2 h-8 w-8'}`}
      style={{ opacity: active ? 1 : 0 }}
    >
      <Icon name="lock-outline" size={small ? 13 : 17} color="currentColor" weight="fill" />
    </span>
  );
}

function PavementBand({
  scene,
  lit,
  reduced,
  className,
}: {
  scene: AuthScene;
  lit: boolean;
  reduced: boolean;
  className: string;
}) {
  let opened = 0;
  return (
    <div aria-hidden="true" className={`relative flex items-end gap-1.5 md:gap-xs ${className}`}>
      {BAND_SLOTS.map((slot) => {
        if (!slot.dish) {
          const yours = scene === 'register-vendor';
          return (
            <div
              key={slot.code}
              className="relative flex h-[60px] w-[52px] flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-brand/80 bg-white/60 dark:bg-card/40 md:h-[76px] md:w-[68px]"
            >
              {yours ? <Beacon radius="rounded-[12px]" /> : null}
              {scene === 'verify' ? (
                <span className="relative flex flex-col items-center gap-0.5 text-primary">
                  <Icon name="chat-outline" size={18} color="currentColor" weight="fill" />
                  <span className="text-[8px] tracking-[0.08em]">●●●●●●</span>
                </span>
              ) : (
                <>
                  <span className="relative font-sign text-[10px] font-bold text-muted [font-stretch:80%]">
                    Ô {slot.code}
                  </span>
                  <span className="relative text-center text-[10px] font-semibold leading-tight text-primary md:text-[11px]">
                    {yours ? 'Ô của bạn' : 'Trống'}
                  </span>
                </>
              )}
            </div>
          );
        }
        const delay = motionDelay(opened++ * 120, reduced);
        const transition = `opacity 460ms var(--ease-out) ${delay}, transform 460ms var(--ease-out) ${delay}`;
        return (
          <div
            key={slot.code}
            className="relative flex h-[60px] w-[52px] flex-col items-center justify-center gap-1 rounded-[12px] bg-card shadow-[0_8px_16px_-12px_rgb(255_106_31/0.6)] ring-1 ring-[#F0D9C9] dark:ring-border md:h-[76px] md:w-[68px]"
            style={{
              opacity: lit ? 1 : 0.35,
              transform: lit ? 'scale(1)' : 'scale(0.96)',
              transition,
            }}
          >
            <FoodPhoto
              dish={slot.dish}
              loading="eager"
              width={40}
              height={40}
              glyphSize={16}
              className="h-8 w-8 rounded-full md:h-10 md:w-10"
            />
            <span className="font-sign text-[10px] font-bold text-text [font-stretch:80%]">
              Ô {slot.code}
            </span>
            <PinDrop small active={scene === 'register-customer' && slot.code === 'A-01' && lit} />
            <LockBadge small active={scene === 'reset' && slot.code === 'A-04'} />
          </div>
        );
      })}
    </div>
  );
}
