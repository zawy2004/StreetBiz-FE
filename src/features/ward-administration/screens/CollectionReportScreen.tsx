import { Card, Money } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint } from '@/components/status';
import { env } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';

export function CollectionReportScreen() {
  const feeItems = useMockDb((s) => s.feeItems);
  const penalties = useMockDb((s) => s.penalties);
  const violations = useMockDb((s) => s.violations);

  const feeCollected = feeItems
    .filter((f) => f.item_status === 'PAID')
    .reduce((s, f) => s + f.amount, 0);
  const feePending = feeItems
    .filter((f) => f.item_status === 'PENDING')
    .reduce((s, f) => s + f.amount, 0);
  const penaltyCollected = penalties
    .filter((p) => p.penalty_status === 'PAID')
    .reduce((s, p) => s + p.amount, 0);
  const penaltyPending = penalties
    .filter((p) => p.penalty_status === 'PENDING')
    .reduce((s, p) => s + p.amount, 0);

  return (
    <Screen>
      <AppHeader title="Báo cáo thu phí" subtitle="Tháng hiện tại" />

      <div className="flex flex-row gap-sm">
        <Card style={{ flex: 1 }}>
          <p className="text-body-sm text-muted">Phí đã thu</p>
          <Money amountVnd={feeCollected} size="lg" />
        </Card>
        <Card style={{ flex: 1 }}>
          <p className="text-body-sm text-muted">Phạt đã thu</p>
          <Money amountVnd={penaltyCollected} size="lg" />
        </Card>
      </div>
      <div className="flex flex-row gap-sm">
        <Card style={{ flex: 1 }}>
          <p className="text-body-sm text-muted">Phí còn nợ</p>
          <Money amountVnd={feePending} />
        </Card>
        <Card style={{ flex: 1 }}>
          <p className="text-body-sm text-muted">Phạt còn nợ</p>
          <Money amountVnd={penaltyPending} />
        </Card>
      </div>

      {env.enableAiCompliance ? (
        <AiHint title="Tóm tắt tự động">
          Đã ghi nhận {violations.length} vi phạm trong tháng, chủ yếu là bày biện vượt vạch quy
          định. Tỷ lệ thu phí đúng hạn đạt mức khá; đề xuất nhắc thanh toán sớm hơn 3 ngày cho các
          hộ có lịch sử nộp trễ.
        </AiHint>
      ) : null}

      <Section title="Vi phạm gần đây">
        {violations.map((v) => (
          <Card key={v.id}>
            <p className="text-headline-sm text-text">{v.violation_type}</p>
            <p className="line-clamp-2 text-body-sm text-muted">{v.note}</p>
          </Card>
        ))}
      </Section>
    </Screen>
  );
}
