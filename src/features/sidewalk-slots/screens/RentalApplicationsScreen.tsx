import { useNavigate } from 'react-router-dom';

import { Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function RentalApplicationsScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const applications = useMockDb((s) => s.applications).filter(
    (a) => a.vendorId === user?.vendorId,
  );
  const slots = useMockDb((s) => s.slots);

  return (
    <Screen>
      <AppHeader title="Đơn thuê ô" back />
      {applications.length === 0 ? (
        <EmptyState icon="file-document-outline" title="Chưa có đơn thuê nào" />
      ) : (
        applications
          .slice()
          .reverse()
          .map((app) => {
            const slotCodes = app.slotIds
              .map((id) => slots.find((s) => s.id === id)?.slot_code)
              .filter(Boolean)
              .join(', ');
            return (
              <Card
                key={app.id}
                onPress={() => navigate(`/vendor/slots/rental-applications/${app.id}`)}
              >
                <div className="flex justify-between">
                  <div className="flex flex-1 flex-col gap-2xs">
                    <span className="text-headline-sm text-text">{slotCodes || '—'}</span>
                    <span className="text-body-sm text-muted">
                      {app.application_type === 'STOREFRONT_ADJACENT'
                        ? 'Ô liền kề mặt tiền'
                        : 'Ô mở'}{' '}
                      · {new Date(app.submitted_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <StatusChip code={app.application_status} />
                </div>
              </Card>
            );
          })
      )}
    </Screen>
  );
}
