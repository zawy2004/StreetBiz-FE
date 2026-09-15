import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { PaymentSummary } from '../components/PaymentSummary';

export function FeePaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const fee = useMockDb((s) => s.feeItems.find((f) => f.id === id));
  const payFee = useMockDb((s) => s.payFee);
  const [processing, setProcessing] = useState(false);

  if (!fee) return <ErrorState message="Không tìm thấy khoản phí." />;

  const pay = () => {
    setProcessing(true);
    setTimeout(() => {
      payFee(fee.id);
      setProcessing(false);
      showToast('Thanh toán thành công');
      router.back();
    }, 900);
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Thanh toán qua MoMo / ZaloPay" onPress={pay} loading={processing} />
        </StickyActions>
      }
    >
      <AppHeader title="Thanh toán phí thuê ô" back />
      <PaymentSummary title={fee.period_label} amount={fee.amount} dueDate={fee.due_date} />
    </Screen>
  );
}
