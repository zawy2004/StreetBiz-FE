import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import {
  ActionChoice,
  AfterConfirmList,
  ReasonMeter,
  ReasonTemplates,
  StampPreview,
} from '../components/ops/permit-action/PermitActionParts';
import { complianceApi } from '../ward-api';

type Action = 'SUSPEND' | 'REVOKE';

/**
 * W16: suspend or revoke a permit. The screen slows the officer down by one
 * beat: the chosen action is stamped on a faded permit, the reason has a
 * ruler, and what happens next is spelled out right above the one danger
 * button. The button itself is the confirmation (no dialog, as before).
 */
export function PermitActionScreen() {
  const { permitId } = useParams<{ permitId: string }>();
  const navigate = useNavigate();

  // Mock DB fallback
  const permit = useMockDb((s) => s.permits.find((p) => p.id === permitId));
  const vendors = useMockDb((s) => s.vendors);
  const contracts = useMockDb((s) => s.contracts);
  const slots = useMockDb((s) => s.slots);
  const suspend = useMockDb((s) => s.suspendPermit);
  const revoke = useMockDb((s) => s.revokePermit);

  const [action, setAction] = useState<Action>('SUSPEND');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [basedOnComplianceThreshold, setBasedOnComplianceThreshold] = useState(false);
  const reasonRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  if (!permit && !isLiveApi)
    return (
      <Screen width="narrow">
        <div className="mt-xl rounded-[28px] bg-card shadow-card ring-1 ring-border">
          <ErrorState message="Không tìm thấy giấy phép." />
        </div>
      </Screen>
    );
  const contract = contracts.find((c) => c.id === permit?.contractId);
  const vendor = vendors.find((v) => v.id === contract?.vendorId);
  // Display only, mock store: the slot the permit's contract is for.
  const slot = slots.find((s) => s.id === contract?.slotId);

  const submit = async () => {
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length < 5 || trimmed.length > 500) {
      showToast('Vui lòng nhập lý do xử lý cụ thể (từ 5 đến 500 ký tự — BR-35)');
      return;
    }

    if (isLiveApi && permitId) {
      setLoading(true);
      try {
        const idNum = Number(permitId);
        await complianceApi.permitAction(idNum, action, trimmed, basedOnComplianceThreshold);
        showToast(
          action === 'SUSPEND'
            ? 'Đã tạm đình chỉ giấy phép sử dụng hè phố'
            : 'Đã thu hồi giấy phép sử dụng hè phố',
        );
        navigate(-1);
        return;
      } catch (err) {
        showToast(errorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Mock fallback
    if (permit) {
      if (action === 'SUSPEND') suspend(permit.id);
      else revoke(permit.id);
      showToast(action === 'SUSPEND' ? 'Đã tạm đình chỉ giấy phép' : 'Đã thu hồi giấy phép');
      navigate(-1);
    }
  };

  /** A sentence starter goes on the end of what is typed, and the caret follows it. */
  const insertTemplate = (text: string) => {
    const next = reason.trim() ? `${reason.trimEnd()} ${text}` : text;
    setReason(next);
    requestAnimationFrame(() => {
      const el = reasonRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.length, next.length);
    });
  };

  const permitLabel = `Giấy phép #${permitId}`;
  const spoken = `${action === 'SUSPEND' ? 'Sẽ tạm đình chỉ' : 'Sẽ thu hồi vĩnh viễn'} giấy phép #${permitId}`;

  return (
    <Screen
      width="default"
      footer={
        <StickyActions>
          <Button
            label={loading ? 'Đang xử lý...' : 'Xác nhận xử lý'}
            variant="danger"
            disabled={loading || reason.trim().length < 5}
            onPress={submit}
          />
        </StickyActions>
      }
    >
      <AppHeader
        title="Đình chỉ / Thu hồi giấy phép"
        subtitle={vendor?.business_name ?? `Giấy phép #${permitId} (WARD-13)`}
        back
      />

      {/* The current state stays one quiet line: in live mode it is not loaded, so it must not stand out. */}
      <div className="-mt-xs flex flex-wrap items-center gap-x-sm gap-y-1 text-body-sm text-muted">
        <span>Trạng thái giấy phép hiện tại</span>
        <StatusChip code={permit?.permit_status ?? 'ACTIVE'} />
        <span className="text-body-xs text-muted">Mã: {permitId}</span>
      </div>

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:gap-xl">
        <div className="xl:sticky xl:top-0">
          <StampPreview
            action={action}
            permitLabel={permitLabel}
            slotCode={slot?.slot_code ?? null}
            vendorName={vendor?.business_name ?? null}
            spoken={spoken}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-lg">
          <ActionChoice
            label="Hành động xử lý hành chính"
            value={action}
            onChange={setAction}
            busy={loading}
          />

          <div className="flex flex-col gap-sm [&_textarea]:text-[16px]">
            <TextField
              ref={reasonRef}
              label="Lý do xử lý bắt buộc (BR-35: 5 - 500 ký tự)"
              value={reason}
              onChangeText={setReason}
              multiline
              placeholder="Ghi rõ hành vi vi phạm, số biên bản hoặc căn cứ pháp lý để đình chỉ / thu hồi..."
            />
            <ReasonMeter length={reason.trim().length} />
            <ReasonTemplates onPick={insertTemplate} />
          </div>

          {action === 'REVOKE' && (
            <label className="sb-pop flex min-h-12 cursor-pointer items-start gap-sm rounded-[16px] bg-card p-md ring-1 ring-inset ring-border">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#B42318]"
                checked={basedOnComplianceThreshold}
                onChange={(e) => setBasedOnComplianceThreshold(e.target.checked)}
              />
              <span className="text-body-md text-text">
                Thu hồi dựa trên đề xuất đạt ngưỡng vi phạm (từ màn hình chi tiết vi phạm) — ghi rõ
                trong nhật ký để phân biệt với quyết định độc lập của cán bộ.
              </span>
            </label>
          )}

          <AfterConfirmList
            footnote={
              <>
                * Căn cứ BR-19 &amp; BR-35: Ngay sau khi quyết định có hiệu lực, Giấy phép số QR sẽ
                lập tức chuyển sang trạng thái tương ứng trên máy chủ, người dân và lực lượng tuần
                tra quét mã sẽ thấy cảnh báo không hợp lệ.
              </>
            }
          />
        </div>
      </div>
    </Screen>
  );
}
