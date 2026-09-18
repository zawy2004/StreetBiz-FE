import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, IconButton } from '@/components/common';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  showToast,
} from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { colors } from '@/theme';
import { PlatformConnection } from '../components/PlatformConnection';
import { platformApi, PlatformApiError, type FoodCategory } from '../platform-api';

export function CategoriesScreen() {
  return (
    <PlatformConnection>
      <CategoriesContent />
    </PlatformConnection>
  );
}

function CategoriesContent() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<FoodCategory>();
  const [editName, setEditName] = useState('');
  const [deleting, setDeleting] = useState<FoodCategory>();
  const categories = useQuery({
    queryKey: ['platform', 'categories'],
    queryFn: platformApi.categories,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['platform', 'categories'] });
  const create = useMutation({
    mutationFn: () => platformApi.createCategory(name.trim()),
    onSuccess: async () => {
      setName('');
      await refresh();
      showToast('Đã thêm danh mục');
    },
  });
  const rename = useMutation({
    mutationFn: () => platformApi.renameCategory(editing!.categoryId, editName.trim()),
    onSuccess: async () => {
      setEditing(undefined);
      setEditName('');
      await refresh();
      showToast('Đã đổi tên danh mục');
    },
  });
  const remove = useMutation({
    mutationFn: () => platformApi.deleteCategory(deleting!.categoryId),
    onSuccess: async () => {
      setDeleting(undefined);
      await refresh();
      showToast('Đã xoá danh mục');
    },
  });
  const mutationError = create.error ?? rename.error ?? remove.error;

  return (
    <Screen>
      <AppHeader title="Danh mục món ăn" subtitle="ADM-01 · Dữ liệu Backend" />
      <div className="flex items-end gap-sm">
        <div className="flex-1">
          <TextField
            label="Danh mục mới"
            value={name}
            onChangeText={(value) => setName(value.slice(0, 100))}
            placeholder="VD: Bánh tráng trộn"
            error={mutationError instanceof PlatformApiError ? mutationError.message : undefined}
          />
        </div>
        <Button
          label="Thêm"
          fullWidth={false}
          loading={create.isPending}
          disabled={!name.trim()}
          onPress={() => create.mutate()}
        />
      </div>

      {categories.isPending ? <LoadingState /> : null}
      {categories.isError ? (
        <ErrorState
          message={
            categories.error instanceof PlatformApiError
              ? categories.error.message
              : 'Không tải được danh mục.'
          }
          onRetry={() => categories.refetch()}
        />
      ) : null}
      {categories.data?.length === 0 ? (
        <EmptyState icon="shape-outline" title="Chưa có danh mục món ăn" />
      ) : null}
      {categories.data?.map((category) => (
        <Card key={category.categoryId}>
          {editing?.categoryId === category.categoryId ? (
            <div className="flex flex-col gap-sm">
              <TextField
                label="Tên danh mục"
                value={editName}
                onChangeText={(value) => setEditName(value.slice(0, 100))}
                autoFocus
              />
              <div className="flex gap-sm">
                <Button label="Huỷ" variant="outline" onPress={() => setEditing(undefined)} />
                <Button
                  label="Lưu"
                  loading={rename.isPending}
                  disabled={!editName.trim()}
                  onPress={() => rename.mutate()}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-sm">
              <div className="min-w-0 flex-1">
                <span className="block truncate text-headline-sm text-text">
                  {category.categoryName}
                </span>
                <span className="block text-body-sm text-muted">
                  {category.itemCount} món
                  {category.createdByName ? ` · Tạo bởi ${category.createdByName}` : ''}
                </span>
              </div>
              <IconButton
                icon="pencil-outline"
                accessibilityLabel="Đổi tên danh mục"
                onPress={() => {
                  setEditing(category);
                  setEditName(category.categoryName);
                }}
              />
              {category.itemCount === 0 ? (
                <IconButton
                  icon="trash-can-outline"
                  accessibilityLabel="Xoá danh mục"
                  color={colors.error}
                  onPress={() => setDeleting(category)}
                />
              ) : null}
            </div>
          )}
        </Card>
      ))}
      <ConfirmDialog
        visible={Boolean(deleting)}
        title="Xoá danh mục?"
        description={`Danh mục “${deleting?.categoryName ?? ''}” sẽ bị xoá vĩnh viễn.`}
        confirmLabel="Xoá"
        confirmVariant="danger"
        onCancel={() => setDeleting(undefined)}
        onConfirm={() => remove.mutate()}
      />
    </Screen>
  );
}
