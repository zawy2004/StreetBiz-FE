import type { ReactNode } from 'react';

import { Button, Icon } from '@/components/common';
import { TextField } from '@/components/forms';
import { Steam } from '@/components/illustrations';
import { BackButton } from '../BackButton';
import { HeroPhoto } from '../HeroPhoto';
import type { FoodPhoto } from '../../food-photos';
import type { IconName } from '@/components/common/Icon';
import { appendPhrase } from '../../append-phrase';

/**
 * The dish, large: 4:3 edge to edge on a phone, 16:9 in the margins on a
 * tablet, a square that stays put while the order column scrolls on desktop.
 * Back floats on the photo; a sold-out chip sits on it (the photo keeps its colours).
 */
export function ItemHero({
  photos,
  icon,
  steam,
  badge,
}: {
  photos: FoodPhoto[];
  icon: IconName;
  steam: boolean;
  badge?: ReactNode;
}) {
  return (
    <div className="sb-rise relative isolate aspect-[4/3] w-full overflow-hidden bg-tint-primary md:aspect-[16/9] md:rounded-[28px] lg:aspect-square lg:max-h-[640px] lg:rounded-[32px] lg:shadow-sheet">
      <HeroPhoto
        photos={photos}
        icon={icon}
        iconSize={96}
        className="absolute inset-0 -z-10 h-full w-full"
        tagClassName="bottom-lg right-sm md:bottom-sm"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-[5] h-1/4 bg-gradient-to-t from-black/25 to-transparent"
      />
      {steam ? (
        <Steam className="absolute left-1/2 top-[8%] h-[170px] w-[130px] -translate-x-1/2 md:h-[220px] md:w-[170px] lg:top-[12%] lg:h-[260px] lg:w-[200px]" />
      ) : null}
      <div className="absolute left-sm top-sm md:left-md md:top-md">
        <BackButton floating />
      </div>
      {badge ? (
        <div className="absolute right-sm top-sm rounded-[7px] bg-card shadow-card md:right-md md:top-md">
          {badge}
        </div>
      ) : null}
    </div>
  );
}

const QUICK_NOTES = ['Không hành', 'Ít cay', 'Không ớt', 'Ít đá', 'Nhiều rau'];

/**
 * The note for the kitchen as an order slip: a pale orange ticket with a torn
 * top edge, quick chips first (one tap writes them in), then the field itself.
 * Every change goes through the same `onChange` (cut at 300 characters by the screen).
 */
export function NoteSlip({ note, onChange }: { note: string; onChange: (value: string) => void }) {
  return (
    <div className="relative rounded-b-[20px] rounded-t-[6px] bg-[#FFF3E8] px-md pb-md pt-lg ring-1 ring-[#F5DCC6] dark:bg-card dark:ring-border">
      <svg
        aria-hidden="true"
        viewBox="0 0 120 8"
        preserveAspectRatio="none"
        className="absolute inset-x-0 -top-px h-2 w-full fill-bg"
      >
        <path d="M0 0 H120 V2 L115 7 L110 2 L105 7 L100 2 L95 7 L90 2 L85 7 L80 2 L75 7 L70 2 L65 7 L60 2 L55 7 L50 2 L45 7 L40 2 L35 7 L30 2 L25 7 L20 2 L15 7 L10 2 L5 7 L0 2 Z" />
      </svg>
      <p className="mb-sm flex items-center gap-1.5 font-sign text-[15px] font-bold text-text [font-stretch:90%]">
        <Icon name="receipt-text-outline" size={18} color="currentColor" className="text-primary" />
        Phiếu gọi món
      </p>
      <div className="no-scrollbar -mx-md mb-sm flex gap-xs overflow-x-auto px-md md:flex-wrap md:overflow-visible">
        {QUICK_NOTES.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(appendPhrase(note, chip))}
            className="h-11 shrink-0 rounded-full bg-card px-md text-label text-text shadow-card ring-1 ring-border transition-[background-color,box-shadow] duration-[120ms] hover:ring-text/25 active:bg-tint-primary active:ring-brand"
          >
            {chip}
          </button>
        ))}
      </div>
      <TextField
        label="Ghi chú cho món (không bắt buộc)"
        value={note}
        onChangeText={onChange}
        placeholder="VD: không ớt, ít đá..."
        helperText={`${note.length}/300`}
      />
    </div>
  );
}

/**
 * Whose dish this is, with the way to their stall, and what the cart already
 * holds: a mango note when adding this dish would replace a cart from another
 * stall (the confirmation still comes on the button, as before).
 */
export function FromStorefront({
  storefrontName,
  onViewStore,
  cartNote,
}: {
  storefrontName: string;
  onViewStore?: () => void;
  cartNote?: { text: string; replaces: boolean } | null;
}) {
  return (
    <div className="flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border">
      <div className="flex items-center gap-sm">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tint-primary text-primary"
        >
          <Icon name="storefront-outline" size={22} color="currentColor" weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-xs font-medium text-muted">Từ quán</p>
          <p
            title={storefrontName}
            className="truncate font-editorial text-[20px] font-semibold leading-tight text-text"
          >
            {storefrontName}
          </p>
        </div>
        {onViewStore ? (
          <Button label="Xem quán" variant="outline" fullWidth={false} onPress={onViewStore} />
        ) : null}
      </div>
      {cartNote ? (
        <p
          className={`flex items-start gap-xs rounded-[12px] px-sm py-xs text-body-md ${cartNote.replaces ? 'bg-secondary-bg text-on-secondary' : 'bg-sunken text-text/80'}`}
        >
          <Icon
            name={cartNote.replaces ? 'alert-circle-outline' : 'cart-outline'}
            size={18}
            color="currentColor"
            className="mt-0.5 shrink-0"
          />
          {cartNote.text}
        </p>
      ) : null}
    </div>
  );
}
