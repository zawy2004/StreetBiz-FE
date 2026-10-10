import { useNavigate } from 'react-router-dom';

import { IconButton } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint } from '@/components/status';
import { useWards } from '@/core/auth/useWards';
import { env } from '@/core/config/env';
import { useAuthStore } from '@/store/auth-store';
import { useWardDashboard } from '../useWardReports';
import {
  CollectionLedger,
  DashboardSkeleton,
  KerbOccupancyStrip,
  ShiftShortcuts,
  WardTaskBoard,
  type Shortcut,
} from '../components/review/DashboardParts';
import { formatTodayVi } from '../components/review/format';

const SHORTCUTS: Shortcut[] = [
  {
    to: '/ward/inbox',
    icon: 'inbox-outline',
    title: 'Hộp duyệt',
    description: 'Hồ sơ đăng ký, đề xuất ô, xung đột địa chỉ và chuyển nhượng',
  },
  {
    to: '/ward/slots',
    icon: 'map-marker-radius-outline',
    title: 'Lưới ô vỉa hè',
    description: 'Theo dõi trạng thái từng ô',
  },
  {
    to: '/ward/patrol',
    icon: 'qrcode-scan',
    title: 'Tuần tra và quét QR',
    description: 'Kiểm tra giấy phép số, phân tích ảnh hiện trường',
  },
  {
    to: '/ward/patrol/violations/new',
    icon: 'gavel',
    title: 'Lập biên bản vi phạm',
    description: 'Biên bản hiện trường và quyết định xử phạt (NĐ 168/2024)',
  },
];

/**
 * WARD-15 shift start. The ward's notice board: today's two work numbers set
 * large, the pavement drawn as its own row of slots, the collection ledger,
 * then the shift toolbar. Every figure is the officer's own ward (the backend
 * scopes the token); nothing here belongs to platform administration.
 */
export function WardDashboardScreen() {
  const navigate = useNavigate();
  const { dashboard, isLoading } = useWardDashboard();
  const wardName = useWardName();
  const pendingCount = dashboard
    ? dashboard.pendingRegistrations + dashboard.pendingApplications
    : 0;
  const today = formatTodayVi();

  const aiHint =
    dashboard && env.enableAiCompliance ? (
      <AiHint title="Tóm tắt tuần này">
        {pendingCount} hồ sơ đang chờ xử lý, tỷ lệ lấp đầy {dashboard.occupancyPercent}%. Ưu tiên
        xét các hồ sơ cửa hàng cố định có giấy phép kinh doanh hợp lệ trước.
      </AiHint>
    ) : null;

  return (
    <Screen width="wide">
      <AppHeader
        title="Tổng quan"
        subtitle={wardName ? `${wardName} · ${today}` : today}
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

      {isLoading || !dashboard ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex flex-col gap-xl">
          <div className="grid items-start gap-md xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:gap-lg">
            <WardTaskBoard
              pendingCount={pendingCount}
              pendingRegistrations={dashboard.pendingRegistrations}
              pendingApplications={dashboard.pendingApplications}
              openViolations={dashboard.openViolations}
              onOpenInbox={() => navigate('/ward/inbox')}
              onOpenViolations={() => navigate('/ward/reports')}
            />
            {aiHint}
          </div>

          <KerbOccupancyStrip
            rented={dashboard.slotRented}
            total={dashboard.slotTotal}
            percent={dashboard.occupancyPercent}
            activeContracts={dashboard.activeContracts}
            onOpen={() => navigate('/ward/slots')}
          />

          <CollectionLedger
            collected={dashboard.revenueCollected}
            outstanding={dashboard.outstandingDebt}
            onOpen={() => navigate('/ward/reports')}
          />
        </div>
      )}

      <div className="mt-sm pb-[88px] md:pb-0">
        <Section title="Lối tắt">
          <ShiftShortcuts shortcuts={SHORTCUTS} onOpen={(to) => navigate(to)} />
        </Section>
      </div>
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
