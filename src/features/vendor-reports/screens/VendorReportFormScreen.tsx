import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/common';
import { PhotoPicker, TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { AiHint } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { env } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function VendorReportFormScreen() {
  const { vendorId } = useLocalSearchParams<{ vendorId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const vendor = useMockDb((s) => s.vendors.find((v) => v.id === vendorId));
  const addReport = useMockDb((s) => s.addReport);
  const [reason, setReason] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();

  if (!vendor) return <ErrorState message="Không tìm thấy hộ kinh doanh." />;

  const submit = () => {
    if (!reason.trim()) return;
    addReport({
      vendorId: vendor.id,
      reporterId: user?.id ?? 'GUEST',
      reason,
      photoUri,
    });
    showToast('Đã gửi phản ánh tới Phường');
    router.back();
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Gửi phản ánh"
            variant="danger"
            onPress={submit}
            disabled={!reason.trim()}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Báo cáo vi phạm" back subtitle={vendor.business_name} />
      {env.enableAiCompliance && photoUri ? (
        <AiHint title="Đã trích xuất vị trí từ ảnh">
          Toạ độ trong ảnh cho thấy hộ kinh doanh đang hoạt động ngoài ô được cấp phép. Thông tin
          này sẽ được đính kèm để Phường xác minh nhanh hơn.
        </AiHint>
      ) : null}
      <TextField
        label="Mô tả vi phạm"
        value={reason}
        onChangeText={setReason}
        multiline
        placeholder="VD: Bán sai vị trí, không có giấy phép..."
      />
      <PhotoPicker
        label="Ảnh minh chứng"
        uri={photoUri}
        onChange={setPhotoUri}
        onRemove={() => setPhotoUri(undefined)}
      />
    </Screen>
  );
}
