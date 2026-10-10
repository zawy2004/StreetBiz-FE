import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, formatVnd } from '@/components/common';
import { ConfirmDialog, EmptyState, ErrorState, showToast } from '@/components/feedback';
import { SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import { apiAssetUrl } from '@/core/api/asset-url';
import { sellerStoreApi, type SellerMenuItem, type MenuInput } from '@/core/api/seller-store-api';
import { categoryIcon } from '@/features/buyer-discovery/category-icons';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import { menuItemPhotos } from '@/features/buyer-discovery/food-photos';
import { DishFoodSafetyChip } from '@/features/food-safety/components/FoodSafetyBits';
import { VERDICT_TONES } from '@/components/illustrations';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import { colors } from '@/theme';
import {
  BuyerPreviewCard,
  BuyerVisibilityStrip,
  DishCardsSkeleton,
  DishPhotoField,
  DishPhotoTips,
  EmptyMenu,
  MenuSkeleton,
  PlateRail,
  PlateRailSkeleton,
  RemoveDishButton,
  SoldOutToggle,
} from '../components/menu/MenuParts';
import { buyerVisibility } from '../menu-view';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function ErrorBox({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className={`rounded-[12px] px-sm py-xs text-body-lg ${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink}`}
    >
      {message}
    </p>
  );
}

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
  const roomy = useMediaQuery('(min-width: 768px)');
  const editor = useRef<HTMLElement>(null);
  const nameField = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const lastEdited = useRef<number | null>(null);
  const editingId = editing?.menuItemId ?? null;

  // "Sửa món" brings the form into view at the name; leaving the edit hands
  // focus back to that dish's "Sửa món" when it is still there.
  useEffect(() => {
    if (editingId !== null) {
      lastEdited.current = editingId;
      editor.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      nameField.current?.focus({ preventScroll: true });
      return;
    }
    const previous = lastEdited.current;
    lastEdited.current = null;
    if (previous !== null)
      document.querySelector<HTMLElement>(`[data-edit-for="${previous}"] button`)?.focus();
  }, [editingId]);

  if (stores.isPending || categories.isPending) return <MenuSkeleton />;
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
  const store = stores.data.find((s) => s.storefrontId === storeId);
  const visibility = buyerVisibility(items, store?.availabilityStatus);
  // Was the failed save the form's (it sends a photo field) or a sold-out switch on a card?
  const formFailed = save.isError && Boolean(save.variables && 'imageUrl' in save.variables.input);
  const listError =
    save.isError && !formFailed
      ? errorMessage(save.error)
      : archive.isError
        ? errorMessage(archive.error)
        : null;
  const goToForm = () => {
    editor.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    nameField.current?.focus({ preventScroll: true });
  };
  const previewPhotos = [
    ...(photoPreview ? [{ src: photoPreview, illustrative: false }] : []),
    ...menuItemPhotos({ itemName: name, categoryName: selectedCategory?.name, description }).filter(
      (photo) => photo.illustrative,
    ),
  ];
  const priceOk = Number.isSafeInteger(amount) && amount > 0 && amount <= 50_000_000;

  const form = (
    <section
      ref={editor}
      aria-labelledby="dish-editor-title"
      className="cq flex flex-col gap-md rounded-[28px] bg-card p-md shadow-sheet ring-1 ring-border md:p-lg"
    >
      <h2 id="dish-editor-title" className="font-heading text-[21px] font-bold text-text">
        {editing ? 'Sửa món' : 'Thêm món mới'}
      </h2>
      <p aria-live="polite" className="sr-only">
        {editing ? `Đang sửa ${editing.name}` : ''}
      </p>
      <div className="flex flex-col gap-xs">
        <DishPhotoField
          label={editing ? 'Đổi ảnh món' : 'Ảnh món *'}
          uri={photoPreview}
          error={Boolean(photoError)}
          uploading={upload.isPending}
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
          {upload.isPending ? (
            'Đang tải ảnh lên…'
          ) : photoError ? (
            <span className="font-medium text-error">{photoError}</span>
          ) : editing ? (
            'Chọn ảnh mới nếu muốn thay ảnh hiện tại.'
          ) : (
            'Bắt buộc: ảnh thật của món để khách nhận ra (JPG, PNG, WEBP, tối đa 5 MB).'
          )}
        </p>
      </div>
      <TextField
        ref={nameField}
        label="Tên món"
        value={name}
        onChangeText={setName}
        maxLength={180}
      />
      <TextField
        label="Giá (đ)"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        helperText={price && priceOk ? `= ${formatVnd(amount)}` : undefined}
      />
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
        <p className="rounded-[12px] bg-[#FFF3D1] px-sm py-xs text-body-md text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
          Danh mục này cần giấy ATTP: món chỉ hiện với khách sau khi hồ sơ ATTP được duyệt.
        </p>
      ) : null}
      {!categories.data.length ? (
        <p className="text-muted">Chưa có danh mục. Liên hệ quản trị viên để bổ sung.</p>
      ) : null}
      <div className="flex flex-col gap-sm sm:flex-row">
        <div className="sm:flex-1">
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
        </div>
        {editing ? (
          <div className="sm:w-auto">
            <Button label="Hủy sửa" variant="ghost" disabled={busy} onPress={reset} />
          </div>
        ) : null}
      </div>
      {formFailed ? <ErrorBox message={errorMessage(save.error)} /> : null}
      <details open={roomy} className="group rounded-[16px]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-label text-text md:hidden [&::-webkit-details-marker]:hidden">
          Khách sẽ thấy
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="pt-xs md:pt-0">
          <BuyerPreviewCard
            name={name.trim()}
            price={priceOk ? amount : null}
            description={description.trim()}
            photos={previewPhotos}
            icon={categoryIcon(selectedCategory?.name)}
            needsAttp={Boolean(selectedCategory?.requiresFoodSafety)}
          />
        </div>
      </details>
      <DishPhotoTips />
    </section>
  );

  const fullCard = (
    <section
      aria-labelledby="menu-full-title"
      className="flex flex-col gap-md rounded-[28px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
    >
      <div>
        <h2 id="menu-full-title" className="font-heading text-[21px] font-bold text-text">
          Thực đơn đã đủ {maxItems} món
        </h2>
        <p className="mt-0.5 text-body-md text-muted">Gỡ bớt một món để thêm món mới.</p>
      </div>
      <DishPhotoTips />
    </section>
  );

  return (
    <Screen width="wide">
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

      {menu.isPending ? (
        <PlateRailSkeleton />
      ) : (
        <PlateRail
          key={storeId}
          slots={maxItems}
          onEmptyPlate={full ? undefined : goToForm}
          dishes={items.map((item) => ({
            id: item.menuItemId,
            name: item.name,
            photos: menuItemPhotos({
              itemName: item.name,
              categoryName: item.categoryName,
              imageUrl: item.imageUrl,
            }),
            icon: categoryIcon(item.categoryName),
            needsAttp: item.foodSafetyStatus === 'MISSING',
            soldOut: item.availabilityStatus === 'SOLD_OUT',
            editing: editing?.menuItemId === item.menuItemId,
          }))}
          caption={
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-sm">
              <p className="font-sign text-[20px] font-bold text-text [font-stretch:94%]">
                {items.length}/{maxItems} món chủ lực
              </p>
              <p className="text-body-sm text-text/75">
                Mỗi gian hàng bán tối đa {maxItems} món để dễ kiểm soát an toàn thực phẩm.
              </p>
            </div>
          }
        />
      )}

      <BuyerVisibilityStrip
        visibility={visibility}
        action={
          <Button
            label={needsAttp > 0 ? `Giấy ATTP (${needsAttp} món cần)` : 'Giấy ATTP'}
            variant="outline"
            icon={
              needsAttp > 0 ? (
                <span aria-hidden="true" className="size-2 rounded-full bg-error" />
              ) : undefined
            }
            onPress={() => navigate(`/vendor/store/food-safety?storefrontId=${storeId}`)}
          />
        }
      />

      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-md xl:sticky xl:top-lg xl:col-start-2 xl:row-start-1">
          {full && !editing ? fullCard : form}
        </div>
        <div className="flex min-w-0 flex-col gap-md xl:col-start-1 xl:row-start-1">
          {listError ? <ErrorBox message={listError} /> : null}
          {menu.isPending ? (
            <DishCardsSkeleton />
          ) : !items.length ? (
            <EmptyMenu />
          ) : (
            <ul className="flex flex-col gap-md">
              {items.map((item) => {
                const isEditing = editing?.menuItemId === item.menuItemId;
                const switching =
                  save.isPending &&
                  save.variables?.id === item.menuItemId &&
                  !('imageUrl' in save.variables.input);
                return (
                  <li
                    key={item.menuItemId}
                    className={`group overflow-hidden rounded-[24px] bg-card shadow-card md:grid md:grid-cols-[200px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)] ${isEditing ? 'ring-2 ring-brand' : 'ring-1 ring-border'}`}
                  >
                    <div className="relative aspect-[16/9] overflow-hidden md:aspect-auto md:min-h-[200px]">
                      <FoodImage
                        photos={menuItemPhotos({
                          itemName: item.name,
                          categoryName: item.categoryName,
                          imageUrl: item.imageUrl,
                        })}
                        icon={categoryIcon(item.categoryName)}
                        iconSize={36}
                        iconColor={colors.primary}
                        placeholderClassName="bg-[#FFF3E8] dark:bg-sunken"
                        className="h-full w-full"
                        imgClassName="transition-transform duration-700 [transition-timing-function:var(--ease-out)] group-hover:scale-[1.04]"
                        showIllustrativeTag
                      />
                      {isEditing ? (
                        <span className="absolute left-sm top-sm rounded-full bg-brand px-sm py-0.5 text-body-xs font-bold text-white">
                          Đang sửa
                        </span>
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-col gap-sm p-md md:p-lg">
                      <div className="flex flex-wrap items-start justify-between gap-xs">
                        <h2
                          title={item.name}
                          className="line-clamp-2 min-w-0 font-editorial text-[22px] font-semibold leading-tight tracking-[-0.01em] text-text md:text-[24px]"
                        >
                          {item.name}
                        </h2>
                        <StatusChip code={item.availabilityStatus} />
                      </div>
                      <p className="font-sign text-[20px] font-bold tabular-nums text-primary">
                        {formatVnd(item.unitPrice)}
                      </p>
                      <div className="flex flex-wrap gap-xs">
                        <DishFoodSafetyChip
                          status={item.foodSafetyStatus}
                          expiresOn={item.foodSafetyExpiresOn}
                        />
                        {!item.imageUrl ? <StatusChip label="Chưa có ảnh" tone="pending" /> : null}
                      </div>
                      {item.description ? (
                        <p className="line-clamp-3 text-body-lg text-text/75">{item.description}</p>
                      ) : null}
                      {item.foodSafetyStatus === 'MISSING' ? (
                        <p
                          className={`rounded-[12px] px-sm py-xs text-body-md font-medium ${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink}`}
                        >
                          Khách chưa thấy món này cho tới khi có giấy ATTP được duyệt.
                        </p>
                      ) : null}
                      {item.availabilityStatus === 'HIDDEN' ? (
                        <p
                          className={`rounded-[12px] px-sm py-xs text-body-md ${VERDICT_TONES.neutral.wash} ${VERDICT_TONES.neutral.ink}`}
                        >
                          Món đã bị quản trị viên ẩn.
                        </p>
                      ) : (
                        <div className="mt-auto flex flex-col gap-sm pt-xs sm:flex-row sm:flex-wrap sm:items-center">
                          <SoldOutToggle
                            available={item.availabilityStatus === 'AVAILABLE'}
                            label={
                              item.availabilityStatus === 'AVAILABLE'
                                ? 'Đánh dấu hết món'
                                : 'Còn hàng trở lại'
                            }
                            disabled={busy}
                            pending={switching}
                            onPress={() =>
                              save.mutate({
                                id: item.menuItemId,
                                input: {
                                  categoryId: item.categoryId,
                                  name: item.name,
                                  description: item.description,
                                  unitPrice: item.unitPrice,
                                  availabilityStatus:
                                    item.availabilityStatus === 'AVAILABLE'
                                      ? 'SOLD_OUT'
                                      : 'AVAILABLE',
                                },
                              })
                            }
                          />
                          <div className="grid grid-cols-2 gap-sm sm:flex">
                            <div data-edit-for={item.menuItemId} className="min-w-0 sm:w-auto">
                              <Button
                                label={item.imageUrl ? 'Sửa món' : 'Thêm ảnh / sửa'}
                                variant="outline"
                                disabled={busy}
                                onPress={() => startEdit(item)}
                              />
                            </div>
                            <RemoveDishButton disabled={busy} onPress={() => setArchiving(item)} />
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
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
