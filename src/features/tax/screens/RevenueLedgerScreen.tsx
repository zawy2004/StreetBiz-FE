import { useState } from 'react';

import { Button, Card, Icon, IconButton, Money, formatVnd } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import {
  errorMessage,
  taxApi,
  type RevenueChannel,
  type RevenueDayDto,
  type RevenueEntryDto,
} from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { saveFile } from '@/core/utils/save-file';
import { colors } from '@/theme';
import { DateInput, FormSheet, MoneyInput, TaxNeedsServer } from '../components/TaxParts';
import {
  CHANNEL_LABEL,
  CHANNEL_OPTIONS,
  FIRST_TAX_YEAR,
  formatDay,
  parseDigits,
  todayIso,
} from '../tax-format';
import { useAddRevenueEntry, useRevenueLedger, useVoidRevenueEntry } from '../useTax';

const MAX_ENTRY = 10_000_000_000;

function monthLabel(year: number, month: number): string {
  return `Tháng ${month}/${year}`;
}

/** Moves a (year, month) pair by whole months. */
function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function EntryRow({ entry, onVoid }: { entry: RevenueEntryDto; onVoid: (entry: RevenueEntryDto) => void }) {
  return (
    <li className="flex items-start justify-between gap-sm py-xs">
      <div className="min-w-0">
        <p className={`font-tabular text-body-lg ${entry.voided ? 'text-muted line-through' : 'text-text'}`}>
          {formatVnd(entry.amount)}
        </p>
        <p className="text-body-sm text-muted">
          {CHANNEL_LABEL[entry.channel]}
          {entry.note ? ` · ${entry.note}` : ''}
        </p>
        {entry.voided ? (
          <p className="text-body-sm text-error">
            Đã huỷ{entry.voidReason ? `: ${entry.voidReason}` : ''} · không tính vào doanh thu
          </p>
        ) : null}
      </div>
      {entry.voided ? (
        <StatusChip label="Đã huỷ" tone="neutral" />
      ) : (
        <IconButton icon="trash-can-outline" accessibilityLabel={`Huỷ khoản ${formatVnd(entry.amount)}`} onPress={() => onVoid(entry)} />
      )}
    </li>
  );
}

function DayCard({ day, onVoid }: { day: RevenueDayDto; onVoid: (entry: RevenueEntryDto) => void }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-sm">
        <h3 className="text-headline-sm text-text">{formatDay(day.date)}</h3>
        <Money amountVnd={day.total} />
      </div>
      {day.onlineOrders > 0 ? (
        <p className="mt-2xs flex items-center gap-xs text-body-sm text-muted">
          <Icon name="receipt-text-outline" size={16} color={colors.muted} />
          {day.onlineOrders} đơn StreetBiz đã hoàn tất · {formatVnd(day.online)}
        </p>
      ) : null}
      {day.entries.length > 0 ? (
        <ul className="mt-xs divide-y divide-border border-t border-border">
          {day.entries.map((entry) => (
            <EntryRow key={entry.entryId} entry={entry} onVoid={onVoid} />
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function AddEntrySheet({ visible, onClose, defaultDate }: { visible: boolean; onClose: () => void; defaultDate: string }) {
  const add = useAddRevenueEntry();
  const [date, setDate] = useState(defaultDate);
  const [amount, setAmount] = useState('');
  const [channel, setChannel] = useState<RevenueChannel>('CASH');
  const [note, setNote] = useState('');

  const value = parseDigits(amount);
  const amountError =
    amount !== '' && value > MAX_ENTRY ? 'Một lần ghi tối đa 10 tỷ đồng.' : undefined;
  const valid = value > 0 && value <= MAX_ENTRY && date !== '';

  const reset = () => {
    setAmount('');
    setNote('');
    setChannel('CASH');
  };

  const submit = () =>
    add.mutate(
      { date, amount: value, channel, note: note.trim() || null },
      {
        onSuccess: () => {
          showToast('Đã ghi vào sổ doanh thu');
          reset();
          onClose();
        },
        onError: (error) => showToast(errorMessage(error)),
      },
    );

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title="Ghi doanh thu bán trực tiếp"
      description="Ghi tiền bán tại chỗ hoặc chuyển khoản vào tài khoản của hộ. Đơn đặt qua StreetBiz đã được ghi tự động, đừng ghi lại."
    >
      <DateInput label="Ngày bán" value={date} onChange={setDate} min={`${FIRST_TAX_YEAR}-01-01`} max={todayIso()} />
      <MoneyInput
        label="Số tiền (đồng)"
        value={amount}
        onChange={setAmount}
        error={amountError}
        placeholder="Ví dụ: 2.500.000"
      />
      <SelectField label="Hình thức nhận tiền" layout="inline" value={channel} options={CHANNEL_OPTIONS} onChange={setChannel} />
      <TextField label="Ghi chú (không bắt buộc)" value={note} onChangeText={setNote} maxLength={300} />
      <Button label="Ghi vào sổ" loading={add.isPending} disabled={!valid || add.isPending} onPress={submit} />
    </FormSheet>
  );
}

/**
 * The household's revenue book for one month: StreetBiz orders (counted automatically, net of
 * refunds) and the sales the household records itself. A wrong entry is voided, not deleted, so
 * the book keeps its history.
 */
export function RevenueLedgerScreen() {
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [adding, setAdding] = useState(false);
  const [voiding, setVoiding] = useState<RevenueEntryDto>();
  const [reason, setReason] = useState('');
  const [exporting, setExporting] = useState(false);
  const ledger = useRevenueLedger(period.year, period.month);
  const voidEntry = useVoidRevenueEntry();
  const data = ledger.data;

  const thisMonth = period.year === now.getFullYear() && period.month === now.getMonth() + 1;
  const canGoBack = period.year * 12 + period.month > FIRST_TAX_YEAR * 12 + 1;
  const defaultDate = thisMonth ? todayIso() : `${period.year}-${String(period.month).padStart(2, '0')}-01`;

  const confirmVoid = () => {
    if (!voiding) return;
    voidEntry.mutate(
      { entryId: voiding.entryId, reason: reason.trim() || null },
      {
        onSuccess: () => {
          showToast('Đã huỷ khoản này');
          setVoiding(undefined);
          setReason('');
        },
        onError: (error) => showToast(errorMessage(error)),
      },
    );
  };

  const exportBook = async () => {
    setExporting(true);
    try {
      saveFile(await taxApi.exportRevenueBook(period.year), `so-doanh-thu-${period.year}.xlsx`);
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Sổ doanh thu"
        subtitle="Đơn StreetBiz tự ghi · bán trực tiếp do hộ ghi"
        back
        right={
          isLiveApi ? (
            <>
              <Button
                label="Tải Excel cả năm"
                variant="outline"
                size="sm"
                fullWidth={false}
                loading={exporting}
                onPress={() => void exportBook()}
              />
              <Button
                label="Ghi doanh thu"
                size="sm"
                fullWidth={false}
                icon={<Icon name="plus" size={18} color={colors.onPrimary} />}
                onPress={() => setAdding(true)}
              />
            </>
          ) : undefined
        }
      />
      {!isLiveApi ? (
        <TaxNeedsServer />
      ) : (
        <>
          <div className="flex items-center justify-between gap-sm">
            <IconButton
              icon="chevron-left"
              accessibilityLabel="Tháng trước"
              disabled={!canGoBack}
              onPress={() => setPeriod((p) => shiftMonth(p.year, p.month, -1))}
            />
            <h2 className="text-headline-md text-text" aria-live="polite">
              {monthLabel(period.year, period.month)}
            </h2>
            <IconButton
              icon="chevron-right"
              accessibilityLabel="Tháng sau"
              disabled={thisMonth}
              onPress={() => setPeriod((p) => shiftMonth(p.year, p.month, 1))}
            />
          </div>

          {ledger.isLoading ? (
            <LoadingState />
          ) : ledger.isError || !data ? (
            <ErrorState message={errorMessage(ledger.error)} onRetry={() => ledger.refetch()} />
          ) : (
            <>
              <Card>
                <p className="text-body-sm text-muted">Doanh thu {monthLabel(data.year, data.month).toLowerCase()}</p>
                <Money amountVnd={data.totals.total} size="lg" />
                <dl className="mt-sm grid grid-cols-2 gap-sm border-t border-border pt-sm">
                  <div>
                    <dt className="text-body-xs text-muted">Đơn hàng StreetBiz</dt>
                    <dd className="font-tabular text-body-lg text-text">{formatVnd(data.totals.online)}</dd>
                  </div>
                  <div>
                    <dt className="text-body-xs text-muted">Bán trực tiếp</dt>
                    <dd className="font-tabular text-body-lg text-text">{formatVnd(data.totals.recorded)}</dd>
                  </div>
                </dl>
              </Card>

              {data.days.length === 0 ? (
                <EmptyState
                  icon="receipt-text-outline"
                  title="Tháng này chưa có doanh thu"
                  description="Đơn hàng hoàn tất sẽ tự vào sổ. Tiền bán trực tiếp bạn ghi bằng nút “Ghi doanh thu”."
                />
              ) : (
                <div className="grid gap-sm md:grid-cols-2">
                  {data.days.map((day) => (
                    <DayCard key={day.date} day={day} onVoid={setVoiding} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      <AddEntrySheet
        key={adding ? `open-${defaultDate}` : 'closed'}
        visible={adding}
        onClose={() => setAdding(false)}
        defaultDate={defaultDate}
      />

      <FormSheet
        visible={voiding !== undefined}
        onClose={() => {
          setVoiding(undefined);
          setReason('');
        }}
        title="Huỷ khoản doanh thu này?"
        description={
          voiding
            ? `${formatVnd(voiding.amount)} ngày ${formatDay(voiding.date)} sẽ không còn được tính, nhưng vẫn nằm trong sổ (gạch ngang) để đối chiếu.`
            : undefined
        }
      >
        <TextField label="Lý do (không bắt buộc)" value={reason} onChangeText={setReason} maxLength={300} />
        <Button label="Huỷ khoản này" variant="danger" loading={voidEntry.isPending} disabled={voidEntry.isPending} onPress={confirmVoid} />
      </FormSheet>
    </Screen>
  );
}
