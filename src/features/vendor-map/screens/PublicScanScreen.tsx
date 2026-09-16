import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Divider, Icon, ListRow } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function PublicScanScreen() {
  const navigate = useNavigate();
  const permits = useMockDb((s) => s.permits);
  const contracts = useMockDb((s) => s.contracts);
  const slots = useMockDb((s) => s.slots);
  const vendors = useMockDb((s) => s.vendors);
  const [code, setCode] = useState('');
  const [searched, setSearched] = useState(false);

  const permit = permits.find((p) => p.permit_code === code.trim());
  const contract = contracts.find((c) => c.id === permit?.contractId);
  const slot = slots.find((s) => s.id === contract?.slotId);
  const vendor = vendors.find((v) => v.id === contract?.vendorId);

  const isValid = permit?.permit_status === 'VALID';

  return (
    <Screen>
      <AppHeader title="Quét mã QR" subtitle="Xác thực giấy phép kinh doanh vỉa hè" />
      <div className="flex items-center justify-center py-lg">
        <Icon name="qrcode-scan" size={64} color={colors.muted} />
      </div>
      <div className="flex items-end gap-sm">
        <div className="flex-1">
          <TextField
            label="Nhập mã giấy phép"
            value={code}
            onChangeText={setCode}
            placeholder="SB-HC1-2026-0815"
          />
        </div>
        <Button label="Kiểm tra" fullWidth={false} onPress={() => setSearched(true)} />
      </div>

      {searched && !permit ? (
        <EmptyState
          icon="qrcode-remove"
          title="Mã không hợp lệ"
          description="Không tìm thấy giấy phép tương ứng."
        />
      ) : null}

      {permit && vendor && slot ? (
        <>
          <Card
            style={isValid ? undefined : { backgroundColor: '#FFDAD614', borderColor: '#BA1A1A33' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-headline-sm text-text">{vendor.business_name}</span>
              <StatusChip code={permit.permit_status} />
            </div>
          </Card>
          <Card padded={false}>
            <div className="px-md">
              <ListRow title="Vị trí cấp phép" subtitle={`${slot.slot_code} · ${slot.street}`} />
              <Divider />
              <ListRow
                title="Hiệu lực đến"
                subtitle={new Date(permit.expires_at).toLocaleDateString('vi-VN')}
              />
            </div>
          </Card>
          <Button
            label="Xem hồ sơ hộ kinh doanh"
            variant="outline"
            onPress={() => navigate(`/customer/explore/vendors/${vendor.id}`)}
          />
          <Button
            label="Báo cáo bất thường"
            variant="ghost"
            onPress={() => navigate(`/customer/explore/vendors/${vendor.id}/reports/new`)}
          />
        </>
      ) : null}
    </Screen>
  );
}
