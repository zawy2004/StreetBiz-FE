import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, Skeleton, showToast } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { usePenaltyTreasury } from '../useFinance';
import { LoadingBlock } from '../components/FinanceParts';
import { PenaltyNote, PenaltyNotice } from '../components/PaymentParts';
import { ReceiptForm, ReceiptStatus, TreasuryGuide } from '../components/TreasuryReceipt';

export function PenaltyPaymentScreen() {
  return isLiveApi ? <LivePenaltyPaymentScreen /> : <MockPenaltyPaymentScreen />;
}

const TITLE = 'Nộp phạt vào Kho bạc';

/**
 * A fine is paid to the State Treasury, not through StreetBiz: this page tells the household how,
 * takes the receipt it gets, and shows where the ward's check of it stands. Only the ward can mark
 * the fine as paid (after matching the receipt with the Treasury), never this page.
 */
function LivePenaltyPaymentScreen() {
  const { id } = useParams<{ id: string }>();
  const penaltyId = Number(id);
  const navigate = useNavigate();
  const treasury = usePenaltyTreasury(penaltyId);

  const toFinance = (
    <StickyActions>
      <Button label="Về trang Tài chính" variant="outline" onPress={() => navigate('/vendor/finance')} />
    </StickyActions>
  );

  if (treasury.isPending) {
    return (
      <Screen>
        <AppHeader title={TITLE} back />
        <NoticeSkeleton />
      </Screen>
    );
  }
  if (treasury.isError) {
    return (
      <Screen>
        <AppHeader title={TITLE} back />
        <ErrorState message={errorMessage(treasury.error)} onRetry={() => treasury.refetch()} />
      </Screen>
    );
  }

  const fine = treasury.data;
  const paid = fine.penaltyStatus === 'PAID';
  return (
    <Screen footer={toFinance}>
      <AppHeader title={TITLE} back />
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="flex min-w-0 max-w-[640px] flex-col gap-md">
          <PenaltyNotice
            violationLabel={fine.violationLabel}
            amount={fine.amount}
            slotCode={fine.slotCode}
            issuedAt={fine.issuedAt}
            status={fine.penaltyStatus}
          />
          {fine.latestReceipt ? <ReceiptStatus receipt={fine.latestReceipt} /> : null}
          {paid ? (
            <p role="status" className="text-body-md text-text/80">
              Phường đã ghi nhận khoản phạt này là đã nộp. Hoá đơn nằm trong mục Hoá đơn.
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 max-w-[640px] flex-col gap-md">
          {fine.canSubmit ? (
            <>
              <TreasuryGuide instructions={fine.instructions} />
              <ReceiptForm penaltyId={penaltyId} issuedAt={fine.issuedAt} />
            </>
          ) : null}
          <PenaltyNote />
        </div>
      </div>
    </Screen>
  );
}

/** The demo build has no server to check a receipt, so it keeps the instant local "paid". */
function MockPenaltyPaymentScreen() {
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
      showToast('Đã ghi nhận nộp phạt');
      navigate(-1);
    }, 900);
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Tôi đã nộp phạt vào Kho bạc" onPress={pay} loading={processing} />
        </StickyActions>
      }
    >
      <AppHeader title={TITLE} back />
      <PenaltyNotice
        violationLabel={penalty.reason}
        amount={penalty.amount}
        issuedAt={penalty.issued_at}
        status={penalty.penalty_status}
      />
    </Screen>
  );
}

/** The notice in outline (its red margin already ruled) while the fine loads. */
function NoticeSkeleton() {
  return (
    <LoadingBlock>
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative flex max-w-[640px] flex-col gap-md overflow-hidden rounded-[16px] bg-card py-lg pl-xl pr-lg ring-1 ring-border/80">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-[#B42318]/60" />
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-12 w-3/5" />
        </div>
        <Skeleton className="h-48 w-full max-w-[640px] !rounded-[20px]" />
      </div>
    </LoadingBlock>
  );
}
