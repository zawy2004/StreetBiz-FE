import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Money } from '@/components/common';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  showToast,
} from '@/components/feedback';
import { PhotoPicker, SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import { apiAssetUrl } from '@/core/api/asset-url';
import { sellerStoreApi, type SellerMenuItem, type MenuInput } from '@/core/api/seller-store-api';
import { categoryIcon } from '@/features/buyer-discovery/category-icons';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import { menuItemPhotos } from '@/features/buyer-discovery/food-photos';
import { DishFoodSafetyChip } from '@/features/food-safety/components/FoodSafetyBits';
import { colors } from '@/theme';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function LiveMenuScreen() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const stores = useQuery({ queryKey: ['commerce', 'stores'], queryFn: sellerStoreApi.stores });
  const storeId = Number(params.get('storefrontId')) || stores.data?.[0]?.storefrontId;
  const categories = useQuery({
    queryKey: ['commerce', 'seller-categories'],
    queryFn: sellerStoreApi.categories,
  });
  const menu = useQuery({
    queryKey: ['commerce', 'seller-menu', storeId],
    queryFn: () => sellerStoreApi.menu(storeId!),
    enabled: Boolean(storeId),
  });
  const cache = useQueryClient();
  const [editing, setEditing] = useState<SellerMenuItem | null>(null);
  const [archiving, setArchiving] = useState<SellerMenuItem | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  // The picked photo: a local preview while uploading, then the server URL to save.
  const [photoPreview, setPhotoPreview] = useState<string>();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const categoryId = Number(category) || categories.data?.[0]?.categoryId;
  const reset = () => {
    setEditing(null);
    setName('');
    setPrice('');
    setDescription('');
    setCategory('');
    setPhotoPreview(undefined);
    setPhotoUrl(null);
    setPhotoError(null);
  };
  const upload = useMutation({
    mutationFn: (file: File) => sellerStoreApi.uploadMenuImage(file),
    onSuccess: (result) => setPhotoUrl(result.fileUrl),
    onError: (error) => {
      setPhotoPreview(undefined);
      setPhotoError(errorMessage(error));
    },
  });
  const save = useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: MenuInput }) =>
      sellerStoreApi.saveItem(storeId!, id, input),
    onSuccess: async () => {
      reset();
      await cache.invalidateQueries({ queryKey: ['commerce'] });
      showToast('Đã lưu món');
    },
  });
  const archive = useMutation({
    mutationFn: (id: number) => sellerStoreApi.archiveItem(storeId!, id),
    onSuccess: async () => {
      setArchiving(null);
      reset();
      await cache.invalidateQueries({ queryKey: ['commerce'] });
      showToast('Đã gỡ món');
    },
  });
  if (stores.isPending || categories.isPending) return <LoadingState />;
  if (stores.isError || categories.isError || menu.isError)
    return (
      <ErrorState
        message={errorMessage(stores.error ?? categories.error ?? menu.error)}
        onRetry={() => {
          void stores.refetch();
          void categories.refetch();
          void menu.refetch();
        }}
      />
    );
  if (!storeId)
    return (
      <Screen>
        <AppHeader title="Thực đơn" back />
        <EmptyState icon="storefront-outline" title="Cần tạo gian hàng trước" />
      </Screen>
    );
  const items = menu.data?.items ?? [];
  const maxItems = menu.data?.maxItems ?? 5;
  const full = items.length >= maxItems;
  const selectedCategory = categories.data.find((c) => c.categoryId === categoryId);
  const amount = Number(price);
  const valid =
    name.trim().length > 0 &&
    Number.isSafeInteger(amount) &&
    amount > 0 &&
    amount <= 50_000_000 &&
    Boolean(categoryId) &&
    // A new dish must come with its photo; an edit may keep the current one.
    (editing !== null || photoUrl !== null);
  const busy = save.isPending || archive.isPending || upload.isPending;
  const needsAttp = items.filter((i) => i.foodSafetyStatus === 'MISSING').length;
  const startEdit = (item: SellerMenuItem) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description ?? '');
    setPrice(String(item.unitPrice));
    setCategory(String(item.categoryId));
    setPhotoPreview(item.imageUrl ? apiAssetUrl(item.imageUrl) : undefined);
    setPhotoUrl(null);
    setPhotoError(null);
    save.reset();
  };
  return (
    <Screen>
      <AppHeader title="Thực đơn" back />
      {stores.data.length > 1 ? (
        <SelectField
          label="Gian hàng"
          value={String(storeId)}
          onChange={(v) => {
            setParams({ storefrontId: v });
            reset();
          }}
          options={stores.data.map((s) => ({ value: String(s.storefrontId), label: s.name }))}
        />
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div>
            <p className="text-headline-sm text-text">
              {items.length}/{maxItems} món chủ lực
            </p>
            <p className="text-body-sm text-muted">
              Mỗi gian hàng bán tối đa {maxItems} món để dễ kiểm soát an toàn thực phẩm.
            </p>
          </div>
          <Button
            label={needsAttp > 0 ? `Giấy ATTP (${needsAttp} món cần)` : 'Giấy ATTP'}
            variant="outline"
            fullWidth={false}
            onPress={() => navigate(`/vendor/store/food-safety?storefrontId=${storeId}`)}
          />
        </div>
      </Card>

      {full && !editing ? (
        <Card>
          <h2 className="text-headline-sm">Thực đơn đã đủ {maxItems} món</h2>
          <p className="text-body-md text-muted">Gỡ bớt một món để thêm món mới.</p>
        </Card>
      ) : (
        <Card>
          <h2 className="mb-sm text-headline-sm">{editing ? 'Sửa món' : 'Thêm món mới'}</h2>
          <div className="mb-sm flex items-start gap-sm">
            <PhotoPicker
              label={editing ? 'Đổi ảnh món' : 'Ảnh món *'}
              uri={photoPreview}
              error={Boolean(photoError)}
              validate={(file) =>
                !/^image\/(jpeg|png|webp)$/.test(file.type)
                  ? 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.'
                  : file.size > MAX_PHOTO_BYTES
                    ? 'Ảnh tối đa 5 MB.'
                    : undefined
              }
              onInvalid={setPhotoError}
              onChange={(preview, file) => {
                setPhotoError(null);
                setPhotoPreview(preview);
                setPhotoUrl(null);
                upload.mutate(file);
              }}
            />
            <p className="text-body-sm text-muted">
              {upload.isPending
                ? 'Đang tải ảnh lên…'
                : photoError
                  ? <span className="text-error">{photoError}</span>
                  : editing
                    ? 'Chọn ảnh mới nếu muốn thay ảnh hiện tại.'
                    : 'Bắt buộc: ảnh thật của món để khách nhận ra (JPG, PNG, WEBP, tối đa 5 MB).'}
            </p>
          </div>
          <TextField label="Tên món" value={name} onChangeText={setName} maxLength={180} />
          <TextField label="Giá (đ)" value={price} onChangeText={setPrice} keyboardType="numeric" />
          <TextField
            label="Mô tả món"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
          />
          <SelectField
            label="Danh mục"
            value={String(categoryId ?? '')}
            onChange={setCategory}
            options={categories.data.map((c) => ({
              value: String(c.categoryId),
              label: c.requiresFoodSafety ? `${c.name} · cần ATTP` : c.name,
            }))}
            layout="inline"
          />
          {selectedCategory?.requiresFoodSafety ? (
            <p className="text-body-sm text-muted">
              Danh mục này cần giấy ATTP: món chỉ hiện với khách sau khi hồ sơ ATTP được duyệt.
            </p>
          ) : null}
          {!categories.data.length ? (
            <p className="text-muted">Chưa có danh mục. Liên hệ quản trị viên để bổ sung.</p>
          ) : null}
          <div className="mt-sm flex gap-sm">
            <Button
              label={editing ? 'Lưu thay đổi' : 'Thêm món'}
              disabled={!valid || busy}
              loading={save.isPending}
              onPress={() =>
                save.mutate({
                  id: editing?.menuItemId ?? null,
                  input: {
                    categoryId: categoryId!,
                    name: name.trim(),
                    unitPrice: amount,
                    description: description.trim() || null,
                    availabilityStatus: editing?.availabilityStatus ?? 'AVAILABLE',
                    imageUrl: photoUrl,
                  },
                })
              }
            />
            {editing ? (
              <Button label="Hủy sửa" variant="ghost" disabled={busy} onPress={reset} />
            ) : null}
          </div>
        </Card>
      )}
      {save.isError || archive.isError ? (
        <p role="alert" className="text-error">
          {errorMessage(save.error ?? archive.error)}
        </p>
      ) : null}
      {menu.isPending ? (
        <LoadingState />
      ) : !items.length ? (
        <EmptyState icon="silverware-fork-knife" title="Chưa có món nào" />
      ) : (
        items.map((item) => (
          <Card key={item.menuItemId}>
            <div className="flex gap-sm">
              <FoodImage
                photos={menuItemPhotos({
                  itemName: item.name,
                  categoryName: item.categoryName,
                  imageUrl: item.imageUrl,
                })}
                icon={categoryIcon(item.categoryName)}
                iconSize={28}
                iconColor={colors.muted}
                className="size-20 shrink-0 rounded-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-xs">
                  <h2 className="truncate text-headline-sm">{item.name}</h2>
                  <StatusChip code={item.availabilityStatus} />
                </div>
                <Money amountVnd={item.unitPrice} />
                <div className="mt-1 flex flex-wrap gap-xs">
                  <DishFoodSafetyChip
                    status={item.foodSafetyStatus}
                    expiresOn={item.foodSafetyExpiresOn}
                  />
                  {!item.imageUrl ? <StatusChip label="Chưa có ảnh" tone="pending" /> : null}
                </div>
              </div>
            </div>
            {item.description ? (
              <p className="my-sm text-body-md text-muted">{item.description}</p>
            ) : null}
            {item.foodSafetyStatus === 'MISSING' ? (
              <p className="mb-sm text-body-sm text-error">
                Khách chưa thấy món này cho tới khi có giấy ATTP được duyệt.
              </p>
            ) : null}
            {item.availabilityStatus === 'HIDDEN' ? (
              <p className="text-error">Món đã bị quản trị viên ẩn.</p>
            ) : (
              <div className="mt-sm flex flex-wrap gap-sm">
                <Button
                  label={item.imageUrl ? 'Sửa món' : 'Thêm ảnh / sửa'}
                  variant="outline"
                  disabled={busy}
                  onPress={() => startEdit(item)}
                />
                <Button
                  label={
                    item.availabilityStatus === 'AVAILABLE'
                      ? 'Đánh dấu hết món'
                      : 'Còn hàng trở lại'
                  }
                  variant="outline"
                  disabled={busy}
                  onPress={() =>
                    save.mutate({
                      id: item.menuItemId,
                      input: {
                        categoryId: item.categoryId,
                        name: item.name,
                        description: item.description,
                        unitPrice: item.unitPrice,
                        availabilityStatus:
                          item.availabilityStatus === 'AVAILABLE' ? 'SOLD_OUT' : 'AVAILABLE',
                      },
                    })
                  }
                />
                <Button
                  label="Gỡ món"
                  variant="ghost"
                  disabled={busy}
                  onPress={() => setArchiving(item)}
                />
              </div>
            )}
          </Card>
        ))
      )}
      <ConfirmDialog
        visible={Boolean(archiving)}
        title="Gỡ món khỏi thực đơn?"
        description="Món sẽ ngừng bán. Lịch sử các đơn đã đặt vẫn được giữ lại."
        confirmLabel="Gỡ món"
        confirmVariant="danger"
        onConfirm={() => {
          if (archiving && !busy) archive.mutate(archiving.menuItemId);
        }}
        onCancel={() => setArchiving(null)}
      />
    </Screen>
  );
}
