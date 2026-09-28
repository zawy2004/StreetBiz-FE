import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Card, Icon } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { FilterChips } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import { foodSafetyApi, type FoodSafetyStatus } from '@/core/api/food-safety-api';
import { colors } from '@/theme';
import { FoodSafetySteps } from '../components/FoodSafetyBits';
import { formatDay } from '../format';

type Filter = 'ALL' | FoodSafetyStatus;

/** The ward's ATTP queue: files to review first, then those waiting on the department. */
export function WardFoodSafetyListScreen() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('ALL');
  const list = useQuery({
    queryKey: ['food-safety', 'ward', filter],
    queryFn: () => foodSafetyApi.wardList(filter === 'ALL' ? undefined : filter),
  });

  return (
    <Screen width="wide">
      <AppHeader title="Hồ sơ ATTP" back subtitle="Xét hồ sơ, chuyển Chi cục ATTP và cập nhật kết quả" />
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'ALL', label: 'Tất cả' },
          { value: 'SUBMITTED', label: 'Chờ phường xét' },
          { value: 'FORWARDED', label: 'Chờ kết quả cục' },
          { value: 'APPROVED', label: 'Đã đạt' },
          { value: 'REJECTED', label: 'Không đạt' },
        ]}
      />
      {list.isPending ? <LoadingState /> : null}
      {list.isError ? <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} /> : null}
      {list.isSuccess && list.data.length === 0 ? (
        <EmptyState icon="shield-check-outline" title="Không có hồ sơ ATTP" />
      ) : null}
      {list.data?.map((application) => (
        <Card
          key={application.applicationId}
          onPress={() => navigate(`/ward/inbox/food-safety/${application.applicationId}`)}
        >
          <div className="flex items-start justify-between gap-sm">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-xs">
                <h2 className="truncate text-headline-sm text-text">
                  #{application.applicationId} · {application.storefrontName}
                </h2>
                {application.isExpired ? <StatusChip code="EXPIRED" /> : <StatusChip code={application.status} />}
              </div>
              <p className="text-body-sm text-muted">
                {application.vendorName} · nộp {formatDay(application.submittedAt)} ·{' '}
                {application.dishes.map((d) => d.name).join(', ')}
              </p>
              <div className="mt-xs max-w-md">
                <FoodSafetySteps application={application} />
              </div>
            </div>
            <Icon name="chevron-right" size={20} color={colors.muted} />
          </div>
        </Card>
      ))}
    </Screen>
  );
}
