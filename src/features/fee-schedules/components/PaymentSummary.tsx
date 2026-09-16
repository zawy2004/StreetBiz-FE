import { Card, Icon, Money } from '@/components/common';
import { colors } from '@/theme';

type Props = {
  title: string;
  amount: number;
  dueDate?: string;
};

export function PaymentSummary({ title, amount, dueDate }: Props) {
  return (
    <>
      <Card>
        <div className="flex flex-col gap-2xs">
          <span className="text-body-md text-muted">{title}</span>
          <Money amountVnd={amount} size="lg" />
          {dueDate ? (
            <span className="text-body-sm text-muted">
              Hạn thanh toán {new Date(dueDate).toLocaleDateString('vi-VN')}
            </span>
          ) : null}
        </div>
      </Card>
      <Card padded={false}>
        <div className="flex items-center gap-sm p-md">
          <Icon name="wallet-outline" size={22} color={colors.tertiary} />
          <span className="flex-1 text-body-md text-text">Ví điện tử MoMo / ZaloPay</span>
          <Icon name="check-circle" size={20} color={colors.tertiary} />
        </div>
      </Card>
    </>
  );
}
