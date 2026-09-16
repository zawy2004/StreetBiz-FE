import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { AiHint, StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { env } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';

export function RegistrationReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const registration = useMockDb((s) => s.registrations.find((r) => r.id === id));
  const approve = useMockDb((s) => s.approveRegistration);
  const reject = useMockDb((s) => s.rejectRegistration);
  const requestEvidence = useMockDb((s) => s.requestRegistrationEvidence);
  const [note, setNote] = useState('');

  if (!registration) return <ErrorState message="Không tìm thấy hồ sơ." />;

  const act = (action: 'APPROVE' | 'REJECT' | 'EVIDENCE') => {
    if (action === 'APPROVE') approve(registration.id);
    if (action === 'REJECT') reject(registration.id, note || 'Hồ sơ chưa hợp lệ');
    if (action === 'EVIDENCE')
      requestEvidence(registration.id, note || 'Vui lòng bổ sung giấy tờ rõ nét hơn');
    showToast('Đã cập nhật hồ sơ');
    navigate(-1);
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="flex-1">
            <Button label="Yêu cầu bổ sung" variant="outline" onPress={() => act('EVIDENCE')} />
          </div>
          <div className="flex-1">
            <Button label="Từ chối" variant="danger" onPress={() => act('REJECT')} />
          </div>
          <div className="flex-1">
            <Button label="Duyệt" variant="approve" onPress={() => act('APPROVE')} />
          </div>
        </StickyActions>
      }
    >
      <AppHeader title={registration.business_name} back />
      <div className="flex flex-row flex-wrap gap-xs">
        <StatusChip code={registration.registration_status} />
        {registration.fast_track ? <StatusChip label="Ưu tiên xét nhanh" tone="ok" /> : null}
      </div>

      {env.enableAiCompliance ? (
        <AiHint title="Đối chiếu tự động">
          Thông tin trên giấy phép kinh doanh khớp với dữ liệu hộ kinh doanh khai báo. Không phát
          hiện hồ sơ trùng lặp từ cùng số CCCD hoặc địa chỉ.
        </AiHint>
      ) : null}

      <Section title="Thông tin hộ kinh doanh">
        <Card padded={false}>
          <div className="px-md">
            <ListRow title="Chủ hộ" subtitle={registration.owner_name} />
            <Divider />
            <ListRow title="Số CCCD" subtitle={registration.id_number} />
            <Divider />
            <ListRow
              title="Loại hình"
              subtitle={
                registration.vendor_type === 'FIXED_STOREFRONT'
                  ? 'Cửa hàng cố định'
                  : 'Bán hàng lưu động'
              }
            />
            <Divider />
            <ListRow title="Địa chỉ" subtitle={registration.address} />
          </div>
        </Card>
      </Section>

      <Section title="Giấy tờ minh chứng">
        <div className="flex flex-row flex-wrap gap-sm">
          {registration.evidence.map((ev) => (
            <div key={ev.type} className="flex flex-col items-center gap-1">
              {ev.uri ? (
                <img src={ev.uri} alt={ev.label} className="h-24 w-24 rounded-sm object-cover" />
              ) : (
                <div className="h-24 w-24 rounded-sm border border-border bg-bg" />
              )}
              <span className="text-body-sm text-muted">{ev.label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Ghi chú phản hồi (nếu từ chối / yêu cầu bổ sung)">
        <TextField value={note} onChangeText={setNote} multiline placeholder="Nhập lý do..." />
      </Section>
    </Screen>
  );
}
