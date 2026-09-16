import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ConfirmDialog, ErrorState } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function RegistrationDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const registration = useMockDb((s) => s.registrations.find((r) => r.id === id));
  const withdraw = useMockDb((s) => s.withdrawRegistration);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  if (!registration) return <ErrorState message="Không tìm thấy hồ sơ." />;

  const canWithdraw = ['PENDING', 'UNDER_REVIEW', 'NEEDS_INFO'].includes(
    registration.registration_status,
  );
  const isFixedApproved =
    registration.vendor_type === 'FIXED_STOREFRONT' &&
    registration.registration_status === 'APPROVED';

  return (
    <Screen
      footer={
        canWithdraw ? (
          <StickyActions>
            <Button label="Rút hồ sơ" variant="outline" onPress={() => setConfirmWithdraw(true)} />
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title={registration.business_name} back />
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2xs">
            <span className="text-body-md text-muted">
              {registration.vendor_type === 'FIXED_STOREFRONT'
                ? 'Cửa hàng cố định'
                : 'Bán hàng lưu động'}
            </span>
            <span className="text-body-sm text-muted">
              Nộp ngày {new Date(registration.submitted_at).toLocaleDateString('vi-VN')}
            </span>
          </div>
          <StatusChip code={registration.registration_status} />
        </div>
      </Card>

      {registration.review_note ? (
        <Card style={{ backgroundColor: '#FFDAD614', borderColor: '#BA1A1A33' }}>
          <p className="mb-1 text-label text-error">Phản hồi từ Phường</p>
          <p className="text-body-md text-text">{registration.review_note}</p>
        </Card>
      ) : null}

      <Section title="Thông tin đã nộp">
        <Card padded={false}>
          <div className="px-md">
            <ListRow title="Chủ hộ" subtitle={registration.owner_name} />
            <Divider />
            <ListRow title="Số CCCD" subtitle={registration.id_number} />
            <Divider />
            <ListRow title="Địa chỉ" subtitle={registration.address} />
          </div>
        </Card>
      </Section>

      <Section title="Giấy tờ minh chứng">
        <div className="flex flex-wrap gap-sm">
          {registration.evidence.map((ev) => (
            <div key={ev.type} className="flex flex-col items-center gap-2xs">
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

      {isFixedApproved ? (
        <Section title="Tiếp theo">
          <Button
            label="Thuê ô vỉa hè liền kề"
            onPress={() => navigate(`/vendor/registrations/${registration.id}/adjacent-slot`)}
          />
          <Button
            label="Cập nhật địa chỉ kinh doanh"
            variant="outline"
            onPress={() => navigate(`/vendor/registrations/${registration.id}/address`)}
          />
        </Section>
      ) : null}

      <ConfirmDialog
        visible={confirmWithdraw}
        title="Rút hồ sơ đăng ký?"
        description="Bạn có thể nộp lại hồ sơ mới bất cứ lúc nào."
        confirmLabel="Rút hồ sơ"
        confirmVariant="danger"
        onConfirm={() => {
          withdraw(registration.id);
          setConfirmWithdraw(false);
          navigate(-1);
        }}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </Screen>
  );
}
