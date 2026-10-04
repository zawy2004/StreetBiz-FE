import { ReactNode } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  Card,
  formatVnd,
  Icon,
  KerbTag,
  ListRow,
  Money,
  type IconName,
} from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { colors } from '@/theme';
import { sideApi } from '@/core/api/side-api';
import { env, isLiveApi } from '@/core/config/env';
import { useRegistrations } from '@/features/business-registrations/useRegistrations';
import { useFeeItems, usePenalties } from '@/features/fee-schedules/useFinance';
import { useMockDb } from '@/mocks/db';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useWards } from '@/core/auth/useWards';
import { useAuthStore } from '@/store/auth-store';
import { buildTodos, fullDate, shortDate, type Todo, type TodoKind, type TodoTone } from '../todos';
import { DebtHero, HeroSkeleton, PermitHero, StatusHero } from '../components/HomeHero';
import { currentPermits, pickStanding, type PermitInfo } from '../standing';

const PENDING_APPLICATION = new Set(['PENDING', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED']);
const PERMIT_HEROES = new Set(['blocked', 'expired', 'expiring', 'not-yet-valid', 'valid']);

export function VendorHomeScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isDesktop = useIsDesktop();
  // Shared with the registrations list/detail screens, so this stays correct
  // against StreetBiz-BE instead of always reporting "no registration yet".
  const registrationsQuery = useRegistrations();
  const { registrations } = registrationsQuery;
  // Unfiltered, so they share their cache with FinanceHomeScreen; both hooks
  // already switch between StreetBiz-BE and the mock store.
  const feesQuery = useFeeItems();
  const { feeItems } = feesQuery;
  const penaltiesQuery = usePenalties();
  const { penalties } = penaltiesQuery;
  const standingQuery = useVendorStanding();
  const { permits } = standingQuery;
  const { wards } = useWards();

  // "Nothing to do" is only true once every source has answered. A source that
  // is still loading or has failed must never read as an all-clear.
  const sources = [
    { label: 'hồ sơ', ...registrationsQuery },
    { label: 'phí thuê', ...feesQuery },
    { label: 'biên bản phạt', ...penaltiesQuery },
  ];
  const todosLoading = sources.some((s) => s.isLoading);
  const failed = sources.filter((s) => s.isError);
  const retryFailed = () => failed.forEach((s) => void s.refetch());
  const failedMessage = `Chưa tải được ${failed.map((s) => s.label).join(', ')}. Kiểm tra mạng rồi thử lại.`;

  const { todos, later } = buildTodos(registrations, feeItems, penalties);
  const dueNow = todos.reduce((sum, t) => sum + (t.amount ?? 0), 0);
  const settled = !todosLoading && failed.length === 0;

  // The hero only speaks once every source has answered, so it never understates
  // what is owed or calls a vendor "all clear" while a request is still out.
  // Already sorted most urgent first, so the hero's button pays payable[0]. There is no
  // combined checkout, so the button never promises one.
  const payable = todos.filter((t) => t.amount !== undefined);
  const lead = payable[0];
  const overdue = payable.some((t) => t.tone === 'danger');
  // The line above the amount describes the item the button pays, so the two never disagree.
  // Names the item the button pays and its deadline: "Phí tháng 09/2026 · quá hạn 19 ngày".
  const urgency = !lead
    ? ''
    : lead.kind === 'penalty'
      ? 'Biên bản phạt chưa nộp'
      : lead.note
        ? `${lead.title} · ${lead.note.charAt(0).toLowerCase()}${lead.note.slice(1)}`
        : lead.title;
  const count = (pick: (t: Todo) => boolean) => todos.filter(pick).length;
  const breakdown = [
    [count((t) => t.kind === 'fee' && t.tone === 'danger'), 'kỳ phí quá hạn'],
    [count((t) => t.kind === 'penalty'), 'biên bản phạt'],
    [count((t) => t.kind === 'fee' && t.tone === 'pending'), 'kỳ phí sắp đến hạn'],
  ]
    .filter(([n]) => n)
    .map(([n, label]) => `${n} ${label}`)
    .join(' · ');
  // The hero waits for every source it reasons over, so it never names the wrong standing.
  const heroSettled = settled && !standingQuery.isLoading && !standingQuery.isError;
  const standing = heroSettled
    ? pickStanding({
        registrations,
        permits,
        hasPendingApplication: standingQuery.hasPendingApplication,
        hasOverdueDebt: overdue,
        hasDueSoonDebt: payable.some((t) => t.tone === 'pending'),
      })
    : null;
  // A vendor confirmed to have no registration has no permits to load, so a failed
  // permit lookup only matters for everyone else.
  const knownUnregistered =
    !registrationsQuery.isLoading && !registrationsQuery.isError && registrations.length === 0;
  const standingFailed = standingQuery.isError && !knownUnregistered;
  const unregistered = standing?.kind === 'unregistered';
  // Hold the hero's place only while it is still coming.
  const heroPending =
    !heroSettled &&
    failed.length === 0 &&
    !standingFailed &&
    (registrationsQuery.isLoading || registrations.length > 0 || standingQuery.isLoading);
  const cardPermit = permits.find((p) => p.effectiveStatus === 'VALID') ?? permits[0];
  const showPermitCard = cardPermit && !(standing && PERMIT_HEROES.has(standing.kind));
  const wardUnitId = (
    registrations.find((r) => r.registrationStatus === 'APPROVED') ?? registrations[0]
  )?.wardUnitId;
  const wardName = wards.find((w) => w.unitId === wardUnitId)?.unitName ?? null;
  const contractPath = (p: PermitInfo) => `/vendor/slots/contracts/${p.contractId}`;
  const slotMeta = (p: PermitInfo, after: ReactNode, others = 0) => (
    <>
      {p.slotCode ? <KerbTag code={p.slotCode} /> : null}
      {after}
      {others > 0 ? <span>và {others} ô khác</span> : null}
    </>
  );

  const hero = (() => {
    if (heroPending) return <HeroSkeleton />;
    // Without contracts we cannot say whether the vendor may sell; never stay silent about it.
    if (standingFailed) {
      return (
        <StatusHero
          tone="danger"
          lead="Chưa tải được giấy phép"
          title="Chưa xem được tình trạng giấy phép"
          meta={<span>Kiểm tra mạng rồi thử lại.</span>}
          action={{ label: 'Thử lại', onPress: standingQuery.refetch }}
        />
      );
    }
    switch (standing?.kind) {
      case 'unregistered':
        return (
          <StatusHero
            tone="pending"
            lead="Chưa có hồ sơ"
            title="Đăng ký kinh doanh để bắt đầu bán"
            meta={<span>Nộp hồ sơ online, phường duyệt xong là thuê được ô vỉa hè.</span>}
            action={{
              label: 'Đăng ký ngay',
              onPress: () => navigate('/vendor/registrations/new/type'),
            }}
          />
        );
      case 'blocked':
        return (
          <StatusHero
            tone="danger"
            lead="Không được bán tại ô này"
            title={
              standing.permit.effectiveStatus === 'REVOKED'
                ? 'Giấy phép đã bị thu hồi'
                : 'Giấy phép đang bị tạm ngưng'
            }
            meta={slotMeta(standing.permit, null, standing.others)}
            action={{
              // The contract page shows the slot, term and status; it has no suspension reason to promise.
              label: 'Xem hợp đồng',
              onPress: () => navigate(contractPath(standing.permit)),
            }}
            note={`Cần giải trình? Liên hệ UBND ${wardName ?? 'phường nơi bạn thuê ô'}.`}
          />
        );
      case 'expired':
        return (
          <StatusHero
            tone="danger"
            lead="Không được bán tại ô này"
            title="Giấy phép đã hết hạn"
            meta={slotMeta(
              standing.permit,
              standing.permit.endDate ? (
                <span>ngày {fullDate(standing.permit.endDate)}</span>
              ) : null,
              standing.others,
            )}
            action={
              standing.canRenew
                ? {
                    label: 'Gia hạn',
                    onPress: () => navigate(`${contractPath(standing.permit)}/renewal`),
                  }
                : { label: 'Thuê ô mới', onPress: () => navigate('/vendor/slots') }
            }
          />
        );
      case 'debt':
        return lead ? (
          <DebtHero
            amount={dueNow}
            tone={overdue ? 'danger' : 'pending'}
            urgency={urgency}
            breakdown={breakdown}
            // The button names its own amount so it can't be read as paying the total above it;
            // the line above the total names the item.
            payLabel={`Trả ${formatVnd(lead.amount ?? 0)}`}
            onPay={() => navigate(lead.to)}
            remaining={payable.length - 1}
          />
        ) : null;
      case 'more-info':
        return (
          <StatusHero
            tone="pending"
            lead="Hồ sơ cần bổ sung"
            title="Phường cần thêm giấy tờ"
            meta={
              <span>
                {standing.registration.reviewDecisionReason ?? standing.registration.displayName}
              </span>
            }
            action={{
              label: 'Bổ sung hồ sơ',
              onPress: () =>
                navigate(`/vendor/registrations/${standing.registration.registrationId}`),
            }}
          />
        );
      case 'expiring':
        return (
          <StatusHero
            tone="pending"
            lead={standing.daysLeft <= 0 ? 'Hết hạn hôm nay' : `Còn ${standing.daysLeft} ngày`}
            title="Giấy phép sắp hết hạn"
            meta={slotMeta(
              standing.permit,
              standing.permit.endDate ? <span>đến {fullDate(standing.permit.endDate)}</span> : null,
            )}
            action={{
              label: 'Gia hạn',
              onPress: () => navigate(`${contractPath(standing.permit)}/renewal`),
            }}
          />
        );
      case 'rejected':
        return (
          <StatusHero
            tone="danger"
            lead="Chưa được bán"
            title="Hồ sơ không được duyệt"
            meta={
              <span>
                {standing.registration.reviewDecisionReason ?? standing.registration.displayName}
              </span>
            }
            action={{
              label: 'Xem hồ sơ',
              onPress: () =>
                navigate(`/vendor/registrations/${standing.registration.registrationId}`),
            }}
          />
        );
      case 'reviewing':
        return (
          <StatusHero
            tone="pending"
            lead={`Nộp ngày ${fullDate(standing.registration.createdAt)}`}
            title="Phường đang xét hồ sơ của bạn"
            meta={<span>{standing.registration.displayName}</span>}
            action={{
              label: 'Xem hồ sơ đã nộp',
              onPress: () =>
                navigate(`/vendor/registrations/${standing.registration.registrationId}`),
            }}
            note="Phường duyệt xong, kết quả hiện ngay tại đây."
          />
        );
      case 'application-pending':
        return (
          <StatusHero
            tone="pending"
            lead="Đang chờ phường"
            title="Đơn thuê ô đang chờ duyệt"
            meta={<span>Duyệt xong, giấy phép QR sẽ hiện ở đây.</span>}
          />
        );
      case 'approved-no-slot':
        return (
          <StatusHero
            tone="ok"
            lead="Hồ sơ đã duyệt"
            title="Chọn ô để bắt đầu bán"
            action={{ label: 'Thuê ô vỉa hè', onPress: () => navigate('/vendor/slots') }}
          />
        );
      case 'not-yet-valid':
        return (
          <StatusHero
            tone="pending"
            lead={
              standing.permit.startDate
                ? `Có hiệu lực từ ${fullDate(standing.permit.startDate)}`
                : 'Sắp có hiệu lực'
            }
            title="Giấy phép chưa có hiệu lực"
            meta={slotMeta(standing.permit, null)}
            action={{
              label: 'Xem giấy phép',
              onPress: () => navigate(`${contractPath(standing.permit)}/permit`),
            }}
          />
        );
      case 'valid':
        return (
          <PermitHero
            slotCode={standing.permit.slotCode}
            validUntil={standing.permit.endDate ? fullDate(standing.permit.endDate) : null}
            qrValue={standing.permit.qrValue}
            onOpen={() => navigate(`${contractPath(standing.permit)}/permit`)}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <Screen>
      <AppHeader title={`Chào ${user?.fullName ?? ''}`} subtitle="Hôm nay quán mình cần làm gì?" />

      {hero}

      {/* DOM order is the phone order: permit, then to-dos, then shortcuts. On desktop the
          permit and shortcuts move to a side column. */}
      <div className="grid gap-md lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {standingQuery.isLoading ? (
          <Card className="lg:col-start-2 lg:row-start-1">
            <div aria-busy="true" className="flex items-center gap-sm">
              <span className="sr-only">Đang tải giấy phép</span>
              <Skeleton className="h-12 w-12 shrink-0" />
              <div className="flex flex-1 flex-col gap-xs">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            </div>
          </Card>
        ) : showPermitCard ? (
          <div className="lg:col-start-2 lg:row-start-1">
            <Card onPress={() => navigate(`${contractPath(cardPermit)}/permit`)}>
              <div className="flex items-center gap-sm">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-tint-tertiary">
                  <Icon name="qrcode" size={28} color={colors.tertiary} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2xs">
                  <span className="truncate text-headline-sm text-text">Giấy phép của bạn</span>
                  <span className="flex flex-wrap items-center gap-x-xs gap-y-1 text-body-sm text-muted">
                    {cardPermit.slotCode ? <KerbTag code={cardPermit.slotCode} /> : null}
                    {cardPermit.endDate ? <span>đến {fullDate(cardPermit.endDate)}</span> : null}
                  </span>
                </div>
                <StatusChip code={cardPermit.effectiveStatus} />
              </div>
            </Card>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-md lg:col-start-1 lg:row-span-2 lg:row-start-1">
          {/* A vendor with nothing on file has nothing to do yet; the hero invites them to start. */}
          {unregistered ? null : (
            <Section
              title="Việc cần làm"
              description={
                !settled
                  ? undefined
                  : todos.length === 0 && later
                    ? 'Chưa có việc gấp'
                    : todos.length > 0
                      ? `${todos.length} việc đang chờ bạn`
                      : undefined
              }
            >
              {todos.length === 0 && !later && todosLoading ? (
                <Card padded={false}>
                  <div aria-busy="true" className="divide-y divide-border px-md">
                    <span className="sr-only">Đang tải việc cần làm</span>
                    <TodoSkeleton />
                    <TodoSkeleton />
                    <TodoSkeleton />
                  </div>
                </Card>
              ) : todos.length === 0 && !later && failed.length > 0 ? (
                <Card padded={false}>
                  <ErrorState message={failedMessage} onRetry={retryFailed} />
                </Card>
              ) : todos.length === 0 && !later ? (
                <Card padded={false}>
                  <EmptyState
                    icon="check-circle-outline"
                    compact
                    title="Không có việc cần xử lý"
                    description="Phí, biên bản và yêu cầu bổ sung hồ sơ sẽ hiện ở đây."
                  />
                </Card>
              ) : (
                <Card padded={false}>
                  <div
                    aria-busy={todosLoading || undefined}
                    className="divide-y divide-border px-md"
                  >
                    {todos.map((t) => (
                      <ListRow
                        key={t.key}
                        title={t.title}
                        subtitle={<TodoMeta todo={t} />}
                        leading={<TodoBadge kind={t.kind} tone={t.tone} />}
                        trailing={
                          t.amount !== undefined ? (
                            <Money amountVnd={t.amount} className="shrink-0" />
                          ) : undefined
                        }
                        // On a phone the amount needs the chevron's width; the whole row is still the button.
                        showChevron={isDesktop || t.amount === undefined}
                        onPress={() => navigate(t.to)}
                      />
                    ))}
                    {later ? (
                      <ListRow
                        title={`${later.count} kỳ phí sắp tới`}
                        subtitle={`Kỳ gần nhất hạn ${shortDate(later.nextDueDate)}`}
                        leading={
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken">
                            <Icon name="clock-outline" size={18} color={colors.muted} />
                          </span>
                        }
                        trailing={
                          <Money
                            amountVnd={later.total}
                            color={colors.muted}
                            className="shrink-0"
                          />
                        }
                        showChevron={isDesktop}
                        onPress={() => navigate('/vendor/finance')}
                      />
                    ) : null}
                    {/* Sources still answering, or failed: the rows above are not the whole list. */}
                    {todosLoading ? <TodoSkeleton /> : null}
                    {failed.length > 0 ? (
                      <div role="alert" className="flex items-center gap-sm py-sm">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error-bg">
                          <Icon name="alert-circle-outline" size={18} color={colors.error} />
                        </span>
                        <p className="min-w-0 flex-1 text-body-md text-text">{failedMessage}</p>
                        <Button
                          label="Thử lại"
                          variant="outline"
                          size="sm"
                          fullWidth={false}
                          onPress={retryFailed}
                        />
                      </div>
                    ) : null}
                  </div>
                </Card>
              )}
            </Section>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-md lg:col-start-2">
          <Section title="Lối tắt">
            {/* One per row on a phone: two columns leave ~100px for the label and
                cut every one of them short. */}
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-1">
              <Shortcut
                icon="file-document-outline"
                label="Đăng ký kinh doanh"
                onPress={() => navigate('/vendor/registrations')}
              />
              {/* Renting a slot is the "Ô thuê" tab, so it is not repeated here. */}
              {/* Marketplace shortcuts would dead-end on "đang phát triển" with Phase 2 off. */}
              {/* Marketplace needs Phase 2 and a valid permit (principle 1: the legal record first). */}
              {env.enablePhase2 && permits.some((p) => p.effectiveStatus === 'VALID') ? (
                <>
                  <Shortcut
                    icon="qrcode-scan"
                    label="Quét mã nhận hàng"
                    onPress={() => navigate('/vendor/orders/scan')}
                  />
                  <Shortcut
                    icon="silverware-fork-knife"
                    label="Cửa hàng & thực đơn"
                    onPress={() => navigate('/vendor/store')}
                  />
                </>
              ) : null}
            </div>
          </Section>
        </div>
      </div>
    </Screen>
  );
}

/**
 * Everything the hero needs about the vendor's slots: a normalised permit per
 * contract that counts as "now" (see `currentPermits`), and whether a rental
 * application is still waiting on the ward. Live, it uses the same query keys as
 * ContractsListScreen, DigitalPermitScreen and RentalApplicationsScreen, so
 * opening any of them from here reuses the cache. A 404 on a contract's permit
 * just means "not issued yet" and leaves that contract out.
 */
function useVendorStanding(): {
  permits: PermitInfo[];
  hasPendingApplication: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const user = useAuthStore((s) => s.user);

  const contracts = useQuery({
    queryKey: ['side', user?.id, 'contracts'],
    queryFn: () => sideApi.listContracts(),
    enabled: isLiveApi,
  });
  const relevant = (contracts.data ?? []).filter((c) => c.contractStatus !== 'CANCELLED');
  const permitQueries = useQueries({
    queries: relevant.map((contract) => ({
      queryKey: ['side', user?.id, 'permit', contract.contractId],
      queryFn: () => sideApi.getPermit(contract.contractId),
      enabled: isLiveApi,
      retry: false,
    })),
  });
  const applications = useQuery({
    queryKey: ['side', user?.id, 'applications'],
    queryFn: () => sideApi.listApplications(),
    enabled: isLiveApi,
  });

  const mockContracts = useMockDb((s) => s.contracts).filter(
    (c) => c.vendorId === user?.vendorId && c.contract_status !== 'CANCELLED',
  );
  const mockSlots = useMockDb((s) => s.slots);
  const mockPermits = useMockDb((s) => s.permits);
  const mockApplications = useMockDb((s) => s.applications);

  if (!isLiveApi) {
    const today = new Date().toISOString().slice(0, 10);
    const all = mockContracts.flatMap((c): PermitInfo[] => {
      const p = mockPermits.find((x) => x.contractId === c.id);
      if (!p) return [];
      // The mock store keeps the issued status; the view's "expired" is derived from the date.
      const expired = p.permit_status === 'VALID' && p.expires_at.slice(0, 10) < today;
      return [
        {
          contractId: c.id,
          slotCode: mockSlots.find((s) => s.id === c.slotId)?.slot_code ?? null,
          effectiveStatus: expired ? 'EXPIRED' : p.permit_status,
          contractStatus: c.contract_status,
          startDate: null,
          endDate: p.expires_at,
          qrValue: p.permit_code,
        },
      ];
    });
    return {
      permits: currentPermits(all),
      hasPendingApplication: mockApplications.some(
        (a) => a.vendorId === user?.vendorId && PENDING_APPLICATION.has(a.application_status),
      ),
      isLoading: false,
      isError: false,
      refetch: () => undefined,
    };
  }

  const all = relevant.flatMap((c, i): PermitInfo[] => {
    const p = permitQueries[i]?.data;
    return p
      ? [
          {
            contractId: c.contractId,
            slotCode: c.slotCode,
            effectiveStatus: p.effectiveStatus,
            contractStatus: c.contractStatus,
            startDate: p.startDate,
            endDate: p.endDate,
            qrValue: p.qrPayload,
          },
        ]
      : [];
  });
  return {
    permits: currentPermits(all),
    hasPendingApplication: (applications.data ?? []).some((a) =>
      PENDING_APPLICATION.has(a.applicationStatus),
    ),
    isLoading:
      contracts.isLoading || applications.isLoading || permitQueries.some((q) => q.isLoading),
    // A permit 404 is "not issued yet", not a failure, so only the lists count here.
    isError: contracts.isError || applications.isError,
    refetch: () => {
      void contracts.refetch();
      void applications.refetch();
    },
  };
}

const KIND_ICON: Record<TodoKind, IconName> = {
  fee: 'cash-multiple',
  penalty: 'alert-octagon-outline',
  registration: 'file-document-outline',
};

/** What the item is (icon) and how urgent it is (tone): the two never share one signal. */
function TodoBadge({ kind, tone }: { kind: TodoKind; tone: TodoTone }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone === 'danger' ? 'bg-error-bg' : 'bg-tint-secondary'}`}
    >
      <Icon
        name={KIND_ICON[kind]}
        size={18}
        color={tone === 'danger' ? colors.error : colors.onSecondary}
      />
    </span>
  );
}

/** Slot, then the deadline or reason, under a to-do's title. */
function TodoMeta({ todo }: { todo: Todo }) {
  const noteClass =
    todo.noteTone === 'danger'
      ? 'font-medium text-error'
      : todo.noteTone === 'pending'
        ? 'font-medium text-on-secondary'
        : 'text-muted';
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-xs gap-y-1">
      {todo.slotCode ? <KerbTag code={todo.slotCode} /> : null}
      {todo.note ? <span className={`text-body-sm ${noteClass}`}>{todo.note}</span> : null}
    </span>
  );
}

/** One placeholder row in the shape of a to-do ListRow. */
function TodoSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-sm py-sm">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  );
}

function Shortcut({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress}>
      <div className="flex items-center gap-sm">
        {/* Ink, not chili: chili is kept for the one action that matters on the screen. */}
        <Icon name={icon} size={22} color={colors.indigo} />
        <span className="min-w-0 flex-1 truncate text-headline-sm text-text">{label}</span>
        <Icon name="chevron-right" size={18} color={colors.muted} />
      </div>
    </Card>
  );
}
