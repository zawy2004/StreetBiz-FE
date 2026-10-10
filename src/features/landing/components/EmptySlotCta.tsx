import { Link } from 'react-router-dom';

import { ctaClass } from './link-styles';

const TILES =
  'linear-gradient(rgb(var(--c-border) / 0.75) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-border) / 0.75) 1px, transparent 1px)';

/** "Your slot is waiting": the last call to action drawn as a big empty slot on tiled pavement. */
export function EmptySlotCta() {
  return (
    <section aria-labelledby="cta-title" className="bg-bg">
      <div className="mx-auto max-w-[1304px] px-md pb-2xl md:px-lg md:pb-[72px] xl:px-xl xl:pb-[96px]">
        <div
          className="relative rounded-[28px] border-[3px] border-dashed border-brand bg-card px-md pb-lg pt-xl md:px-xl md:pb-xl md:pt-2xl"
          style={{ backgroundImage: TILES, backgroundSize: '24px 24px' }}
        >
          <span aria-hidden="true" className="kerb-tag absolute -top-3 left-md md:left-xl">
            Ô trống
          </span>
          <div className="flex flex-col gap-lg lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[560px]">
              <h2
                id="cta-title"
                className="font-editorial text-[30px] font-semibold leading-[36px] tracking-[-0.02em] text-text [font-variation-settings:'opsz'_60] md:text-[40px] md:leading-[46px]"
              >
                Sẵn sàng lên phố cùng StreetBiz?
              </h2>
              <p className="mt-sm text-body-lg text-muted">
                Tạo tài khoản miễn phí trong một phút. Hộ kinh doanh chọn vai trò bán hàng khi đăng
                ký.
              </p>
            </div>
            <div className="flex flex-col gap-sm sm:flex-row">
              <Link to="/auth/register" className={ctaClass('primary', 'md', 'w-full sm:w-auto')}>
                Tạo tài khoản
              </Link>
              <Link to="/auth/sign-in" className={ctaClass('outline', 'md', 'w-full sm:w-auto')}>
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
