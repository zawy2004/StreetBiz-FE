import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Icon, IconButton } from '@/components/common';
import { DataTable, type Column } from '@/components/data';
import { ConfirmDialog, ErrorState, showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { colors } from '@/theme';
import { PlatformConnection } from '../components/PlatformConnection';
import {
  CategoriesSkeleton,
  CategoryPreviewRail,
  CategorySummary,
  CategoryThumb,
  DeleteLocked,
  ItemCountBar,
} from '../components/CategoryParts';
import { fold } from '../components/admin-format';
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

  // Display only: an in-memory search over the loaded list, and a short highlight on the
  // category the server just created (its id is in the create response; nothing is refetched for it).
  const [query, setQuery] = useState('');
  const [freshId, setFreshId] = useState<number>();
  const createdId = create.data?.categoryId;
  useEffect(() => {
    if (createdId === undefined) return;
    setFreshId(createdId);
    const timer = setTimeout(() => setFreshId(undefined), 1600);
    return () => clearTimeout(timer);
  }, [createdId]);

  const all = categories.data ?? [];
  const needle = fold(query);
  const rows = needle ? all.filter((c) => fold(c.categoryName).includes(needle)) : all;
  const maxItems = Math.max(0, ...all.map((c) => c.itemCount));

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
              className="input-shell h-11 min-w-[180px] flex-1 rounded-sm border border-border bg-card px-sm text-body-md text-text"
            />
            <span className="sb-pop flex gap-xs">
              <Button
                size="sm"
                label="Huỷ"
                variant="outline"
                fullWidth={false}
                onPress={() => setEditing(undefined)}
              />
              <Button
                size="sm"
                label="Lưu"
                fullWidth={false}
                loading={rename.isPending}
                disabled={!editName.trim()}
                onPress={() => rename.mutate()}
              />
            </span>
          </div>
        ) : (
          <span
            className={`-mx-xs flex min-w-0 items-center gap-sm rounded-[12px] px-xs py-0.5 transition-colors duration-[1200ms] ${freshId === category.categoryId ? 'bg-tint-primary' : 'bg-transparent'}`}
          >
            <CategoryThumb name={category.categoryName} />
            <span className="line-clamp-2 min-w-0 break-words text-[15px] font-semibold leading-[22px]">
              {category.categoryName}
            </span>
          </span>
        ),
    },
    {
      key: 'items',
      header: 'Số món',
      align: 'right',
      width: '220px',
      render: (category) => <ItemCountBar count={category.itemCount} max={maxItems} />,
    },
    {
      key: 'creator',
      header: 'Người tạo',
      width: '180px',
      render: (category) => (
        <span className="text-muted">{category.createdByName ?? 'Hệ thống'}</span>
      ),
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
          ) : (
            <DeleteLocked count={category.itemCount} />
          )}
        </div>
      ),
    },
  ];

  return (
    <Screen width="wide">
      <AppHeader
        title="Danh mục món ăn"
        subtitle="Nhóm món người mua dùng để lọc quán. Chỉ xoá được danh mục chưa có món."
      />

      <section
        aria-label="Thêm danh mục"
        className="flex flex-col gap-md overflow-hidden rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg"
      >
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
            icon={<Icon name="plus" size={18} color="currentColor" />}
          />
        </form>
        {!categories.isError ? (
          <CategoryPreviewRail
            categories={all}
            draft={name}
            freshId={freshId}
            loading={categories.isPending}
          />
        ) : null}
      </section>

      {categories.isError ? (
        <ErrorState
          message={
            categories.error instanceof PlatformApiError
              ? categories.error.message
              : 'Không tải được danh mục.'
          }
          onRetry={() => categories.refetch()}
        />
      ) : categories.isPending ? (
        <CategoriesSkeleton />
      ) : (
        <>
          {all.length > 0 ? (
            <div className="flex flex-col gap-md lg:flex-row lg:items-end lg:justify-between">
              <CategorySummary categories={all} />
              <label className="input-shell flex h-11 w-full items-center gap-xs rounded-[10px] border border-border bg-card px-sm hover:border-muted/50 lg:max-w-[340px]">
                <span className="sr-only">Tìm danh mục</span>
                <Icon
                  name="magnify"
                  size={18}
                  color="currentColor"
                  className="shrink-0 text-muted"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm danh mục"
                  className="h-full min-w-0 flex-1 bg-transparent text-body-md text-text outline-none placeholder:text-muted/80 [&::-webkit-search-cancel-button]:hidden"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Xoá chữ tìm kiếm"
                    className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-sunken hover:text-text"
                  >
                    <Icon name="close" size={16} color="currentColor" />
                  </button>
                ) : null}
              </label>
            </div>
          ) : null}
          <DataTable
            caption="Danh mục món ăn"
            rows={rows}
            columns={columns}
            rowKey={(category) => String(category.categoryId)}
            loading={categories.isPending}
            empty={
              needle && all.length > 0
                ? {
                    icon: 'magnify',
                    title: 'Không có danh mục khớp',
                    description: 'Thử tên khác, hoặc xoá chữ tìm kiếm.',
                    action: (
                      <Button
                        label="Xoá tìm kiếm"
                        variant="outline"
                        fullWidth={false}
                        onPress={() => setQuery('')}
                      />
                    ),
                  }
                : {
                    icon: 'shape-outline',
                    title: 'Chưa có danh mục món ăn',
                    description: 'Thêm danh mục đầu tiên ở ô phía trên.',
                  }
            }
          />
        </>
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
