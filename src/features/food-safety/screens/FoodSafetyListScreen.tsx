import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import { foodSafetyApi, type FoodSafetyApplication } from '@/core/api/food-safety-api';
import { FoodSafetySteps } from '../components/FoodSafetyBits';
import { formatDay } from '../format';

/** The vendor's ATTP files: where each one is in the ward → department → result flow. */
export function FoodSafetyListScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const storefrontId = params.get('storefrontId');
  const cache = useQueryClient();
  const list = useQuery({ queryKey: ['food-safety', 'mine'], queryFn: foodSafetyApi.mine });
  const [withdrawing, setWithdrawing] = useState<FoodSafetyApplication | null>(null);
  const withdraw = useMutation({
    mutationFn: (id: number) => foodSafetyApi.withdraw(id),
    onSuccess: async () => {
      setWithdrawing(null);
      await cache.invalidateQueries({ queryKey: ['food-safety'] });
      await cache.invalidateQueries({ queryKey: ['commerce'] });
      showToast('Đã rút hồ sơ');
    },
  });

  if (list.isPending) return <LoadingState />;
  if (list.isError) return <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />;

  const newUrl = `/vendor/store/food-safety/new${storefrontId ? `?storefrontId=${storefrontId}` : ''}`;
  return (
    <Screen>
      <AppHeader title="Giấy ATTP" back subtitle="An toàn thực phẩm cho món bán tại gian hàng" />
      <Card>
        <p className="text-body-md text-text">
          Món thuộc nhóm rủi ro cao (món nước, cơm - bún - phở, bánh mì - xôi, hải sản) chỉ được bán khi có giấy ATTP.
        </p>
        <p className="mt-1 text-body-sm text-muted">
          Hồ sơ gửi phường → phường chuyển Chi cục ATTP kiểm tra → phường cập nhật kết quả cho bạn.
        </p>
        <div className="mt-sm">
          <Button label="Nộp hồ sơ ATTP" fullWidth={false} onPress={() => navigate(newUrl)} />
        </div>
      </Card>

      {list.data.length === 0 ? (
        <EmptyState icon="shield-check-outline" title="Chưa có hồ sơ ATTP" />
      ) : (
        list.data.map((application) => (
          <Card key={application.applicationId}>
            <div className="flex flex-wrap items-center justify-between gap-xs">
              <h2 className="text-headline-sm text-text">
                Hồ sơ #{application.applicationId} · {application.storefrontName}
              </h2>
              {application.isExpired ? (
                <StatusChip code="EXPIRED" />
              ) : (
                <StatusChip code={application.status} />
              )}
            </div>
            {application.status !== 'WITHDRAWN' ? (
              <div className="my-sm">
                <FoodSafetySteps application={application} />
              </div>
            ) : null}
            <p className="text-body-md text-text">{application.dishes.map((d) => d.name).join(', ')}</p>
            <p className="text-body-sm text-muted">Nộp ngày {formatDay(application.submittedAt)}</p>
            {application.status === 'APPROVED' ? (
              <p className="mt-1 text-body-sm text-tertiary">
                Giấy số {application.certificateNumber} · hiệu lực {formatDay(application.issuedOn)} –{' '}
                {formatDay(application.expiresOn)}
              </p>
            ) : null}
            {application.status === 'FORWARDED' && application.departmentName ? (
              <p className="mt-1 text-body-sm text-muted">Đang chờ {application.departmentName} kiểm tra.</p>
            ) : null}
            {application.reviewReason &&
            ['MORE_INFORMATION_REQUIRED', 'REJECTED'].includes(application.status) &&
            !application.forwardedAt ? (
              <p className="mt-1 text-body-sm text-error">Phường: {application.reviewReason}</p>
            ) : null}
            {application.resultReason && application.status === 'REJECTED' ? (
              <p className="mt-1 text-body-sm text-error">Kết quả kiểm tra: {application.resultReason}</p>
            ) : null}
            {application.actions.length > 0 ? (
              <div className="mt-sm flex flex-wrap gap-sm">
                {application.actions.includes('RESUBMIT') ? (
                  <Button
                    label="Bổ sung hồ sơ"
                    fullWidth={false}
                    onPress={() => navigate(`/vendor/store/food-safety/${application.applicationId}/edit`)}
                  />
                ) : null}
                {application.actions.includes('WITHDRAW') ? (
                  <Button
                    label="Rút hồ sơ"
                    variant="ghost"
                    fullWidth={false}
                    onPress={() => setWithdrawing(application)}
                  />
                ) : null}
              </div>
            ) : null}
          </Card>
        ))
      )}
      {withdraw.isError ? (
        <p role="alert" className="text-error">
          {errorMessage(withdraw.error)}
        </p>
      ) : null}
      <ConfirmDialog
        visible={Boolean(withdrawing)}
        title="Rút hồ sơ ATTP?"
        description="Phường sẽ không xét hồ sơ này nữa. Bạn có thể nộp hồ sơ mới sau."
        confirmLabel="Rút hồ sơ"
        confirmVariant="danger"
        onConfirm={() => {
          if (withdrawing && !withdraw.isPending) withdraw.mutate(withdrawing.applicationId);
        }}
        onCancel={() => setWithdrawing(null)}
      />
    </Screen>
  );
}
