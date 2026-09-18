import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Avatar, Button, Card, Divider, Icon, ListRow } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { colors } from '@/theme';
import { communityApi, CommunityApiError } from '../community-api';

export function VendorProfileScreen() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const profile = useQuery({
    queryKey: ['community', 'vendor', vendorId],
    queryFn: () => communityApi.profile(vendorId!),
    enabled: Boolean(vendorId),
  });

  if (profile.isPending) return <LoadingState />;
  if (profile.isError || !profile.data) {
    return (
      <ErrorState
        message={
          profile.error instanceof CommunityApiError
            ? profile.error.message
            : 'Không tìm thấy hộ kinh doanh.'
        }
        onRetry={() => profile.refetch()}
      />
    );
  }

  const vendor = profile.data;
  return (
    <Screen>
      <AppHeader title={vendor.displayName} back />
      <Card>
        <div className="flex gap-sm">
          <Avatar name={vendor.displayName} size={56} />
          <div className="flex flex-1 flex-col gap-1">
            <StatusChip code={vendor.permitStatus} />
            <span className="text-body-md text-muted">{vendor.vendorType}</span>
            <div className="flex items-center gap-1">
              <Icon name="star" size={16} color={colors.secondary} />
              <span className="text-body-md text-text">
                {vendor.communityRating?.toFixed(1) ?? 'Chưa có điểm'} ({vendor.communityCount} đánh
                giá)
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card padded={false}>
        <div className="px-md">
          <ListRow title="Vị trí" subtitle={`${vendor.zoneName} · Ô ${vendor.slotCode}`} />
          <Divider />
          <ListRow title="Phường" subtitle={vendor.wardName ?? `#${vendor.wardId}`} />
          <Divider />
          <ListRow title="Địa chỉ đăng ký" subtitle={vendor.address ?? 'Chưa cập nhật'} />
          <Divider />
          <ListRow
            title="Giấy phép có hiệu lực đến"
            subtitle={new Date(vendor.permitEndDate).toLocaleDateString('vi-VN')}
          />
          {vendor.verifiedCount > 0 ? (
            <>
              <Divider />
              <ListRow
                title="Đánh giá từ giao dịch xác thực"
                subtitle={`${vendor.verifiedRating?.toFixed(1) ?? '—'} ★ (${vendor.verifiedCount})`}
              />
            </>
          ) : null}
        </div>
      </Card>

      <div className="flex gap-sm">
        <div className="flex-1">
          <Button
            label="Viết đánh giá"
            variant="outline"
            onPress={() => navigate(`/customer/explore/vendors/${vendor.vendorId}/comments/new`)}
          />
        </div>
        <div className="flex-1">
          <Button
            label="Báo cáo vi phạm"
            variant="ghost"
            onPress={() => navigate(`/customer/explore/vendors/${vendor.vendorId}/reports/new`)}
          />
        </div>
      </div>

      <Section title={`Đánh giá cộng đồng (${vendor.comments.length})`}>
        {vendor.comments.length === 0 ? (
          <EmptyState icon="comment-outline" title="Chưa có đánh giá nào" />
        ) : (
          vendor.comments.map((comment) => (
            <Card key={comment.commentId}>
              <div className="flex items-center justify-between gap-sm">
                <span className="text-headline-sm text-text">{comment.authorName}</span>
                {comment.rating ? (
                  <div className="flex items-center gap-0.5">
                    <Icon name="star" size={14} color={colors.secondary} />
                    <span className="text-body-sm text-muted">{comment.rating}</span>
                  </div>
                ) : null}
              </div>
              {comment.commentText ? (
                <p className="mt-1 text-body-md text-muted">{comment.commentText}</p>
              ) : null}
              <p className="mt-1 text-body-sm text-muted">
                {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}
