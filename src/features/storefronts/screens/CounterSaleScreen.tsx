import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { Button, formatVnd } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { sellerStoreApi, type SellerMenuItem } from '@/core/api/seller-store-api';
import { isLiveApi } from '@/core/config/env';
import { TaxNeedsServer } from '@/features/tax/components/TaxParts';
import { todayIso } from '@/features/tax/tax-format';
import { useAddRevenueEntry, useRevenueLedger, useVoidRevenueEntry } from '@/features/tax/useTax';
import {
  UNDO_MS,
  add,
  clearDish,
  countOf,
  isSellable,
  remove,
  saleNote,
  toLines,
  totalOf,
  type Basket,
} from '../counter-sale';

/** A sale just recorded and still undoable. */
type Recorded = { entryId: number; amount: number };

/**
 * "Bán tại quầy": one tap per dish while serving a customer who pays cash, then one button to record
 * it in the revenue book (the same book the tax pages read, POST /vendor/tax/revenue-entries). A
 * mistaken sale is undone within ten seconds; the book keeps the voided line, as it always does.
 *
 * This is a note-taker, not a till: it is not an electronic invoice and does not replace one.
 */
export function CounterSaleScreen() {
  const [params] = useSearchParams();
  const stores = useQuery({
    queryKey: ['commerce', 'stores'],
    queryFn: sellerStoreApi.stores,
    enabled: isLiveApi,
  });
  const storeId = Number(params.get('storefrontId')) || stores.data?.[0]?.storefrontId;
  const menu = useQuery({
    queryKey: ['commerce', 'seller-menu', storeId],
    queryFn: () => sellerStoreApi.menu(storeId!),
    enabled: isLiveApi && Boolean(storeId),
  });

  const today = todayIso();
  const [year, month] = today.split('-').map(Number) as [number, number];
  const ledger = useRevenueLedger(year, month);
  const day = ledger.data?.days.find((d) => d.date === today);

  const addEntry = useAddRevenueEntry();
  const voidEntry = useVoidRevenueEntry();

  const [basket, setBasket] = useState<Basket>({});
  const [recorded, setRecorded] = useState<Recorded | null>(null);
  // Set the instant the button is pressed. `isPending` only changes on the next render, so two
  // presses in the same moment would both get through and record the sale twice.
  const recording = useRef(false);

  // The undo offer lapses on its own.
  useEffect(() => {
    if (!recorded) return;
    const timer = setTimeout(() => setRecorded(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [recorded]);

  const items = useMemo<SellerMenuItem[]>(() => menu.data?.items ?? [], [menu.data]);
  const lines = useMemo(() => toLines(basket, items), [basket, items]);
  const total = totalOf(lines);
  const count = countOf(lines);

  if (!isLiveApi) {
    return (
      <Screen>
        <AppHeader title="Bán tại quầy" back />
        <TaxNeedsServer />
      </Screen>
    );
  }
  if (stores.isPending || (storeId && menu.isPending)) {
    return (
      <Screen>
        <AppHeader title="Bán tại quầy" back />
        <LoadingState label="Đang tải thực đơn" />
      </Screen>
    );
  }
  if (stores.isError || menu.isError) {
    return (
      <Screen>
        <AppHeader title="Bán tại quầy" back />
        <ErrorState
          message={errorMessage(stores.error ?? menu.error)}
          onRetry={() => {
            void stores.refetch();
            void menu.refetch();
          }}
        />
      </Screen>
    );
  }
  if (!storeId || items.length === 0) {
    return (
      <Screen>
        <AppHeader title="Bán tại quầy" back />
        <EmptyState
          icon="silverware-fork-knife"
          title={storeId ? 'Chưa có món để bán' : 'Cần tạo gian hàng trước'}
          description="Thêm món vào thực đơn rồi quay lại đây để ghi bán hàng nhanh."
        />
      </Screen>
    );
  }

  const record = () => {
    if (lines.length === 0 || recording.current) return;
    recording.current = true;
    addEntry.mutate(
      { date: todayIso(), amount: total, channel: 'CASH', note: saleNote(lines) },
      {
        onSuccess: (entry) => {
          setRecorded({ entryId: entry.entryId, amount: entry.amount });
          setBasket({});
        },
        onSettled: () => {
          recording.current = false;
        },
      },
    );
  };

  const undo = () => {
    if (!recorded) return;
    voidEntry.mutate(
      { entryId: recorded.entryId, reason: 'Bấm nhầm' },
      {
        onSuccess: () => {
          showToast(`Đã hoàn tác khoản ${formatVnd(recorded.amount)}`);
          setRecorded(null);
        },
      },
    );
  };

  const footer = (
    <StickyActions>
      {/* One full-width bar (StickyActions would otherwise shrink its child to a button's width on
          desktop): the total on the left, the two actions on the right. */}
      <div className="flex w-full flex-col gap-xs lg:!w-full lg:flex-row lg:items-center lg:justify-between lg:gap-lg">
        <div className="flex items-baseline justify-between gap-sm lg:justify-start">
          <span className="text-body-md text-muted">
            {count > 0 ? `${count} món` : 'Chạm món để thêm'}
          </span>
          <span
            aria-live="polite"
            className="font-sign text-[34px] font-extrabold leading-none text-text font-tabular"
          >
            {formatVnd(total)}
          </span>
        </div>
        {addEntry.isError ? (
          <p role="alert" className="text-body-md text-error">
            {errorMessage(addEntry.error)} Khoản này chưa được ghi, bạn bấm lại nhé.
          </p>
        ) : null}
        <div className="flex gap-sm lg:w-[420px] lg:shrink-0">
          <Button
            label="Xoá hết"
            variant="outline"
            fullWidth={false}
            disabled={count === 0 || addEntry.isPending}
            onPress={() => setBasket({})}
          />
          <Button
            label="Đã thu tiền mặt"
            size="lg"
            loading={addEntry.isPending}
            disabled={count === 0}
            onPress={record}
          />
        </div>
      </div>
    </StickyActions>
  );

  return (
    <Screen footer={footer}>
      <AppHeader title="Bán tại quầy" back subtitle="Chạm món, rồi bấm Đã thu tiền mặt" />

      {recorded ? (
        <div
          role="status"
          className="flex items-center justify-between gap-sm rounded-[16px] bg-tint-tertiary px-md py-sm"
        >
          <span className="text-body-lg font-semibold text-text">
            Đã ghi {formatVnd(recorded.amount)} vào sổ doanh thu
          </span>
          <Button
            label="Hoàn tác"
            variant="outline"
            size="sm"
            fullWidth={false}
            loading={voidEntry.isPending}
            onPress={undo}
          />
        </div>
      ) : null}
      {voidEntry.isError ? (
        <p role="alert" className="text-body-md text-error">
          {errorMessage(voidEntry.error)}
        </p>
      ) : null}

      <ul className="grid grid-cols-2 gap-sm md:grid-cols-3">
        {items.map((item) => {
          const quantity = basket[item.menuItemId] ?? 0;
          const sellable = isSellable(item);
          return (
            <li key={item.menuItemId}>
              <button
                type="button"
                disabled={!sellable}
                onClick={() => setBasket((b) => add(b, item.menuItemId))}
                aria-label={
                  sellable
                    ? `Thêm ${item.name}, ${formatVnd(item.unitPrice)}`
                    : `${item.name}, hết hàng`
                }
                className={`relative flex min-h-[104px] w-full flex-col items-start justify-between gap-xs rounded-[20px] p-md text-left shadow-card ring-1 transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${
                  quantity > 0 ? 'bg-tint-primary ring-primary' : 'bg-card ring-border'
                }`}
              >
                <span className="text-[17px] font-semibold leading-snug text-text">
                  {item.name}
                </span>
                <span className="font-sign text-[20px] font-bold text-primary font-tabular">
                  {sellable ? formatVnd(item.unitPrice) : 'Hết hàng'}
                </span>
                {quantity > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute right-sm top-sm flex h-8 min-w-8 items-center justify-center rounded-full bg-primary px-2 font-sign text-[16px] font-bold text-white"
                  >
                    ×{quantity}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {lines.length > 0 ? (
        <section
          aria-label="Món đang chọn"
          className="flex flex-col gap-xs rounded-[20px] bg-card p-md shadow-card ring-1 ring-border"
        >
          <h2 className="text-headline-sm text-text">Đang chọn</h2>
          <ul className="flex flex-col divide-y divide-border">
            {lines.map(({ item, quantity, amount }) => (
              <li key={item.menuItemId} className="flex items-center gap-sm py-xs">
                <span className="min-w-0 flex-1 truncate text-body-lg text-text">{item.name}</span>
                <button
                  type="button"
                  aria-label={`Bớt ${item.name}`}
                  onClick={() => setBasket((b) => remove(b, item.menuItemId))}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-sunken text-[22px] font-bold text-text"
                >
                  −
                </button>
                <span className="w-7 text-center font-sign text-[18px] font-bold font-tabular">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label={`Thêm một ${item.name}`}
                  onClick={() => setBasket((b) => add(b, item.menuItemId))}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-sunken text-[22px] font-bold text-text"
                >
                  +
                </button>
                <span className="w-24 text-right font-tabular text-body-lg text-text">
                  {formatVnd(amount)}
                </span>
                <button
                  type="button"
                  aria-label={`Bỏ ${item.name}`}
                  onClick={() => setBasket((b) => clearDish(b, item.menuItemId))}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-error"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        aria-label="Hôm nay"
        className="flex flex-col gap-xs rounded-[20px] bg-card p-md shadow-card ring-1 ring-border"
      >
        <h2 className="text-headline-sm text-text">Hôm nay</h2>
        {ledger.isPending ? (
          <p className="text-body-md text-muted">Đang tải…</p>
        ) : (
          <dl className="grid grid-cols-3 gap-sm text-center">
            <div>
              <dt className="text-body-sm text-muted">Bạn ghi</dt>
              <dd className="font-sign text-[20px] font-bold text-text font-tabular">
                {formatVnd(day?.recorded ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-body-sm text-muted">Đơn online</dt>
              <dd className="font-sign text-[20px] font-bold text-text font-tabular">
                {formatVnd(day?.online ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-body-sm text-muted">Tổng</dt>
              <dd className="font-sign text-[20px] font-bold text-primary font-tabular">
                {formatVnd(day?.total ?? 0)}
              </dd>
            </div>
          </dl>
        )}
        <p className="text-body-sm text-muted">
          Sổ này giúp bạn theo dõi doanh thu và thuế. Đây không phải hoá đơn điện tử; hộ thuộc diện
          phải xuất hoá đơn vẫn dùng công cụ riêng.
        </p>
      </section>
    </Screen>
  );
}
