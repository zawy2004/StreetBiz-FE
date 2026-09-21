import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { BrandLogo, IconButton } from '@/components/common';
import { ThemeSwitchButton } from '@/components/layout';

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  children: ReactNode;
};

/** A stretch of pavement drawn as painted slots; some taken (filled), some free. */
const PAVEMENT: { code: string; taken: boolean }[] = [
  { code: 'A-01', taken: true },
  { code: 'A-02', taken: true },
  { code: 'A-03', taken: false },
  { code: 'A-04', taken: true },
  { code: 'B-01', taken: false },
  { code: 'B-02', taken: true },
  { code: 'B-03', taken: true },
  { code: 'B-04', taken: false },
];

export function AuthShell({ title, subtitle, back, children }: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-full flex-1 bg-bg">
      <aside className="relative hidden w-[44%] max-w-[640px] flex-col justify-between overflow-hidden bg-primary p-2xl text-white lg:flex dark:bg-card dark:border-r dark:border-border">
        <div className="flex items-center gap-sm">
          <span className="rounded-md bg-white p-1.5">
            <BrandLogo size={28} />
          </span>
          <span className="text-headline-lg text-white">StreetBiz</span>
        </div>

        <div>
          <p className="max-w-[16ch] text-display-lg text-white">Vỉa hè có trật tự, quán có khách.</p>
          <p className="mt-sm max-w-[42ch] text-body-lg text-white/85">
            Người mua tìm quán có giấy phép, hộ kinh doanh thuê ô đúng chỗ, phường duyệt hồ sơ trên cùng một nơi.
          </p>
        </div>

        <div aria-hidden="true" className="grid grid-cols-4 gap-sm">
          {PAVEMENT.map((slot) => (
            <div
              key={slot.code}
              className={[
                'flex h-16 items-end rounded-sm border-2 border-dashed p-xs text-body-xs font-bold',
                slot.taken ? 'border-white/70 bg-white/15 text-white' : 'border-white/35 text-white/60',
              ].join(' ')}
            >
              Ô {slot.code}
            </div>
          ))}
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex items-center justify-between p-md">
          {back ? (
            <IconButton icon="arrow-left" accessibilityLabel="Quay lại" onPress={() => navigate(-1)} />
          ) : (
            <span />
          )}
          <ThemeSwitchButton />
        </div>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-lg pb-2xl">
          <div className="mb-lg flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="lg:hidden">
              <BrandLogo size={44} />
            </span>
            <h1 className="mt-sm text-display-md text-text lg:mt-0">{title}</h1>
            {subtitle ? <p className="mt-1 text-body-md text-muted">{subtitle}</p> : null}
          </div>
          <div className="flex flex-col gap-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
