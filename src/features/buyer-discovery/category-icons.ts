import type { IconName } from '@/components/common/Icon';

/** Keyword → glyph for marketplace categories, whose names come from the backend. */
/** Order matters: "Bánh mì" must hit the bread rule before "mì" hits noodles. */
const RULES: [RegExp, IconName][] = [
  [/bánh|xôi/i, 'cupcake'],
  [/bún|phở|mì|miến|hủ tiếu|cao lầu|mỳ/i, 'noodles'],
  [/cà phê|cafe|trà|nước|sinh tố|đồ uống/i, 'coffee-outline'],
  [/chè|kem|tráng miệng/i, 'icecream'],
  [/cơm|cháo/i, 'rice'],
  [/nướng|lẩu|hải sản|ốc/i, 'fire'],
];

export function categoryIcon(name: string | undefined): IconName {
  if (!name) return 'silverware-fork-knife';
  return RULES.find(([pattern]) => pattern.test(name))?.[1] ?? 'fastfood';
}
