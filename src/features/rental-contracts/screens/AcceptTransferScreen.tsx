import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { colors, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function AcceptTransferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const transfer = useMockDb((s) => s.transfers.find((t) => t.id === id));
  const registrations = useMockDb((s) => s.registrations).filter(
    (r) => r.vendorId === user?.vendorId,
  );
  const acceptTransfer = useMockDb((s) => s.acceptTransfer);

  if (!transfer) return <ErrorState message="Không tìm thấy yêu cầu." />;

  const hasApprovedRegistration = registrations.some((r) => r.registration_status === 'APPROVED');

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Chấp nhận chuyển nhượng"
            disabled={!hasApprovedRegistration || !user?.vendorId}
            onPress={() => {
              if (!user?.vendorId) return;
              acceptTransfer(transfer.id, user.vendorId);
              showToast('Đã gửi yêu cầu, chờ Phường duyệt');
              router.back();
            }}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Chấp nhận chuyển nhượng" back />
      <Card>
        <Text style={[typography.bodyMd, { color: colors.text }]}>
          Một hộ kinh doanh muốn chuyển nhượng ô đang thuê cho bạn. Yêu cầu cần Phường duyệt trước
          khi có hiệu lực.
        </Text>
      </Card>
      {!hasApprovedRegistration ? (
        <Card style={{ backgroundColor: '#E09F3E18', borderColor: '#E09F3E40' }}>
          <Text style={[typography.bodyMd, { color: colors.onSecondary }]}>
            Bạn cần có hồ sơ đăng ký kinh doanh đã được duyệt trước khi nhận chuyển nhượng.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
