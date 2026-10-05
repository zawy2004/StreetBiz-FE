import type { RegistrationStatus } from '@/core/api';

type Props = {
  status: RegistrationStatus;
  createdAt: string;
  reviewedAt: string | null;
};

type Stage = { key: string; title: string; note?: string; state: 'done' | 'current' | 'todo' | 'stopped' };

const date = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/** Where a registration is on its way to a decision, read from its status and the dates we hold. */
function buildStages({ status, createdAt, reviewedAt }: Props): Stage[] {
  const filed = status !== 'DRAFT';
  const inReview = ['UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED'].includes(status);
  const decided = ['APPROVED', 'REJECTED'].includes(status);

  const stages: Stage[] = [
    {
      key: 'draft',
      title: 'Soạn hồ sơ',
      note: `Tạo ngày ${date(createdAt)}`,
      state: filed ? 'done' : 'current',
    },
    {
      key: 'filed',
      title: 'Nộp cho phường',
      state: !filed ? 'todo' : status === 'SUBMITTED' ? 'current' : 'done',
    },
    {
      key: 'review',
      title: status === 'MORE_INFORMATION_REQUIRED' ? 'Phường yêu cầu bổ sung' : 'Phường xem xét',
      note: status === 'MORE_INFORMATION_REQUIRED' ? 'Cập nhật hồ sơ rồi gửi lại' : undefined,
      state: decided ? 'done' : inReview ? 'current' : 'todo',
    },
    {
      key: 'result',
      title: status === 'REJECTED' ? 'Bị từ chối' : status === 'APPROVED' ? 'Đã được duyệt' : 'Kết quả',
      note: reviewedAt && decided ? `Ngày ${date(reviewedAt)}` : undefined,
      state: decided ? 'done' : 'todo',
    },
  ];

  // A withdrawn file stops where it was; show that rather than a path that no longer leads anywhere.
  if (status === 'WITHDRAWN') {
    return [
      { ...stages[0]!, state: 'done' },
      { key: 'withdrawn', title: 'Đã rút hồ sơ', state: 'stopped' },
    ];
  }
  return stages;
}

const DOT: Record<Stage['state'], string> = {
  done: 'bg-primary border-primary',
  current: 'bg-card border-primary ring-4 ring-[rgb(var(--c-primary)/0.18)]',
  todo: 'bg-card border-border',
  stopped: 'bg-muted border-muted',
};

export function RegistrationTimeline(props: Props) {
  const stages = buildStages(props);
  return (
    <ol aria-label="Tiến trình hồ sơ" className="flex flex-col">
      {stages.map((stage, index) => (
        <li
          key={stage.key}
          aria-current={stage.state === 'current' ? 'step' : undefined}
          className="flex gap-sm"
        >
          <div className="flex flex-col items-center">
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${DOT[stage.state]}`} />
            {index < stages.length - 1 ? (
              <span className={`w-0.5 flex-1 ${stage.state === 'done' ? 'bg-primary' : 'bg-border'}`} />
            ) : null}
          </div>
          <div className="pb-md">
            <p className={`text-body-md ${stage.state === 'todo' ? 'text-muted' : 'text-text'}`}>{stage.title}</p>
            {stage.note ? <p className="text-body-sm text-muted">{stage.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
