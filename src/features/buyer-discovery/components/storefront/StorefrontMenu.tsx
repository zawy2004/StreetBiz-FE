import { useEffect, useState, type MouseEvent } from 'react';

import { formatVnd } from '@/components/common';
import { EmptyState } from '@/components/feedback';
import { StatusChip } from '@/components/status';
import type { MarketplaceMenuItem, StorefrontMenuCategory } from '@/core/api/commerce-api';
import { FoodSafetyBadge } from '@/features/food-safety/components/FoodSafetyBits';
import { colors } from '@/theme';
import { categoryIcon } from '../../category-icons';
import { menuItemPhotos } from '../../food-photos';
import { FoodImage } from '../FoodImage';

const anchorId = (categoryId: number) => `menu-cat-${categoryId}`;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Props = {
  menu: StorefrontMenuCategory[];
  onOpenItem: (item: MarketplaceMenuItem) => void;
};

/**
 * The printed menu: a sticky strip of categories (with their dish counts) that
 * jumps to each group and lights up the one being read, a summary line counted
 * from the menu itself, then each category (`h3`) and its dishes.
 */
export function StorefrontMenu({ menu, onOpenItem }: Props) {
  const items = menu.flatMap((category) => category.items);
  const prices = items.map((item) => item.unitPrice);
  const certified = items.filter((item) => item.foodSafetyCertified).length;
  // One or two dishes in all: bigger photos, so the menu block does not look empty.
  const roomy = items.length > 0 && items.length <= 2;

  return (
    <section aria-labelledby="menu-title" className="flex min-w-0 flex-col gap-md">
      <div className="flex flex-col gap-1">
        <h2
          id="menu-title"
          className="font-editorial text-[30px] font-semibold leading-tight tracking-[-0.02em] text-text lg:text-[36px]"
        >
          Thực đơn
        </h2>
        {items.length > 0 ? (
          <p className="flex flex-wrap items-baseline gap-x-sm gap-y-1 text-body-md text-muted">
            <span>{items.length} món</span>
            <span aria-hidden="true">·</span>
            <span className="font-sign text-[15px] font-bold font-tabular text-primary">
              Từ {formatVnd(Math.min(...prices))}
            </span>
            {certified > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-tertiary">{certified} món đạt ATTP</span>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {menu.length > 1 ? <MenuCategoryNav menu={menu} /> : null}

      {menu.length === 0 ? (
        <EmptyState
          icon="silverware-fork-knife"
          title="Chưa có món nào"
          description="Quán chưa đăng món lên thực đơn."
        />
      ) : null}

      {menu.map((category) => (
        <section key={category.categoryId} className="flex flex-col gap-xs">
          <h3
            id={anchorId(category.categoryId)}
            className="scroll-mt-[80px] pt-sm font-editorial text-[24px] font-semibold leading-tight text-text"
          >
            {category.categoryName}
          </h3>
          <ul className="flex flex-col divide-y divide-border/70">
            {category.items.map((item) => (
              <li key={item.menuItemId} className="py-1">
                <MenuItemRow item={item} roomy={roomy} onPress={() => onOpenItem(item)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

/**
 * Chips for the categories, sticky under the top while the menu scrolls. A chip
 * is a link to its group's heading; clicking scrolls there in place (no change
 * to the address). The group in view lights up.
 */
function MenuCategoryNav({ menu }: { menu: StorefrontMenuCategory[] }) {
  const [current, setCurrent] = useState<number>(menu[0]!.categoryId);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const headings = menu
      .map((category) => document.getElementById(anchorId(category.categoryId)))
      .filter((el): el is HTMLElement => el != null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setCurrent(Number(visible.target.id.replace('menu-cat-', '')));
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [menu]);

  const jump = (event: MouseEvent<HTMLAnchorElement>, categoryId: number) => {
    event.preventDefault();
    setCurrent(categoryId);
    document
      .getElementById(anchorId(categoryId))
      ?.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <nav
      aria-label="Danh mục thực đơn"
      className="sticky top-0 z-10 -mx-md bg-bg/95 px-md py-xs md:-mx-lg md:px-lg lg:mx-0 lg:rounded-full lg:bg-bg/85 lg:px-0 lg:backdrop-blur-xl"
    >
      <ul className="no-scrollbar flex gap-xs overflow-x-auto py-1">
        {menu.map((category) => {
          const active = current === category.categoryId;
          return (
            <li key={category.categoryId} className="shrink-0">
              <a
                href={`#${anchorId(category.categoryId)}`}
                aria-current={active ? 'true' : undefined}
                onClick={(event) => jump(event, category.categoryId)}
                className={[
                  'flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-md text-label transition-[background-color,box-shadow,color] duration-200',
                  active
                    ? 'bg-primary font-semibold text-on-primary shadow-[0_8px_20px_-8px_rgb(var(--c-primary)/0.7)]'
                    : 'bg-card text-text shadow-card ring-1 ring-border hover:ring-text/25',
                ].join(' ')}
              >
                {category.categoryName}
                <span
                  className={`font-tabular text-body-xs font-bold ${active ? 'text-on-primary/85' : 'text-muted'}`}
                >
                  {category.items.length}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * A dish on the menu: photo, name in the editorial face, description, ATTP mark,
 * then the price and, when it is out, the "HẾT MÓN" chip. A sold-out dish still
 * opens (as before) and keeps its colours.
 */
function MenuItemRow({
  item,
  roomy,
  onPress,
}: {
  item: MarketplaceMenuItem;
  roomy: boolean;
  onPress: () => void;
}) {
  const soldOut = item.availabilityStatus === 'SOLD_OUT';
  return (
    <button
      type="button"
      onClick={onPress}
      className={[
        'group grid w-full items-start gap-x-md gap-y-1.5 rounded-[20px] p-xs text-left transition-[background-color,transform] duration-150 hover:bg-sunken/60 active:scale-[0.99] md:p-sm',
        roomy
          ? 'grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[160px_minmax(0,1fr)_auto]'
          : 'grid-cols-[88px_minmax(0,1fr)] sm:grid-cols-[112px_minmax(0,1fr)_auto]',
      ].join(' ')}
    >
      <span className="relative row-span-2 block aspect-square overflow-hidden rounded-[16px] shadow-card sm:row-span-1">
        <FoodImage
          photos={menuItemPhotos(item)}
          icon={categoryIcon(item.categoryName)}
          iconSize={30}
          iconColor={colors.onSecondary}
          placeholderClassName="bg-tint-accent"
          className="h-full w-full"
          imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </span>
      <span className="flex min-w-0 flex-col gap-1 pt-0.5">
        <span className="line-clamp-2 font-editorial text-[19px] font-semibold leading-snug text-text">
          {item.itemName}
        </span>
        {item.description ? (
          <span className="line-clamp-2 text-body-md text-muted">{item.description}</span>
        ) : null}
        {item.foodSafetyCertified ? (
          <span className="mt-0.5">
            <FoodSafetyBadge />
          </span>
        ) : null}
      </span>
      {/* Phones: under the words (second column); wider: its own column on the right. */}
      <span className="col-start-2 flex flex-wrap items-center gap-xs sm:col-start-3 sm:row-start-1 sm:flex-col sm:items-end sm:gap-1.5 sm:pt-0.5">
        <span className="font-sign text-[17px] font-bold font-tabular text-primary">
          {formatVnd(item.unitPrice)}
        </span>
        {soldOut ? <StatusChip code="SOLD_OUT" /> : null}
      </span>
    </button>
  );
}
