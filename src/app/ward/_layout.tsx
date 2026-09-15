import { Tabs } from 'expo-router/js-tabs';

import { createRoleTabBar, tabIcon } from '@/components/layout/RoleTabBar';
import { RoleGuard } from '@/core/auth/RoleGuard';
import { useIsDesktop } from '@/hooks/useBreakpoint';

const tabBar = createRoleTabBar('Cán bộ Phường');

export default function WardLayout() {
  const isDesktop = useIsDesktop();

  return (
    <RoleGuard role="WARD_AUTHORITY">
      <Tabs
        tabBar={tabBar}
        screenOptions={{ headerShown: false, tabBarPosition: isDesktop ? 'left' : 'bottom' }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{ title: 'Tổng quan', tabBarIcon: tabIcon('view-dashboard-outline') }}
        />
        <Tabs.Screen
          name="inbox"
          options={{ title: 'Hộp duyệt', tabBarIcon: tabIcon('inbox-outline') }}
        />
        <Tabs.Screen
          name="slots"
          options={{ title: 'Lưới ô', tabBarIcon: tabIcon('map-marker-radius-outline') }}
        />
        <Tabs.Screen
          name="patrol"
          options={{ title: 'Tuần tra', tabBarIcon: tabIcon('qrcode-scan') }}
        />
        <Tabs.Screen
          name="reports"
          options={{ title: 'Báo cáo', tabBarIcon: tabIcon('chart-bar') }}
        />
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>
    </RoleGuard>
  );
}
