import { useNavigate } from 'react-router-dom';

import { Card, formatVnd, IconButton } from '@/components/common';
import { RatioMeter, WorkQueue } from '@/components/data';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint } from '@/components/status';
import { ErrorState, LoadingState } from '@/components/feedback';
import { useWards } from '@/core/auth/useWards';
import { env } from '@/core/config/env';
import { useAuthStore } from '@/store/auth-store';
import { useWardDashboard } from '../useWardReports';

/**
 * The ward officer's desk: what is waiting on the ward first, as a worklist with
 * the way in beside each figure, then how the ward's sidewalks are doing. The
 * sidebar already lists every section, so the page repeats none of it.
 */
export function WardDashboardScreen() {
  const navigate = useNavigate();
  const { dashboard, isLoading, isError, refetch } = useWardDashboard();
  const wardName = useWardName();

  return (
    <Screen width="wide">
      <AppHeader
        title="Tổng quan"
        subtitle={wardName}
        right={
          <>
            <IconButton
              icon="cog-outline"
              accessibilityLabel="Cấu hình"
              onPress={() => navigate('/ward/settings/pricing')}
            />
            <IconButton
              icon="account-circle-outline"
              accessibilityLabel="Tài khoản"
              onPress={() => navigate('/account')}
            />
          </>
        }
      />

      {/* Without the error branch a failed request left the spinner running forever. */}
      {isError ? (
        <ErrorState
          message="Chưa tải được số liệu của phường. Kiểm tra mạng rồi thử lại."
          onRetry={() => void refetch()}
        />
      ) : isLoading || !dashboard ? (
        <LoadingState />
      ) : (
        (() => {
          const pending = dashboard.pendingRegistrations + dashboard.pendingApplications;
          const violations = dashboard.openViolations;
          const debt = dashboard.outstandingDebt;
          const waiting = (pending > 0 ? 1 : 0) + (violations > 0 ? 1 : 0) + (debt > 0 ? 1 : 0);
          return (
            <>
              <div className="grid gap-lg lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
                <Section
                  title="Cần xử lý"
                  description={
                    waiting > 0 ? `${waiting} việc đang chờ phường` : 'Phường đã xử lý hết'
                  }
                >
                  <WorkQueue
                    // The review queue is the ward's main job, so it gets the one chili button when it has work.
                    primaryKey={pending > 0 ? 'inbox' : violations > 0 ? 'violations' : undefined}
                    items={[
                      {
                        key: 'inbox',
                        icon: 'inbox-outline',
                        tone: pending > 0 ? 'pending' : 'neutral',
                        label: 'Hồ sơ chờ duyệt',
                        value: `${pending}`,
                        hint:
                          pending > 0
                            ? `${dashboard.pendingRegistrations} đăng ký · ${dashboard.pendingApplications} đơn thuê ô`
                            : 'Đã xử lý hết',
                        action: { label: 'Mở hộp duyệt', onPress: () => navigate('/ward/inbox') },
                      },
                      {
                        key: 'violations',
                        icon: 'gavel',
                        tone: violations > 0 ? 'danger' : 'neutral',
                        label: 'Vi phạm cần xử lý',
                        value: `${violations}`,
                        hint: violations > 0 ? 'chưa xử phạt hoặc chưa nộp phạt' : 'Đã xử lý hết',
                        action: { label: 'Xem vi phạm', onPress: () => navigate('/ward/reports') },
                      },
                      {
                        key: 'debt',
                        icon: 'clock-outline',
                        tone: debt > 0 ? 'pending' : 'neutral',
                        label: 'Còn phải thu',
                        value: formatVnd(debt),
                        hint: 'phí thuê ô và tiền phạt chưa nộp',
                        action: { label: 'Xem báo cáo', onPress: () => navigate('/ward/reports') },
                      },
                    ]}
                  />
                </Section>

                <Section title="Tình hình phường">
                  <Card>
                    <RatioMeter
                      label="Tỷ lệ lấp đầy"
                      part={dashboard.slotRented}
                      whole={dashboard.slotTotal}
                      unit="ô đang thuê"
                    />
                    <dl className="mt-md grid grid-cols-2 gap-md border-t border-border pt-md">
                      <div>
                        <dt className="text-body-sm text-muted">Đã thu</dt>
                        <dd className="mt-2xs font-tabular text-headline-md text-text">
                          {formatVnd(dashboard.revenueCollected)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-body-sm text-muted">Hợp đồng hiệu lực</dt>
                        <dd className="mt-2xs font-tabular text-headline-md text-text">
                          {dashboard.activeContracts}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                </Section>
              </div>

              {env.enableAiCompliance ? (
                <AiHint title="Tóm tắt tuần này">
                  {pending} hồ sơ đang chờ xử lý, tỷ lệ lấp đầy {dashboard.occupancyPercent}%. Ưu
                  tiên xét các hồ sơ cửa hàng cố định có giấy phép kinh doanh hợp lệ trước.
                </AiHint>
              ) : null}
            </>
          );
        })()
      )}
    </Screen>
  );
}

/**
 * The signed-in officer's ward name. The account already carries its ward id,
 * and useWards (cached reference data) covers both live and mock mode.
 */
function useWardName(): string | undefined {
  const user = useAuthStore((state) => state.user);
  const { wards } = useWards();
  // Mock accounts carry the ward name directly instead of an id.
  return wards.find((ward) => ward.unitId === user?.wardUnitId)?.unitName ?? user?.wardUnitType;
}
