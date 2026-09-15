import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card } from '@/components/common';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, showToast } from '@/components/feedback';
import { env } from '@/core/config/env';
import { colors, spacing, typography } from '@/theme';
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[typography.headlineSm, { color: colors.text }]}>
                  {CONTENT_LABEL[r.content_type]}
                </Text>
                <StatusChip code={r.status} />
              </View>
              <Text style={[typography.bodyMd, { color: colors.muted, marginTop: 4 }]}>
                {r.reason}
              </Text>
              {r.status === 'PENDING' ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Bỏ qua"
                      variant="outline"
                      onPress={() => moderateContent(r.id, false)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Ẩn nội dung"
                      variant="danger"
                      onPress={() => moderateContent(r.id, true)}
                    />
                  </View>
                </View>
              ) : null}
            </Card>
          ))
        )
      ) : complaints.length === 0 ? (
        <EmptyState icon="chat-alert-outline" title="Không có khiếu nại nào" />
      ) : (
        complaints.map((c) => (
          <Card key={c.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[typography.headlineSm, { color: colors.text }]}>
                {c.complaint_type}
              </Text>
              <StatusChip code={c.status} />
            </View>
            <Text style={[typography.bodyMd, { color: colors.muted, marginTop: 4 }]}>
              {c.description}
            </Text>
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
