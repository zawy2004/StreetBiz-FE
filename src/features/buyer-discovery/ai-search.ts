import type { SearchIntent } from '@/core/api/ai-api';
import type { DiscoveryFilters, SearchSort } from './discovery-filters';

/** What reading a sentence changes on the search screen. */
export type IntentApplication = {
  /** The keywords that replace the sentence in the search box. */
  text: string;
  /** Only the filters the sentence spoke about; the rest of the customer's filters stay as they were. */
  filters: Partial<DiscoveryFilters>;
  sort: SearchSort | null;
  /** Parts of the sentence the screen cannot apply, in the customer's words. */
  notes: string[];
};

const SORTS: Record<string, SearchSort> = {
  name: 'NAME',
  price_asc: 'PRICE_ASC',
  price_desc: 'PRICE_DESC',
  rating: 'RATING',
  distance: 'NEAREST',
};

/**
 * Turns the reading of a sentence (AIP-03) into the search screen's own filters. Anything the screen
 * cannot do is reported in `notes` rather than silently dropped, so the customer is never told a
 * filter is on when it is not. "Near me" needs a position; without one it is a note, not a guess.
 */
export function applyIntent(intent: SearchIntent, hasPosition: boolean): IntentApplication {
  const filters: Partial<DiscoveryFilters> = {};
  const notes: string[] = [];

  if (intent.categoryId !== null) filters.categoryId = intent.categoryId;
  if (intent.openNow === true) filters.openNow = true;
  if (intent.maxPrice !== null) filters.maxPrice = intent.maxPrice;
  if (intent.minRating !== null) filters.minRating = intent.minRating;
  if (intent.minPrice !== null) {
    notes.push('Chưa lọc được theo giá tối thiểu; bộ lọc giá chỉ áp mức tối đa.');
  }

  if (intent.nearMe) {
    if (hasPosition) filters.radiusMeters = intent.radiusMeters ?? 2000;
    else notes.push('Bật vị trí của bạn để lọc theo khoảng cách.');
  }

  const wanted = intent.sort ? SORTS[intent.sort] : undefined;
  const sort = wanted === 'NEAREST' && !hasPosition ? null : (wanted ?? null);

  return { text: intent.query ?? '', filters, sort, notes };
}

/** A sentence is worth sending to the model when it has more than one word or a number in it. */
export const looksLikeASentence = (text: string): boolean => {
  const trimmed = text.trim();
  return trimmed.length >= 6 && (/\s/.test(trimmed) || /\d/.test(trimmed));
};
