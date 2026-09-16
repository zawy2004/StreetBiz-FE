import { Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function VendorViolationsScreen() {
  const user = useAuthStore((s) => s.user);
  const violations = useMockDb((s) => s.violations).filter((v) => v.vendorId === user?.vendorId);

  return (
    <Screen>
      <AppHeader title="Lịch sử vi phạm" back />
      {violations.length === 0 ? (
        <EmptyState icon="shield-check-outline" title="Không có vi phạm nào" />
      ) : (
        violations.map((v) => (
          <Card key={v.id}>
            <span className="text-headline-sm text-text">{v.violation_type}</span>
            <p className="mt-2xs text-body-md text-muted">{v.note}</p>
            <div className="mt-xs">
              <span className="text-body-sm text-muted">
                {new Date(v.recorded_at).toLocaleString('vi-VN')}
              </span>
            </div>
          </Card>
        ))
      )}
    </Screen>
  );
}
