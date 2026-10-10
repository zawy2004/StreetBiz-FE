import { useRef, useState, type KeyboardEvent } from 'react';

import { Icon } from '@/components/common';
import { EVIDENCE_TYPE, VENDOR_TYPE, type ApiVendorType } from '@/core/api';
import { EVIDENCE_LABELS, requiredEvidence } from '../../new-registration-store';

/* ------------------------------------------------------------------ scenes */

const KERB = (y: number, count: number, w: number) =>
  Array.from({ length: count }, (_, i) => (
    <rect
      key={i}
      x={i * w}
      y={y}
      width={w}
      height="10"
      className={i % 2 ? 'fill-kerb-paint' : 'fill-brand'}
    />
  ));

/**
 * Itinerant: the pavement from above with three empty painted slots; a push
 * cart with an orange canopy rolls into the middle one when this card is picked.
 */
export function ItinerantArt({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 320 180"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
    >
      <rect width="320" height="138" className="fill-[#EEF1F4] dark:fill-[#1D2833]" />
      {[24, 120, 216].map((x) => (
        <rect
          key={x}
          x={x}
          y="30"
          width="80"
          height="86"
          rx="9"
          fill="none"
          strokeWidth="3"
          strokeDasharray="9 7"
          className="stroke-brand/70"
        />
      ))}
      {KERB(138, 15, 22)}
      <rect y="148" width="320" height="32" className="fill-[#E1E5EA] dark:fill-[#2B3946]" />
      <path
        d="M0 164 H320"
        strokeWidth="3"
        strokeDasharray="18 14"
        className="stroke-white/90 dark:stroke-white/25"
      />
      <g
        style={{
          transform: active ? 'translateX(0px)' : 'translateX(-30px)',
          transition: 'transform 600ms cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <ellipse cx="160" cy="108" rx="34" ry="5" className="fill-text/10" />
        <line x1="134" y1="52" x2="134" y2="76" strokeWidth="2.5" className="stroke-text" />
        <line x1="186" y1="52" x2="186" y2="76" strokeWidth="2.5" className="stroke-text" />
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M${126 + i * 17} 40 h17 v12 a8.5 8.5 0 0 1 -17 0 z`}
            className={i % 2 ? 'fill-white' : 'fill-brand'}
          />
        ))}
        <path d="M126 40 h68" strokeWidth="2" className="stroke-text" />
        <rect
          x="128"
          y="74"
          width="64"
          height="26"
          rx="5"
          strokeWidth="2"
          className="fill-accent stroke-text"
        />
        <rect x="136" y="80" width="22" height="9" rx="2" className="fill-white/85" />
        <line
          x1="192"
          y1="80"
          x2="208"
          y2="70"
          strokeWidth="3"
          strokeLinecap="round"
          className="stroke-text"
        />
        <circle cx="141" cy="103" r="6" strokeWidth="2" className="fill-card stroke-text" />
        <circle cx="180" cy="103" r="6" strokeWidth="2" className="fill-card stroke-text" />
      </g>
    </svg>
  );
}

/**
 * Fixed storefront: a shop face with a striped awning; the slot right in front
 * of its door is painted solid and glows once when this card is picked.
 */
export function StorefrontArt({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 320 180"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
    >
      <rect width="320" height="88" className="fill-[#FFF3E8] dark:fill-[#2A2420]" />
      <rect
        x="40"
        y="10"
        width="240"
        height="78"
        strokeWidth="2"
        className="fill-card stroke-text"
      />
      <rect x="62" y="20" width="196" height="16" rx="3" className="fill-sign" />
      <rect x="76" y="26" width="168" height="4" rx="2" className="fill-white/80" />
      <rect
        x="64"
        y="56"
        width="62"
        height="32"
        strokeWidth="2"
        className="fill-[#DDEBF7] stroke-text dark:fill-[#203142]"
      />
      <rect
        x="194"
        y="56"
        width="62"
        height="32"
        strokeWidth="2"
        className="fill-[#DDEBF7] stroke-text dark:fill-[#203142]"
      />
      <rect
        x="138"
        y="52"
        width="44"
        height="36"
        strokeWidth="2"
        className="fill-[#DDEBF7] stroke-text dark:fill-[#203142]"
      />
      <g
        style={{
          transform: active ? 'scaleY(1)' : 'scaleY(0.6)',
          transformOrigin: '160px 40px',
          transition: 'transform 600ms cubic-bezier(.2,.8,.2,1)',
        }}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <path
            key={i}
            d={`M${40 + i * 20} 40 h20 v10 a10 10 0 0 1 -20 0 z`}
            className={i % 2 ? 'fill-white' : 'fill-brand'}
          />
        ))}
        <path d="M40 40 H280" strokeWidth="2" className="stroke-text" />
      </g>
      <rect y="88" width="320" height="50" className="fill-[#EEF1F4] dark:fill-[#1D2833]" />
      <rect
        x="112"
        y="96"
        width="96"
        height="36"
        rx="7"
        strokeWidth="3"
        className="fill-[rgb(var(--c-brand)/0.22)] stroke-brand"
      />
      {active ? (
        <rect
          x="106"
          y="91"
          width="108"
          height="46"
          rx="10"
          fill="none"
          strokeWidth="2.5"
          className="sb-slot-beacon stroke-brand"
          style={{ animationIterationCount: 1 }}
        />
      ) : null}
      {KERB(138, 15, 22)}
      <rect y="148" width="320" height="32" className="fill-[#E1E5EA] dark:fill-[#2B3946]" />
      <path
        d="M0 164 H320"
        strokeWidth="3"
        strokeDasharray="18 14"
        className="stroke-white/90 dark:stroke-white/25"
      />
    </svg>
  );
}

/* ----------------------------------------------------------------- choice */

type ChoiceOption = {
  value: ApiVendorType;
  label: string;
  description: string;
};

const OPTIONS: ChoiceOption[] = [
  {
    value: VENDOR_TYPE.itinerant,
    label: 'Bán hàng lưu động',
    description: 'Không có địa điểm cố định, chọn ô trống trên bản đồ vỉa hè',
  },
  {
    value: VENDOR_TYPE.fixedStorefront,
    label: 'Cửa hàng cố định',
    description: 'Có địa chỉ kinh doanh cố định, thuê ô liền kề mặt tiền',
  },
];

/**
 * Two picture cards as a radio group (`role="radiogroup"` / `role="radio"` +
 * `aria-checked`, roving focus with the arrow keys). Picking calls `onChange`
 * exactly like the old select did.
 */
export function VendorTypeChoice({
  value,
  onChange,
  labelledBy,
}: {
  value: ApiVendorType;
  onChange: (value: ApiVendorType) => void;
  labelledBy: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    if (!forward && !back) return;
    event.preventDefault();
    const next = (index + (forward ? 1 : OPTIONS.length - 1)) % OPTIONS.length;
    const target = OPTIONS[next];
    if (!target) return;
    onChange(target.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="grid grid-cols-1 gap-sm md:grid-cols-2 md:gap-md"
    >
      {OPTIONS.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`sb-rise group relative flex min-h-[128px] overflow-hidden rounded-[20px] text-left transition-[transform,box-shadow,background-color] duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 active:scale-[.985] md:flex-col ${
              selected
                ? 'bg-[#FFF3E8] shadow-card-hover ring-[3px] ring-brand dark:bg-[#2A2420]'
                : 'bg-card shadow-card ring-1 ring-border hover:ring-text/25'
            }`}
            style={{ ['--delay' as string]: `${i * 100}ms` }}
          >
            <span className="relative w-[112px] shrink-0 overflow-hidden md:aspect-video md:w-full">
              {opt.value === VENDOR_TYPE.itinerant ? (
                <ItinerantArt active={selected} />
              ) : (
                <StorefrontArt active={selected} />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-md pr-xl md:pr-md">
              <span
                className={`text-[20px] font-[650] leading-[26px] ${selected ? 'text-primary' : 'text-text'}`}
              >
                {opt.label}
              </span>
              <span className="text-[15px] leading-[22px] text-muted">{opt.description}</span>
            </span>
            <span
              aria-hidden="true"
              className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full transition-[opacity,transform] duration-200 ${
                selected
                  ? 'scale-100 bg-primary text-on-primary opacity-100'
                  : 'scale-75 bg-card text-border opacity-100 ring-1 ring-border'
              }`}
            >
              <Icon
                name={selected ? 'check' : 'circle-outline'}
                size={selected ? 18 : 14}
                color="currentColor"
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- checklist */

type DocKind = 'id-front' | 'id-back' | 'license' | 'portrait' | 'address';

/** Tiny drawings of each paper the vendor should have ready. Not copies of real documents. */
export function DocMiniArt({
  kind,
  className = 'h-10 w-10',
}: {
  kind: DocKind;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      {kind === 'id-front' || kind === 'id-back' ? (
        <>
          <rect
            x="3"
            y="9"
            width="34"
            height="22"
            rx="3.5"
            strokeWidth="1.8"
            className="fill-[#FFF3E8] stroke-text dark:fill-[#2A2420]"
          />
          {kind === 'id-front' ? (
            <>
              <rect x="7" y="14" width="9" height="11" rx="1.5" className="fill-brand/70" />
              <rect x="19" y="14" width="14" height="2.4" rx="1.2" className="fill-text/60" />
              <rect x="19" y="19" width="11" height="2.4" rx="1.2" className="fill-text/35" />
              <rect x="19" y="24" width="13" height="2.4" rx="1.2" className="fill-text/35" />
            </>
          ) : (
            <>
              <rect x="7" y="14" width="8" height="7" rx="1.5" className="fill-accent" />
              <rect x="7" y="24" width="26" height="2.4" rx="1.2" className="fill-text/35" />
              <rect x="19" y="14" width="14" height="2.4" rx="1.2" className="fill-text/60" />
              <rect x="19" y="18.5" width="10" height="2.4" rx="1.2" className="fill-text/35" />
            </>
          )}
        </>
      ) : kind === 'license' ? (
        <>
          <rect
            x="8"
            y="3"
            width="24"
            height="34"
            rx="3"
            strokeWidth="1.8"
            className="fill-card stroke-text"
          />
          <rect x="12" y="9" width="16" height="2.4" rx="1.2" className="fill-text/60" />
          <rect x="12" y="14" width="12" height="2.4" rx="1.2" className="fill-text/35" />
          <circle
            cx="24"
            cy="28"
            r="5.5"
            fill="none"
            strokeWidth="1.8"
            className="stroke-[#B42318] dark:stroke-[#FF7A6E]"
          />
          <circle cx="24" cy="28" r="2.4" className="fill-[#B42318]/70 dark:fill-[#FF7A6E]/70" />
        </>
      ) : kind === 'portrait' ? (
        <>
          <circle
            cx="20"
            cy="20"
            r="17"
            strokeWidth="1.8"
            strokeDasharray="4 3"
            className="fill-[#FFF3E8] stroke-brand dark:fill-[#2A2420]"
          />
          <circle cx="20" cy="16" r="5.5" className="fill-text/60" />
          <path d="M10 31 a10 8 0 0 1 20 0" className="fill-text/60" />
        </>
      ) : (
        <>
          <rect x="4" y="11" width="32" height="18" rx="4" className="fill-sign" />
          <rect
            x="7"
            y="14"
            width="26"
            height="12"
            rx="2.5"
            fill="none"
            strokeWidth="1.2"
            className="stroke-white/80"
          />
          <text
            x="20"
            y="23.5"
            textAnchor="middle"
            fontSize="8"
            fontWeight="800"
            className="fill-white font-sign"
          >
            112
          </text>
        </>
      )}
    </svg>
  );
}

function ChecklistItem({
  kind,
  label,
  need,
}: {
  kind: DocKind;
  label: string;
  need: 'required' | 'optional';
}) {
  return (
    <li className="flex items-center gap-sm">
      <DocMiniArt kind={kind} />
      <span className="min-w-0 flex-1 text-[15px] font-medium leading-5 text-text">{label}</span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-bold leading-4 ${
          need === 'required'
            ? 'bg-[#FFF3D1] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]'
            : 'bg-[#EEF1F4] text-[#2B3640] dark:bg-[#1D2833] dark:text-[#C5D0DA]'
        }`}
      >
        {need === 'required' ? 'Bắt buộc' : 'Không bắt buộc'}
      </span>
    </li>
  );
}

/**
 * "Bạn sẽ cần chuẩn bị": the documents step 4 will ask for (requiredEvidence)
 * plus the optional portrait and the address rule of step 2 (BR-07). The
 * business licence slides in only for a fixed storefront. On phones it folds.
 */
export function PrepareChecklist({ vendorType }: { vendorType: ApiVendorType }) {
  const [open, setOpen] = useState(true);
  const fixed = vendorType === VENDOR_TYPE.fixedStorefront;
  const needsLicense = requiredEvidence(vendorType).includes(EVIDENCE_TYPE.businessLicense);

  return (
    <section className="flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border">
      <h3 className="hidden text-headline-md text-text md:block">Bạn sẽ cần chuẩn bị</h3>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="-m-xs flex min-h-12 items-center justify-between gap-sm rounded-[12px] p-xs text-left md:hidden"
      >
        <span className="text-headline-md text-text">Bạn sẽ cần chuẩn bị</span>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="currentColor"
          className="text-muted"
        />
      </button>
      <ul className={`flex-col gap-sm ${open ? 'flex' : 'hidden md:flex'}`}>
        <ChecklistItem
          kind="id-front"
          label={EVIDENCE_LABELS[EVIDENCE_TYPE.identityDocument]}
          need="required"
        />
        <ChecklistItem
          kind="id-back"
          label={EVIDENCE_LABELS[EVIDENCE_TYPE.identityDocumentBack]}
          need="required"
        />
        <li
          aria-hidden={!needsLicense}
          className={`grid transition-[grid-template-rows,opacity] duration-200 [transition-timing-function:var(--ease-out)] ${
            needsLicense ? 'grid-rows-[1fr] opacity-100' : '-mt-sm grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <ul>
              <ChecklistItem
                kind="license"
                label={EVIDENCE_LABELS[EVIDENCE_TYPE.businessLicense]}
                need="required"
              />
            </ul>
          </div>
        </li>
        <ChecklistItem
          kind="portrait"
          label={EVIDENCE_LABELS[EVIDENCE_TYPE.portraitSelfie]}
          need="optional"
        />
        <ChecklistItem
          kind="address"
          label="Địa chỉ kinh doanh"
          need={fixed ? 'required' : 'optional'}
        />
      </ul>
    </section>
  );
}
