import { useNavigate } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { useNewRegistrationStore } from '../new-registration-store';

export function RegistrationsListScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const registrations = useMockDb((s) => s.registrations).filter(
    (r) => r.vendorId === user?.vendorId,
  );
  const reset = useNewRegistrationStore((s) => s.reset);

  return (
    <Screen
      footer={
        <div className="p-md">
          <Button
            label="Đăng ký kinh doanh mới"
            onPress={() => {
              reset();
              navigate('/vendor/registrations/new/type');
            }}
          />
        </div>
      }
    >
      <AppHeader title="Đăng ký kinh doanh" back />
      {registrations.length === 0 ? (
        <EmptyState icon="file-document-outline" title="Chưa có hồ sơ đăng ký" />
      ) : (
        registrations.map((r) => (
          <Card key={r.id} onPress={() => navigate(`/vendor/registrations/${r.id}`)}>
            <div className="flex justify-between">
              <div className="flex flex-1 flex-col gap-2xs">
                <span className="text-headline-sm text-text">{r.business_name}</span>
                <span className="text-body-md text-muted">
                  {r.vendor_type === 'FIXED_STOREFRONT' ? 'Cửa hàng cố định' : 'Bán hàng lưu động'}
                </span>
              </div>
              <StatusChip code={r.registration_status} />
            </div>
          </Card>
        ))
      )}
    </Screen>
  );
}
