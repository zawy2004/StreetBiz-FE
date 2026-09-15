import { ComponentProps } from 'react';
import { ColorValue, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { BrandLogo } from '@/components/common';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { colors, spacing, typography } from '@/theme';

const SIDEBAR_WIDTH = 280;

/**
 * Custom tab bar rendered by every role's `_layout.tsx` via `<Tabs tabBar={...}>`.
 * Bottom row on mobile/tablet, fixed indigo sidebar on desktop (>=1024px) —
 * matches the "Modern Heritage" layout spec (280px sidebar, 24px gutter).
 *
 * The navigator invokes `tabBar(props)` as a plain function call (not via
 * JSX), so hooks cannot be called directly inside it — that breaks the
 * Rules of Hooks with an "Invalid hook call" error. The fix is to have the
 * `tabBar` function only return JSX for a real component (`RoleTabBarInner`)
 * instead of calling hooks itself; React then mounts that component through
 * its normal element-reconciliation path, where hooks work fine.
 */
export function createRoleTabBar(roleLabel: string) {
  return function RoleTabBar(props: BottomTabBarProps) {
    return <RoleTabBarInner {...props} roleLabel={roleLabel} />;
  };
}

function RoleTabBarInner({
  state,
  descriptors,
  navigation,
  roleLabel,
}: BottomTabBarProps & { roleLabel: string }) {
  const isDesktop = useIsDesktop();
  const routes = state.routes.filter((route) => {
    const options = descriptors[route.key]?.options;
    return options?.tabBarItemStyle !== undefined
      ? JSON.stringify(options.tabBarItemStyle) !== JSON.stringify({ display: 'none' })
      : true;
  });

  const items = routes.map((route) => {
    const { options } = descriptors[route.key]!;
    const index = state.routes.findIndex((r) => r.key === route.key);
    const focused = state.index === index;
    const color = focused ? colors.primary : isDesktop ? colors.white : colors.muted;
    const label = (options.title ?? route.name) as string;
    const icon = options.tabBarIcon?.({ focused, color, size: 22 });

    const onPress = () => {
      if (!focused) {
        navigation.navigate(route.name);
      }
    };

    return { key: route.key, label, icon, focused, onPress };
  });

  if (isDesktop) {
    return (
      <SafeAreaView edges={['top', 'left', 'bottom']} style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <BrandLogo size={28} />
          <Text style={[typography.headlineSm, { color: colors.white }]} numberOfLines={1}>
            StreetBiz
          </Text>
        </View>
        <Text style={[typography.badge, { color: '#9AA3B8', marginBottom: spacing.sm }]}>
          {roleLabel.toUpperCase()}
        </Text>
        <ScrollView contentContainerStyle={{ gap: 4 }}>
          {items.map((item) => (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityState={{ selected: item.focused }}
              style={[styles.sidebarItem, item.focused && styles.sidebarItemActive]}
            >
              {item.icon}
              <Text
                style={[
                  typography.headlineSm,
                  { color: item.focused ? colors.primary : colors.white },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
      <View style={styles.bottomRow}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: item.focused }}
            style={styles.bottomItem}
          >
            {item.icon}
            <Text
              style={[typography.bodySm, { color: item.focused ? colors.primary : colors.muted }]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

export type RoleTabIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Typed `tabBarIcon` factory for `Tabs.Screen` options — keeps icon wiring one-liners. */
export function tabIcon(name: RoleTabIcon) {
  return function TabIcon({ color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <MaterialCommunityIcons name={name} size={size} color={color as string} />;
  };
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.indigo,
    padding: spacing.md,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    height: 44,
    borderRadius: 8,
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bottomBar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomRow: {
    flexDirection: 'row',
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    minHeight: 56,
  },
});
