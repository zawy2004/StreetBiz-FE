import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Divider, Icon, ListRow } from '@/components/common';
import { EmptyState } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { colors } from '@/theme';
import { communityApi, CommunityApiError } from '../community-api';

function currentPosition(): Promise<{ latitude: number; longitude: number } | undefined> {
  if (!navigator.geolocation) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 7_000 },
    );
  });
}

export function PublicScanScreen() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const verification = useMutation({
    mutationFn: async () => communityApi.verifyPermit(code.trim(), await currentPosition()),
  });
  const result = verification.data;

  return (
    <Screen>
      <AppHeader title="Quét mã QR" subtitle="Xác thực giấy phép trực tiếp với Backend" />
      <div className="flex items-center justify-center py-lg">
        <Icon name="qrcode-scan" size={64} color={colors.muted} />
      </div>
      <div className="flex items-end gap-sm">
        <div className="flex-1">
          <TextField
            label="Nội dung QR giấy phép"
            value={code}
            onChangeText={(value) => setCode(value.slice(0, 500))}
            placeholder="Dán nội dung mã QR"
            error={
              verification.error instanceof CommunityApiError
                ? verification.error.message
                : undefined
            }
          />
        </div>
        <Button
          label="Kiểm tra"
          fullWidth={false}
          loading={verification.isPending}
          disabled={!code.trim()}
          onPress={() => verification.mutate()}
        />
      </div>

      {result && !result.permitId ? (
        <EmptyState
          icon="qrcode-remove"
          title="Mã QR không hợp lệ"
          description="Chữ ký hoặc giấy phép tương ứng không tồn tại. Lần kiểm tra đã được ghi nhận."
        />
      ) : null}

      {result?.permitId ? (
        <>
          <Card
            style={
              result.isValid
                ? undefined
                : { backgroundColor: '#FFDAD614', borderColor: '#BA1A1A33' }
            }
          >
            <div className="flex items-center justify-between gap-sm">
              <span className="text-headline-sm text-text">{result.displayName}</span>
              <StatusChip code={result.status} />
            </div>
          </Card>
          <Card padded={false}>
            <div className="px-md">
              <ListRow title="Ô được cấp phép" subtitle={result.slotCode ?? 'Không có dữ liệu'} />
              <Divider />
              <ListRow
                title="Thời hạn"
                subtitle={`${result.validFrom ? new Date(result.validFrom).toLocaleDateString('vi-VN') : '—'} – ${
                  result.validUntil ? new Date(result.validUntil).toLocaleDateString('vi-VN') : '—'
                }`}
              />
            </div>
          </Card>
          {result.vendorId ? (
            <>
              <Button
                label="Xem hồ sơ hộ kinh doanh"
                variant="outline"
                onPress={() => navigate(`/customer/explore/vendors/${result.vendorId}`)}
              />
              <Button
                label="Báo cáo bất thường"
                variant="ghost"
                onPress={() =>
                  navigate(
                    `/customer/explore/vendors/${result.vendorId}/reports/new?permitId=${result.permitId}&slotId=${result.slotId}`,
                  )
                }
              />
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
