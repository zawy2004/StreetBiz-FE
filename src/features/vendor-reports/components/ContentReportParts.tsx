import { useEffect, useState } from 'react';

import { Icon, type IconName } from '@/components/common';

const TARGETS: Record<string, { label: string; icon: IconName }> = {
  STOREFRONT: { label: 'Quán', icon: 'storefront-outline' },
  MENU_ITEM: { label: 'Món', icon: 'silverware-fork-knife' },
  REVIEW: { label: 'Đánh giá', icon: 'comment-outline' },
};

/**
 * What is being reported, drawn as a small flag planted on it: a round tint
 * with the kind's glyph, the flag coming down at its edge as the screen opens,
 * the kind in the editorial face and its id in signage figures. An unknown or
 * missing kind reads "Nội dung".
 */
export function ReportTargetCard({
  contentType,
  targetId,
}: {
  contentType: string | null;
  targetId: string;
}) {
  const target = (contentType && TARGETS[contentType]) || {
    label: 'Nội dung',
    icon: 'flag-outline' as IconName,
  };
  const [planted, setPlanted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPlanted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="flex items-center gap-md rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:gap-lg md:p-lg">
      <div aria-hidden="true" className="relative shrink-0">
        <span className="sb-pop flex h-[72px] w-[72px] items-center justify-center rounded-full bg-tint-primary text-primary md:h-24 md:w-24">
          <Icon name={target.icon} size={36} color="currentColor" weight="duotone" />
        </span>
        <span
          className="absolute -right-2 -top-1 flex h-9 w-9 items-center justify-center rounded-full bg-card text-brand shadow-card transition-[transform,opacity] duration-[360ms] [transition-timing-function:var(--ease-out)]"
          style={{
            transform: planted ? 'translateY(0) rotate(0deg)' : 'translateY(-12px) rotate(-8deg)',
            opacity: planted ? 1 : 0,
          }}
        >
          <Icon name="flag-outline" size={20} color="currentColor" weight="fill" />
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body-sm font-medium text-muted">Đang báo cáo</span>
        <span className="font-editorial text-[28px] font-semibold leading-tight text-text">
          {target.label}
        </span>
        {targetId ? (
          <span className="truncate font-sign text-[16px] font-bold font-tabular text-text/80">
            Mã #{targetId}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Two channels, two jobs: the ward handles stalls on the pavement, the
 * platform's administrators handle what is shown on StreetBiz. Says where to
 * go for which, without claiming where this report ends up.
 */
export function ChannelNote() {
  return (
    <section
      aria-label="Gửi đúng nơi"
      className="flex flex-col gap-sm rounded-[20px] bg-sunken/70 p-md"
    >
      <div className="flex flex-wrap items-center gap-xs">
        <span className="kerb-tag">Phường: vỉa hè</span>
        <span className="inline-flex h-6 items-center rounded-[5px] bg-tint-accent px-2 text-[13px] font-bold text-on-secondary">
          Quản trị: nội dung
        </span>
      </div>
      <p className="text-body-md text-text/85">
        Nội dung sai trên StreetBiz thì báo ở đây. Quán bán sai chỗ, lấn vỉa hè thì dùng &ldquo;Báo
        cáo vi phạm&rdquo; trong hồ sơ hộ kinh doanh để gửi Phường.
      </p>
    </section>
  );
}
