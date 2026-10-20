import {
  hasActiveFilters,
  menuItemQuery,
  menuSortFor,
  NO_DISCOVERY_FILTERS,
  storefrontQuery,
  storefrontSortFor,
} from '@/features/buyer-discovery/discovery-filters';

const HERE = { latitude: 16.0605, longitude: 108.2145 };

describe('hasActiveFilters', () => {
  it('is off for the empty filters and for a service area alone', () => {
    expect(hasActiveFilters(NO_DISCOVERY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...NO_DISCOVERY_FILTERS, wardId: 3 })).toBe(false);
  });

  it.each([
    { categoryId: 2 },
    { openNow: true },
    { radiusMeters: 1000 },
    { maxPrice: 30_000 },
  ])('is on for %o', (patch) => {
    expect(hasActiveFilters({ ...NO_DISCOVERY_FILTERS, ...patch })).toBe(true);
  });
});

describe('storefrontQuery', () => {
  it('sends only what is set, trimming the text and dropping switched-off filters', () => {
    expect(storefrontQuery(NO_DISCOVERY_FILTERS, null, '  bún ')).toEqual({
      query: 'bún',
      wardId: undefined,
      categoryId: undefined,
      openNow: undefined,
      position: undefined,
      radiusMeters: undefined,
      sort: 'name',
    });
  });

  it('passes the area, category, opening hours and position, and sorts by distance by default', () => {
    const query = storefrontQuery({ ...NO_DISCOVERY_FILTERS, wardId: 3, categoryId: 2, openNow: true }, HERE, '');

    expect(query).toMatchObject({ wardId: 3, categoryId: 2, openNow: true, position: HERE, sort: 'distance' });
    expect(query.query).toBeUndefined();
  });

  it('ignores a radius without a position, which the API would reject', () => {
    const filters = { ...NO_DISCOVERY_FILTERS, radiusMeters: 2000 };

    expect(storefrontQuery(filters, null, '').radiusMeters).toBeUndefined();
    expect(storefrontQuery(filters, HERE, '').radiusMeters).toBe(2000);
  });

  it('never asks for distance order without a position', () => {
    expect(storefrontQuery(NO_DISCOVERY_FILTERS, null, '', 'distance').sort).toBe('name');
    expect(storefrontQuery(NO_DISCOVERY_FILTERS, HERE, '', 'rating').sort).toBe('rating');
  });
});

describe('menuItemQuery', () => {
  it('carries the price cap and the shared filters but no position', () => {
    expect(
      menuItemQuery({ ...NO_DISCOVERY_FILTERS, wardId: 3, categoryId: 1, openNow: true, maxPrice: 50_000 }, ' xôi ', 'price_asc'),
    ).toEqual({ query: 'xôi', wardId: 3, categoryId: 1, openNow: true, maxPrice: 50_000, sort: 'price_asc' });
  });
});

describe('search sort', () => {
  it('maps one choice onto both lists', () => {
    expect(storefrontSortFor('NEAREST', HERE)).toBe('distance');
    expect(storefrontSortFor('NEAREST', null)).toBe('name');
    expect(storefrontSortFor('RATING', null)).toBe('rating');
    expect(storefrontSortFor('PRICE_ASC', HERE)).toBe('name');

    expect(menuSortFor('PRICE_ASC')).toBe('price_asc');
    expect(menuSortFor('PRICE_DESC')).toBe('price_desc');
    expect(menuSortFor('RATING')).toBe('name');
  });
});
