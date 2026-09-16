import { useParams } from 'react-router-dom';

import { Button, Card, Divider, Icon, ListRow, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function InvoiceDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const invoice = useMockDb((s) => s.invoices.find((i) => i.id === id));
  const feeItem = useMockDb((s) => s.feeItems.find((f) => f.id === invoice?.feeItemId));

  if (!invoice) return <ErrorState message="Không tìm thấy hoá đơn." />;

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
      <AppHeader title={invoice.invoice_number} back />
      <Card>
        <div className="flex flex-col items-center gap-xs">
          <Icon name="receipt" size={32} color={colors.tertiary} />
          <Money amountVnd={invoice.amount} size="lg" />
          <span className="text-body-sm text-muted">
            Xuất ngày {new Date(invoice.issued_at).toLocaleDateString('vi-VN')}
          </span>
        </div>
      </Card>
      {feeItem ? (
        <Card padded={false}>
          <div className="px-md">
            <ListRow title="Khoản phí" subtitle={feeItem.period_label} />
            <Divider />
            <ListRow title="Trạng thái" subtitle="Đã thanh toán" />
          </div>
        </Card>
      ) : null}
    </Screen>
  );
}
