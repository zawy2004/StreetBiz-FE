import { Link, NavLink, useNavigate } from 'react-router-dom';

import { Avatar, BrandLogo, Icon } from '@/components/common';
import type { RoleTabItem } from '@/components/layout/RoleTabBar';
import { ThemeSwitchButton } from '@/components/layout/ThemeToggle';
import { useCartStore } from '@/features/cart/cart-store';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme';

type Props = { items: RoleTabItem[] };

/**
 * Buyer navigation on web: one bar across the top (logo, sections, search,
 * cart, theme, account), the food-delivery app pattern, instead of an admin
 * sidebar. Phones keep the bottom tab bar.
 */
export function ConsumerTopNav({ items }: Props) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const accountTo = items.find((i) => i.to.endsWith('/account'))?.to;
  const sections = items.filter((i) => i.to !== accountTo);

  return (
    <header className="shrink-0 border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-lg px-xl">
        <Link to={items[0]?.to ?? '/'} className="flex items-center gap-xs" aria-label="StreetBiz, về trang khám phá">
          <BrandLogo size={30} />
          <span className="text-headline-lg text-text">StreetBiz</span>
        </Link>

        <nav aria-label="Điều hướng chính" className="flex items-center gap-1">
          {sections.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex h-10 items-center rounded-full px-md text-body-md transition-colors',
                  isActive ? 'bg-tint-primary font-semibold text-primary' : 'text-text hover:bg-sunken',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => navigate('/customer/explore/search')}
          className="ml-auto flex h-10 w-full max-w-[380px] items-center gap-xs rounded-full border border-border bg-sunken px-md text-left text-body-md text-muted transition-colors hover:border-muted/50"
        >
          <Icon name="magnify" size={20} color={colors.muted} />
          Tìm món, quán hoặc tuyến phố
        </button>

        <div className="flex items-center gap-1">
          <Link
            to="/customer/explore/cart"
            aria-label={`Giỏ hàng, ${cartCount} món`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-sunken"
          >
            <Icon name="cart-outline" size={22} color={colors.text} />
            {cartCount > 0 ? (
              <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-badge font-tabular text-on-primary">
                {cartCount}
              </span>
            ) : null}
          </Link>
          <ThemeSwitchButton />
          {user && accountTo ? (
            <Link to={accountTo} aria-label="Tài khoản" className="ml-1 rounded-full">
              <Avatar name={user.fullName} size={36} />
            </Link>
          ) : (
            <Link
              to="/auth/sign-in"
              className="ml-1 flex h-10 items-center rounded-full bg-primary px-md text-label font-semibold text-on-primary hover:bg-primary-pressed"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
