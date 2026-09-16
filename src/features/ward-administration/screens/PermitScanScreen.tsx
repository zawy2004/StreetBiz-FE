import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Divider, Icon, ListRow } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { AiHint, StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { env } from '@/core/config/env';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function PermitScanScreen() {
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

  return (
    <Screen>
      <AppHeader title="Tuần tra hiện trường" subtitle="Quét / nhập mã giấy phép QR" />
      <div className="flex flex-row items-end gap-sm">
        <div className="flex-1">
          <TextField
            label="Mã giấy phép"
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
          title="Không tìm thấy giấy phép"
          description="Mã không hợp lệ hoặc chưa được cấp."
        />
      ) : null}

      {permit && contract && slot && vendor ? (
        <>
          <Card>
            <div className="flex flex-row items-center justify-between">
              <p className="text-headline-sm text-text">{vendor.business_name}</p>
              <StatusChip code={permit.permit_status} />
            </div>
          </Card>
          <Card padded={false}>
            <div className="px-md">
              <ListRow title="Ô cấp phép" subtitle={`${slot.slot_code} · ${slot.street}`} />
              <Divider />
              <ListRow title="Diện tích cho phép" subtitle={`${slot.size_m2} m²`} />
              <Divider />
              <ListRow
                title="Hiệu lực đến"
                subtitle={new Date(permit.expires_at).toLocaleDateString('vi-VN')}
              />
            </div>
          </Card>

          {env.enableAiCompliance ? (
            <AiHint title="Không phát hiện lệch vị trí">
              Vị trí quét khớp với toạ độ ô đã cấp phép trong 5 lần quét gần nhất.
            </AiHint>
          ) : null}

          <div className="flex flex-row gap-sm">
            <div className="flex-1">
              <Button
                label="Lập biên bản"
                variant="outline"
                onPress={() =>
                  navigate(`/ward/patrol/violations/new?vendorId=${vendor.id}&slotId=${slot.id}`)
                }
              />
            </div>
            <div className="flex-1">
              <Button
                label="Đình chỉ / thu hồi"
                variant="danger"
                onPress={() => navigate(`/ward/patrol/permits/${permit.id}/action`)}
              />
            </div>
          </div>
        </>
      ) : null}

      {!searched && !permit ? (
        <div className="flex items-center justify-center py-xl">
          <Icon name="qrcode-scan" size={48} color={colors.muted} />
        </div>
      ) : null}
    </Screen>
  );
}
