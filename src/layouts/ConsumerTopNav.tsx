import { Link, NavLink, useNavigate } from 'react-router-dom';

import { Avatar, BrandLogo, Icon } from '@/components/common';
import { NavBadge, type RoleTabItem } from '@/components/layout/RoleTabBar';
import { ThemeSwitchButton } from '@/components/layout/ThemeToggle';
import { useCartStore } from '@/features/cart/cart-store';
import { useAuthStore } from '@/store/auth-store';

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
    <header className="relative z-20 shrink-0 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-[1320px] items-center gap-lg px-xl">
        <Link to={items[0]?.to ?? '/'} className="flex items-center gap-xs rounded-[10px]" aria-label="StreetBiz, về trang khám phá">
          <BrandLogo size={30} />
          <span className="font-sign text-[21px] font-bold tracking-[-0.01em] text-text [font-stretch:108%]">StreetBiz</span>
        </Link>

        <nav aria-label="Điều hướng chính" className="flex items-center gap-1">
          {sections.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex h-10 items-center gap-xs rounded-full px-md text-body-md transition-colors duration-150',
                  isActive ? 'bg-primary font-semibold text-on-primary shadow-card' : 'text-text/80 hover:bg-sunken hover:text-text',
                ].join(' ')
              }
            >
              {item.label}
              <NavBadge count={item.badge} />
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => navigate('/customer/explore/search')}
          className="ml-auto flex h-11 w-full max-w-[380px] items-center gap-xs rounded-full border border-border bg-bg px-md text-left text-body-md text-muted transition-colors hover:border-text/25"
        >
          <Icon name="magnify" size={19} color="currentColor" />
          Tìm món, quán hoặc tuyến phố
        </button>

        <div className="flex items-center gap-1">
          <Link
            to="/customer/explore/cart"
            aria-label={`Giỏ hàng, ${cartCount} món`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-text hover:bg-sunken"
          >
            <Icon name="cart-outline" size={22} color="currentColor" />
            {cartCount > 0 ? (
              <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-badge font-tabular text-on-accent">
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
              className="ml-1 flex h-10 items-center rounded-full bg-primary px-md text-label font-semibold text-on-primary transition-colors hover:bg-primary-pressed"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
