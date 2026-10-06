import { Button, Card, Icon, Money, formatVnd } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage, type WardDebtorDto } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { colors } from '@/theme';
import { useRemindDebtor, useWardDebtors } from '../useWardReports';

const day = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

function DebtorCard({ debtor }: { debtor: WardDebtorDto }) {
  const remind = useRemindDebtor();
  const remindedToday = debtor.remindedToday || remind.isSuccess;

  const send = () =>
    remind.mutate(debtor.contractId, {
      onSuccess: () => showToast(`Đã gửi nhắc nợ đến ${debtor.businessName ?? debtor.vendorName}`),
      onError: (error) => showToast(errorMessage(error)),
    });

  return (
    <Card>
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="truncate text-headline-sm text-text">{debtor.businessName ?? debtor.vendorName}</p>
          <p className="text-body-sm text-muted">
            {[debtor.businessName ? debtor.vendorName : null, `Ô ${debtor.slotCode}`, debtor.zoneName]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <StatusChip label={`Quá hạn ${debtor.daysOverdue} ngày`} tone="danger" />
      </div>

      <div className="mt-sm grid grid-cols-2 gap-sm">
        <div>
          <p className="text-body-xs text-muted">Nợ quá hạn · {debtor.overdueCount} kỳ</p>
          <Money amountVnd={debtor.overdueAmount} />
        </div>
        <div>
          <p className="text-body-xs text-muted">Sắp đến hạn</p>
          <Money amountVnd={debtor.upcomingAmount} />
        </div>
      </div>
      <p className="mt-2xs text-body-sm text-muted">Hạn cũ nhất chưa nộp: {day(debtor.oldestDueDate)}</p>

      <div className="mt-sm flex flex-wrap items-center justify-between gap-sm border-t border-border pt-sm">
        <span className="flex items-center gap-2xs text-body-sm text-muted">
          <Icon name="bell-outline" size={16} color={colors.muted} />
          {debtor.lastRemindedAt
            ? `Nhắc lần cuối ${new Date(debtor.lastRemindedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}`
            : 'Chưa nhắc lần nào'}
        </span>
        <div className="flex gap-xs">
          {debtor.vendorPhone ? (
            <a
              href={`tel:${debtor.vendorPhone}`}
              className="inline-flex h-9 items-center gap-xs rounded-sm border border-border bg-card px-sm text-label font-semibold text-text hover:bg-sunken"
            >
              <Icon name="phone-outline" size={16} />
              Gọi
            </a>
          ) : null}
          <Button
            label={remindedToday ? 'Đã nhắc hôm nay' : 'Nhắc nợ'}
            size="sm"
            fullWidth={false}
            variant={remindedToday ? 'outline' : 'primary'}
            loading={remind.isPending}
            disabled={remindedToday || remind.isPending}
            onPress={send}
          />
        </div>
      </div>
    </Card>
  );
}

/**
 * WARD-14: who owes the ward rental fees past their due date, most overdue first, with a one-tap
 * in-app reminder (one per household per day) and the phone number for a call.
 */
export function WardDebtorsScreen() {
  const debtors = useWardDebtors();
  const rows = debtors.data ?? [];
  const total = rows.reduce((sum, row) => sum + row.overdueAmount, 0);

  return (
    <Screen width="wide">
      <AppHeader
        title="Hộ nợ phí quá hạn"
        subtitle={rows.length ? `${rows.length} hộ · ${formatVnd(total)} quá hạn` : undefined}
        back
      />
      {!isLiveApi ? (
        <EmptyState icon="information-outline" title="Danh sách nợ phí chỉ có khi kết nối máy chủ" />
      ) : debtors.isLoading ? (
        <LoadingState />
      ) : debtors.isError ? (
        <ErrorState message={errorMessage(debtors.error)} onRetry={() => debtors.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon="check-circle-outline" title="Không có hộ nào nợ phí quá hạn" />
      ) : (
        <div className="grid gap-sm md:grid-cols-2">
          {rows.map((debtor) => (
            <DebtorCard key={debtor.contractId} debtor={debtor} />
          ))}
        </div>
      )}
    </Screen>
  );
}
