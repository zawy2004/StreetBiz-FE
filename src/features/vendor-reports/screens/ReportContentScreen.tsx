import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { showToast } from '@/components/feedback';
import { Screen, StickyActions } from '@/components/layout';
import { appendPhrase } from '@/features/buyer-discovery/append-phrase';
import { BuyerPageHeader } from '@/features/vendor-map/components/BuyerPageHeader';
import { NoteArea } from '@/features/vendor-map/components/NoteArea';
import { PhraseChips } from '@/features/vendor-map/components/PhraseChips';
import { useMockDb } from '@/mocks/db';
import { ChannelNote, ReportTargetCard } from '../components/ContentReportParts';

type ContentType = 'STOREFRONT' | 'MENU_ITEM' | 'REVIEW';

const REASONS = [
  'Thông tin sai sự thật',
  'Hình ảnh không phù hợp',
  'Nội dung xúc phạm',
  'Giá không đúng',
  'Spam/quảng cáo',
];

/**
 * A small flag on a piece of content: what is being reported, why (quick
 * reasons or one's own words), and which channel is for what. One narrow column.
 */
export function ReportContentScreen() {
  const [searchParams] = useSearchParams();
  const contentType = searchParams.get('contentType') as ContentType;
  const targetId = searchParams.get('targetId') ?? '';
  const navigate = useNavigate();
  const reportContent = useMockDb((s) => s.reportContent);
  const [reason, setReason] = useState('');

  return (
    <Screen
      width="narrow"
      footer={
        <StickyActions>
          <Button
            label="Gửi báo cáo"
            variant="danger"
            disabled={!reason.trim()}
            onPress={() => {
              reportContent({ content_type: contentType, targetId, reason });
              showToast('Đã gửi báo cáo tới quản trị viên');
              navigate(-1);
            }}
          />
        </StickyActions>
      }
    >
      <div className="flex w-full max-w-[560px] flex-col gap-lg">
        <BuyerPageHeader title="Báo cáo nội dung" />
        <ReportTargetCard contentType={contentType} targetId={targetId} />
        <section aria-labelledby="reason-title" className="flex flex-col gap-sm">
          <h2
            id="reason-title"
            className="font-editorial text-[22px] font-semibold leading-tight text-text"
          >
            Vì sao bạn báo cáo?
          </h2>
          <PhraseChips
            label="Lý do thường gặp"
            phrases={REASONS}
            text={reason}
            onPick={(phrase) => setReason(appendPhrase(reason, phrase))}
            wrap
          />
          <NoteArea
            label="Lý do báo cáo"
            value={reason}
            onChangeText={setReason}
            placeholder="VD: Thông tin sai sự thật, hình ảnh không phù hợp..."
            counter={`${reason.length} ký tự`}
            maxRows={12}
          />
        </section>
        <ChannelNote />
      </div>
    </Screen>
  );
}
