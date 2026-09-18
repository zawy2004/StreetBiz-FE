import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { sideApi, SideApiError, type RentalApplication } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';

const APPLICATION_METHOD_LABEL: Record<string, string> = {
  AUTO_ADJACENT: 'Ô liền kề mặt tiền',
  MANUAL_SELECTED: 'Ô mở',
};

export function RentalApplicationsScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);

  const applications = useQuery({
    queryKey: ['side', userId, 'applications'],
    queryFn: () => sideApi.listApplications(),
  });

  return (
    <Screen>
      <AppHeader title="Đơn thuê ô" back />
      {applications.isPending && <LoadingState />}
      {applications.error && (
        <ErrorState
          message={
            applications.error instanceof SideApiError
              ? applications.error.message
              : applications.error.message
          }
          onRetry={() => void applications.refetch()}
        />
      )}
      {applications.data && applications.data.length === 0 && (
        <EmptyState icon="file-document-outline" title="Chưa có đơn thuê nào" />
      )}
      {applications.data
        ?.slice()
        .reverse()
        .map((app) => (
          <ApplicationCard
            key={app.applicationId}
            app={app}
            onPress={() => navigate(`/vendor/slots/rental-applications/${app.applicationId}`)}
          />
        ))}
    </Screen>
  );
}

function ApplicationCard({ app, onPress }: { app: RentalApplication; onPress: () => void }) {
  const slot = useQuery({
    queryKey: ['side', 'slot', app.slotId],
    queryFn: () => sideApi.getSlot(app.slotId),
    staleTime: 5 * 60_000,
  });

  return (
    <Card onPress={onPress}>
      <div className="flex justify-between">
        <div className="flex flex-1 flex-col gap-2xs">
          <span className="text-headline-sm text-text">{slot.data?.slotCode ?? `Ô #${app.slotId}`}</span>
          <span className="text-body-sm text-muted">
            {APPLICATION_METHOD_LABEL[app.applicationMethod] ?? app.applicationMethod} ·{' '}
            {new Date(app.createdAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
        <StatusChip code={app.applicationStatus} />
      </div>
    </Card>
  );
}
