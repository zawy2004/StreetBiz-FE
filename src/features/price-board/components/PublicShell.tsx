import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import brandMark from '@/assets/brand/streetbiz-mark-orange.png';
import { LegalLinks } from '@/features/legal/components/LegalLinks';

/**
 * The page a phone camera opens from a printed QR: no sign-in, no app to install. A slim
 * brand bar, one readable column, and a quiet footer with the legal links.
 */
export function PublicShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div data-surface="CUSTOMER" className="flex min-h-full flex-col bg-bg">
      <header className="border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-[60px] w-full max-w-[760px] items-center justify-between gap-md px-md">
          <Link to="/" className="flex items-center gap-xs rounded-[12px]">
            {/* Decorative: the word beside it names the link. */}
            <img src={brandMark} alt="" width={26} height={26} className="shrink-0" />
            <span className="font-sign text-[19px] font-bold text-text">StreetBiz</span>
          </Link>
          {aside}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-lg px-md py-lg">
        {children}
      </main>
      {/* Right padding keeps the copyright clear of the assistant bubble, as in CompactFooter. */}
      <footer className="border-t border-border bg-card py-sm pl-md pr-[88px] text-body-sm text-muted md:pr-[190px]">
        <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center justify-between gap-x-md gap-y-1">
          <LegalLinks />
          <span>© {new Date().getFullYear()} StreetBiz</span>
        </div>
      </footer>
    </div>
  );
}
