import { Icon } from '@/components/common';
import type { StreetFeature } from '@/core/api/side-api';
import { alpha, colors } from '@/theme';
import { FEATURE_ICONS, FEATURE_LABELS } from '../slot-visuals';

type Props = { feature: StreetFeature };

/**
 * A technical corridor or piece of street furniture sitting in a row between
 * slots. One that blocks business is drawn as a no-go block and is not
 * clickable: no slot can be applied for there.
 */
export function FeatureCard({ feature }: Props) {
  const blocked = feature.blocksBusiness;
  const accent = blocked ? colors.error : colors.muted;

  return (
    <div
      data-testid={`feature-card-${feature.featureId}`}
      title={feature.note ?? feature.label}
      style={{
        backgroundColor: blocked ? colors.errorBg : colors.card,
        borderColor: blocked ? alpha(colors.error, 0.4) : colors.border,
      }}
      className="flex min-h-[124px] w-[104px] shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed p-xs text-center"
    >
      <Icon name={FEATURE_ICONS[feature.featureType]} size={24} color={accent} />
      <span className="text-body-sm font-semibold" style={{ color: blocked ? colors.error : colors.text }}>
        {feature.label || FEATURE_LABELS[feature.featureType]}
      </span>
      {blocked ? (
        <span className="rounded-sm bg-error px-1 text-badge text-white dark:text-[#1A0604]">CẤM KINH DOANH</span>
      ) : (
        <span className="text-badge text-muted">{FEATURE_LABELS[feature.featureType]}</span>
      )}
    </div>
  );
}
