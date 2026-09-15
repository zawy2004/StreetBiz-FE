import { Tabs } from 'expo-router/js-tabs';

import { createRoleTabBar, tabIcon } from '@/components/layout/RoleTabBar';
import { RoleGuard } from '@/core/auth/RoleGuard';
import { useIsDesktop } from '@/hooks/useBreakpoint';

const tabBar = createRoleTabBar('Quản trị viên');

export default function PlatformLayout() {
  const isDesktop = useIsDesktop();

  return (
    <RoleGuard role="PLATFORM_ADMIN">
      <Tabs
        tabBar={tabBar}
        screenOptions={{ headerShown: false, tabBarPosition: isDesktop ? 'left' : 'bottom' }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{ title: 'Tổng quan', tabBarIcon: tabIcon('view-dashboard-outline') }}
        />
        <Tabs.Screen
          name="accounts"
          options={{ title: 'Tài khoản', tabBarIcon: tabIcon('account-group-outline') }}
        />
        <Tabs.Screen
          name="categories"
          options={{ title: 'Danh mục', tabBarIcon: tabIcon('shape-outline') }}
        />
        <Tabs.Screen
          name="moderation"
          options={{ title: 'Kiểm duyệt', tabBarIcon: tabIcon('shield-alert-outline') }}
        />
      </Tabs>
    </RoleGuard>
  );
}
