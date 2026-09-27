import { describe, expect, it } from 'vitest';

import { menuItemPhotos, storefrontPhotos } from '@/features/buyer-discovery/food-photos';

const stock = (name: string) => `/images/food/${name}.jpg`;
const item = (itemName: string, extra: Partial<Parameters<typeof menuItemPhotos>[0]> = {}) =>
  menuItemPhotos({ itemName, ...extra });

describe('menuItemPhotos', () => {
  it.each([
    ['Bánh mì thịt nướng', 'banh-mi-thit-nuong'],
    ['Bánh mì chả cá', 'banh-mi'],
    ['Xôi xéo', 'xoi-xeo'],
    ['Xôi gà xé', 'xoi-ga'],
    ['Bún chả Hà Nội', 'bun-cha'],
    ['Bún bò Huế', 'bun-bo-hue'],
    ['Phở bò tái', 'pho'],
    ['Nem cua bể', 'nem-cua-be'],
    ['Cà phê sữa đá', 'ca-phe'],
    ['Trà đá', 'tra-da'],
    ['Sữa đậu nành', 'sua-dau-nanh'],
    ['Nước sâm', 'nuoc-giai-khat'],
    ['Chè đỗ đen', 'che'],
    ['bun cha khong dau', 'bun-cha'],
  ])('%s → %s', (name, photo) => {
    expect(item(name)).toEqual([{ src: stock(photo), illustrative: true }]);
  });

  it('falls back to the category when the dish name is unknown', () => {
    expect(item('Đặc biệt nhà làm', { categoryName: 'Chè - Tráng miệng' })[0]?.src).toBe(stock('che'));
  });

  it('puts the vendor photo first', () => {
    expect(item('Phở bò', { imageUrl: 'https://cdn.example/pho.jpg' })).toEqual([
      { src: 'https://cdn.example/pho.jpg', illustrative: false },
      { src: stock('pho'), illustrative: true },
    ]);
  });

  it('returns nothing for an unrecognised dish', () => {
    expect(item('Món lạ', { categoryName: 'Khác' })).toEqual([]);
  });
});

describe('storefrontPhotos', () => {
  it('matches the stall name', () => {
    expect(storefrontPhotos({ storefrontId: 2, storefrontName: 'Bún chả Hải Châu' })[0]?.src).toBe(stock('bun-cha'));
  });

  it('always has a stock photo, stable per stall', () => {
    const a = storefrontPhotos({ storefrontId: 7, storefrontName: 'Quán Cô Ba' });
    expect(a).toHaveLength(1);
    expect(a).toEqual(storefrontPhotos({ storefrontId: 7, storefrontName: 'Quán Cô Ba' }));
  });
});
