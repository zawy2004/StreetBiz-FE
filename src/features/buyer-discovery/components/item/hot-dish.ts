import type { IconName } from '@/components/common/Icon';

/** Dishes served hot get the steam (noodle soups, rice, grills), and only while still on sale. */
const HOT_GLYPHS: IconName[] = ['noodles', 'rice', 'fire'];

export const isHotDish = (glyph: IconName) => HOT_GLYPHS.includes(glyph);
