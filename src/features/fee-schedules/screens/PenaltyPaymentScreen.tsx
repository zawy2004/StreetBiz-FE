import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { PaymentSummary } from '../components/PaymentSummary';

export function PenaltyPaymentScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const penalty = useMockDb((s) => s.penalties.find((p) => p.id === id));
  const payPenalty = useMockDb((s) => s.payPenalty);
  const [processing, setProcessing] = useState(false);

  if (!penalty) return <ErrorState message="Không tìm thấy biên bản phạt." />;

  const pay = () => {
    setProcessing(true);
    setTimeout(() => {
      payPenalty(penalty.id);
      setProcessing(false);
      showToast('Thanh toán thành công');
      navigate(-1);
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
      <AppHeader title="Thanh toán biên bản phạt" back />
      <PaymentSummary title={penalty.reason} amount={penalty.amount} />
    </Screen>
  );
}
