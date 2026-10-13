import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { formatVnd, Icon } from '@/components/common';
import { ConfirmDialog, ErrorState, Skeleton, showToast } from '@/components/feedback';
import { Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { commerceApi, errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useCartStore } from '@/features/cart/cart-store';
import { FoodSafetyBadge } from '@/features/food-safety/components/FoodSafetyBits';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { categoryIcon } from '../category-icons';
import { BackButton } from '../components/BackButton';
import { isHotDish } from '../components/item/hot-dish';
import { FromStorefront, ItemHero, NoteSlip } from '../components/item/ItemParts';
import { OrderBar, QuantityStepper } from '../components/item/OrderBar';
import { menuItemPhotos } from '../food-photos';

export function ItemDetailScreen() {
  return isLiveApi ? <LiveItemDetailScreen /> : <MockItemDetailScreen />;
}

function LiveItemDetailScreen() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [confirmCartReplacement, setConfirmCartReplacement] = useState(false);
  const item = useQuery({
    queryKey: ['commerce', 'menu-item', itemId],
    queryFn: () => commerceApi.menuItem(itemId!),
    enabled: Boolean(itemId),
  });
  const add = useMutation({
    mutationFn: () => commerceApi.addCartItem(item.data!.menuItemId, quantity, note.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['commerce', 'cart'] });
      showToast('Đã thêm vào giỏ');
      navigate('/customer/explore/cart');
    },
  });
  const cart = useQuery({
    queryKey: ['commerce', 'cart'],
    queryFn: commerceApi.cart,
    enabled: user?.role_code === 'CUSTOMER',
  });

  if (item.isPending) return <ItemDetailSkeleton />;
  if (item.isError || !item.data) {
    return (
      <Screen>
        <div>
          <BackButton />
        </div>
        <ErrorState message={errorMessage(item.error)} onRetry={() => item.refetch()} />
      </Screen>
    );
  }

  const soldOut = item.data.availabilityStatus !== 'AVAILABLE';
  const glyph = categoryIcon(item.data.categoryName);
  const changeNote = (value: string) => setNote(value.slice(0, 300));

  // What the cart already holds, said before the button (the confirmation stays on the button).
  const held = cart.data;
  const heldCount = held?.items.reduce((sum, row) => sum + row.quantity, 0) ?? 0;
  const replaces = Boolean(held && held.storefrontId !== item.data.storefrontId);
  const cartNote = held
    ? replaces
      ? {
          replaces: true,
          text: `${heldCount > 0 ? `Giỏ đang có ${heldCount} món từ ${held.storefrontName}. ` : ''}Thêm món này sẽ thay giỏ ở ${held.storefrontName}.`,
        }
      : heldCount > 0
        ? { replaces: false, text: `Giỏ đang có ${heldCount} món từ ${held.storefrontName}.` }
        : null
    : null;

  const orderBar = (
    <OrderBar
      label={
        user
          ? `Thêm vào giỏ · ${(item.data.unitPrice * quantity).toLocaleString('vi-VN')} đ`
          : 'Đăng nhập để thêm vào giỏ'
      }
      total={user ? item.data.unitPrice * quantity : null}
      disabled={soldOut || add.isPending || (user?.role_code === 'CUSTOMER' && cart.isPending)}
      loading={add.isPending}
      onPress={() =>
        user?.role_code === 'CUSTOMER'
          ? cart.data && cart.data.storefrontId !== item.data.storefrontId
            ? setConfirmCartReplacement(true)
            : add.mutate()
          : navigate('/auth/sign-in')
      }
      stepper={
        soldOut ? null : (
          <QuantityStepper
            quantity={quantity}
            onDecrease={() => setQuantity((value) => Math.max(1, value - 1))}
            onIncrease={() => setQuantity((value) => Math.min(99, value + 1))}
          />
        )
      }
      note={
        <>
          {add.isError ? <AlertLine>{errorMessage(add.error)}</AlertLine> : null}
          {cart.isError ? <AlertLine>{errorMessage(cart.error)}</AlertLine> : null}
          {!user ? (
            <p className="text-body-sm text-muted">Đăng nhập tài khoản người mua để đặt món.</p>
          ) : null}
        </>
      }
    />
  );

  return (
    <Screen
      padded={false}
      footer={isDesktop ? undefined : <StickyActions>{orderBar}</StickyActions>}
    >
      <ItemLayout
        hero={
          <ItemHero
            photos={menuItemPhotos(item.data)}
            icon={glyph}
            steam={!soldOut && isHotDish(glyph)}
            badge={soldOut ? <StatusChip code={item.data.availabilityStatus} /> : undefined}
          />
        }
        orderBar={isDesktop ? orderBar : null}
      >
        <ItemHeading
          category={item.data.categoryName}
          name={item.data.itemName}
          price={item.data.unitPrice}
          status={soldOut ? null : <StatusChip code={item.data.availabilityStatus} />}
        />
        {item.data.foodSafetyCertified ? (
          <div className="flex flex-col items-start gap-1">
            <FoodSafetyBadge />
            <p className="text-body-sm text-muted">
              Món thuộc giấy chứng nhận an toàn thực phẩm còn hạn.
            </p>
          </div>
        ) : null}
        {item.data.description ? (
          <p className="max-w-[60ch] text-body-lg text-text/80">{item.data.description}</p>
        ) : null}
        {!soldOut ? <NoteSlip note={note} onChange={changeNote} /> : null}
        <FromStorefront
          storefrontName={item.data.storefrontName}
          onViewStore={() => navigate(`/customer/explore/stores/${item.data.storefrontId}`)}
          cartNote={cartNote}
        />
      </ItemLayout>
      <ConfirmDialog
        visible={confirmCartReplacement}
        title="Thay giỏ hàng hiện tại?"
        description={`Giỏ tại ${cart.data?.storefrontName ?? 'cửa hàng khác'} sẽ được thay bằng món từ ${item.data.storefrontName}.`}
        confirmLabel="Thay giỏ hàng"
        confirmVariant="danger"
        onConfirm={() => {
          setConfirmCartReplacement(false);
          add.mutate();
        }}
        onCancel={() => setConfirmCartReplacement(false)}
      />
    </Screen>
  );
}

function MockItemDetailScreen() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const item = useMockDb((state) => state.menuItems.find((row) => row.id === itemId));
  const storefront = useMockDb((state) =>
    state.storefronts.find((row) => row.id === item?.storefrontId),
  );
  const addToCart = useCartStore((state) => state.add);
  const [quantity, setQuantity] = useState(1);
  if (!item || !storefront) return <ErrorState message="Không tìm thấy món." />;
  const soldOut = item.availability_status === 'SOLD_OUT';
  const glyph = categoryIcon(item.name);

  const orderBar = (
    <OrderBar
      label={`Thêm vào giỏ · ${(item.price * quantity).toLocaleString('vi-VN')} đ`}
      total={item.price * quantity}
      disabled={soldOut}
      onPress={() => {
        addToCart({ menuItemId: item.id, storefrontId: storefront.id, quantity });
        showToast('Đã thêm vào giỏ');
        navigate(-1);
      }}
      stepper={
        soldOut ? null : (
          <QuantityStepper
            quantity={quantity}
            onDecrease={() => setQuantity((value) => Math.max(1, value - 1))}
            onIncrease={() => setQuantity((value) => value + 1)}
          />
        )
      }
    />
  );

  return (
    <Screen
      padded={false}
      footer={isDesktop ? undefined : <StickyActions>{orderBar}</StickyActions>}
    >
      <ItemLayout
        hero={
          <ItemHero
            photos={menuItemPhotos({ itemName: item.name })}
            icon={glyph}
            steam={!soldOut && isHotDish(glyph)}
            badge={soldOut ? <StatusChip code={item.availability_status} /> : undefined}
          />
        }
        orderBar={isDesktop ? orderBar : null}
      >
        <ItemHeading
          name={item.name}
          price={item.price}
          status={soldOut ? null : <StatusChip code={item.availability_status} />}
        />
        {item.description ? (
          <p className="max-w-[60ch] text-body-lg text-text/80">{item.description}</p>
        ) : null}
        <FromStorefront storefrontName={storefront.name} />
      </ItemLayout>
    </Screen>
  );
}

/**
 * Phone: the photo edge to edge and the content as a sheet sliding up over its
 * lower edge. Tablet: one column in the margins. Desktop: the photo on the left
 * (staying put), the order column on the right with its bar pinned at the foot.
 */
function ItemLayout({
  hero,
  orderBar,
  children,
}: {
  hero: ReactNode;
  orderBar: ReactNode | null;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1320px] md:px-lg md:pt-md lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-xl lg:px-xl lg:pt-lg xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="lg:sticky lg:top-lg">{hero}</div>
      <div className="relative -mt-lg flex flex-col gap-lg rounded-t-[28px] bg-bg px-md pb-xl pt-lg sb-rise [--delay:120ms] md:mt-0 md:rounded-none md:px-0 lg:pb-lg lg:pt-0">
        {children}
        {orderBar ? (
          <div className="sticky bottom-0 z-10 -mx-xs rounded-[20px] bg-bg/95 p-xs backdrop-blur-xl">
            {orderBar}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ItemHeading({
  category,
  name,
  price,
  status,
}: {
  category?: string;
  name: string;
  price: number;
  status: ReactNode | null;
}) {
  return (
    <div className="flex flex-col gap-sm">
      {category ? (
        <p className="flex items-center gap-1.5 text-label font-semibold text-primary">
          <Icon name={categoryIcon(category)} size={16} color="currentColor" />
          {category}
        </p>
      ) : null}
      <h1 className="line-clamp-3 font-editorial text-[40px] font-semibold leading-[1.04] tracking-[-0.025em] text-text [font-variation-settings:'opsz'_72] md:text-[48px] lg:text-[44px] xl:text-[56px]">
        {name}
      </h1>
      <div className="flex flex-wrap items-center gap-sm">
        <span className="font-sign text-[30px] font-bold font-tabular leading-none text-primary lg:text-[36px]">
          {formatVnd(price)}
        </span>
        {status}
      </div>
    </div>
  );
}

function AlertLine({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-center gap-1.5 text-body-md font-medium text-error">
      <Icon name="alert-circle-outline" size={18} color="currentColor" />
      {children}
    </p>
  );
}

/** The page's outline while the dish loads; the bar holds its place without a live button. */
function ItemDetailSkeleton() {
  return (
    <Screen padded={false}>
      <div
        role="status"
        aria-label="Đang tải món"
        className="mx-auto w-full max-w-[1320px] md:px-lg md:pt-md lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-xl lg:px-xl lg:pt-lg xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
      >
        <div className="relative aspect-[4/3] md:aspect-[16/9] lg:aspect-square lg:max-h-[640px]">
          <Skeleton className="absolute inset-0 !rounded-none md:!rounded-[28px] lg:!rounded-[32px]" />
          <div className="absolute left-sm top-sm md:left-md md:top-md">
            <BackButton floating />
          </div>
        </div>
        <div className="flex flex-col gap-md px-md pt-lg md:px-0">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-[70%]" />
          <Skeleton className="h-9 w-[120px]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <div className="mt-md flex items-center gap-sm">
            <Skeleton className="h-14 w-[136px] !rounded-full" />
            <Skeleton className="h-[52px] flex-1 !rounded-[14px]" />
          </div>
        </div>
      </div>
    </Screen>
  );
}
