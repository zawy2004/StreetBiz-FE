import type { RentalApplication } from '@/core/api/side-api';
import { Callout } from './Callout';
import { needsMoreInformation } from '../my-slots-view';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

type Props = { app: Pick<RentalApplication, 'applicationStatus' | 'reviewDecisionReason' | 'reviewedAt'> };

/** What the ward said about an application, when it said something worth showing. */
export function ApplicationNote({ app }: Props) {
  if (needsMoreInformation(app.applicationStatus)) {
    return (
      <Callout tone="pending">
        <strong>Phường yêu cầu:</strong> {app.reviewDecisionReason ?? 'Bổ sung thông tin cho hồ sơ.'}
      </Callout>
    );
  }
  if (app.applicationStatus === 'REJECTED') {
    return (
      <Callout tone="danger" icon="close-circle-outline">
        <strong>Lý do từ chối:</strong> {app.reviewDecisionReason ?? 'Phường không nêu lý do.'}
      </Callout>
    );
  }
  if (app.applicationStatus === 'APPROVED' && app.reviewedAt) {
    return <Callout tone="ok">Phường đã duyệt đơn ngày {formatDate(app.reviewedAt)}.</Callout>;
  }
  return null;
}
