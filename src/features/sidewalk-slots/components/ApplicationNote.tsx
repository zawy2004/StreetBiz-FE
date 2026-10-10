import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';
import { VERDICT_TONES, type VerdictTone } from '@/components/illustrations';
import type { RentalApplication } from '@/core/api/side-api';
import { needsMoreInformation } from '../my-slots-view';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

type Props = {
  app: Pick<RentalApplication, 'applicationStatus' | 'reviewDecisionReason' | 'reviewedAt'>;
  /** Cut a long reason to three lines on a list card; the detail page shows it whole. */
  clamp?: boolean;
};

/**
 * What the ward said about an application, when it said something worth
 * showing, written like a note slip with a small round ward stamp in its
 * corner: mango for a request, red for a refusal, green for an approval.
 */
export function ApplicationNote({ app, clamp = false }: Props) {
  if (needsMoreInformation(app.applicationStatus)) {
    return (
      <WardRemark tone={VERDICT_TONES.pending} icon="information-outline" clamp={clamp}>
        <strong>Phường yêu cầu:</strong>{' '}
        {app.reviewDecisionReason ?? 'Bổ sung thông tin cho hồ sơ.'}
      </WardRemark>
    );
  }
  if (app.applicationStatus === 'REJECTED') {
    return (
      <WardRemark tone={VERDICT_TONES.danger} icon="close-circle-outline" clamp={clamp}>
        <strong>Lý do từ chối:</strong> {app.reviewDecisionReason ?? 'Phường không nêu lý do.'}
      </WardRemark>
    );
  }
  if (app.applicationStatus === 'APPROVED' && app.reviewedAt) {
    return (
      <WardRemark tone={VERDICT_TONES.ok} icon="check-circle-outline" clamp={clamp}>
        Phường đã duyệt đơn ngày {formatDate(app.reviewedAt)}.
      </WardRemark>
    );
  }
  return null;
}

function WardRemark({
  tone,
  icon,
  clamp,
  children,
}: {
  tone: VerdictTone;
  icon: IconName;
  clamp: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role="note"
      className={`relative flex items-start gap-xs overflow-hidden rounded-[14px] py-sm pl-sm pr-[52px] text-body-sm ${tone.wash} ${tone.ink}`}
    >
      <Icon name={icon} size={18} color="currentColor" className="mt-px shrink-0" />
      <div className={`min-w-0 flex-1 ${clamp ? 'line-clamp-3' : ''}`}>{children}</div>
      <WardSeal className={`absolute right-2 top-1.5 h-9 w-9 -rotate-12 opacity-80 ${tone.ink}`} />
    </div>
  );
}

/** A tiny round "PHƯỜNG" stamp. Decoration only. */
function WardSeal({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className={className}>
      <circle cx="20" cy="20" r="17.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="20" r="12.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <text
        x="20"
        y="22.6"
        textAnchor="middle"
        fontSize="6.6"
        fontWeight="800"
        letterSpacing="0.3"
        fill="currentColor"
        className="font-sign"
      >
        PHƯỜNG
      </text>
    </svg>
  );
}
