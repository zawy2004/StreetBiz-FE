import { useId, useState } from 'react';

import { Icon } from '@/components/common';
import type { WardSlot } from '../../../ward-config-api';

const label = (slot: WardSlot) => `${slot.slotCode} · ${slot.zoneName}`;

/** Lower-case and without diacritics, so "hoang" finds "Hoàng Diệu". */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

/**
 * Jump to another slot: type part of a code or a street name to narrow the list, then pick.
 * Shows the current slot until it is focused.
 */
export function SlotSwitcher({
  slots,
  current,
  onPick,
}: {
  slots: WardSlot[];
  current: WardSlot;
  onPick: (slot: WardSlot) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const needle = fold(query.trim());
  const matches = needle ? slots.filter((s) => fold(label(s)).includes(needle)) : slots;

  const pick = (slot: WardSlot) => {
    setOpen(false);
    setQuery('');
    if (slot.slotId !== current.slotId) onPick(slot);
  };

  return (
    <div className="relative flex flex-col gap-1">
      <span className="text-body-md font-semibold text-text">Chọn ô khác</span>
      <div className="relative">
        <Icon
          name="magnify"
          size={20}
          color="currentColor"
          className="pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          role="combobox"
          aria-label="Chọn ô khác"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={open ? query : label(current)}
          placeholder="Tìm mã ô hoặc tên đường…"
          onFocus={(event) => {
            setOpen(true);
            setQuery('');
            event.currentTarget.select();
          }}
          onBlur={() => setOpen(false)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false);
              event.currentTarget.blur();
            } else if (event.key === 'Enter' && matches[0]) {
              event.preventDefault();
              pick(matches[0]);
            }
          }}
          className="h-12 w-full rounded-[12px] border border-border bg-card pl-[40px] pr-sm text-body-md text-text placeholder:text-muted"
        />
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Danh sách ô"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-[12px] bg-card py-1 shadow-card ring-1 ring-border"
        >
          {matches.length === 0 ? (
            <li className="px-sm py-xs text-body-md text-muted">Không có ô nào khớp.</li>
          ) : (
            matches.map((slot) => (
              <li
                key={slot.slotId}
                role="option"
                aria-selected={slot.slotId === current.slotId}
                // mousedown, not click: the input's blur would close the list before a click lands.
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(slot);
                }}
                className={`cursor-pointer px-sm py-xs text-body-md hover:bg-tint-primary ${
                  slot.slotId === current.slotId ? 'font-semibold text-primary' : 'text-text'
                }`}
              >
                {label(slot)}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
