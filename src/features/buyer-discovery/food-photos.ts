import { apiAssetUrl } from '@/core/api/asset-url';

/**
 * Stock photos (public/images/food, credits in CREDITS.md there) shown when a
 * stall or dish has no photo of its own, so the discovery screens are not a
 * wall of grey tiles. A vendor's own `imageUrl` always wins; a stock photo is
 * flagged `illustrative` so the UI can label it "Ảnh minh họa".
 */
export type FoodPhoto = { src: string; illustrative: boolean };

type PhotoKey =
  | 'banh-mi'
  | 'banh-mi-thit-nuong'
  | 'xoi-ga'
  | 'xoi-xeo'
  | 'bun-cha'
  | 'bun-bo-hue'
  | 'pho'
  | 'hu-tieu'
  | 'com-tam'
  | 'chao'
  | 'banh-xeo'
  | 'banh-cuon'
  | 'banh-trang-nuong'
  | 'nem-cua-be'
  | 'nem-nuong'
  | 'cha-gio'
  | 'ca-phe'
  | 'tra-da'
  | 'sua-dau-nanh'
  | 'che'
  | 'do-nuong'
  | 'nuoc-giai-khat';

/**
 * Matched against text with the accents stripped (see `fold`), so "Bún chả"
 * and "bun cha" hit the same rule. Order matters: the specific dish comes
 * before the word it contains ("bánh mì thịt nướng" before "bánh mì" before
 * "nướng"; "bún chả" before "bún").
 */
const RULES: [RegExp, PhotoKey][] = [
  [/banh m[iy]\b.*nuong/, 'banh-mi-thit-nuong'],
  [/banh m[iy]\b/, 'banh-mi'],
  [/xoi xeo/, 'xoi-xeo'],
  [/\bxoi\b/, 'xoi-ga'],
  [/bun cha/, 'bun-cha'],
  [/bun bo|bun rieu|\bbun\b/, 'bun-bo-hue'],
  [/hu tieu|hu tiu/, 'hu-tieu'],
  [/\bpho\b|\bm[iy]\b|\bmien\b|cao lau|mon nuoc/, 'pho'],
  [/\bcom\b/, 'com-tam'],
  [/\bchao\b/, 'chao'],
  [/banh xeo|banh khot/, 'banh-xeo'],
  [/banh cuon/, 'banh-cuon'],
  [/banh trang|an vat/, 'banh-trang-nuong'],
  [/nem cua|nem vuong/, 'nem-cua-be'],
  [/nem nuong/, 'nem-nuong'],
  [/cha gio|nem ran/, 'cha-gio'],
  [/ca phe|\bcafe\b|coffee/, 'ca-phe'],
  [/\btra\b/, 'tra-da'],
  [/dau nanh/, 'sua-dau-nanh'],
  [/\bche\b|trang mieng/, 'che'],
  [/nuong|\bxien\b/, 'do-nuong'],
  [/nuoc (sam|mia|ep|ngot|chanh|dua|cam|giai khat)|sinh to|do uong/, 'nuoc-giai-khat'],
];

/** Stalls that match nothing still get a photo, picked by id so each keeps its own. */
const STALL_FALLBACKS: PhotoKey[] = ['bun-cha', 'pho', 'com-tam', 'banh-mi', 'banh-cuon'];

const photoUrl = (key: PhotoKey) => `${import.meta.env.BASE_URL}images/food/${key}.jpg`;

/** Lowercase, accents off, "đ" → "d", punctuation to spaces. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
}

/** The first text (in priority order) that names a known dish decides the photo. */
function matchKey(texts: (string | null | undefined)[]): PhotoKey | null {
  for (const text of texts) {
    if (!text) continue;
    const folded = fold(text);
    const hit = RULES.find(([pattern]) => pattern.test(folded));
    if (hit) return hit[1];
  }
  return null;
}

function candidates(imageUrl: string | null | undefined, key: PhotoKey | null): FoodPhoto[] {
  const photos: FoodPhoto[] = [];
  if (imageUrl) photos.push({ src: apiAssetUrl(imageUrl), illustrative: false });
  if (key) photos.push({ src: photoUrl(key), illustrative: true });
  return photos;
}

/** Photos to try for a stall, best first: its own, then one for the dish it is named after. */
export function storefrontPhotos(storefront: {
  storefrontId: number;
  storefrontName: string;
  description?: string | null;
  categories?: string[];
  imageUrl?: string | null;
}): FoodPhoto[] {
  const key =
    matchKey([storefront.storefrontName, storefront.description, ...(storefront.categories ?? [])]) ??
    STALL_FALLBACKS[Math.abs(storefront.storefrontId) % STALL_FALLBACKS.length]!;
  return candidates(storefront.imageUrl, key);
}

/** Photos to try for a dish; empty when neither the dish nor its category is recognised. */
export function menuItemPhotos(item: {
  itemName: string;
  description?: string | null;
  categoryName?: string | null;
  imageUrl?: string | null;
}): FoodPhoto[] {
  return candidates(item.imageUrl, matchKey([item.itemName, item.categoryName, item.description]));
}
