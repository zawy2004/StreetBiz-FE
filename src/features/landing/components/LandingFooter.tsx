import { BrandLogo } from '@/components/common';

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-[1304px] flex-wrap items-center justify-between gap-md px-md pb-[120px] pt-lg text-body-sm text-muted md:px-lg md:pb-lg xl:px-xl">
        <span className="flex flex-wrap items-center gap-xs">
          <BrandLogo size={22} />
          <span className="font-sign text-[16px] font-bold text-text">StreetBiz</span>
          <span>Vỉa hè có trật tự, quán có khách.</span>
        </span>
        <span>© {new Date().getFullYear()} StreetBiz</span>
      </div>
    </footer>
  );
}
