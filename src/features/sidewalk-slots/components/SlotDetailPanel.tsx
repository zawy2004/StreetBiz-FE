import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Icon, Money } from '@/components/common';
import type { IconName } from '@/components/common/Icon';
import type { SidewalkSlot, SidewalkZone } from '@/core/api/side-api';
import { reverseGeocode } from '@/services/map/reverse-geocode';
import { formatAreaSqm, formatHours, formatSize, toDms } from '../slot-format';
import { BUSINESS_CATEGORY_LABELS, slotDisplayState, type SlotDisplayState } from '../slot-stats';
import { DISPLAY_STATE_LABELS, SLOT_TONES } from '../slot-visuals';
import { useNow } from '../useNow';
import { SlotApplyForm } from './SlotApplyForm';
import { SlotBayDrawing } from './SlotBayDrawing';

type Props = {
  slot: SidewalkSlot;
  /** Loaded separately; the panel is usable without it (no ward contact card). */
  zone: SidewalkZone | undefined;
  /**
   * `docked` beside or under the workspace plan (V11); `page` for the slot's own
   * page (V12): the bay drawing large on the left, a sticky price card on the right.
   */
  variant?: 'docked' | 'page';
  /** Docked only: scrolls back up to the plan (shown while the panel sits under it). */
  onBackToPlan?: () => void;
};

/** Photo or bay drawing, measurements, amenities, fee estimate and the apply flow for one slot. */
export function SlotDetailPanel({ slot, zone, variant = 'docked', onBackToPlan }: Props) {
  const nowMs = useNow();
  const state = slotDisplayState(slot, nowMs);
  const address = useQuery({
    queryKey: ['side', 'reverse-geocode', slot.latitude, slot.longitude],
    queryFn: ({ signal }) => reverseGeocode(slot.latitude, slot.longitude, signal),
    staleTime: Infinity,
  });
  const size = formatSize(slot.widthMeters, slot.lengthMeters);
  const area = formatAreaSqm(slot.widthMeters, slot.lengthMeters);
  const page = variant === 'page';

  const facts = (
    <div className="flex flex-col gap-md">
      <div className="grid grid-cols-2 gap-xs">
        <Fact
          icon="ruler-square"
          label="Kích thước"
          value={size ? `${size}${area ? ` (${area})` : ''}` : 'Chưa đo kích thước'}
        />
        <Fact
          icon="clock-outline"
          label="Giờ hoạt động"
          value={formatHours(slot.availableFrom, slot.availableTo)}
        />
        <Fact
          icon="tag-outline"
          label="Ngành hàng"
          value={
            slot.businessCategory
              ? BUSINESS_CATEGORY_LABELS[slot.businessCategory]
              : 'Chưa phân ngành'
          }
        />
        {slot.tenantName && (
          <Fact icon="storefront-outline" label="Hộ đang thuê" value={slot.tenantName} />
        )}
      </div>
      <div className="flex flex-col gap-xs">
        <p className="text-badge text-muted">HẠ TẦNG</p>
        <div className="grid grid-cols-3 gap-xs">
          <Amenity icon="flash-outline" label="Điện" on={slot.hasPower} />
          <Amenity icon="water-outline" label="Nước" on={slot.hasWater} />
          <Amenity icon="trash-can-outline" label="Thùng rác" on={slot.hasTrashBin} />
        </div>
      </div>
    </div>
  );

  const place = (
    <div className="flex items-start gap-sm rounded-[16px] bg-bg p-sm ring-1 ring-inset ring-border">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-card"
      >
        <Icon name="map-marker-outline" size={18} color="currentColor" weight="fill" />
      </span>
      <div className="min-w-0">
        <p className="line-clamp-3 text-body-md text-text">
          {address.isPending
            ? 'Đang tìm địa chỉ…'
            : (address.data ?? `${slot.latitude}, ${slot.longitude}`)}
        </p>
        <p className="mt-0.5 font-tabular text-body-sm text-muted">
          {toDms(slot.latitude, slot.longitude)}
        </p>
      </div>
    </div>
  );

  const media = slot.imageUrl ? (
    <figure className="flex flex-col gap-xs">
      <img
        src={slot.imageUrl}
        alt={`Ô ${slot.slotCode}`}
        loading="lazy"
        width={640}
        height={360}
        className="aspect-video w-full rounded-[20px] bg-sunken object-cover ring-1 ring-border"
      />
      {page ? <figcaption className="text-body-sm text-muted">Ảnh hiện trạng</figcaption> : null}
    </figure>
  ) : (
    <div className="flex flex-col gap-1">
      <SlotBayDrawing slot={slot} state={state} variant={page ? 'page' : 'docked'} />
      <span className="flex items-center gap-1 text-body-sm text-muted">
        <Icon name="camera-plus-outline" size={15} color="currentColor" />
        Chưa có ảnh
      </span>
    </div>
  );

  const contact = zone?.contactName ? (
    <div className="flex items-center justify-between gap-sm rounded-[16px] bg-card p-md shadow-card ring-1 ring-border">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tint-indigo text-indigo"
      >
        <Icon name="headset" size={22} color="currentColor" weight="duotone" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words text-headline-sm text-text">{zone.contactName}</p>
        <p className="break-words text-body-sm text-muted">
          {zone.wardName}
          {zone.contactPhone ? ` · ${zone.contactPhone}` : ''}
        </p>
      </div>
      {zone.contactPhone && (
        <a
          href={`tel:${zone.contactPhone.replace(/\s/g, '')}`}
          className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-[12px] px-sm text-label font-semibold text-primary transition-colors hover:bg-tint-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Icon name="phone-outline" size={18} color="currentColor" />
          Gọi hỗ trợ
        </a>
      )}
    </div>
  ) : null;

  const price = <PriceLine slot={slot} state={state} large={page} />;

  if (page) {
    // One column below 1280px (drawing, facts, price card, contact, place); two above it,
    // the price card sticky on the right. The wrappers dissolve (`contents`) in one column.
    return (
      <article
        className="flex flex-col gap-lg xl:grid xl:grid-cols-[minmax(0,1fr)_392px] xl:items-start xl:gap-xl"
        data-testid="slot-detail-panel"
      >
        <div className="contents xl:flex xl:flex-col xl:gap-lg">
          <div className="order-1">{media}</div>
          <div className="order-2">{facts}</div>
          <div className="order-5">{place}</div>
        </div>
        <div className="contents xl:sticky xl:top-0 xl:flex xl:flex-col xl:gap-md">
          <section
            aria-label="Giá và đăng ký thuê"
            className="order-3 flex flex-col gap-md rounded-[24px] bg-card px-md pb-md pt-md shadow-sheet ring-1 ring-border md:px-lg md:pb-lg"
          >
            {price}
            <SlotApplyForm slot={slot} />
          </section>
          {contact ? <div className="order-4">{contact}</div> : null}
        </div>
      </article>
    );
  }

  return (
    <article
      className="flex flex-col gap-md lg:grid lg:grid-cols-2 lg:items-start lg:gap-lg xl:flex"
      data-testid="slot-detail-panel"
    >
      <div className="contents lg:flex lg:flex-col lg:gap-md xl:contents">
        {onBackToPlan ? (
          <button
            type="button"
            onClick={onBackToPlan}
            className="order-first inline-flex h-12 w-fit items-center gap-1.5 rounded-full bg-card px-md text-label font-semibold text-text shadow-card ring-1 ring-border transition-transform active:scale-[0.98] xl:hidden"
          >
            <Icon name="chevron-up" size={18} color="currentColor" />
            Về sơ đồ
          </button>
        ) : null}
        <div className="order-1 flex flex-wrap items-center justify-between gap-xs">
          <h2 className="font-sign text-[24px] font-extrabold leading-tight text-text [font-stretch:80%]">
            Ô {slot.slotCode}
          </h2>
          <StateChip state={state} />
        </div>
        <div className="order-2">{media}</div>
        <div className="order-3">{place}</div>
        <div className="order-4">{facts}</div>
        {contact ? <div className="order-7">{contact}</div> : null}
      </div>
      <div className="contents lg:flex lg:flex-col lg:gap-md xl:contents">
        <div className="order-5">{price}</div>
        <div className="order-6">
          <SlotApplyForm slot={slot} />
        </div>
      </div>
    </article>
  );
}

/** Upper-case state sign in the state's own pale wash and deep ink. */
export function StateChip({ state }: { state: SlotDisplayState }) {
  const tone = SLOT_TONES[state];
  return (
    <span
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[6px] px-2 text-badge ${tone.wash} ${tone.ink}`}
    >
      <Icon name={tone.icon} size={14} color="currentColor" />
      {DISPLAY_STATE_LABELS[state].toUpperCase()}
    </span>
  );
}

function PriceLine({
  slot,
  state,
  large,
}: {
  slot: SidewalkSlot;
  state: SlotDisplayState;
  large: boolean;
}) {
  const monthly = slot.priceDisplayUnit === 'MONTH' && slot.pricePerMonth != null;
  return (
    <div className="flex items-start justify-between gap-sm">
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-1">
          <Money
            amountVnd={slot.pricePerDay}
            size={large ? 'lg' : 'md'}
            className="font-sign font-bold"
          />
          <span className="text-body-sm text-muted">/ ngày</span>
        </p>
        {monthly ? (
          <p className="flex items-baseline gap-x-1 text-muted">
            <Money amountVnd={slot.pricePerMonth!} color="currentColor" />
            <span className="text-body-sm">/ tháng</span>
          </p>
        ) : null}
      </div>
      {large ? <StateChip state={state} /> : null}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: IconName; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-xs rounded-[14px] bg-bg p-sm ring-1 ring-inset ring-border">
      <Icon name={icon} size={20} color="currentColor" className="mt-0.5 shrink-0 text-indigo" />
      <div className="min-w-0">
        <p className="text-body-xs text-muted">{label}</p>
        <p
          className="break-words text-body-sm font-semibold text-text"
          title={typeof value === 'string' ? value : undefined}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Amenity({ icon, label, on }: { icon: IconName; label: string; on: boolean }) {
  return (
    <div
      className={[
        'flex h-12 items-center justify-center gap-1.5 rounded-[12px] px-xs text-body-sm',
        on
          ? 'bg-[#E6F6EC] font-semibold text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]'
          : 'bg-card text-muted line-through ring-1 ring-inset ring-border',
      ].join(' ')}
    >
      <Icon name={icon} size={18} color="currentColor" weight={on ? 'fill' : 'regular'} />
      {label}
      {on ? <Icon name="check" size={14} color="currentColor" /> : null}
    </div>
  );
}
