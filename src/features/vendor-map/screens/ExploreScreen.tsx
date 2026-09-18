import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Avatar, Button, Card, Icon } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { colors } from '@/theme';
import { ActiveVendorMap } from '../components/ActiveVendorMap';
import { communityApi, CommunityApiError } from '../community-api';

type SearchPosition = { latitude: number; longitude: number; radiusMeters: number };

export function ExploreScreen() {
  const navigate = useNavigate();
  const [position, setPosition] = useState<SearchPosition>();
  const [locationError, setLocationError] = useState<string>();
  const [locating, setLocating] = useState(false);
  const vendors = useQuery({
    queryKey: ['community', 'vendors', position],
    queryFn: () => communityApi.activeVendors(position),
  });

  const locate = () => {
    if (!navigator.geolocation) {
      setLocationError('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    setLocating(true);
    setLocationError(undefined);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({
          latitude: coords.latitude,
          longitude: coords.longitude,
          radiusMeters: 5_000,
        });
        setLocating(false);
      },
      () => {
        setLocationError('Không lấy được vị trí. Hãy cấp quyền định vị rồi thử lại.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const records = vendors.data ?? [];

  return (
    <Screen>
      <AppHeader title="Khám phá" subtitle="Hộ kinh doanh có giấy phép đang hoạt động" />
      <div className="flex gap-sm">
        <Button
          label={position ? 'Cập nhật vị trí' : 'Tìm quanh tôi'}
          variant="outline"
          fullWidth={false}
          loading={locating}
          onPress={locate}
          icon={<Icon name="crosshairs-gps" size={18} color={colors.indigo} />}
        />
        {position ? (
          <Button
            label="Xem tất cả"
            variant="ghost"
            fullWidth={false}
            onPress={() => setPosition(undefined)}
          />
        ) : null}
      </div>
      {locationError ? <p className="text-body-sm text-error">{locationError}</p> : null}

      {vendors.isPending ? <LoadingState /> : null}
      {vendors.isError ? (
        <ErrorState
          message={
            vendors.error instanceof CommunityApiError
              ? vendors.error.message
              : 'Không tải được danh sách hộ kinh doanh.'
          }
          onRetry={() => vendors.refetch()}
        />
      ) : null}
      {vendors.isSuccess && records.length === 0 ? (
        <EmptyState
          icon="storefront-outline"
          title={
            position
              ? 'Không có hộ kinh doanh trong bán kính 5 km'
              : 'Chưa có hộ kinh doanh đang hoạt động'
          }
        />
      ) : null}
      {records.length > 0 ? (
        <>
          <ActiveVendorMap
            vendors={records}
            onSelect={(vendor) => navigate(`/customer/explore/vendors/${vendor.vendorId}`)}
          />
          {records.map((vendor) => (
            <Card
              key={`${vendor.vendorId}-${vendor.slotId}`}
              onPress={() => navigate(`/customer/explore/vendors/${vendor.vendorId}`)}
            >
              <div className="flex gap-sm">
                <Avatar name={vendor.displayName} size={48} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-headline-sm text-text">{vendor.displayName}</span>
                  <span className="truncate text-body-sm text-muted">
                    {vendor.zoneName} · Ô {vendor.slotCode}
                  </span>
                  <span className="text-body-sm text-muted">
                    {vendor.communityRating
                      ? `${vendor.communityRating.toFixed(1)} ★ (${vendor.communityCount})`
                      : 'Chưa có đánh giá'}
                    {vendor.distanceMeters != null
                      ? ` · ${Math.round(vendor.distanceMeters).toLocaleString('vi-VN')} m`
                      : ''}
                  </span>
                </div>
                <StatusChip code="VALID" />
              </div>
            </Card>
          ))}
        </>
      ) : null}
      <div className="flex items-center justify-center gap-1.5">
        <Icon name="shield-check-outline" size={16} color={colors.tertiary} />
        <span className="text-body-sm text-muted">Dữ liệu được kiểm tra trực tiếp từ Backend</span>
      </div>
    </Screen>
  );
}
