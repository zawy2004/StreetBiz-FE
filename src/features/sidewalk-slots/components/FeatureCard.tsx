import { Icon } from '@/components/common';
import type { StreetFeature } from '@/core/api/side-api';
import { FEATURE_ICONS, FEATURE_LABELS } from '../slot-visuals';

type Props = { feature: StreetFeature };

/**
 * Street furniture or a technical corridor standing in a row between slots,
 * drawn as a small street sign with its pictogram. One that blocks business is
 * a red-hatched no-go block. Never a button: nothing can be applied for here.
 */
export function FeatureCard({ feature }: Props) {
  const blocked = feature.blocksBusiness;
  const label = feature.label || FEATURE_LABELS[feature.featureType];

  return (
    <div
      data-testid={`feature-card-${feature.featureId}`}
      title={feature.note ?? feature.label}
      className={[
        'relative flex min-h-[124px] w-[104px] shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-[12px] border-2 border-dashed p-xs text-center',
        blocked
          ? 'border-[#8F1717]/45 bg-[#FDEBEA] text-[#8F1717] dark:border-[#FF9A90]/45 dark:bg-[#3A1414] dark:text-[#FF9A90]'
          : 'border-border bg-card/80 text-muted',
      ].join(' ')}
    >
      {blocked ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,rgb(180_35_24/0.1)_0_6px,transparent_6px_14px)]"
        />
      ) : null}
      <span
        aria-hidden="true"
        className={`relative flex h-10 w-10 items-center justify-center rounded-full ${blocked ? 'bg-card text-[#8F1717] dark:text-[#FF9A90]' : 'bg-sunken text-text'}`}
      >
        <Icon
          name={FEATURE_ICONS[feature.featureType]}
          size={24}
          color="currentColor"
          weight="duotone"
        />
      </span>
      <span
        className={`relative line-clamp-2 text-body-xs font-semibold leading-tight ${blocked ? '' : 'text-text'}`}
      >
        {label}
      </span>
      {blocked ? (
        <span className="relative rounded-[5px] bg-error px-1.5 py-px text-badge text-white dark:text-[#1A0604]">
          CẤM KINH DOANH
        </span>
      ) : (
        <span className="relative text-badge text-muted">
          {FEATURE_LABELS[feature.featureType]}
        </span>
      )}
    </div>
  );
}
