import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { EmptyState, showToast } from '@/components/feedback';
import { SelectField } from '@/components/forms';
import { Screen, StickyActions } from '@/components/layout';
import { ApiError, commerceApi, errorMessage, type ContentReportReason } from '@/core/api';
import { BuyerPageHeader } from '@/features/vendor-map/components/BuyerPageHeader';
import { NoteArea } from '@/features/vendor-map/components/NoteArea';
import { useAuthStore } from '@/store/auth-store';
import { ChannelNote, ReportTargetCard } from '../components/ContentReportParts';

const REASONS: { value: ContentReportReason; label: string }[] = [
  { value: 'MISLEADING', label: 'Thông tin hoặc hình ảnh sai sự thật' },
  { value: 'INAPPROPRIATE', label: 'Nội dung phản cảm, xúc phạm' },
  { value: 'UNSAFE_OR_ILLEGAL', label: 'Món hàng không an toàn hoặc bị cấm' },
  { value: 'COUNTERFEIT', label: 'Hàng giả, gian lận' },
  { value: 'OTHER', label: 'Lý do khác' },
];

const DETAIL_MAX = 400;
const OTHER_MIN = 10;

/** What the customer sees for each refusal the server can give; anything else shows the server's own words. */
function submitError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      const minutes = Math.max(1, Math.ceil((error.retryAfterSeconds ?? 60) / 60));
      return `Bạn đã gửi quá nhiều báo cáo. Hãy thử lại sau khoảng ${minutes} phút.`;
    }
    if (error.status === 409) return 'Bạn đã báo cáo nội dung này, báo cáo đang được xem xét.';
    if (error.status === 404) return 'Nội dung này không còn hiển thị nên không thể báo cáo.';
  }
  return errorMessage(error);
}

/**
 * REV-03 against the real API: report a storefront or a dish to the platform's moderators. The
 * page is reached from the storefront and dish pages with the kind, id and name in the address.
 * A guest is asked to sign in first (AS-03).
 */
export function LiveReportContentScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const contentType = params.get('contentType');
  const targetId = Number(params.get('targetId'));
  const name = params.get('name')?.trim() ?? '';
  const [reason, setReason] = useState<ContentReportReason>();
  const [detail, setDetail] = useState('');

  const valid =
    (contentType === 'STOREFRONT' || contentType === 'MENU_ITEM') &&
    Number.isSafeInteger(targetId) &&
    targetId > 0;
  const submit = useMutation({
    mutationFn: () => {
      const input = { reasonCode: reason!, detail: detail.trim() || null };
      return contentType === 'STOREFRONT'
        ? commerceApi.reportStorefront(targetId, input)
        : commerceApi.reportMenuItem(targetId, input);
    },
    onSuccess: () => {
      showToast('Đã gửi báo cáo tới quản trị viên');
      navigate(-1);
    },
  });

  if (!valid) {
    return (
      <Screen width="narrow">
        <BuyerPageHeader title="Báo cáo nội dung" />
        <EmptyState
          icon="flag-outline"
          title="Không xác định được nội dung cần báo cáo"
          description="Hãy mở quán hoặc món muốn báo cáo rồi chọn “Báo cáo”."
          action={<Button label="Về trang khám phá" fullWidth={false} onPress={() => navigate('/customer/explore')} />}
        />
      </Screen>
    );
  }
  if (!user) {
    return (
      <Screen width="narrow">
        <BuyerPageHeader title="Báo cáo nội dung" />
        <EmptyState
          icon="account-outline"
          title="Đăng nhập để báo cáo"
          description="Báo cáo gắn với tài khoản của bạn để quản trị viên có thể xác minh và tránh báo cáo lặp."
          action={<Button label="Đăng nhập" fullWidth={false} onPress={() => navigate('/auth/sign-in')} />}
        />
      </Screen>
    );
  }

  const trimmed = detail.trim();
  const needsDetail = reason === 'OTHER';
  const detailError =
    needsDetail && trimmed.length < OTHER_MIN
      ? `Hãy mô tả lý do, tối thiểu ${OTHER_MIN} ký tự.`
      : undefined;
  const canSend = Boolean(reason) && !detailError && !submit.isPending;

  return (
    <Screen
      width="narrow"
      footer={
        <StickyActions>
          <Button
            label="Gửi báo cáo"
            variant="danger"
            disabled={!canSend}
            loading={submit.isPending}
            onPress={() => submit.mutate()}
          />
        </StickyActions>
      }
    >
      <div className="flex w-full max-w-[560px] flex-col gap-lg">
        <BuyerPageHeader title="Báo cáo nội dung" />
        <ReportTargetCard contentType={contentType} targetId={String(targetId)} name={name} />
        <section aria-labelledby="reason-title" className="flex flex-col gap-sm">
          <h2
            id="reason-title"
            className="font-editorial text-[22px] font-semibold leading-tight text-text"
          >
            Vì sao bạn báo cáo?
          </h2>
          <SelectField
            label="Lý do"
            layout="inline"
            value={reason}
            onChange={(value) => {
              submit.reset();
              setReason(value);
            }}
            options={REASONS}
          />
          <NoteArea
            label={needsDetail ? 'Mô tả lý do (bắt buộc)' : 'Mô tả thêm (không bắt buộc)'}
            value={detail}
            onChangeText={(value) => {
              submit.reset();
              setDetail(value.slice(0, DETAIL_MAX));
            }}
            placeholder="VD: Ảnh trên trang không đúng món đang bán."
            counter={`${detail.length}/${DETAIL_MAX} ký tự`}
            maxRows={8}
          />
          {reason && detailError ? (
            <p className="text-body-sm text-muted">{detailError}</p>
          ) : null}
          {submit.isError ? (
            <p role="alert" className="text-body-md font-medium text-error">
              {submitError(submit.error)}
            </p>
          ) : null}
        </section>
        <ChannelNote />
      </div>
    </Screen>
  );
}
