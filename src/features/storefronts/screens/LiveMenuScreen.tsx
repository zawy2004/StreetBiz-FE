import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, Money } from '@/components/common';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  showToast,
} from '@/components/feedback';
import { SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import { sellerStoreApi, type SellerMenuItem, type MenuInput } from '@/core/api/seller-store-api';

export function LiveMenuScreen() {
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
  const categoryId = Number(category) || categories.data?.[0]?.categoryId;
  const reset = () => {
    setEditing(null);
    setName('');
    setPrice('');
    setDescription('');
    setCategory('');
  };
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
  const amount = Number(price);
  const valid =
    name.trim().length > 0 &&
    Number.isSafeInteger(amount) &&
    amount > 0 &&
    amount <= 50_000_000 &&
    Boolean(categoryId);
  const busy = save.isPending || archive.isPending;
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
        <h2 className="mb-sm text-headline-sm">{editing ? 'Sửa món' : 'Thêm món mới'}</h2>
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
          options={categories.data.map((c) => ({ value: String(c.categoryId), label: c.name }))}
          layout="inline"
        />
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
                },
              })
            }
          />
          {editing ? (
            <Button label="Hủy sửa" variant="ghost" disabled={busy} onPress={reset} />
          ) : null}
        </div>
      </Card>
      {save.isError || archive.isError ? (
        <p role="alert" className="text-error">
          {errorMessage(save.error ?? archive.error)}
        </p>
      ) : null}
      {menu.isPending ? (
        <LoadingState />
      ) : !menu.data?.length ? (
        <EmptyState icon="silverware-fork-knife" title="Chưa có món nào" />
      ) : (
        menu.data.map((item) => (
          <Card key={item.menuItemId}>
            <div className="flex items-center justify-between gap-sm">
              <h2 className="text-headline-sm">{item.name}</h2>
              <StatusChip code={item.availabilityStatus} />
            </div>
            <Money amountVnd={item.unitPrice} />
            <p className="my-sm text-body-md text-muted">{item.description}</p>
            {item.availabilityStatus === 'HIDDEN' ? (
              <p className="text-error">Món đã bị quản trị viên ẩn.</p>
            ) : (
              <div className="flex flex-wrap gap-sm">
                <Button
                  label="Sửa món"
                  variant="outline"
                  disabled={busy}
                  onPress={() => {
                    setEditing(item);
                    setName(item.name);
                    setDescription(item.description ?? '');
                    setPrice(String(item.unitPrice));
                    setCategory(String(item.categoryId));
                    save.reset();
                  }}
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
                        ...item,
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
