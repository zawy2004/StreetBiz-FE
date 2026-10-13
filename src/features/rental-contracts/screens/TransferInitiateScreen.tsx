import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { PhoneField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, Skeleton, showToast } from '@/components/feedback';
import type { ApiRegistration } from '@/core/api';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { REGISTRATIONS_KEY } from '@/features/business-registrations/useRegistrations';
import { Callout } from '@/features/sidewalk-slots/components/Callout';
import { ContractSummary } from '@/features/sidewalk-slots/components/ContractSummary';
import {
  TRANSFER_STEP_LABELS,
  contractProgress,
  isLiveContract,
} from '@/features/sidewalk-slots/my-slots-view';
import { hkdCode } from '@/features/sidewalk-slots/slot-format';
import { useAuthStore } from '@/store/auth-store';

/** "905999997" -> "+84 905 999 997"; display only, the request carries what was typed. */
function readablePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').replace(/^84/, '').replace(/^0/, '');
  return `+84 ${digits.replace(/(\d{3})(?=\d)/g, '$1 ')}`;
}

/**
 * Handing a slot to another household, drawn as a handover: you, the slot in
 * the middle (still yours, with a lock), and the receiver whose card holds the
 * phone field. Below, the three steps it goes through and what is passed on.
 */
export function TransferInitiateScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const contractId = Number(id);
  const validId = Number.isFinite(contractId);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const [error, setError] = useState<string>();

  const contract = useQuery({
    queryKey: ['side', userId, 'contract', contractId],
    queryFn: () => sideApi.getContract(contractId),
    enabled: validId,
  });

  const submit = useMutation({
    mutationFn: () => sideApi.requestTransfer({ contractId, toVendorPhone: phone }),
    onSuccess: (result) => {
      showToast(result.message);
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'transfers'] });
      navigate(-1);
    },
    onError: (err) =>
      setError(err instanceof SideApiError ? err.message : 'Không gửi được yêu cầu.'),
  });

  if (!validId)
    return (
      <Screen>
        <ErrorState message="Mã hợp đồng không hợp lệ." />
      </Screen>
    );
  if (contract.isPending) return <TransferSkeleton />;
  if (contract.error)
    return (
      <Screen>
        <ErrorState message={contract.error.message} onRetry={() => void contract.refetch()} />
      </Screen>
    );

  const handleSubmit = () => {
    setError(undefined);
    if (phone.replace(/\D/g, '').length < 9) return setPhoneError('Số điện thoại chưa hợp lệ.');
    setPhoneError(undefined);
    submit.mutate();
  };

  const live = isLiveContract(contract.data.contractStatus);
  const daysLeft = live
    ? contractProgress(contract.data.startDate, contract.data.endDate, new Date()).daysLeft
    : null;
  // Display only, from what the top bar has already loaded: no request of its own.
  const registration = queryClient
    .getQueryData<ApiRegistration[]>(REGISTRATIONS_KEY)
    ?.find((r) => r.registrationStatus === 'APPROVED');
  const phoneReady = phone.replace(/\D/g, '').length >= 9;

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Gửi yêu cầu" loading={submit.isPending} onPress={handleSubmit} />
        </StickyActions>
      }
    >
      <AppHeader
        title="Chuyển nhượng ô"
        back
        subtitle="Chuyển ô đang thuê cho hộ kinh doanh khác"
      />

      {/* The handover: you -> the slot -> the receiver. */}
      <div className="flex flex-col items-stretch gap-0 xl:grid xl:grid-cols-[minmax(0,0.7fr)_auto_minmax(0,1fr)_auto_minmax(0,1.4fr)] xl:items-center">
        <PartyCard
          icon="storefront-outline"
          label="Bên chuyển"
          name={registration?.displayName || 'Hộ của bạn'}
          sub={
            registration?.registrationId != null ? hkdCode(registration.registrationId) : undefined
          }
        />
        <Connector lock />
        <section className="flex flex-col gap-sm overflow-hidden rounded-[22px] bg-card p-md shadow-sheet ring-1 ring-border md:p-lg">
          <p className="text-badge text-muted">Ô CHUYỂN NHƯỢNG</p>
          <ContractSummary contract={contract.data} live={live} />
        </section>
        <Connector />
        <section
          className={`cq flex flex-col gap-sm rounded-[22px] p-md shadow-card ring-1 transition-colors md:p-lg ${
            phoneReady ? 'bg-[#FFF3E8] ring-brand/30 dark:bg-[#2A2420]' : 'bg-card ring-border'
          }`}
        >
          <div className="flex items-center gap-sm">
            <span
              aria-hidden="true"
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                phoneReady
                  ? 'bg-card text-primary shadow-card'
                  : 'border-2 border-dashed border-border text-muted'
              }`}
            >
              <Icon
                name="account-circle-outline"
                size={26}
                color="currentColor"
                weight={phoneReady ? 'fill' : 'regular'}
              />
            </span>
            <div>
              <p className="text-body-xs text-muted">Bên nhận</p>
              <p className="text-headline-sm text-text">Hộ kinh doanh nhận ô</p>
            </div>
          </div>
          <PhoneField
            label="Số điện thoại người nhận"
            value={phone}
            onChangeText={setPhone}
            error={phoneError}
          />
          <p className="text-body-sm text-muted">
            Người nhận cần có tài khoản Hộ kinh doanh và hồ sơ đăng ký đã được duyệt.
          </p>
          {phoneReady ? (
            <p className="flex items-center gap-1.5 text-body-md font-semibold text-text">
              <Icon name="send-outline" size={16} color="currentColor" className="text-primary" />
              Gửi tới <span className="font-sign font-tabular">{readablePhone(phone)}</span>
            </p>
          ) : null}
        </section>
      </div>

      {daysLeft != null ? (
        <p className="text-body-lg text-text">
          Bên nhận tiếp tục phần còn lại của hợp đồng:{' '}
          <span className="font-sign font-bold">{daysLeft} ngày</span>.
        </p>
      ) : null}

      <div className="flex flex-col gap-md xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
        <TransferStepsPreview />
        <div className="flex flex-col gap-md">
          <Callout tone="neutral">
            Người nhận phải đồng ý, sau đó Phường duyệt thì việc chuyển nhượng mới có hiệu lực.
            Trong lúc chờ, ô vẫn thuộc về bạn.
          </Callout>
          {error && <Callout tone="danger">{error}</Callout>}
        </div>
      </div>
    </Screen>
  );
}

function PartyCard({
  icon,
  label,
  name,
  sub,
}: {
  icon: 'storefront-outline';
  label: string;
  name: string;
  sub?: string;
}) {
  return (
    <section className="flex items-center gap-sm rounded-[22px] bg-card p-md shadow-card ring-1 ring-border md:p-lg xl:flex-col xl:items-start">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF3E8] text-primary dark:bg-[#2A2420]"
      >
        <Icon name={icon} size={24} color="currentColor" weight="duotone" />
      </span>
      <div className="min-w-0">
        <p className="text-body-xs text-muted">{label}</p>
        <p className="text-[17px] font-semibold leading-snug text-text">{name}</p>
        {sub ? <p className="font-sign text-body-sm font-bold text-muted">{sub}</p> : null}
      </div>
    </section>
  );
}

/** Dashed orange hand-off arrow: down on a phone, across from 1280px. */
function Connector({ lock = false }: { lock?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="relative flex items-center justify-center py-sm xl:px-xs xl:py-0"
    >
      <span className="h-10 border-l-2 border-dashed border-brand xl:h-0 xl:w-10 xl:border-l-0 xl:border-t-2" />
      <Icon
        name="chevron-down"
        size={18}
        color="currentColor"
        className="absolute bottom-0 text-brand xl:bottom-auto xl:right-0 xl:-rotate-90"
      />
      {lock ? (
        <span className="absolute left-[calc(50%+16px)] flex items-center gap-1 whitespace-nowrap rounded-full bg-[#E6F6EC] px-2 py-0.5 text-body-xs font-semibold text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0] xl:left-1/2 xl:top-full xl:mt-1 xl:-translate-x-1/2">
          <Icon name="lock-outline" size={12} color="currentColor" />
          Vẫn là của bạn
        </span>
      ) : null}
    </div>
  );
}

/** Preview of the three steps; nothing has happened yet, so all are still to come. */
function TransferStepsPreview() {
  const notes: ReactNode[] = [
    <>
      <Icon name="lock-outline" size={12} color="currentColor" /> Ô vẫn thuộc về bạn
    </>,
    null,
    'Ô chuyển sang hộ nhận',
  ];
  return (
    <section className="rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
      <ol aria-label="Các bước chuyển nhượng" className="grid grid-cols-3 gap-xs">
        {TRANSFER_STEP_LABELS.map((label, i) => (
          <li key={label} className="relative flex flex-col gap-1">
            {i < TRANSFER_STEP_LABELS.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute left-9 right-0 top-[15px] h-0.5 bg-border"
              />
            ) : null}
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-card font-sign text-[14px] font-bold text-muted ring-2 ring-inset ring-border">
              {i + 1}
            </span>
            <span className="text-body-sm font-semibold leading-tight text-text">{label}</span>
            {notes[i] ? (
              <span className="flex items-center gap-1 text-body-xs text-muted">{notes[i]}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function TransferSkeleton() {
  return (
    <Screen>
      <div role="status" aria-label="Đang tải hợp đồng" className="flex flex-col gap-md">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-24 w-full rounded-[22px]" />
        <Skeleton className="h-32 w-full rounded-[22px]" />
        <Skeleton className="h-44 w-full rounded-[22px]" />
      </div>
    </Screen>
  );
}
