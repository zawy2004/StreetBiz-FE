import { Tabs } from 'expo-router/js-tabs';

import { createRoleTabBar, tabIcon } from '@/components/layout/RoleTabBar';
import { RoleGuard } from '@/core/auth/RoleGuard';
import { useIsDesktop } from '@/hooks/useBreakpoint';

const tabBar = createRoleTabBar('Người mua');

export default function CustomerLayout() {
  const isDesktop = useIsDesktop();

  return (
    <RoleGuard role="CUSTOMER" allowGuest>
      <Tabs
        tabBar={tabBar}
        screenOptions={{ headerShown: false, tabBarPosition: isDesktop ? 'left' : 'bottom' }}
      >
        <Tabs.Screen
          name="explore"
          options={{ title: 'Khám phá', tabBarIcon: tabIcon('compass-outline') }}
        />
        <Tabs.Screen
          name="scan"
          options={{ title: 'Quét QR', tabBarIcon: tabIcon('qrcode-scan') }}
        />
        <Tabs.Screen
          name="orders"
          options={{ title: 'Đơn hàng', tabBarIcon: tabIcon('receipt-text-outline') }}
        />
        <Tabs.Screen
          name="account"
          options={{ title: 'Tài khoản', tabBarIcon: tabIcon('account-circle-outline') }}
        />
        <Tabs.Screen name="checkout" options={{ href: null }} />
      </Tabs>
    </RoleGuard>
  );
}
