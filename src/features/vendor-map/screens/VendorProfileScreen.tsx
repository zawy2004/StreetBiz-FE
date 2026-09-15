import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Avatar, Button, Card, Money } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint, StatusChip } from '@/components/status';
import { EmptyState, ErrorState } from '@/components/feedback';
import { env } from '@/core/config/env';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/features/cart/cart-store';

export function VendorProfileScreen() {
  const { vendorId } = useLocalSearchParams<{ vendorId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const vendor = useMockDb((s) => s.vendors.find((v) => v.id === vendorId));
  const contracts = useMockDb((s) => s.contracts).filter(
    (c) => c.vendorId === vendorId && c.contract_status === 'ACTIVE',
  );
  const permits = useMockDb((s) => s.permits);
  const slots = useMockDb((s) => s.slots);
  const comments = useMockDb((s) => s.comments).filter((c) => c.vendorId === vendorId);
  const storefront = useMockDb((s) => s.storefronts.find((st) => st.vendorId === vendorId));
  const menuItems = useMockDb((s) => s.menuItems).filter((m) => m.storefrontId === storefront?.id);
  const cartItems = useCartStore((s) => s.items).filter((i) => i.storefrontId === storefront?.id);

  if (!vendor) return <ErrorState message="Không tìm thấy hộ kinh doanh." />;

  const contract = contracts[0];
  const permit = permits.find((p) => p.contractId === contract?.id);
  const slot = slots.find((s) => s.id === contract?.slotId);
  const ratingAvg = comments.length
    ? comments.reduce((sum, c) => sum + c.rating, 0) / comments.length
    : 0;

  return (
    <Screen>
      <AppHeader title={vendor.business_name} back />
      <Card>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Avatar name={vendor.business_name} size={56} />
          <View style={{ flex: 1, gap: 4 }}>
            {permit ? <StatusChip code={permit.permit_status} /> : null}
            {comments.length ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="star" size={16} color={colors.secondary} />
                <Text style={[typography.bodyMd, { color: colors.text }]}>
                  {ratingAvg.toFixed(1)} ({comments.length} đánh giá)
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        {slot ? (
          <Text style={[typography.bodyMd, { color: colors.muted, marginTop: spacing.sm }]}>
            {slot.street} · Ô {slot.slot_code} · {slot.time_window}
          </Text>
        ) : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Viết đánh giá"
            variant="outline"
            onPress={() =>
              user
                ? router.push(`/customer/explore/vendors/${vendor.id}/comments/new`)
                : router.push('/auth/sign-in')
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Báo cáo vi phạm"
            variant="ghost"
            onPress={() => router.push(`/customer/explore/vendors/${vendor.id}/reports/new`)}
          />
        </View>
      </View>

      {env.enableAiCompliance && comments.length > 2 ? (
        <AiHint title="Tóm tắt đánh giá">
          Khách hàng khen ngợi hương vị và vệ sinh an toàn thực phẩm, một số phản hồi về thời gian
          chờ vào giờ cao điểm.
        </AiHint>
      ) : null}

      {storefront && menuItems.length > 0 ? (
        <Section
          title="Thực đơn"
          action={
            cartItems.length > 0 ? (
              <Button
                label={`Giỏ hàng (${cartItems.length})`}
                fullWidth={false}
                variant="outline"
                onPress={() => router.push('/customer/explore/cart')}
              />
            ) : undefined
          }
        >
          {menuItems.map((item) => (
            <Card key={item.id} onPress={() => router.push(`/customer/explore/items/${item.id}`)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[typography.headlineSm, { color: colors.text }]}>{item.name}</Text>
                <Money amountVnd={item.price} />
              </View>
            </Card>
          ))}
        </Section>
      ) : null}

      <Section title={`Đánh giá (${comments.length})`}>
        {comments.length === 0 ? (
          <EmptyState icon="comment-outline" title="Chưa có đánh giá nào" />
        ) : (
          comments.map((c) => (
            <Card key={c.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[typography.headlineSm, { color: colors.text }]}>{c.authorName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <MaterialCommunityIcons name="star" size={14} color={colors.secondary} />
                  <Text style={[typography.bodySm, { color: colors.muted }]}>{c.rating}</Text>
                </View>
              </View>
              <Text style={[typography.bodyMd, { color: colors.muted, marginTop: 4 }]}>
                {c.text}
              </Text>
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}
