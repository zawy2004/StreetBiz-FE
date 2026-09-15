import { Tabs } from 'expo-router/js-tabs';

import { createRoleTabBar, tabIcon } from '@/components/layout/RoleTabBar';
import { RoleGuard } from '@/core/auth/RoleGuard';
import { useIsDesktop } from '@/hooks/useBreakpoint';

const tabBar = createRoleTabBar('Hộ kinh doanh');

export default function VendorLayout() {
  const isDesktop = useIsDesktop();

  return (
    <RoleGuard role="VENDOR">
      <Tabs
        tabBar={tabBar}
        screenOptions={{ headerShown: false, tabBarPosition: isDesktop ? 'left' : 'bottom' }}
      >
        <Tabs.Screen
          name="home"
          options={{ title: 'Trang chủ', tabBarIcon: tabIcon('home-outline') }}
        />
        <Tabs.Screen
          name="slots"
          options={{ title: 'Ô thuê', tabBarIcon: tabIcon('map-marker-radius-outline') }}
        />
        <Tabs.Screen
          name="finance"
          options={{ title: 'Tài chính', tabBarIcon: tabIcon('cash-multiple') }}
        />
        <Tabs.Screen
          name="store"
          options={{ title: 'Cửa hàng', tabBarIcon: tabIcon('silverware-fork-knife') }}
        />
        <Tabs.Screen
          name="account"
          options={{ title: 'Tài khoản', tabBarIcon: tabIcon('account-circle-outline') }}
        />
        <Tabs.Screen name="registrations" options={{ href: null }} />
        <Tabs.Screen name="assistant" options={{ href: null }} />
      </Tabs>
    </RoleGuard>
  );
}
