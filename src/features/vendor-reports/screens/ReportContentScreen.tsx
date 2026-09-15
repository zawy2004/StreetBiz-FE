import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

type Params = { contentType: 'STOREFRONT' | 'MENU_ITEM' | 'REVIEW'; targetId: string };

export function ReportContentScreen() {
  const { contentType, targetId } = useLocalSearchParams<Params>();
  const router = useRouter();
  const reportContent = useMockDb((s) => s.reportContent);
  const [reason, setReason] = useState('');

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Gửi báo cáo"
            variant="danger"
            disabled={!reason.trim()}
            onPress={() => {
              reportContent({ content_type: contentType, targetId, reason });
              showToast('Đã gửi báo cáo tới quản trị viên');
              router.back();
            }}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Báo cáo nội dung" back />
      <TextField
        label="Lý do báo cáo"
        value={reason}
        onChangeText={setReason}
        multiline
        placeholder="VD: Thông tin sai sự thật, hình ảnh không phù hợp..."
      />
    </Screen>
  );
}
