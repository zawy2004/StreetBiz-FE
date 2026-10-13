import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { EmptyState, ErrorState, Skeleton, showToast } from '@/components/feedback';
import { VENDOR_TYPE } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import {
  CautionNote,
  FrontageDiagram,
  RegistrationStrip,
  RentalProcessStrip,
  SlotPlate,
} from '../components/lifecycle/LifecycleParts';
import { useRegistrationDetail } from '../useRegistrations';

export function AdjacentSlotScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Resolves both a live numeric id and a mock REG-001 style id; the screen used
  // to look only in the mock store and so never found a real registration.
  const { registration, isLoading } = useRegistrationDetail(Number(id));
  const slots = useMockDb((s) => s.slots);
  const submitRentalApplication = useMockDb((s) => s.submitRentalApplication);
  const [slotHover, setSlotHover] = useState(false);

  if (isLoading)
    return (
      <Screen>
        <AppHeader title="Ô liền kề mặt tiền" back />
        <p role="status" className="text-body-md text-muted">
          Đang tải hồ sơ…
        </p>
        <div aria-hidden="true" className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="aspect-[7/4] w-full rounded-[24px]" />
          <Skeleton className="h-[200px] w-full rounded-[14px]" />
        </div>
      </Screen>
    );
  if (!registration)
    return (
      <Screen>
        <AppHeader title="Ô liền kề mặt tiền" back />
        <div className="flex flex-col items-center rounded-[28px] bg-card pb-lg text-center shadow-card ring-1 ring-border">
          <ErrorState message="Không tìm thấy hồ sơ." />
          <Link
            to="/vendor/registrations"
            className="-mt-lg inline-flex min-h-12 items-center gap-1.5 rounded-[12px] px-md text-[15px] font-semibold text-primary hover:bg-tint-primary"
          >
            <Icon name="format-list-bulleted" size={18} color="currentColor" />
            Về danh sách hồ sơ
          </Link>
        </div>
      </Screen>
    );

  // Demo auto-suggestion: nearest available slot on the same street. This is mock
  // fiction -- SIDE-03A requires a real slot chosen within the backend's 150 m
  // adjacency radius -- so it must not run against a live backend.
  const suggested = isLiveApi ? undefined : slots.find((s) => s.slot_status === 'AVAILABLE');

  const submit = () => {
    if (!suggested) return;
    submitRentalApplication({
      vendorId: String(registration.registrationId),
      slotIds: [suggested.id],
      application_type: 'STOREFRONT_ADJACENT',
    });
    showToast('Đã gửi đơn thuê ô liền kề');
    navigate('/vendor/slots/rental-applications', { replace: true });
  };

  const eligible =
    registration.vendorType === VENDOR_TYPE.fixedStorefront &&
    registration.registrationStatus === 'APPROVED';
  const mode = isLiveApi ? 'live' : suggested ? 'suggested' : 'none';

  return (
    <Screen
      footer={
        suggested ? (
          <StickyActions>
            <Button label="Gửi đơn thuê ô này" onPress={submit} />
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader
        title="Ô liền kề mặt tiền"
        back
        subtitle={registration.declaredAddress ?? registration.displayName}
      />

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-md">
          <FrontageDiagram
            shopName={registration.displayName}
            slotCode={suggested?.slot_code}
            mode={mode}
            highlight={slotHover}
            onSlotHover={setSlotHover}
          />

          {isLiveApi ? (
            // SIDE-03A exists on the backend (POST /api/vendor/rental-applications/adjacent)
            // but needs a real slot picker fed by GET /api/sidewalk-slots, which this
            // screen does not have yet.
            <div className="rounded-[24px] bg-card shadow-card ring-1 ring-border">
              <EmptyState
                icon="map-marker-off-outline"
                title="Đang kết nối với Backend"
                description="Chức năng thuê ô liền kề sẽ dùng dữ liệu ô thật của phường. Hiện tại vui lòng chọn ô từ bản đồ ô vỉa hè."
                action={
                  <Button
                    label="Mở bản đồ ô vỉa hè"
                    fullWidth={false}
                    icon={<Icon name="map-outline" size={18} color="currentColor" />}
                    onPress={() => navigate('/vendor/slots')}
                  />
                }
              />
            </div>
          ) : !suggested ? (
            <div className="rounded-[24px] bg-card shadow-card ring-1 ring-border">
              <EmptyState
                icon="map-marker-off-outline"
                title="Chưa có ô liền kề khả dụng"
                description="Phường chưa số hoá ô liền kề tại địa chỉ này."
              />
            </div>
          ) : (
            <p className="flex items-start gap-sm rounded-[14px] bg-[#FFF3D1] px-md py-sm text-[15px] font-medium leading-[22px] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
              <Icon
                name="information-outline"
                size={18}
                color="currentColor"
                className="mt-0.5 shrink-0"
              />
              Chế độ demo: ô gợi ý là ô còn trống đầu tiên, chưa kiểm khoảng cách tới cửa hàng.
            </p>
          )}

          <div className="hidden xl:block">
            <RentalProcessStrip />
          </div>
        </div>

        <div className="grid min-w-0 gap-md md:grid-cols-2 xl:sticky xl:top-0 xl:grid-cols-1">
          {suggested ? (
            <SlotPlate
              slotCode={suggested.slot_code}
              street={suggested.street}
              size={suggested.size_m2}
              timeWindow={suggested.time_window}
              priceMonthly={suggested.price_monthly}
              status={suggested.slot_status}
              highlight={slotHover}
            />
          ) : null}
          <div
            className={`flex min-w-0 flex-col gap-sm ${suggested ? '' : 'md:col-span-2 xl:col-span-1'}`}
          >
            <RegistrationStrip registration={registration} title="Cửa hàng của bạn" />
            {!eligible ? (
              <CautionNote>Ô liền kề dành cho cửa hàng cố định đã được duyệt.</CautionNote>
            ) : null}
          </div>
        </div>
      </div>

      <div className="xl:hidden">
        <RentalProcessStrip />
      </div>
    </Screen>
  );
}
