import { useState } from 'react';

import { Button, Card } from '@/components/common';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, showToast } from '@/components/feedback';
import { env } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';

type Tab = 'CONTENT' | 'COMPLAINTS';

const CONTENT_LABEL: Record<string, string> = {
  STOREFRONT: 'Gian hàng',
  MENU_ITEM: 'Món ăn',
  REVIEW: 'Đánh giá',
};

export function ModerationScreen() {
  const [tab, setTab] = useState<Tab>('CONTENT');
  const reportedContent = useMockDb((s) => s.reportedContent);
  const moderateContent = useMockDb((s) => s.moderateContent);
  const complaints = useMockDb((s) => s.complaints);
  const resolveComplaint = useMockDb((s) => s.resolveComplaint);

  if (!env.enablePhase2) {
    return (
      <Screen>
        <AppHeader title="Kiểm duyệt" />
        <EmptyState icon="shield-check-outline" title="Tính năng thuộc Phase 2" />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Kiểm duyệt" />
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'CONTENT', label: 'Nội dung bị báo cáo' },
          { value: 'COMPLAINTS', label: 'Khiếu nại đơn hàng' },
        ]}
      />

      {tab === 'CONTENT' ? (
        reportedContent.length === 0 ? (
          <EmptyState icon="flag-outline" title="Không có nội dung bị báo cáo" />
        ) : (
          reportedContent.map((r) => (
            <Card key={r.id}>
              <div className="flex justify-between">
                <span className="text-headline-sm text-text">{CONTENT_LABEL[r.content_type]}</span>
                <StatusChip code={r.status} />
              </div>
              <p className="mt-1 text-body-md text-muted">{r.reason}</p>
              {r.status === 'PENDING' ? (
                <div className="mt-sm flex gap-sm">
                  <div className="flex-1">
                    <Button
                      label="Bỏ qua"
                      variant="outline"
                      onPress={() => moderateContent(r.id, false)}
                    />
                  </div>
                  <div className="flex-1">
                    <Button
                      label="Ẩn nội dung"
                      variant="danger"
                      onPress={() => moderateContent(r.id, true)}
                    />
                  </div>
                </div>
              ) : null}
            </Card>
          ))
        )
      ) : complaints.length === 0 ? (
        <EmptyState icon="chat-alert-outline" title="Không có khiếu nại nào" />
      ) : (
        complaints.map((c) => (
          <Card key={c.id}>
            <div className="flex justify-between">
              <span className="text-headline-sm text-text">{c.complaint_type}</span>
              <StatusChip code={c.status} />
            </div>
            <p className="mt-1 text-body-md text-muted">{c.description}</p>
            {c.status === 'PENDING' ? (
              <Button
                label="Đánh dấu đã xử lý"
                variant="approve"
                onPress={() => {
                  resolveComplaint(c.id);
                  showToast('Đã xử lý khiếu nại');
                }}
              />
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
