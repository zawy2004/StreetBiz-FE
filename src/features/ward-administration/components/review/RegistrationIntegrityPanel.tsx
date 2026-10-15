import { Link } from 'react-router-dom';

import type { StatusTone } from '@/theme';
import {
  useRegistrationIntegrity,
  type IntegrityFlag,
  type IntegritySeverity,
  type RelatedRegistration,
} from '../../ward-integrity-api';
import { ToneBox } from './Primitives';

const SEVERITY: Record<IntegritySeverity, { tone: StatusTone; label: string }> = {
  HIGH: { tone: 'danger', label: 'Mức cao' },
  MEDIUM: { tone: 'pending', label: 'Mức trung bình' },
  LOW: { tone: 'neutral', label: 'Mức thấp' },
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã nộp',
  UNDER_REVIEW: 'Đang xem xét',
  MORE_INFORMATION_REQUIRED: 'Cần bổ sung',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  WITHDRAWN: 'Đã rút',
};

function Related({ item }: { item: RelatedRegistration }) {
  const status = STATUS_LABEL[item.status] ?? item.status;
  const where = `${item.wardName} · ${status}${item.note ? ` · ${item.note}` : ''}`;
  // Another ward's household has no name or id here: the officer is told where to ask, no more.
  if (item.registrationId === null || item.businessName === null) {
    return <li className="text-body-sm">Hồ sơ ở {where}</li>;
  }
  return (
    <li className="text-body-sm">
      <Link
        to={`/ward/inbox/registrations/${item.registrationId}`}
        className="font-semibold underline underline-offset-2"
      >
        {item.businessName}
      </Link>{' '}
      <span className="opacity-80">({where})</span>
    </li>
  );
}

function Flag({ flag }: { flag: IntegrityFlag }) {
  const severity = SEVERITY[flag.severity];
  return (
    <ToneBox
      tone={severity.tone}
      title={
        <span>
          {flag.title}{' '}
          <span className="ml-1 rounded-full bg-black/10 px-xs py-0.5 align-middle text-[12px] font-semibold dark:bg-white/15">
            {severity.label}
          </span>
        </span>
      }
    >
      <p>{flag.detail}</p>
      {flag.related.length > 0 ? (
        <ul className="mt-xs flex list-disc flex-col gap-0.5 pl-md">
          {flag.related.map((item, index) => (
            <Related key={`${item.registrationId ?? 'other'}-${index}`} item={item} />
          ))}
        </ul>
      ) : null}
    </ToneBox>
  );
}

/**
 * AIC-03: has this CCCD or address been filed through another account, is the account filing in a
 * burst, is the same person competing with themselves for a slot. A warning to look into, never a
 * verdict (BR-41): the officer decides, and a failed check simply leaves the panel out.
 */
export function RegistrationIntegrityPanel({ registrationId }: { registrationId: string }) {
  const { data, isLoading, isError } = useRegistrationIntegrity(registrationId);

  if (isLoading || isError || !data) return null;

  if (data.flags.length === 0) {
    return data.hasIdNumber ? (
      <ToneBox tone="ok" title="Không phát hiện hồ sơ trùng lặp">
        Số CCCD, địa chỉ và lịch sử nộp hồ sơ không trùng với hồ sơ của tài khoản khác.
      </ToneBox>
    ) : (
      <ToneBox tone="neutral" title="Chưa đối chiếu được hồ sơ trùng lặp">
        Hồ sơ chưa có số CCCD nên chưa thể so với hồ sơ khác. Chạy bóc tách CCCD hoặc yêu cầu hộ kinh
        doanh bổ sung số CCCD.
      </ToneBox>
    );
  }

  return (
    <section aria-label="Đối chiếu hồ sơ trùng lặp" className="flex flex-col gap-sm">
      <h3 className="text-headline-sm font-semibold text-text">
        Đối chiếu hồ sơ trùng lặp ({data.flags.length} cảnh báo)
      </h3>
      {data.flags.map((flag) => (
        <Flag key={flag.code} flag={flag} />
      ))}
      <p className="text-body-xs text-muted">{data.basis}</p>
    </section>
  );
}
