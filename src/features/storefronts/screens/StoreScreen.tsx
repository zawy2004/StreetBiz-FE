import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { SegmentedControl, TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { EmptyState, showToast } from '@/components/feedback';
import { env, isLiveApi } from '@/core/config/env';
import { storefrontPhotos, type FoodPhoto } from '@/features/buyer-discovery/food-photos';
import { LiveStoreScreen } from './LiveStoreScreen';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import {
  StartSellingSteps,
  StoreShortcuts,
  StorefrontFacade,
} from '../components/store/StoreParts';

export function StoreScreen() {
  return isLiveApi ? <LiveStoreScreen /> : <MockStoreScreen />;
}

function MockStoreScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const storefront = useMockDb((s) => s.storefronts.find((st) => st.vendorId === user?.vendorId));
  const registrations = useMockDb((s) => s.registrations).filter(
    (r) => r.vendorId === user?.vendorId,
  );
  const contracts = useMockDb((s) => s.contracts).filter((c) => c.vendorId === user?.vendorId);
  const slots = useMockDb((s) => s.slots);
  const createStorefront = useMockDb((s) => s.createStorefront);
  const updateStorefront = useMockDb((s) => s.updateStorefront);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!env.enablePhase2) {
    return (
      <Screen>
        <AppHeader title="Cửa hàng" />
        <EmptyState icon="storefront-outline" title="Tính năng đang phát triển" />
      </Screen>
    );
  }

  const canCreate =
    registrations.some((r) => r.registration_status === 'APPROVED') &&
    contracts.some((c) => c.contract_status === 'ACTIVE');
  // The demo stall has no slot of its own: show one only when the vendor has a
  // single active contract, so the plate is never a guess.
  const active = contracts.filter((c) => c.contract_status === 'ACTIVE');
  const contract = active.length === 1 ? active[0] : undefined;
  const slotCode = contract
    ? slots.find((slot) => slot.id === contract.slotId)?.slot_code
    : undefined;
  const photosFor = (title: string, text: string, own?: string): FoodPhoto[] => [
    ...(own ? [{ src: own, illustrative: false }] : []),
    ...storefrontPhotos({ storefrontId: 0, storefrontName: title, description: text }),
  ];
  const shortcuts = (
    <StoreShortcuts
      newOrders={undefined}
      onOrders={() => navigate('/vendor/store/orders')}
      onSales={() => navigate('/vendor/store/sales')}
    />
  );

  if (!storefront) {
    return (
      <Screen width="wide">
        <AppHeader title="Cửa hàng" />
        {!canCreate ? (
          <EmptyState
            icon="storefront-outline"
            title="Chưa đủ điều kiện mở gian hàng"
            description="Cần có hồ sơ đăng ký đã duyệt và một hợp đồng thuê ô đang hoạt động."
            action={
              <Button
                label="Thuê ô vỉa hè"
                fullWidth={false}
                onPress={() => navigate('/vendor/slots')}
              />
            }
          />
        ) : (
          <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-xl">
            <section
              aria-labelledby="mock-create-title"
              className="cq flex flex-col gap-md rounded-[28px] bg-card p-md shadow-sheet ring-1 ring-border md:p-lg"
            >
              <h2 id="mock-create-title" className="font-heading text-[21px] font-bold text-text">
                Mở gian hàng đầu tiên
              </h2>
              <div role="group" aria-label="Xem trước gian hàng" className="max-w-[420px]">
                <StorefrontFacade
                  variant="preview"
                  data={{
                    name: name.trim(),
                    description: description.trim() || null,
                    status: 'OPEN',
                    photos: photosFor(name || 'quán', description),
                    slotCode,
                    contractEnd: contract?.end_date,
                  }}
                />
              </div>
              <TextField label="Tên gian hàng" value={name} onChangeText={setName} />
              <TextField
                label="Mô tả ngắn"
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <Button
                label="Tạo gian hàng"
                disabled={!name.trim()}
                onPress={() => {
                  if (!user?.vendorId) return;
                  createStorefront({
                    vendorId: user.vendorId,
                    name,
                    description,
                    openTime: '06:00',
                    closeTime: '10:30',
                    availability_status: 'OPEN',
                  });
                  showToast('Đã tạo gian hàng');
                }}
              />
            </section>
            <StartSellingSteps />
          </div>
        )}
      </Screen>
    );
  }

  return (
    <Screen width="wide">
      <div className="flex flex-col gap-md xl:flex-row xl:items-end xl:justify-between">
        <AppHeader title={storefront.name} />
        {shortcuts}
      </div>
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-lg">
          <StorefrontFacade
            data={{
              name: storefront.name,
              description: storefront.description,
              status: storefront.availability_status,
              photos: photosFor(storefront.name, storefront.description, storefront.imageUri),
              slotCode,
              contractEnd: contract?.end_date,
              rating: { average: storefront.ratingAvg, count: storefront.ratingCount },
            }}
          >
            <p className="mb-sm text-body-sm text-muted">
              Giờ mở cửa {storefront.openTime} – {storefront.closeTime}
            </p>
            <div className="sm:w-auto">
              <Button label="Quản lý thực đơn" onPress={() => navigate('/vendor/store/menu')} />
            </div>
          </StorefrontFacade>
          <Section title="Trạng thái">
            <SegmentedControl
              value={storefront.availability_status}
              onChange={(v) => updateStorefront(storefront.id, { availability_status: v })}
              options={[
                { value: 'OPEN', label: 'Đang mở' },
                { value: 'PAUSED', label: 'Tạm dừng' },
                { value: 'CLOSED', label: 'Đóng cửa' },
              ]}
            />
          </Section>
        </div>
        <StartSellingSteps />
      </div>
    </Screen>
  );
}
