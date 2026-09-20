import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Button, Card, Icon } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { FilterChips } from '@/components/forms';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { sideApi, type RentalApplication } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme';
import { ApplicationNote } from '../components/ApplicationNote';
import { InfoRows } from '../components/InfoRows';
import { MySlotsTabs } from '../components/MySlotsTabs';
import {
  APPLICATION_FILTERS,
  countApplications,
  filterApplications,
  needsMoreInformation,
  type ApplicationFilter,
} from '../my-slots-view';

const APPLICATION_METHOD_LABEL: Record<string, string> = {
  AUTO_ADJACENT: 'Ô liền kề mặt tiền',
  MANUAL_SELECTED: 'Ô mở',
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

export function RentalApplicationsScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const [filter, setFilter] = useState<ApplicationFilter>('ALL');

  const applications = useQuery({
    queryKey: ['side', userId, 'applications'],
    queryFn: () => sideApi.listApplications(),
  });

  // The API lists oldest first; a vendor wants the latest application on top.
  const newestFirst = applications.data?.slice().reverse() ?? [];
  const counts = countApplications(newestFirst);
  const visible = filterApplications(newestFirst, filter);

  return (
    <Screen>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-md">
        <MySlotsTabs />
        <AppHeader title="Đơn thuê ô" subtitle="Hồ sơ đăng ký thuê ô vỉa hè của bạn" back />
        {applications.isPending && <LoadingState />}
        {applications.error && (
          <ErrorState message={applications.error.message} onRetry={() => void applications.refetch()} />
        )}
        {applications.data && applications.data.length === 0 && (
          <EmptyState
            icon="file-document-outline"
            title="Chưa có đơn thuê nào"
            description="Chọn một ô còn trống trên bản đồ để nộp đơn thuê."
            action={<Button label="Chọn ô để thuê" fullWidth={false} onPress={() => navigate('/vendor/slots')} />}
          />
        )}
        {applications.data && applications.data.length > 0 && (
          <>
            <FilterChips
              value={filter}
              onChange={setFilter}
              options={APPLICATION_FILTERS.map((f) => ({ ...f, count: counts[f.value] }))}
            />
            {visible.length === 0 && <EmptyState icon="file-document-outline" title="Không có đơn nào trong mục này" />}
            <div className="grid gap-sm md:grid-cols-2">
              {visible.map((app) => (
                <ApplicationCard
                  key={app.applicationId}
                  app={app}
                  onOpen={() => navigate(`/vendor/slots/rental-applications/${app.applicationId}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}

function ApplicationCard({ app, onOpen }: { app: RentalApplication; onOpen: () => void }) {
  const slot = useQuery({
    queryKey: ['side', 'slot', app.slotId],
    queryFn: () => sideApi.getSlot(app.slotId),
    staleTime: 5 * 60_000,
  });
  const attention = needsMoreInformation(app.applicationStatus);
  const rejected = app.applicationStatus === 'REJECTED';

  return (
    <Card style={attention ? { borderLeft: `4px solid ${colors.primary}` } : rejected ? { borderLeft: `4px solid ${colors.error}` } : undefined}>
      <div className="flex flex-col gap-sm">
        <div className="flex items-start justify-between gap-sm">
          <div className="min-w-0">
            <span className="flex items-center gap-1 text-headline-sm text-text">
              {slot.data?.slotCode ?? `Ô #${app.slotId}`}
              {attention && <Icon name="alert-circle-outline" size={18} color={colors.primary} />}
              {app.applicationStatus === 'APPROVED' && (
                <Icon name="check-circle-outline" size={18} color={colors.tertiary} />
              )}
            </span>
            <span className="text-body-sm text-muted">
              {APPLICATION_METHOD_LABEL[app.applicationMethod] ?? app.applicationMethod}
            </span>
          </div>
          <div className="shrink-0">
            <StatusChip code={app.applicationStatus} />
          </div>
        </div>

        <InfoRows
          rows={[
            { label: 'Ngày nộp', value: formatDate(app.createdAt) },
            { label: 'Thời hạn thuê', value: `${app.requestedTermDays} ngày` },
            { label: 'Tuyến phố', value: slot.data?.zoneName },
          ]}
        />

        <ApplicationNote app={app} />

        <div className="flex items-center justify-between gap-sm">
          <span className="text-body-sm text-muted">Mã đơn #{app.applicationId}</span>
          <Button
            label="Xem chi tiết"
            variant={attention ? 'primary' : 'outline'}
            fullWidth={false}
            onPress={onOpen}
            icon={<Icon name="arrow-right" size={18} color={attention ? colors.onPrimary : colors.indigo} />}
          />
        </div>
      </div>
    </Card>
  );
}
