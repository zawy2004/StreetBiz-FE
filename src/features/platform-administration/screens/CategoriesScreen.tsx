import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, IconButton } from '@/components/common';
import { DataTable, type Column } from '@/components/data';
import { ConfirmDialog, ErrorState, showToast } from '@/components/feedback';
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

  const columns: Column<FoodCategory>[] = [
    {
      key: 'name',
      header: 'Tên danh mục',
      render: (category) =>
        editing?.categoryId === category.categoryId ? (
          <div className="flex flex-wrap items-center gap-xs" onClick={(e) => e.stopPropagation()}>
            <input
              aria-label="Tên danh mục"
              value={editName}
              onChange={(e) => setEditName(e.target.value.slice(0, 100))}
              autoFocus
              className="input-shell h-9 min-w-[180px] flex-1 rounded-sm border border-border bg-card px-sm text-body-md text-text"
            />
            <Button size="sm" label="Huỷ" variant="outline" fullWidth={false} onPress={() => setEditing(undefined)} />
            <Button
              size="sm"
              label="Lưu"
              fullWidth={false}
              loading={rename.isPending}
              disabled={!editName.trim()}
              onPress={() => rename.mutate()}
            />
          </div>
        ) : (
          category.categoryName
        ),
    },
    {
      key: 'items',
      header: 'Số món',
      align: 'right',
      width: '110px',
      render: (category) => <span className="font-tabular">{category.itemCount}</span>,
    },
    {
      key: 'creator',
      header: 'Người tạo',
      width: '200px',
      render: (category) => <span className="text-muted">{category.createdByName ?? 'Hệ thống'}</span>,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: '120px',
      render: (category) => (
        <div className="flex justify-end gap-1">
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
      ),
    },
  ];

  return (
    <Screen width="wide">
      <AppHeader title="Danh mục món ăn" subtitle="Nhóm món người mua dùng để lọc quán. Chỉ xoá được danh mục chưa có món." />

      <Card>
        <form
          className="flex flex-col gap-sm sm:flex-row sm:items-start"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
        >
          <div className="min-w-0 flex-1">
            <TextField
              label="Danh mục mới"
              value={name}
              onChangeText={(value) => setName(value.slice(0, 100))}
              placeholder="VD: Bánh tráng trộn"
              error={mutationError instanceof PlatformApiError ? mutationError.message : undefined}
            />
          </div>
          <Button
            type="submit"
            label="Thêm danh mục"
            fullWidth={false}
            loading={create.isPending}
            disabled={!name.trim()}
          />
        </form>
      </Card>

      {categories.isError ? (
        <ErrorState
          message={
            categories.error instanceof PlatformApiError
              ? categories.error.message
              : 'Không tải được danh mục.'
          }
          onRetry={() => categories.refetch()}
        />
      ) : (
        <DataTable
          caption="Danh mục món ăn"
          rows={categories.data ?? []}
          columns={columns}
          rowKey={(category) => String(category.categoryId)}
          loading={categories.isPending}
          empty={{
            icon: 'shape-outline',
            title: 'Chưa có danh mục món ăn',
            description: 'Thêm danh mục đầu tiên ở ô phía trên.',
          }}
        />
      )}
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
