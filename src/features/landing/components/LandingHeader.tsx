import { Link } from 'react-router-dom';

import { BrandLogo } from '@/components/common';
import { ThemeSwitchButton } from '@/components/layout';
import { ctaClass } from './link-styles';

const NAV = [
  { href: '#vai-tro', label: 'Vai trò' },
  { href: '#cach-hoat-dong', label: 'Cách hoạt động' },
  { href: '#cho-phuong', label: 'Cho phường' },
];

/** Light, frosted header that stays on top: the three doors are always one tap away. */
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-card/85 backdrop-blur-xl backdrop-saturate-150">
      <a
        href="#noi-dung"
        className="sr-only rounded-[10px] bg-card px-md py-xs text-label text-text shadow-sheet focus:not-sr-only focus:absolute focus:left-md focus:top-xs focus:z-40"
      >
        Bỏ qua tới nội dung chính
      </a>
      <div className="mx-auto flex h-[60px] max-w-[1304px] items-center justify-between gap-md px-md md:h-[72px] md:px-lg xl:px-xl">
        <Link to="/" className="flex shrink-0 items-center gap-xs rounded-[12px]">
          <BrandLogo size={30} />
          <span className="font-sign text-[21px] font-bold tracking-[-0.01em] text-text [font-stretch:108%]">
            StreetBiz
          </span>
        </Link>

        <nav aria-label="Trang chủ" className="hidden items-center md:flex lg:gap-1">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex h-11 items-center rounded-full px-2 text-[14px] font-semibold text-muted transition-colors hover:bg-sunken hover:text-text lg:px-sm lg:text-[15px]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-xs">
          <span className="hidden sm:block">
            <ThemeSwitchButton />
          </span>
          <Link
            to="/auth/sign-in"
            className="inline-flex h-11 items-center rounded-full px-sm text-[15px] font-semibold text-text transition-colors hover:bg-sunken"
          >
            Đăng nhập
          </Link>
          <Link
            to="/auth/register"
            className={ctaClass('primary', 'md', 'hidden !h-11 !px-md sm:inline-flex')}
          >
            Đăng ký
          </Link>
        </div>
      </div>
    </header>
  );
}
