import { useId, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Icon, type IconName } from '@/components/common';
import { ConfirmDialog, Skeleton } from '@/components/feedback';
import { PermitStamp, VERDICT_TONES } from '@/components/illustrations';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { useAuthStore } from '@/store/auth-store';
import { LocationReview } from '../components/LocationReview';
import { WardGate } from '../components/WardGate';
import {
  CaseBlockers,
  CaseHeaderPlate,
  ConflictOverlapArt,
  QueueTicket,
  TransferLedgerPlate,
  TransferProgress,
} from '../components/review/CaseParts';
import { formatWaitVi } from '../components/review/format';
import { caseTone } from '../components/review/helpers';
import { FactGrid, type Fact } from '../components/review/Primitives';
import {
  actionLabels,
  caseLabels,
  statusLabel,
  wardApi,
  wardReviewRoot,
  type CaseKind,
  type WardCase,
} from '../ward-api';
import { CaseDocuments } from '../components/CaseDocuments';

const ACTION_ICONS: Record<string, IconName> = {
  APPROVE: 'check-circle-outline',
  REJECT: 'close-circle-outline',
  QUEUE: 'format-list-bulleted',
  REVIEW: 'comment-outline',
  REQUEST_INFO: 'file-document-outline',
};

export function WardCaseScreen({ kind: givenKind }: { kind?: CaseKind }) {
  const { kind: routeKind, id = '' } = useParams();
  const kind = givenKind ?? routeKind;
  if (!kind || !(kind in caseLabels) || !/^\d+$/.test(id))
    return (
      <Screen>
        <div
          className={`flex flex-col items-start gap-md rounded-[24px] p-md md:flex-row md:items-center md:p-lg ${VERDICT_TONES.danger.wash}`}
        >
          <svg viewBox="0 0 96 72" aria-hidden="true" className="h-[72px] w-[96px] shrink-0">
            <rect
              x="6"
              y="6"
              width="84"
              height="52"
              rx="10"
              className="fill-card stroke-[#8F1717] dark:stroke-[#FF9A90]"
              strokeWidth="2.5"
              strokeDasharray="7 5"
            />
            <text
              x="48"
              y="42"
              textAnchor="middle"
              className="fill-[#8F1717] font-sign dark:fill-[#FF9A90]"
              fontSize="30"
              fontWeight="800"
            >
              ?
            </text>
            {Array.from({ length: 5 }, (_, i) => (
              <rect
                key={i}
                x={i * 19.2}
                y="64"
                width="19.2"
                height="6"
                className={i % 2 ? 'fill-[#FFF8F2]' : 'fill-brand'}
              />
            ))}
          </svg>
          <div className="flex flex-col items-start gap-sm">
            <p
              role="alert"
              className={`text-[17px] font-semibold leading-6 ${VERDICT_TONES.danger.ink}`}
            >
              Mã hồ sơ không hợp lệ. Mở hồ sơ từ danh sách dữ liệu thật.
            </p>
            <BackToList />
          </div>
        </div>
      </Screen>
    );
  return (
    <WardGate>
      <CaseContent key={`${kind}-${id}`} kind={kind as CaseKind} id={id} />
    </WardGate>
  );
}

function BackToList() {
  return (
    <Link
      to={wardReviewRoot}
      className="inline-flex min-h-12 items-center gap-xs rounded-[12px] bg-card px-md text-[15px] font-semibold text-text ring-1 ring-inset ring-border transition-colors hover:bg-sunken"
    >
      <Icon name="chevron-left" size={18} color="currentColor" />
      Về danh sách
    </Link>
  );
}

function CaseContent({ kind, id }: { kind: CaseKind; id: string }) {
  // Scope the cache to the signed-in officer so one account never sees another's
  // ward cases after a sign-out/sign-in on the same tab.
  const userId = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const [reason, setReason] = useState('');
  const [pendingDecision, setPendingDecision] = useState('');
  // Display only: which action the stamp names once the server has saved it.
  const [lastAction, setLastAction] = useState('');
  const slipId = useId();
  const reasonId = `${slipId}-reason`;
  const counterId = `${slipId}-counter`;
  const queryKey = ['ward', userId, kind, id];
  const record = useQuery({ queryKey, queryFn: () => wardApi.get(kind, id) });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['ward', userId] });
  };
  const decide = useMutation({
    mutationFn: ({ data, action }: { data: WardCase; action: string }) =>
      wardApi.decide(data, action, reason.trim()),
    onSuccess: (data) => {
      client.setQueryData(queryKey, data);
      setReason('');
      refresh();
    },
    onError: refresh,
  });
  if (record.isPending)
    return (
      <Screen width="wide">
        <p role="status" className="text-body-md text-muted">
          Đang tải hồ sơ…
        </p>
        <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-xl">
          <div className="flex flex-col gap-md">
            <div className="flex flex-col gap-sm rounded-[24px] bg-card p-lg ring-1 ring-border">
              <div className="flex items-center gap-sm">
                <Skeleton className="h-12 w-12 rounded-[12px]" />
                <Skeleton className="h-10 w-[120px] rounded-[8px]" />
                <Skeleton className="h-6 w-28" />
              </div>
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-[200px] rounded-[24px]" />
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[16px] ring-1 ring-border">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-16 rounded-none" />
              ))}
            </div>
          </div>
          <Skeleton className="h-[320px] rounded-[24px]" />
        </div>
      </Screen>
    );
  if (record.error || !record.data)
    return (
      <Screen>
        <AppHeader title={caseLabels[kind]} back />
        <div
          className={`flex flex-col items-start gap-sm rounded-[20px] p-md md:p-lg ${VERDICT_TONES.danger.wash}`}
        >
          <p
            role="alert"
            className={`flex items-start gap-xs text-[16px] font-semibold leading-6 ${VERDICT_TONES.danger.ink}`}
          >
            <Icon
              name="alert-circle-outline"
              size={20}
              color="currentColor"
              className="mt-0.5 shrink-0"
            />
            {record.error?.message ?? 'Không tìm thấy hồ sơ.'}
          </p>
          <div className="flex flex-wrap gap-sm">
            <Button
              label="Thử lại"
              fullWidth={false}
              onPress={() => {
                void record.refetch();
              }}
            />
            <BackToList />
          </div>
        </div>
      </Screen>
    );
  const data = record.data;
  const evidence =
    data.evidenceUrl && /^https?:\/\//i.test(data.evidenceUrl) ? data.evidenceUrl : null;
  const statusText = statusLabel(kind, data.status);
  const tone = caseTone(data.status);
  const sentAt = new Date(
    data.createdAt.endsWith('Z') ? data.createdAt : data.createdAt + 'Z',
  ).toLocaleString('vi-VN');
  const wait = formatWaitVi(data.createdAt, 'Gửi');
  const awaiting = data.actions.length > 0;
  const stampTone = VERDICT_TONES[tone];

  const facts: Fact[] = [
    {
      label: 'Trạng thái',
      value: `${statusText}${data.fastTrack ? ' · Ưu tiên xử lý nhanh' : ''}`,
      emphasis: true,
    },
    {
      label: 'Ngày gửi',
      value: (
        <>
          <span className="font-tabular">{sentAt}</span>
          {wait ? <span className="block text-body-sm font-normal text-muted">{wait}</span> : null}
        </>
      ),
    },
  ];
  if (kind !== 'transfers' && data.contractTerm)
    facts.push({ label: 'Thời hạn giữ nguyên', value: data.contractTerm });
  if (kind !== 'transfers' && data.outstanding != null)
    facts.push({
      label: 'Phí và phạt chưa thanh toán',
      value: (
        <span
          className={`font-sign font-bold font-tabular ${data.outstanding > 0 ? 'text-[#8F1717] dark:text-[#FF9A90]' : ''}`}
        >
          {data.outstanding.toLocaleString('vi-VN')} ₫
        </span>
      ),
    });
  if (kind !== 'conflicts' && data.queuePosition != null)
    facts.push({ label: 'Vị trí hàng chờ', value: String(data.queuePosition) });
  if (data.reason) facts.push({ label: 'Lý do đã ghi nhận', value: data.reason, wide: true });
  if (evidence)
    facts.push({
      label: 'Minh chứng',
      wide: true,
      value: (
        <a
          href={evidence}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-xs font-semibold text-indigo underline-offset-4 hover:underline"
        >
          <Icon name="eye-outline" size={18} color="currentColor" />
          Mở ảnh minh chứng
        </a>
      ),
    });

  const counterTone =
    reason.length >= 500 ? 'bg-error' : reason.length > 450 ? 'bg-accent' : 'bg-tertiary';

  return (
    <Screen width="wide">
      <Link
        className="inline-flex w-fit items-center gap-1 rounded-[8px] py-1 text-body-sm font-semibold text-indigo hover:underline"
        to={`${wardReviewRoot}?kind=${kind}`}
      >
        <Icon name="chevron-left" size={16} color="currentColor" />
        Danh sách hồ sơ
      </Link>
      <AppHeader
        title={caseLabels[kind]}
        back
        subtitle={data.slotCode}
        right={
          awaiting ? (
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById(slipId)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#FFF3E8] px-md text-body-sm font-semibold text-[#8A3200] ring-1 ring-primary/30 transition-colors hover:bg-tint-primary dark:bg-[#3A2414] dark:text-[#FFB98A]"
            >
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand" />
              Chờ bạn quyết định
              <Icon name="chevron-down" size={16} color="currentColor" className="xl:hidden" />
            </button>
          ) : undefined
        }
      />

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-md">
          <CaseHeaderPlate
            kind={kind}
            slotCode={data.slotCode}
            statusText={statusText}
            tone={tone}
            fastTrack={data.fastTrack}
            applicant={data.applicant}
            summary={data.summary}
          />

          {kind === 'proposals' && <LocationReview record={data} onSaved={refresh} />}
          {kind === 'transfers' && (
            <>
              <TransferLedgerPlate
                outstanding={data.outstanding}
                contractTerm={data.contractTerm}
              />
            </>
          )}
          {kind === 'conflicts' && (
            <div className="grid gap-md md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
              <QueueTicket
                queuePosition={data.queuePosition}
                slotCode={data.slotCode}
                statusText={statusText}
                tone={tone}
              />
              <ConflictOverlapArt />
            </div>
          )}

          {data.blockers.length > 0 && <CaseBlockers blockers={data.blockers} />}
          {kind === 'transfers' && <TransferProgress status={data.status} />}

          <section aria-labelledby={`${slipId}-facts`} className="flex flex-col gap-sm">
            <h2 id={`${slipId}-facts`} className="font-sign text-[18px] font-bold text-text">
              Thông tin hồ sơ
            </h2>
            <FactGrid facts={facts} />
          </section>

          {data.documents && data.documents.length > 0 && (
            <CaseDocuments documents={data.documents} />
          )}
        </div>

        <section
          id={slipId}
          aria-labelledby={`${slipId}-title`}
          className="relative scroll-mt-md overflow-hidden rounded-[24px] bg-card shadow-sheet ring-1 ring-border xl:sticky xl:top-md"
        >
          <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
          <div className="flex flex-col gap-md p-md md:p-lg">
            <h2
              id={`${slipId}-title`}
              className="font-sign text-[18px] font-bold leading-tight text-text"
            >
              Quyết định của cán bộ
            </h2>
            {data.actions.length > 0 ? (
              <>
                <div className="flex flex-col gap-xs">
                  <label htmlFor={reasonId} className="text-label text-text">
                    Lý do quyết định (bắt buộc)
                  </label>
                  <textarea
                    id={reasonId}
                    aria-describedby={counterId}
                    className="input-shell w-full resize-y rounded-sm border border-border bg-card px-sm py-[9px] text-[16px] leading-[28px] text-text disabled:cursor-not-allowed disabled:bg-sunken"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(to bottom, transparent 0 27px, rgb(var(--c-border)) 27px 28px)',
                      backgroundPositionY: '8px',
                      backgroundAttachment: 'local',
                    }}
                    rows={4}
                    maxLength={500}
                    value={reason}
                    disabled={decide.isPending}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="flex items-center gap-sm">
                    <span
                      aria-hidden="true"
                      className="h-1 flex-1 overflow-hidden rounded-full bg-sunken"
                    >
                      <span
                        className={`block h-full rounded-full transition-[width] duration-150 ${counterTone}`}
                        style={{ width: `${(reason.length / 500) * 100}%` }}
                      />
                    </span>
                    <p id={counterId} className="text-body-sm text-muted font-tabular">
                      {reason.length}/500 ký tự
                    </p>
                  </div>
                </div>
                <p className="text-body-sm text-muted">
                  Thao tác máy chủ cho phép:{' '}
                  <span className="font-semibold text-text">
                    {data.actions.map((a) => actionLabels[a] ?? a).join(', ')}
                  </span>
                </p>
                <div className="flex flex-col gap-sm">
                  {data.actions.map((action) => (
                    <span
                      key={action}
                      className="block"
                      title={!reason.trim() ? 'Nhập lý do trước' : undefined}
                    >
                      <Button
                        label={actionLabels[action] ?? action}
                        variant={action === 'REJECT' ? 'danger' : 'approve'}
                        icon={
                          <Icon
                            name={ACTION_ICONS[action] ?? 'check'}
                            size={19}
                            color="currentColor"
                          />
                        }
                        disabled={!reason.trim() || decide.isPending || record.isFetching}
                        onPress={() => setPendingDecision(action)}
                      />
                    </span>
                  ))}
                </div>
                {data.actions.includes('QUEUE') ? (
                  <p className="flex items-start gap-xs rounded-[12px] bg-sunken/70 px-sm py-xs text-body-sm text-text/80">
                    <Icon
                      name="information-outline"
                      size={16}
                      color="currentColor"
                      className="mt-0.5 shrink-0"
                    />
                    Đưa vào hàng chờ chỉ ghi nhận thứ tự chờ, không thay đổi hợp đồng hiện tại.
                  </p>
                ) : null}
                <p className="text-body-xs text-muted">
                  Lý do được lưu cùng tài khoản cán bộ; thời điểm do máy chủ ghi.
                </p>
              </>
            ) : decide.isSuccess ? null : (
              <div className="flex flex-col items-start gap-xs">
                <p className="text-body-md text-muted">
                  Không có thao tác nào cho hồ sơ ở trạng thái này.
                </p>
                <StatusChip label={statusText} tone={tone} />
              </div>
            )}
            {decide.isPending && (
              <p role="status" className="flex items-center gap-xs text-body-sm text-muted">
                <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-brand" />
                Đang lưu quyết định…
              </p>
            )}
            {decide.error && (
              <p
                role="alert"
                className={`flex items-start gap-xs rounded-[12px] px-sm py-xs text-[15px] font-medium ${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink}`}
              >
                <Icon
                  name="alert-circle-outline"
                  size={18}
                  color="currentColor"
                  className="mt-0.5 shrink-0"
                />
                {decide.error.message}
              </p>
            )}
            {decide.isSuccess && (
              <div
                className={`sb-pop relative flex min-h-[132px] items-center gap-md overflow-hidden rounded-[16px] p-md pr-[120px] ${stampTone.wash}`}
              >
                <div className={`flex min-w-0 flex-col gap-1 ${stampTone.ink}`}>
                  <span className="font-sign text-[22px] font-extrabold uppercase leading-tight [font-stretch:90%]">
                    {actionLabels[lastAction] ?? lastAction}
                  </span>
                  <p role="status" className="text-[15px] font-semibold leading-snug">
                    Quyết định đã được lưu vào Backend.
                  </p>
                  <span className="text-body-sm">Trạng thái mới: {statusText}</span>
                </div>
                <div className="absolute inset-y-0 right-xs flex items-center">
                  <PermitStamp
                    icon={stampTone.icon}
                    inkClass={stampTone.ink}
                    strokeClass={stampTone.stroke}
                    ringText="QUYẾT ĐỊNH PHƯỜNG ★ STREETBIZ ★"
                    className="h-[104px] w-[104px]"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <ConfirmDialog
        visible={!!pendingDecision}
        title={actionLabels[pendingDecision] ?? ''}
        description={reason.trim()}
        onCancel={() => setPendingDecision('')}
        onConfirm={() => {
          const action = pendingDecision;
          setPendingDecision('');
          setLastAction(action);
          decide.mutate({ data, action });
        }}
      />
    </Screen>
  );
}
