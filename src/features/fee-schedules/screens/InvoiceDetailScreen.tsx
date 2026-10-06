import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { Button, Card, Divider, Icon, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { errorMessage, financeApi } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { saveFile } from '@/core/utils/save-file';
import { colors } from '@/theme';
import { useInvoiceDetail } from '../useFinance';

export function InvoiceDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);
  const { invoice, isLoading, isError, error, refetch } = useInvoiceDetail(invoiceId);
  const [downloading, setDownloading] = useState(false);

  const downloadPdf = async (invoiceNumber: string) => {
    if (!isLiveApi) {
      showToast('Tải PDF chỉ có khi kết nối máy chủ (đang ở chế độ demo).');
      return;
    }
    setDownloading(true);
    try {
      saveFile(await financeApi.invoicePdf(invoiceId), `${invoiceNumber}.pdf`);
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

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

  const penalty = invoice.kind === 'PENALTY';
  const provider =
    invoice.paymentProvider === 'MOMO'
      ? 'MoMo'
      : invoice.paymentProvider === 'ZALOPAY'
        ? 'ZaloPay'
        : invoice.paymentProvider;
  // The receipt's lines, in the order the PDF prints them; a line with nothing to say is left out.
  const lines: { label: string; value: string | null | undefined }[] = [
    { label: 'Đơn vị thu', value: invoice.wardName ? `UBND ${invoice.wardName}` : null },
    { label: 'Người nộp', value: invoice.payerName },
    { label: 'Hộ kinh doanh', value: invoice.businessName },
    { label: 'Ô vỉa hè', value: invoice.slotCode },
    penalty
      ? { label: 'Vi phạm', value: invoice.violationLabel }
      : { label: 'Kỳ phí', value: invoice.periodLabel },
    { label: 'Quyết định xử phạt', value: penalty ? invoice.decisionNumber : null },
    { label: 'Hình thức', value: provider },
    { label: 'Mã giao dịch', value: invoice.providerReference },
    {
      label: 'Thời điểm thanh toán',
      value: invoice.paidAt
        ? new Date(invoice.paidAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
        : null,
    },
  ];
  const shown = lines.filter((line) => line.value);

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Tải hoá đơn (PDF)"
            variant="outline"
            loading={downloading}
            disabled={downloading}
            onPress={() => void downloadPdf(invoice.invoiceNumber)}
          />
        </StickyActions>
      }
    >
      <AppHeader title={invoice.invoiceNumber} back />
      <Card>
        <div className="flex flex-col items-center gap-xs text-center">
          <Icon name="receipt" size={32} color={colors.tertiary} />
          <p className="text-label text-muted">{penalty ? 'Biên lai nộp tiền phạt' : 'Biên lai phí thuê ô'}</p>
          <Money amountVnd={invoice.amount} size="lg" />
          {invoice.amountInWords ? (
            <p className="text-body-sm italic text-muted">Bằng chữ: {invoice.amountInWords}</p>
          ) : null}
          <div className="flex items-center gap-xs">
            <StatusChip code={invoice.paidAt ? 'PAID' : 'PENDING'} />
            <span className="text-body-sm text-muted">
              Xuất ngày {new Date(invoice.issuedAt).toLocaleDateString('vi-VN')}
            </span>
          </div>
        </div>
      </Card>
      <Card padded={false}>
        <dl className="px-md">
          {shown.map((line, index) => (
            <div key={line.label}>
              {index ? <Divider /> : null}
              <div className="flex items-start justify-between gap-md py-sm">
                <dt className="shrink-0 text-body-md text-muted">{line.label}</dt>
                <dd className="text-right text-body-md text-text">{line.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </Card>
      <p className="px-2xs text-body-xs text-muted">
        Chứng từ do StreetBiz lập sau khi cổng thanh toán xác nhận; không thay thế biên lai thu phí, lệ
        phí hoặc biên lai thu tiền phạt do cơ quan có thẩm quyền phát hành.
      </p>
    </Screen>
  );
}
