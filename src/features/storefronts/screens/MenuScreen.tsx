import { useState } from 'react';

import { Button, formatVnd } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint, StatusChip } from '@/components/status';
import { EmptyState, showToast } from '@/components/feedback';
import { env, isLiveApi } from '@/core/config/env';
import { menuItemPhotos, type FoodPhoto } from '@/features/buyer-discovery/food-photos';
import { categoryIcon } from '@/features/buyer-discovery/category-icons';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import { colors } from '@/theme';
import { LiveMenuScreen } from './LiveMenuScreen';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import {
  DishPhotoTips,
  EmptyMenu,
  PlateRail,
  RemoveDishButton,
  SoldOutToggle,
} from '../components/menu/MenuParts';

export function MenuScreen() {
  return isLiveApi ? <LiveMenuScreen /> : <MockMenuScreen />;
}

/** Demo dishes have no category name: their own photo first, then one for their name. */
const photosOf = (item: { name: string; imageUri?: string }): FoodPhoto[] => [
  ...(item.imageUri ? [{ src: item.imageUri, illustrative: false }] : []),
  ...menuItemPhotos({ itemName: item.name }),
];

function MockMenuScreen() {
  const user = useAuthStore((s) => s.user);
  const storefront = useMockDb((s) => s.storefronts.find((st) => st.vendorId === user?.vendorId));
  const menuItems = useMockDb((s) => s.menuItems).filter((m) => m.storefrontId === storefront?.id);
  const addMenuItem = useMockDb((s) => s.addMenuItem);
  const updateMenuItem = useMockDb((s) => s.updateMenuItem);
  const removeMenuItem = useMockDb((s) => s.removeMenuItem);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  if (!storefront) {
    return (
      <Screen>
        <AppHeader title="Thực đơn" back />
        <EmptyState icon="silverware-fork-knife" title="Cần tạo gian hàng trước" />
      </Screen>
    );
  }

  const submit = () => {
    const amount = Number(price);
    if (!name.trim() || !amount) return;
    addMenuItem({
      storefrontId: storefront.id,
      name,
      price: amount,
      description: '',
      categoryId: 'CAT-05',
      availability_status: 'AVAILABLE',
    });
    setName('');
    setPrice('');
    showToast('Đã thêm món');
  };

  return (
    <Screen width="wide">
      <AppHeader title="Thực đơn" back />
      {env.enableAiCompliance ? (
        <AiHint title="Gợi ý mô tả &amp; danh mục món">
          Thêm ảnh món ăn để hệ thống tự viết mô tả và đề xuất danh mục, giá tham khảo.
        </AiHint>
      ) : null}

      {/* The demo stall has no limit: its dishes plus one free plate. */}
      <PlateRail
        slots={menuItems.length + 1}
        dishes={menuItems.map((item) => ({
          id: item.id,
          name: item.name,
          photos: photosOf(item),
          icon: categoryIcon(item.name),
          soldOut: item.availability_status === 'SOLD_OUT',
        }))}
      />

      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start xl:gap-xl">
        <div className="cq flex min-w-0 flex-col gap-md rounded-[28px] bg-card p-md shadow-sheet ring-1 ring-border md:p-lg xl:sticky xl:top-lg xl:col-start-2 xl:row-start-1">
          <Section title="Thêm món mới">
            <TextField label="Tên món" value={name} onChangeText={setName} />
            <TextField
              label="Giá (đ)"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
            <Button label="Thêm vào thực đơn" onPress={submit} disabled={!name.trim() || !price} />
          </Section>
          <DishPhotoTips />
        </div>

        <div className="flex min-w-0 flex-col gap-md xl:col-start-1 xl:row-start-1">
          <Section title={`Món hiện có (${menuItems.length})`}>
            {menuItems.length === 0 ? (
              <EmptyMenu />
            ) : (
              <ul className="flex flex-col gap-md">
                {menuItems.map((item) => (
                  <li
                    key={item.id}
                    className="group overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border md:grid md:grid-cols-[200px_minmax(0,1fr)]"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden md:aspect-auto md:min-h-[180px]">
                      <FoodImage
                        photos={photosOf(item)}
                        icon={categoryIcon(item.name)}
                        iconSize={36}
                        iconColor={colors.primary}
                        placeholderClassName="bg-[#FFF3E8] dark:bg-sunken"
                        className="h-full w-full"
                        imgClassName="transition-transform duration-700 [transition-timing-function:var(--ease-out)] group-hover:scale-[1.04]"
                        showIllustrativeTag
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-sm p-md md:p-lg">
                      <div className="flex flex-wrap items-start justify-between gap-xs">
                        <span className="line-clamp-2 min-w-0 font-editorial text-[22px] font-semibold leading-tight text-text md:text-[24px]">
                          {item.name}
                        </span>
                        <StatusChip code={item.availability_status} />
                      </div>
                      <p className="font-sign text-[20px] font-bold tabular-nums text-primary">
                        {formatVnd(item.price)}
                      </p>
                      <div className="mt-auto flex flex-col gap-sm pt-xs sm:flex-row sm:items-center">
                        <SoldOutToggle
                          available={item.availability_status === 'AVAILABLE'}
                          label={
                            item.availability_status === 'AVAILABLE'
                              ? 'Đánh dấu hết món'
                              : 'Còn hàng trở lại'
                          }
                          disabled={false}
                          pending={false}
                          onPress={() =>
                            updateMenuItem(item.id, {
                              availability_status:
                                item.availability_status === 'AVAILABLE' ? 'SOLD_OUT' : 'AVAILABLE',
                            })
                          }
                        />
                        <RemoveDishButton
                          disabled={false}
                          onPress={() => removeMenuItem(item.id)}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </Screen>
  );
}
