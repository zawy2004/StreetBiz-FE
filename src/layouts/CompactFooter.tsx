import { LegalLinks } from '@/features/legal/components/LegalLinks';

/** One quiet line for working roles (vendors): legal pages and copyright, no brand block. */
export function CompactFooter() {
  return (
    <footer className="mt-md flex flex-wrap items-center justify-between gap-x-md border-t border-border bg-card px-md py-xs text-body-sm text-muted md:pl-lg md:pr-[190px]">
      <LegalLinks />
      <span>© {new Date().getFullYear()} StreetBiz</span>
    </footer>
  );
}
