import type { ReactNode } from 'react';

import { Icon } from '@/components/common';
import { VERDICT_TONES } from '@/components/illustrations';
import type { PublicPriceBoard } from '@/features/vendor-map/community-api';
import { formatBoardStamp, priceWithUnit } from '../price-board-format';

type Props = {
  board: PublicPriceBoard;
  /** The version printed on the paper board the buyer scanned (its `?v=`), when known. */
  printedVersion?: number;
  /** Static labels in Vietnamese and English (the public /q page). */
  bilingual?: boolean;
  /** Buttons under the board (the complaint actions). */
  children?: ReactNode;
};

/** A Vietnamese label with its English line under it on the bilingual page. */
function Duo({ vi, en, bilingual }: { vi: string; en: string; bilingual?: boolean }) {
  if (!bilingual) return <>{vi}</>;
  return (
    <>
      {vi}
      <span className="block text-[0.82em] font-normal text-muted" lang="en">
        {en}
      </span>
    </>
  );
}

/**
 * BUY-06: the stall's price board as it stands on the server, drawn like the menu board at a
 * street stall: each dish on its own ruled line with a dotted leader to its price and unit,
 * the version and update time in the corner. When the paper board scanned is an older
 * version, a pale notice says so before anything else.
 */
export function PriceBoardCard({ board, printedVersion, bilingual, children }: Props) {
  const stamp = formatBoardStamp(board.updatedAt);
  const outdated = board.printedVersionIsCurrent === false;
  const pending = VERDICT_TONES.pending;

  return (
    <section
      aria-labelledby="price-board-title"
      className="sb-pop overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="flex flex-col gap-md p-md md:p-lg">
        <div className="flex flex-wrap items-start justify-between gap-sm">
          <h2
            id="price-board-title"
            className="font-editorial text-[26px] font-semibold leading-tight tracking-[-0.01em] text-text md:text-[28px]"
          >
            <Duo vi="Bảng giá niêm yết" en="Posted prices" bilingual={bilingual} />
          </h2>
          <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-tint-primary px-sm text-body-sm font-semibold text-primary">
            <Icon name="tag-outline" size={16} color="currentColor" />
            Bản số {board.version}
            {bilingual ? (
              <span lang="en" className="font-normal text-primary/80">
                · v{board.version}
              </span>
            ) : null}
          </span>
        </div>

        {outdated ? (
          <p
            role="status"
            className={`flex items-start gap-xs rounded-[16px] px-md py-sm text-body-md font-semibold ${pending.wash} ${pending.ink}`}
          >
            <Icon
              name="alert-circle-outline"
              size={20}
              color="currentColor"
              className="mt-0.5 shrink-0"
            />
            <span>
              {printedVersion
                ? `Bảng giá tại quầy là bản ${printedVersion}, giá hiện tại là bản ${board.version}.`
                : `Bảng giá tại quầy không phải bản mới nhất (hiện tại là bản ${board.version}).`}
              {bilingual ? (
                <span lang="en" className="block font-normal">
                  {printedVersion
                    ? `The board at the stall is version ${printedVersion}; current prices are version ${board.version}.`
                    : `The board at the stall is not the latest (current: version ${board.version}).`}
                </span>
              ) : null}
            </span>
          </p>
        ) : null}

        {board.items.length === 0 ? (
          <p className="rounded-[16px] bg-sunken/70 px-md py-sm text-body-md text-muted">
            Quầy chưa có món nào trên bảng giá.
          </p>
        ) : (
          <ul
            aria-label="Các món và giá"
            className="flex flex-col divide-y divide-dashed divide-border"
          >
            {board.items.map((item) => (
              <li
                key={item.menuItemId}
                className="flex items-end gap-sm py-sm first:pt-0 last:pb-0"
              >
                <span className="min-w-0">
                  <span className="block text-[18px] font-semibold leading-snug text-text">
                    {item.name}
                  </span>
                  {item.nameEn ? (
                    <span lang="en" className="block text-body-sm italic text-muted">
                      {item.nameEn}
                    </span>
                  ) : null}
                </span>
                <span
                  aria-hidden="true"
                  className="mb-[7px] min-w-[24px] flex-1 border-b-2 border-dotted border-border"
                />
                <span className="shrink-0 text-right font-sign text-[20px] font-bold leading-tight text-primary font-tabular [font-stretch:94%]">
                  {priceWithUnit(item.unitPrice, item.priceUnit)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-1 border-t border-border pt-sm text-body-sm text-muted">
          {stamp ? (
            <p className="flex items-center gap-1.5">
              <Icon name="clock-outline" size={16} color="currentColor" />
              <span>
                Cập nhật lúc {stamp}
                {bilingual ? <span lang="en"> · Updated {stamp}</span> : null}
              </span>
            </p>
          ) : null}
          <p>
            Giá bằng đồng Việt Nam cho mỗi đơn vị tính. Bảng giá giấy tại quầy là bắt buộc; mã QR
            giúp bạn đối chiếu.
            {bilingual ? (
              <span lang="en" className="block">
                Prices in VND per unit shown. The paper board at the stall is the official one; the
                QR code lets you check it.
              </span>
            ) : null}
          </p>
        </div>

        {children}
      </div>
    </section>
  );
}
