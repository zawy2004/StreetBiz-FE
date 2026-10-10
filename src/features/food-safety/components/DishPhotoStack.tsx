import type { FoodSafetyApplication } from '@/core/api/food-safety-api';
import { categoryIcon } from '@/features/buyer-discovery/category-icons';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import { menuItemPhotos } from '@/features/buyer-discovery/food-photos';
import { colors } from '@/theme';

type Dish = FoodSafetyApplication['dishes'][number];

/**
 * The dishes of a file as overlapping round photos, so a file is recognised
 * by its food before its number. `realOnly` (ward screens) leaves out stock
 * photos: an officer must not mistake an illustration for the stall's dish.
 */
export function DishPhotoStack({
  dishes,
  max = 4,
  size = 44,
  realOnly = false,
}: {
  dishes: Dish[];
  max?: number;
  size?: number;
  realOnly?: boolean;
}) {
  const shown = dishes.slice(0, max);
  const more = dishes.length - shown.length;
  const photos = shown.map((dish) => {
    const all = menuItemPhotos({
      itemName: dish.name,
      categoryName: dish.categoryName,
      imageUrl: dish.imageUrl,
    });
    return realOnly ? all.filter((photo) => !photo.illustrative) : all;
  });
  const illustrative = photos.some((list) => list[0]?.illustrative);
  if (!shown.length) return null;

  return (
    <div className="flex shrink-0 flex-col gap-1">
      <ul className="flex items-center" aria-hidden="true">
        {shown.map((dish, index) => (
          <li
            key={dish.menuItemId}
            title={dish.name}
            className="relative shrink-0 transition-transform duration-150 hover:z-10 hover:-translate-y-0.5"
            // Fixed box so the row never jumps when photos arrive.
            style={{ marginLeft: index ? -Math.round(size * 0.22) : 0, width: size, height: size }}
          >
            <FoodImage
              photos={photos[index]!}
              icon={categoryIcon(dish.categoryName)}
              iconSize={Math.round(size * 0.45)}
              iconColor={colors.primary}
              placeholderClassName="bg-[#FFF3E8] dark:bg-sunken"
              className="h-full w-full rounded-full ring-2 ring-card"
            />
          </li>
        ))}
        {more > 0 ? (
          <li
            className="relative flex shrink-0 items-center justify-center rounded-full bg-sunken text-body-xs font-semibold text-text ring-2 ring-card"
            style={{ marginLeft: -Math.round(size * 0.22), width: size, height: size }}
          >
            +{more}
          </li>
        ) : null}
      </ul>
      {illustrative ? <span className="text-body-xs text-muted">Ảnh minh họa</span> : null}
    </div>
  );
}
