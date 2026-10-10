import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Icon, type IconName } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ConfirmDialog, ErrorState, Skeleton, showToast } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { Callout } from '@/features/sidewalk-slots/components/Callout';
import { ContractSummary } from '@/features/sidewalk-slots/components/ContractSummary';
import { contractProgress, isLiveContract } from '@/features/sidewalk-slots/my-slots-view';
import { useAuthStore } from '@/store/auth-store';

const REASON_HINTS = ['Chuyển địa điểm kinh doanh', 'Ngừng kinh doanh', 'Ô không còn phù hợp'];

const CONSEQUENCES: { icon: IconName; text: string }[] = [
  { icon: 'qrcode', text: 'Giấy phép số của ô này sẽ hết hiệu lực.' },
  { icon: 'storefront-outline', text: 'Ô được mở lại cho các hộ kinh doanh khác.' },
  { icon: 'cash-multiple', text: 'Hãy thanh toán mọi khoản phí còn nợ trước khi trả ô.' },
];

/**
 * Ending a contract early, said calmly: the stall on the pavement now and the
 * same bay empty and lit for someone else after, the three consequences as
 * lines of a record, a gentler way out (transfer), and the reason.
 */
export function ReturnSlotScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const contractId = Number(id);
  const validId = Number.isFinite(contractId);
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string>();

  const contract = useQuery({
    queryKey: ['side', userId, 'contract', contractId],
    queryFn: () => sideApi.getContract(contractId),
    enabled: validId,
  });

  const cancel = useMutation({
    mutationFn: () => sideApi.cancelContract(contractId, reason.trim() || null),
    onSuccess: (result) => {
      setConfirm(false);
      showToast(result.message);
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'contracts'] });
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'contract', contractId] });
      navigate('/vendor/slots/contracts', { replace: true });
    },
    onError: (err) => {
      setConfirm(false);
      setError(err instanceof SideApiError ? err.message : 'Không trả được ô.');
    },
  });

  if (!validId)
    return (
      <Screen>
        <ErrorState message="Mã hợp đồng không hợp lệ." />
      </Screen>
    );
  if (contract.isPending) return <ReturnSkeleton />;
  if (contract.error)
    return (
      <Screen>
        <ErrorState message={contract.error.message} onRetry={() => void contract.refetch()} />
      </Screen>
    );

  const live = isLiveContract(contract.data.contractStatus);
  const daysLeft = live
    ? contractProgress(contract.data.startDate, contract.data.endDate, new Date()).daysLeft
    : null;

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Trả ô này" variant="danger" onPress={() => setConfirm(true)} />
        </StickyActions>
      }
    >
      <AppHeader title="Trả ô vỉa hè" back subtitle="Kết thúc hợp đồng thuê trước hạn" />

      <div className="flex flex-col gap-lg xl:grid xl:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] xl:items-start xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-lg">
          <ReturnScene />

          <section className="flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
            <h2 className="text-badge text-muted">Ô SẼ TRẢ</h2>
            <ContractSummary
              contract={contract.data}
              live={live}
              status={live ? undefined : contract.data.contractStatus}
            />
            {daysLeft != null ? (
              <p className="text-body-md font-semibold text-text">
                Bạn sẽ trả lại {daysLeft} ngày còn lại của hợp đồng.
              </p>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-[#8F1717]/20">
            <h2 className="flex items-center gap-xs bg-[#FDEBEA] px-md py-sm text-[17px] font-bold text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90] md:px-lg">
              <Icon name="alert-circle-outline" size={20} color="currentColor" />
              Trước khi trả ô, bạn cần biết:
            </h2>
            <ul className="divide-y divide-border">
              {CONSEQUENCES.map((c) => (
                <li key={c.text} className="flex min-h-14 items-center gap-sm px-md py-xs md:px-lg">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#FDEBEA] text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]"
                  >
                    <Icon name={c.icon} size={20} color="currentColor" />
                  </span>
                  <span className="text-[16px] text-text">{c.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <button
            type="button"
            onClick={() => navigate(`/vendor/slots/contracts/${contract.data.contractId}/transfer`)}
            className="group flex w-full items-center gap-sm rounded-[20px] bg-[#FFF3E8] p-md text-left ring-1 ring-brand/20 transition-[transform,box-shadow] hover:shadow-card-hover active:scale-[0.99] dark:bg-[#2A2420] md:p-lg"
          >
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-card"
            >
              <Icon name="swap-horizontal" size={22} color="currentColor" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-md text-text">Muốn để lại ô cho người quen?</span>
              <span className="block text-[16px] font-semibold text-primary">
                Chuyển nhượng thay vì trả
              </span>
            </span>
            <Icon
              name="chevron-right"
              size={20}
              color="currentColor"
              className="shrink-0 text-primary transition-transform group-hover:translate-x-1"
            />
          </button>

          {error ? <Callout tone="danger">{error}</Callout> : null}
        </div>

        <section className="cq flex min-w-0 flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
          <TextField
            label="Lý do trả ô (không bắt buộc)"
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder="VD: Chuyển địa điểm kinh doanh"
          />
          <div className="flex flex-col gap-xs">
            <span className="text-body-sm text-muted">Chọn nhanh</span>
            <div className="no-scrollbar -mx-md flex gap-xs overflow-x-auto px-md md:mx-0 md:flex-wrap md:px-0">
              {REASON_HINTS.map((hint) => (
                <button
                  key={hint}
                  type="button"
                  aria-pressed={reason === hint}
                  onClick={() => setReason(hint)}
                  className={`h-11 shrink-0 rounded-full px-md text-label transition-colors ${
                    reason === hint
                      ? 'bg-tint-primary font-semibold text-primary ring-2 ring-inset ring-primary'
                      : 'bg-card text-text ring-1 ring-inset ring-border hover:ring-text/25'
                  }`}
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        visible={confirm}
        title="Xác nhận trả ô?"
        description="Hành động này không thể hoàn tác."
        confirmLabel="Trả ô"
        confirmVariant="danger"
        onConfirm={() => {
          setError(undefined);
          cancel.mutate();
        }}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  );
}

/**
 * Now and after: the vendor's stall in its bay, then the same bay empty with a
 * dashed, softly glowing outline waiting for someone else. Decoration only; no
 * slot code is drawn (the consequences say it in words).
 */
function ReturnScene() {
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-[24px] bg-[#FFF3E8] shadow-card ring-1 ring-border dark:bg-[#2A2420]"
    >
      <svg
        viewBox="0 0 560 170"
        className="block h-[150px] w-full md:h-[170px] xl:h-[180px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <text
          x="120"
          y="28"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          className="fill-muted"
        >
          Hiện tại
        </text>
        <text
          x="420"
          y="28"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          className="fill-muted"
        >
          Sau khi trả
        </text>
        {/* Now: the bay with a stall */}
        <rect
          x="50"
          y="44"
          width="140"
          height="92"
          rx="10"
          fill="none"
          strokeWidth="2.5"
          className="stroke-text"
        />
        <g>
          {Array.from({ length: 6 }, (_, i) => (
            <rect
              key={i}
              x={68 + i * 17.3}
              y="56"
              width="17.3"
              height="18"
              className={i % 2 ? 'fill-white' : 'fill-brand'}
            />
          ))}
          <path
            d="M68 74 q8.6 8 17.3 0 q8.6 8 17.3 0 q8.6 8 17.3 0 q8.6 8 17.3 0 q8.6 8 17.3 0 q8.6 8 17.3 0"
            className="fill-brand"
          />
          <rect
            x="74"
            y="84"
            width="92"
            height="36"
            rx="4"
            className="fill-card stroke-text/60"
            strokeWidth="1.5"
          />
          <circle cx="98" cy="102" r="7" className="fill-accent" />
          <rect x="114" y="95" width="38" height="14" rx="3" className="fill-tertiary/70" />
        </g>
        {/* Arrow */}
        <path
          d="M222 92 H322"
          strokeDasharray="7 6"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          className="stroke-muted"
        />
        <path
          d="M314 84 L324 92 L314 100"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-muted"
        />
        {/* After: the same bay, empty and lit */}
        <rect
          x="350"
          y="44"
          width="140"
          height="92"
          rx="10"
          className="fill-[rgb(var(--c-brand)/0.08)] stroke-brand"
          strokeWidth="2.5"
          strokeDasharray="9 7"
        />
        <rect
          x="344"
          y="38"
          width="152"
          height="104"
          rx="14"
          fill="none"
          strokeWidth="2"
          className="sb-slot-beacon stroke-brand/60"
        />
        <rect x="380" y="78" width="80" height="24" rx="6" className="fill-card" />
        <text
          x="420"
          y="95"
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          className="fill-[#0B5D33] dark:fill-[#8BE3B0]"
        >
          Còn trống
        </text>
        {Array.from({ length: 26 }, (_, i) => (
          <rect
            key={`k${i}`}
            x={i * 22}
            y="156"
            width="22"
            height="14"
            className={i % 2 ? 'fill-kerb-paint' : 'fill-kerb'}
          />
        ))}
      </svg>
    </div>
  );
}

function ReturnSkeleton() {
  return (
    <Screen>
      <div role="status" aria-label="Đang tải hợp đồng" className="flex flex-col gap-md">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-[170px] w-full rounded-[24px]" />
        <Skeleton className="h-28 w-full rounded-[20px]" />
        <Skeleton className="h-44 w-full rounded-[20px]" />
      </div>
    </Screen>
  );
}
