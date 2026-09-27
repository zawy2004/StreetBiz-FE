import { useParams } from 'react-router-dom';

import { Button, Card, Divider, Icon, ListRow, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { colors } from '@/theme';
import { useInvoiceDetail } from '../useFinance';

export function InvoiceDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);
  const { invoice, isLoading, isError, error, refetch } = useInvoiceDetail(invoiceId);

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="Hoá đơn" back />
        <LoadingState />
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen>
        <AppHeader title="Hoá đơn" back />
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      </Screen>
    );
  }
  if (!invoice) return <ErrorState message="Không tìm thấy hoá đơn." />;

  const itemLabel = invoice.kind === 'PENALTY' ? 'Biên bản phạt' : 'Khoản phí';
  const itemSubtitle = invoice.kind === 'PENALTY' ? invoice.violationLabel : invoice.periodLabel;

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Tải hoá đơn (PDF)"
            variant="outline"
            onPress={() => showToast('Đã lưu hoá đơn vào thiết bị (demo)')}
          />
        </StickyActions>
      }
    >
      <AppHeader title={invoice.invoiceNumber} back />
      <Card>
        <div className="flex flex-col items-center gap-xs">
          <Icon name="receipt" size={32} color={colors.tertiary} />
          <Money amountVnd={invoice.amount} size="lg" />
          <span className="text-body-sm text-muted">
            Xuất ngày {new Date(invoice.issuedAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
      </Card>
      <Card padded={false}>
        <div className="px-md">
          {itemSubtitle ? (
            <>
              <ListRow title={itemLabel} subtitle={itemSubtitle} />
              <Divider />
            </>
          ) : null}
          <ListRow
            title="Trạng thái"
            trailing={<StatusChip code={invoice.paidAt ? 'PAID' : 'PENDING'} />}
          />
        </div>
      </Card>
    </Screen>
  );
}
