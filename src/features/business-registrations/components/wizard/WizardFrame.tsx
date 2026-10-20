import type { ReactNode } from 'react';

import { Icon } from '@/components/common';

export const WIZARD_STEPS = [
  { short: 'Loại hình', full: 'Loại hình kinh doanh' },
  { short: 'Thông tin hộ', full: 'Thông tin hộ kinh doanh' },
  { short: 'Chủ hộ & ngành nghề', full: 'Chủ hộ kinh doanh & ngành nghề' },
  { short: 'Giấy tờ', full: 'Giấy tờ minh chứng' },
] as const;

const KERB_STRIPES = {
  backgroundImage:
    'repeating-linear-gradient(90deg, rgb(var(--c-brand)) 0 14px, rgb(var(--c-kerb-paint)) 14px 22px)',
};

/**
 * Four painted segments for the four wizard steps: done ones solid orange, the
 * current one striped like a kerb, the rest grey, each named underneath. Not
 * clickable (jumping between steps would change the flow). "Bước n/4 · …" is
 * always in the DOM: visible on phones, read out on wider screens.
 */
export function WizardProgress({ step }: { step: 1 | 2 | 3 | 4 }) {
  const total = WIZARD_STEPS.length;
  const current = WIZARD_STEPS[step - 1];
  return (
    <div className="flex flex-col gap-xs">
      <ol aria-label="Tiến độ đăng ký" className="grid grid-cols-4 gap-1.5">
        {WIZARD_STEPS.map((s, i) => {
          const n = i + 1;
          const state = n < step ? 'done' : n === step ? 'current' : 'todo';
          return (
            <li
              key={s.short}
              aria-current={state === 'current' ? 'step' : undefined}
              className="min-w-0"
            >
              <span
                aria-hidden="true"
                className={`block h-2 rounded-[4px] ${
                  state === 'done'
                    ? 'bg-brand'
                    : state === 'todo'
                      ? 'bg-sunken'
                      : 'ring-1 ring-brand/40'
                }`}
                style={state === 'current' ? KERB_STRIPES : undefined}
              />
              <span
                className={`mt-1.5 hidden items-center gap-1 text-[13px] font-semibold leading-[18px] md:flex ${
                  state === 'current' ? 'text-text' : 'text-muted'
                }`}
              >
                {state === 'done' ? (
                  <Icon
                    name="check"
                    size={14}
                    color="currentColor"
                    className="shrink-0 text-tertiary"
                  />
                ) : null}
                <span className="truncate">{s.short}</span>
                {state === 'done' ? <span className="sr-only">(đã xong)</span> : null}
              </span>
              <span className="sr-only md:hidden">{s.short}</span>
            </li>
          );
        })}
      </ol>
      <p className="text-body-md font-semibold text-text md:sr-only">
        Bước {step}/{total} · {current?.full}
      </p>
    </div>
  );
}

/** Edit mode marker: the wizard is updating a file the ward already has. */
export function EditingBanner({ displayName }: { displayName: string }) {
  return (
    <div className="flex min-h-12 items-center gap-sm rounded-[14px] bg-[#EEF1F4] px-md py-sm text-[#2B3640] dark:bg-[#1D2833] dark:text-[#C5D0DA]">
      <Icon name="pencil-outline" size={20} color="currentColor" className="shrink-0" />
      <p title={displayName} className="min-w-0 truncate text-[15px] font-semibold">
        Đang cập nhật hồ sơ {displayName}
      </p>
    </div>
  );
}

/** Static reminder of how the draft is kept (findings A5); changes nothing. */
export function DraftNotice() {
  return (
    <p className="flex items-start gap-sm rounded-[14px] bg-secondary-bg px-md py-sm text-body-md text-on-secondary">
      <Icon name="information-outline" size={18} color="currentColor" className="mt-0.5 shrink-0" />
      <span>
        Thông tin bạn điền được giữ tạm trên trang này. Tải lại hoặc đóng trang sẽ mất phần đã điền.
      </span>
    </p>
  );
}

/** The one question a step asks, in signage type. */
export function WizardQuestion({
  id,
  children,
  hint,
}: {
  id?: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2
        id={id}
        className="font-sign text-[24px] font-extrabold leading-[30px] tracking-[-0.015em] text-text md:text-[30px] md:leading-[36px]"
      >
        {children}
      </h2>
      {hint ? <p className="text-body-lg text-muted">{hint}</p> : null}
    </div>
  );
}

/** A bordered, titled panel for the side column of a wizard step. */
export function AsidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border">
      <h3 className="text-headline-md text-text">{title}</h3>
      {children}
    </section>
  );
}
