import { useState } from 'react';

import { Button, formatVnd, Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import type { PriceChangeKind } from '@/core/api/seller-store-api';
import { formatBoardStamp } from '@/features/price-board/price-board-format';

/** Units a street stall prices by; any other can be typed (1-30 characters). */
const COMMON_UNITS = ['phần', 'ổ', 'ly', 'tô', 'đĩa', 'chai', 'cái', 'kg'];

/** Quick picks that fill the "Đơn vị tính" field; the chosen one is pressed. */
export function UnitChips({ value, onPick }: { value: string; onPick: (unit: string) => void }) {
  return (
    <div role="group" aria-label="Đơn vị thường dùng" className="flex flex-wrap gap-xs">
      {COMMON_UNITS.map((unit) => {
        const active = value.trim() === unit;
        return (
          <button
            key={unit}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(unit)}
            className={[
              'h-9 rounded-full px-sm text-label transition-colors',
              active
                ? 'bg-primary font-semibold text-on-primary'
                : 'bg-card text-text ring-1 ring-border hover:ring-text/25',
            ].join(' ')}
          >
            {unit}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The paper board's state at a glance: which version the public board is ("Bản số N"),
 * when it last changed, and the button that opens the A5 page to print and hang at the
 * stall. Without a live permit there is no QR to print, so the button says why it waits.
 */
export function PriceBoardStrip({
  version,
  updatedAt,
  loading,
  canPrint,
  onPrint,
  cannotPrintNote = 'Cần giấy phép còn hiệu lực để in bảng giá có mã QR.',
}: {
  version: number | undefined;
  updatedAt: string | null | undefined;
  loading: boolean;
  canPrint: boolean;
  onPrint: () => void;
  /** Why printing waits, shown under the disabled button. */
  cannotPrintNote?: string;
}) {
  const stamp = formatBoardStamp(updatedAt);
  return (
    <section
      aria-label="Bảng giá niêm yết"
      className="flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:flex-row md:items-center md:justify-between md:gap-lg"
    >
      <div className="flex min-w-0 items-start gap-sm">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint-primary text-primary">
          <Icon name="tag-outline" size={20} color="currentColor" />
        </span>
        <div className="min-w-0">
          {loading ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <p className="font-sign text-[20px] font-bold leading-tight text-text [font-stretch:94%]">
              {version ? `Bảng giá bản số ${version}` : 'Bảng giá chưa có bản nào'}
              {stamp ? (
                <span className="font-sans text-body-md font-normal text-muted">
                  {' '}
                  · cập nhật {stamp}
                </span>
              ) : null}
            </p>
          )}
          <p className="mt-0.5 text-body-md text-text/75">
            Mỗi lần đổi giá, đơn vị hay gỡ món là một bản mới. In lại và treo tại quầy: bảng giấy là
            bắt buộc, mã QR trên bảng giúp khách đối chiếu.
          </p>
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-1 md:w-auto md:items-end">
        <Button
          label="In bảng giá"
          variant="outline"
          disabled={loading || !canPrint}
          icon={<Icon name="printer" size={19} color="currentColor" />}
          onPress={onPrint}
        />
        {!loading && !canPrint ? (
          <p className="text-body-sm text-muted md:text-right">{cannotPrintNote}</p>
        ) : null}
      </div>
    </section>
  );
}

const KIND_LABELS: Record<PriceChangeKind, string> = {
  CREATED: 'Thêm món',
  UPDATED: 'Sửa món',
  ARCHIVED: 'Gỡ khỏi bảng giá',
  RESTORED: 'Hiện lại',
};

export type PriceHistoryRow = {
  priceHistoryId: number | string;
  name: string;
  nameEn: string | null;
  priceUnit: string;
  unitPrice: number;
  previousUnitPrice: number | null;
  isListed: boolean;
  changeKind: PriceChangeKind;
  changedAt: string;
  changedByName: string;
};

const FIRST_ROWS = 8;

/**
 * "Lịch sử giá": every change to the board, newest first, as the server keeps it (append
 * only): when, which dish, the price before → after with its unit, and who made it.
 */
export function PriceHistoryPanel({
  history,
  loading,
  error,
}: {
  history: PriceHistoryRow[];
  loading?: boolean;
  error?: string | null;
}) {
  const [all, setAll] = useState(false);
  const rows = all ? history : history.slice(0, FIRST_ROWS);
  return (
    <section
      aria-labelledby="price-history-title"
      className="flex flex-col gap-sm rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-sm">
        <h2 id="price-history-title" className="font-heading text-[21px] font-bold text-text">
          Lịch sử giá
        </h2>
        <p className="text-body-sm text-muted">
          Hệ thống chỉ ghi thêm, không sửa hay xóa dòng nào.
        </p>
      </div>
      {loading ? (
        <div role="status" aria-label="Đang tải lịch sử giá" className="flex flex-col gap-xs">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <p role="alert" className="text-body-md text-error">
          {error}
        </p>
      ) : history.length === 0 ? (
        <p className="text-body-md text-muted">Chưa có thay đổi nào.</p>
      ) : (
        <>
          <ol aria-label="Các lần đổi giá" className="flex flex-col divide-y divide-border">
            {rows.map((row) => {
              const changed =
                row.previousUnitPrice != null && row.previousUnitPrice !== row.unitPrice;
              return (
                <li
                  key={row.priceHistoryId}
                  className="flex flex-col gap-0.5 py-sm first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-md"
                >
                  <div className="min-w-0">
                    <p className="text-[16px] font-semibold leading-snug text-text">
                      {row.name}
                      {row.nameEn ? (
                        <span lang="en" className="font-normal italic text-muted">
                          {' '}
                          · {row.nameEn}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-body-sm text-muted">
                      {KIND_LABELS[row.changeKind] ?? row.changeKind} ·{' '}
                      {formatBoardStamp(row.changedAt) ?? '—'} · {row.changedByName}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 font-tabular text-[16px] sm:text-right ${row.isListed ? 'text-text' : 'text-muted line-through'}`}
                  >
                    {changed ? (
                      <>
                        <span className="text-muted line-through">
                          {formatVnd(row.previousUnitPrice!)}
                        </span>
                        <Icon
                          name="arrow-right"
                          size={14}
                          color="currentColor"
                          className="mx-1 inline align-[-2px] text-muted"
                        />
                      </>
                    ) : null}
                    <span className="font-semibold">{formatVnd(row.unitPrice)}</span>
                    <span className="text-muted"> / {row.priceUnit}</span>
                  </p>
                </li>
              );
            })}
          </ol>
          {history.length > FIRST_ROWS ? (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="inline-flex min-h-11 w-fit items-center gap-1 text-label font-semibold text-primary hover:underline"
            >
              {all ? 'Thu gọn' : `Xem tất cả ${history.length} thay đổi`}
              <Icon name={all ? 'chevron-up' : 'chevron-down'} size={16} color="currentColor" />
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
