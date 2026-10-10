import { useRef, useState } from 'react';

import { Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { menuItemPhotos } from '@/features/buyer-discovery/food-photos';
import type { FoodCategory } from '../platform-api';
import { useHorizontalOverflow } from './admin-motion';

/** The stock photo of a category's dish, or the shapes glyph when none matches or loads. */
export function CategoryThumb({ name, size = 40 }: { name: string; size?: 36 | 40 }) {
  const [failed, setFailed] = useState(false);
  const photo = menuItemPhotos({ itemName: name })[0];
  const box = size === 36 ? 'h-9 w-9' : 'h-10 w-10';
  if (!photo || failed) {
    return (
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-full bg-sunken text-muted ${box}`}
      >
        <Icon name="shape-outline" size={18} color="currentColor" weight="duotone" />
      </span>
    );
  }
  return (
    <img
      src={photo.src}
      alt=""
      loading="lazy"
      decoding="async"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-cover ${box}`}
    />
  );
}

/**
 * "What buyers see": every category as the photo pill of the buyer filter bar
 * (a still copy, nothing here is clickable). The name being typed leads the
 * rail with a dashed orange edge; a category just added pops in where the
 * server put it.
 */
export function CategoryPreviewRail({
  categories,
  draft,
  freshId,
  loading,
}: {
  categories: FoodCategory[];
  draft: string;
  freshId?: number;
  loading: boolean;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const overflowing = useHorizontalOverflow(railRef, [categories.length, draft]);
  const name = draft.trim();

  return (
    <div className="flex min-w-0 flex-col gap-xs">
      <p className="flex flex-wrap items-center gap-x-sm gap-y-1 text-label text-text">
        Người mua thấy như thế này
        <span className="rounded-full bg-sunken px-2 py-0.5 text-body-xs font-medium text-muted">
          Ảnh minh họa
        </span>
      </p>
      <div
        ref={railRef}
        role={overflowing ? 'region' : undefined}
        aria-label={overflowing ? 'Xem trước danh mục' : undefined}
        aria-hidden={overflowing ? undefined : true}
        tabIndex={overflowing ? 0 : undefined}
        className={`no-scrollbar flex min-w-0 gap-xs overflow-x-auto px-0.5 py-1 ${overflowing ? '[mask-image:linear-gradient(90deg,transparent,#000_14px,#000_calc(100%-28px),transparent)]' : ''}`}
      >
        <span
          className={`flex h-11 max-w-[220px] shrink-0 items-center gap-2 rounded-full border-2 border-dashed py-1 pl-1 pr-sm text-[14px] font-semibold leading-5 transition-colors ${name ? 'border-brand bg-card text-text' : 'border-border bg-transparent text-muted'}`}
        >
          {name ? (
            <CategoryThumb key={name} name={name} size={36} />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken">
              <Icon name="plus" size={16} color="currentColor" />
            </span>
          )}
          <span className="truncate" title={name || undefined}>
            {name || 'Tên mới hiện ở đây'}
          </span>
          {name ? (
            <span className="rounded-full bg-tint-primary px-1.5 py-0.5 text-[11px] font-bold leading-none text-primary">
              Mới
            </span>
          ) : null}
        </span>
        {loading
          ? [112, 92, 120, 104, 128, 96].map((w) => (
              <span
                key={w}
                style={{ width: w }}
                className="sb-shimmer h-11 shrink-0 rounded-full"
              />
            ))
          : categories.map((category) => (
              <span
                key={category.categoryId}
                title={category.categoryName}
                className={`flex h-11 max-w-[220px] shrink-0 items-center gap-2 rounded-full bg-card py-1 pl-1 pr-md text-[14px] font-semibold leading-5 text-text shadow-card ring-1 ring-border ${category.categoryId === freshId ? 'sb-pop ring-2 ring-brand' : ''}`}
              >
                <CategoryThumb name={category.categoryName} size={36} />
                <span className="truncate">{category.categoryName}</span>
              </span>
            ))}
      </div>
    </div>
  );
}

/** Three figures above the table: how many categories, how many dishes, how many can be deleted. */
export function CategorySummary({ categories }: { categories: FoodCategory[] }) {
  const dishes = categories.reduce((sum, c) => sum + c.itemCount, 0);
  const empty = categories.filter((c) => c.itemCount === 0).length;
  const figures = [
    { value: categories.length, label: 'danh mục' },
    { value: dishes, label: 'món' },
    { value: empty, label: 'danh mục trống' },
  ];
  return (
    <dl className="grid grid-cols-3 gap-sm sm:flex sm:gap-xl">
      {figures.map((f) => (
        <div key={f.label} className="flex min-w-0 flex-col">
          <dt className="order-2 text-body-sm text-muted">{f.label}</dt>
          <dd className="order-1 font-sign text-[28px] font-semibold leading-8 text-text font-tabular">
            {f.value.toLocaleString('vi-VN')}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** "Số món" as a bar against the category with the most dishes, the figure beside it. */
export function ItemCountBar({ count, max }: { count: number; max: number }) {
  const width = max > 0 ? Math.max(count > 0 ? 4 : 0, (count / max) * 100) : 0;
  return (
    <span className="flex items-center justify-end gap-sm">
      <span
        aria-hidden="true"
        className="hidden h-1.5 w-full max-w-[140px] overflow-hidden rounded-[3px] bg-sunken sm:block"
      >
        <span
          className="block h-full rounded-[3px] bg-brand/70 transition-[width] duration-300"
          style={{ width: `${width}%` }}
        />
      </span>
      <span className="min-w-[2ch] font-sign text-[14px] font-medium leading-5 font-tabular">
        {count}
      </span>
    </span>
  );
}

/** A category that still has dishes: a padlock where the bin would be, saying why. */
export function DeleteLocked({ count }: { count: number }) {
  const label = `Không xoá được: còn ${count} món`;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted"
    >
      <Icon name="lock-outline" size={20} color="currentColor" />
    </span>
  );
}

/** The table's shape while the list loads. */
export function CategoriesSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải danh mục"
      className="overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-border/80"
    >
      <div className="h-10 border-b border-border bg-sunken/70" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-md border-b border-border px-md py-sm last:border-b-0"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-2 w-32 sm:block" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
