import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { colors, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function VendorReportReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const report = useMockDb((s) => s.reports.find((r) => r.id === id));
  const vendors = useMockDb((s) => s.vendors);
  const resolveReport = useMockDb((s) => s.resolveReport);

  if (!report) return <ErrorState message="Không tìm thấy phản ánh." />;

  const vendor = vendors.find((v) => v.id === report.vendorId);

  return (
    <Screen
      footer={
        <StickyActions>
          <View style={{ flex: 1 }}>
            <Button
              label="Lập biên bản vi phạm"
              variant="outline"
              onPress={() => router.push('/ward/patrol/violations/new')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Đánh dấu đã xử lý"
              variant="approve"
              onPress={() => {
                resolveReport(report.id);
                showToast('Đã xử lý phản ánh');
                router.back();
              }}
            />
          </View>
        </StickyActions>
      }
    >
      <AppHeader
        title="Phản ánh vi phạm"
        back
        subtitle={vendor?.business_name ?? 'Không rõ hộ kinh doanh'}
      />
      <Card>
        <Text style={[typography.bodyMd, { color: colors.muted }]}>Nội dung phản ánh</Text>
        <Text style={[typography.headlineSm, { color: colors.text, marginTop: 4 }]}>
          {report.reason}
        </Text>
        <Text style={[typography.bodySm, { color: colors.muted, marginTop: 8 }]}>
          Gửi lúc {new Date(report.created_at).toLocaleString('vi-VN')}
        </Text>
      </Card>
    </Screen>
  );
}
