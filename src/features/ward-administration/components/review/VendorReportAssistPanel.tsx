import { Button, Icon } from '@/components/common';
import { AiHint } from '@/components/status';
import type { VendorReportAssist } from '@/core/api/ai-api';
import {
  flagLabel,
  PERMIT_VISIBLE_LABELS,
  permitSentence,
} from '../../vendor-report-view';
import { ToneBox } from './Primitives';

/**
 * AIB-01: the system's notes beside a citizen report. The permit check is computed from the permit
 * and contract records; the signage and place are read off the photo by a model and are only
 * suggestions. Nothing here accepts, rejects or closes the report: that stays with the officer.
 */
export function VendorReportAssistPanel({
  assist,
  hasPhoto,
  running,
  error,
  onRun,
}: {
  assist: VendorReportAssist;
  hasPhoto: boolean;
  running: boolean;
  error: string | null;
  onRun: () => void;
}) {
  return (
    <section aria-labelledby="report-assist-title" className="flex flex-col gap-sm">
      <h2 id="report-assist-title" className="font-heading text-[19px] font-bold text-text">
        Ghi chú của hệ thống
      </h2>

      {assist.flags.length > 0 ? (
        <ul aria-label="Điểm cần lưu ý" className="flex flex-col gap-xs">
          {assist.flags.map((flag) => {
            const { label, tone } = flagLabel(flag);
            return (
              <li key={flag}>
                <ToneBox tone={tone} title={label} />
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="rounded-[16px] bg-card p-md ring-1 ring-border">
        <h3 className="text-label font-semibold text-text">Kiểm tra giấy phép</h3>
        <p className="mt-xs text-body-md text-text/80">
          {assist.permitCheck
            ? permitSentence(assist.permitCheck)
            : 'Phản ánh này không kèm mã QR giấy phép nào đã quét.'}
        </p>
      </div>

      {assist.aiAvailable ? (
        <AiHint title="Đọc từ ảnh">
          <dl className="flex flex-col gap-xs">
            {assist.signageText ? (
              <div>
                <dt className="text-body-sm text-muted">Chữ trên biển hiệu</dt>
                <dd className="text-text">{assist.signageText}</dd>
              </div>
            ) : null}
            {assist.locationText ? (
              <div>
                <dt className="text-body-sm text-muted">Nơi nhận ra</dt>
                <dd className="text-text">{assist.locationText}</dd>
              </div>
            ) : null}
            {assist.permitVisible ? (
              <div>
                <dt className="text-body-sm text-muted">Giấy phép trong ảnh</dt>
                <dd className="text-text">
                  {PERMIT_VISIBLE_LABELS[assist.permitVisible] ?? assist.permitVisible}
                </dd>
              </div>
            ) : null}
            {assist.description ? (
              <div>
                <dt className="text-body-sm text-muted">Mô tả</dt>
                <dd className="text-text">{assist.description}</dd>
              </div>
            ) : null}
          </dl>
          {assist.generatedAt ? (
            <p className="mt-xs text-body-sm text-muted">
              Đọc lúc {new Date(assist.generatedAt).toLocaleString('vi-VN')}
            </p>
          ) : null}
        </AiHint>
      ) : (
        <p role="status" className="text-body-md text-muted">
          {hasPhoto
            ? 'Chưa có phân tích từ ảnh. Bạn có thể yêu cầu hệ thống đọc ảnh.'
            : 'Phản ánh không có ảnh nên chưa có gì để đọc.'}
        </p>
      )}

      {hasPhoto ? (
        <div>
          <Button
            label={assist.aiAvailable ? 'Đọc lại ảnh' : 'Phân tích ảnh bằng AI'}
            variant="outline"
            size="sm"
            fullWidth={false}
            icon={<Icon name="creation" size={16} color="currentColor" weight="fill" />}
            loading={running}
            onPress={onRun}
          />
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-body-sm font-medium text-error">
          {error}
        </p>
      ) : null}

      <p className="text-body-sm text-muted">{assist.disclaimer}</p>
    </section>
  );
}
