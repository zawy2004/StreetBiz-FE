import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Divider, ListRow, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { EmptyState, showToast } from '@/components/feedback';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '../cart-store';

export function CheckoutScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const menuItems = useMockDb((s) => s.menuItems);
  const storefronts = useMockDb((s) => s.storefronts);
  const placeOrder = useMockDb((s) => s.placeOrder);
  const [failed, setFailed] = useState(false);
  const [processing, setProcessing] = useState(false);

  const rows = items.flatMap((cartItem) => {
    const menuItem = menuItems.find((m) => m.id === cartItem.menuItemId);
    return menuItem ? [{ cartItem, menuItem }] : [];
  });
  const storefront = storefronts.find((st) => st.id === items[0]?.storefrontId);
  const total = rows.reduce((sum, r) => sum + r.menuItem.price * r.cartItem.quantity, 0);

  if (rows.length === 0 || !storefront) {
    return (
      <Screen>
        <AppHeader title="Thanh toán" back />
        <EmptyState icon="cart-outline" title="Giỏ hàng trống" />
      </Screen>
    );
  }

  const pay = () => {
    if (!user) return navigate('/auth/sign-in');
    setProcessing(true);
    setFailed(false);
    // Demo: fail once in a while so PAY-02 (retry) has something to show.
    setTimeout(() => {
      setProcessing(false);
      const success = Math.random() > 0.15;
      if (!success) {
        setFailed(true);
        return;
      }
      const order = placeOrder({
        customerId: user.id,
        storefrontId: storefront.id,
        items: rows.map((r) => ({
          menuItemId: r.menuItem.id,
          name: r.menuItem.name,
          price: r.menuItem.price,
          quantity: r.cartItem.quantity,
        })),
        total,
      });
      clearCart();
      showToast('Thanh toán thành công, đơn hàng đã được gửi');
      navigate(`/customer/orders/${order.id}`, { replace: true });
    }, 900);
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label={failed ? 'Thử lại thanh toán' : `Thanh toán qua MoMo / ZaloPay`}
            variant={failed ? 'danger' : 'primary'}
            loading={processing}
            onPress={pay}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Thanh toán" back subtitle={storefront.name} />
      <Card padded={false}>
        <div className="px-md">
          {rows.map((r, i) => (
            <div key={r.cartItem.menuItemId}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                title={`${r.cartItem.quantity}× ${r.menuItem.name}`}
                trailing={<Money amountVnd={r.menuItem.price * r.cartItem.quantity} />}
              />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-headline-sm text-text">Tổng cộng</span>
          <Money amountVnd={total} size="lg" />
        </div>
      </Card>
      {failed ? (
        <Card style={{ backgroundColor: '#FFDAD614', borderColor: '#BA1A1A33' }}>
          <p className="text-body-md" style={{ color: colors.error }}>
            Thanh toán thất bại. Vui lòng thử lại.
          </p>
        </Card>
      ) : null}
      <p className="text-center text-body-sm text-muted">
        Đơn hàng chỉ được tạo sau khi thanh toán thành công · Nhận tại quầy
      </p>
    </Screen>
  );
}
