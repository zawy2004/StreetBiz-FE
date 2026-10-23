import { describe, expect, it } from 'vitest';

import type { SearchIntent } from '@/core/api/ai-api';
import { applyIntent, looksLikeASentence } from '@/features/buyer-discovery/ai-search';
import { flagLabel, permitSentence } from '@/features/ward-administration/vendor-report-view';

const intent = (patch: Partial<SearchIntent> = {}): SearchIntent => ({
  available: true,
  source: 'AI',
  query: null,
  categoryId: null,
  categoryName: null,
  minPrice: null,
  maxPrice: null,
  openNow: null,
  minRating: null,
  nearMe: false,
  radiusMeters: null,
  sort: null,
  explanation: 'Hiểu là: …',
  ...patch,
});

describe('AIP-03 applying a reading of a sentence', () => {
  it('turns the reading into the screen\'s own filters and puts the keywords in the box', () => {
    const result = applyIntent(
      intent({ query: 'bún chả', categoryId: 3, maxPrice: 50000, openNow: true, minRating: 4, nearMe: true, radiusMeters: 1500, sort: 'rating' }),
      true,
    );

    expect(result.text).toBe('bún chả');
    expect(result.filters).toEqual({
      categoryId: 3,
      maxPrice: 50000,
      openNow: true,
      minRating: 4,
      radiusMeters: 1500,
    });
    expect(result.sort).toBe('RATING');
    expect(result.notes).toEqual([]);
  });

  it('changes only what the sentence spoke about', () => {
    const result = applyIntent(intent({ query: 'xôi' }), false);

    expect(result.filters).toEqual({});
    expect(result.sort).toBeNull();
  });

  it('never switches a filter off: "not mentioned" is not "no"', () => {
    expect(applyIntent(intent({ openNow: false }), false).filters).toEqual({});
  });

  it('falls back to a 2 km radius when "near me" names no distance', () => {
    expect(applyIntent(intent({ nearMe: true }), true).filters.radiusMeters).toBe(2000);
  });

  it('says so when "near me" cannot be applied without a position, and does not guess one', () => {
    const result = applyIntent(intent({ nearMe: true, radiusMeters: 500, sort: 'distance' }), false);

    expect(result.filters.radiusMeters).toBeUndefined();
    expect(result.sort).toBeNull();
    expect(result.notes).toContain('Bật vị trí của bạn để lọc theo khoảng cách.');
  });

  it('sorts by distance only when there is a position', () => {
    expect(applyIntent(intent({ nearMe: true, sort: 'distance' }), true).sort).toBe('NEAREST');
  });

  it('reports a minimum price it cannot filter by instead of dropping it silently', () => {
    const result = applyIntent(intent({ minPrice: 20000, maxPrice: 40000 }), true);

    expect(result.filters.maxPrice).toBe(40000);
    expect(result.notes.join(' ')).toContain('giá tối thiểu');
  });

  it.each([
    ['', false],
    ['bún', false],
    ['bún chả', true],
    ['xôi30k', true],
    ['  ab ', false],
  ])('treats %j as a sentence: %s', (text, expected) => {
    expect(looksLikeASentence(text)).toBe(expected);
  });
});

describe('AIB-01 wording', () => {
  it('has an officer-facing label for every flag the server raises', () => {
    for (const flag of [
      'NO_PHOTO',
      'NO_PERMIT_VISIBLE_IN_PHOTO',
      'SIGNAGE_DIFFERS_FROM_REGISTERED_NAME',
      'PERMIT_NOT_VALID',
      'PERMIT_SLOT_MISMATCH',
    ]) {
      expect(flagLabel(flag).label).not.toBe(flag);
    }
  });

  it('shows an unknown flag as it is rather than hiding it', () => {
    expect(flagLabel('SOMETHING_NEW').label).toBe('SOMETHING_NEW');
  });

  it('says whether the scanned permit is valid, with its slot', () => {
    const base = { permitId: 55, permitStatus: 'ACTIVE', contractStatus: 'ACTIVE', slotCode: 'A-01', slotMatchesReport: true };

    expect(permitSentence({ ...base, validNow: true })).toBe('Giấy phép #55 (ô A-01) còn hiệu lực.');
    expect(permitSentence({ ...base, validNow: false, slotCode: null })).toBe(
      'Giấy phép #55 không còn hiệu lực.',
    );
  });
});
