import { useNavigate } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { vendorTypeLabel } from '../labels';
import { useNewRegistrationStore } from '../new-registration-store';
import { useRegistrations } from '../useRegistrations';

/** REG-03: the vendor's own registrations and where each one stands. */
export function RegistrationsListScreen() {
  const navigate = useNavigate();
  const reset = useNewRegistrationStore((s) => s.reset);
  const { registrations, isLoading, isError, error, refetch } = useRegistrations();

  const startNew = () => {
    reset();
    navigate('/vendor/registrations/new/type');
  };

  const body = () => {
    if (isLoading) return <LoadingState />;
    if (isError) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
    if (registrations.length === 0) {
      return (
        <EmptyState
          icon="file-document-outline"
          title="Chưa có hồ sơ đăng ký"
          description="Nộp hồ sơ để được phường xét duyệt và nhận giấy phép số."
        />
      );
    }

    return registrations.map((r) => (
      <Card
        key={r.registrationId}
        onPress={() => navigate(`/vendor/registrations/${r.registrationId}`)}
      >
        <div className="flex justify-between gap-sm">
          <div className="flex flex-1 flex-col gap-2xs">
            <span className="text-headline-sm text-text">{r.displayName}</span>
            <span className="text-body-md text-muted">{vendorTypeLabel(r.vendorType)}</span>
            <span className="text-body-sm text-muted">
              Nộp ngày {new Date(r.createdAt).toLocaleDateString('vi-VN')}
            </span>
          </div>
          <StatusChip code={r.registrationStatus} />
        </div>
      </Card>
    ));
  };

  return (
    <Screen
      footer={
        <div className="p-md">
          <Button label="Đăng ký kinh doanh mới" onPress={startNew} />
        </div>
      }
    >
      <AppHeader title="Đăng ký kinh doanh" back />
      {body()}
    </Screen>
  );
}
