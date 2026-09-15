import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { AiHint } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { env } from '@/core/config/env';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function SlotProposalReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const slot = useMockDb((s) => s.slots.find((sl) => sl.id === id));
  const reviewProposal = useMockDb((s) => s.reviewSlotProposal);

  if (!slot) return <ErrorState message="Không tìm thấy đề xuất." />;

  const act = (approve: boolean) => {
    reviewProposal(slot.id, approve);
    showToast(approve ? 'Đã thêm ô vào lưới' : 'Đã từ chối đề xuất');
    router.back();
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <View style={{ flex: 1 }}>
            <Button label="Từ chối" variant="danger" onPress={() => act(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Thêm vào lưới" variant="approve" onPress={() => act(true)} />
          </View>
        </StickyActions>
      }
    >
      <AppHeader title="Đề xuất ô mới" back subtitle={slot.street} />

      {env.enableAiCompliance ? (
        <AiHint title="Ước tính khả thi từ ảnh/toạ độ">
          Vị trí nằm trong ranh giới phường (đã xác minh toạ độ). Bề rộng vỉa hè còn lại ước tính
          đạt chuẩn hành lang đi bộ tối thiểu 1.5m.
        </AiHint>
      ) : null}

      <Card padded={false}>
        <View style={{ paddingHorizontal: spacing.md }}>
          <ListRow title="Diện tích ước tính" subtitle={`${slot.size_m2} m²`} />
          <Divider />
          <ListRow title="Toạ độ" subtitle={`${slot.lat.toFixed(4)}, ${slot.lng.toFixed(4)}`} />
        </View>
      </Card>

      <Card>
        <Text style={[typography.bodySm, { color: colors.muted, marginBottom: spacing.xs }]}>
          Ảnh vị trí
        </Text>
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 8,
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        />
      </Card>
    </Screen>
  );
}
