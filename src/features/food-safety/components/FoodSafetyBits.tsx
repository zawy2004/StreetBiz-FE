import { Icon } from '@/components/common';
import { StatusChip } from '@/components/status';
import type { FoodSafetyApplication } from '@/core/api/food-safety-api';
import type { DishFoodSafetyStatus } from '@/core/api/seller-store-api';
import { colors } from '@/theme';
import { formatDay } from '../format';

/** Where one dish stands with ATTP, on the vendor's menu. */
export function DishFoodSafetyChip({
  status,
  expiresOn,
}: {
  status: DishFoodSafetyStatus;
  expiresOn?: string | null;
}) {
  switch (status) {
    case 'APPROVED':
      return <StatusChip label={`Đạt ATTP đến ${formatDay(expiresOn)}`} tone="ok" />;
    case 'PENDING':
      return <StatusChip label="Chờ duyệt ATTP" tone="pending" />;
    case 'MISSING':
      return <StatusChip label="Cần giấy ATTP" tone="danger" />;
    default:
      return null;
  }
}

/** "Đạt ATTP" mark buyers see next to a certified dish. */
export function FoodSafetyBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-tint-tertiary px-2 py-0.5 text-body-xs font-semibold text-tertiary">
      <Icon name="shield-check-outline" size={14} color={colors.tertiary} />
      Đạt ATTP
    </span>
  );
}

const STEPS = ['Gửi phường', 'Chuyển cục ATTP', 'Có kết quả'] as const;

function reachedStep(application: FoodSafetyApplication): number {
  switch (application.status) {
    case 'FORWARDED':
      return 1;
    case 'APPROVED':
      return 2;
    case 'REJECTED':
      // Rejected by the ward (never forwarded) or by the department.
      return application.forwardedAt ? 2 : 0;
    default:
      return 0;
  }
}

/** The three hops of an ATTP file: vendor → ward → department → result back to the vendor. */
export function FoodSafetySteps({ application }: { application: FoodSafetyApplication }) {
  const reached = reachedStep(application);
  const failed = application.status === 'REJECTED';
  return (
    <ol className="flex items-center gap-xs" aria-label="Tiến trình hồ sơ ATTP">
      {STEPS.map((label, index) => {
        const done = index <= reached;
        const tone = failed && index === reached ? 'bg-error' : done ? 'bg-tertiary' : 'bg-border';
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col gap-1">
            <span className={`h-1.5 rounded-full ${tone}`} />
            <span className={`truncate text-body-xs ${done ? 'text-text' : 'text-muted'}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
