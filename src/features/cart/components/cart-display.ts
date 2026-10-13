import { menuItemPhotos } from '@/features/buyer-discovery/food-photos';

/** Display helpers for the cart and checkout (C10, C11). Nothing here fetches. */

export const dishPhotos = (itemName: string, imageUrl?: string | null) =>
  menuItemPhotos({ itemName, imageUrl });

export const cartLineNameId = (id: string) => `cart-line-${id}`;

/** Why "Thanh toán" is off, said right above it. The condition itself is the screen's. */
export function checkoutBlockReason(
  storefrontStatus: string | undefined,
  availability: string[],
): string | null {
  if (storefrontStatus !== 'OPEN') {
    return storefrontStatus === 'PAUSED'
      ? 'Quán đang tạm dừng nhận đơn nên chưa đặt được. Giỏ vẫn được giữ.'
      : 'Quán đang đóng cửa nên chưa đặt được. Giỏ vẫn được giữ.';
  }
  if (availability.some((status) => status !== 'AVAILABLE')) {
    return 'Có món không còn bán. Giảm món đó về 0 để tiếp tục.';
  }
  return null;
}
