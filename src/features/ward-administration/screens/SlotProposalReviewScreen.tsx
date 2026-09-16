import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { AiHint } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { env } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';

export function SlotProposalReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const slot = useMockDb((s) => s.slots.find((sl) => sl.id === id));
  const reviewProposal = useMockDb((s) => s.reviewSlotProposal);

  if (!slot) return <ErrorState message="Không tìm thấy đề xuất." />;

  const act = (approve: boolean) => {
    reviewProposal(slot.id, approve);
    showToast(approve ? 'Đã thêm ô vào lưới' : 'Đã từ chối đề xuất');
    navigate(-1);
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="flex-1">
            <Button label="Từ chối" variant="danger" onPress={() => act(false)} />
          </div>
          <div className="flex-1">
            <Button label="Thêm vào lưới" variant="approve" onPress={() => act(true)} />
          </div>
        </StickyActions>
      }
    >
      <AppHeader title="Đề xuất ô mới" back subtitle={slot.street} />

      {env.enableAiCompliance ? (
        <AiHint title="Ước tính khả thi từ ảnh/toạ độ">
          Vị trí nằm trong ranh giới phường (đã xác minh toạ độ). Bề rộng vỉa hè còn lại ước tính
          đạt chuẩn hành lang đi bộ tối thiểu 1.5m.
        </AiHint>
      ) : null}

      <Card padded={false}>
        <div className="px-md">
          <ListRow title="Diện tích ước tính" subtitle={`${slot.size_m2} m²`} />
          <Divider />
          <ListRow title="Toạ độ" subtitle={`${slot.lat.toFixed(4)}, ${slot.lng.toFixed(4)}`} />
        </div>
      </Card>

      <Card>
        <p className="mb-xs text-body-sm text-muted">Ảnh vị trí</p>
        <div className="h-[120px] w-[120px] rounded-sm border border-border bg-bg" />
      </Card>
    </Screen>
  );
}
