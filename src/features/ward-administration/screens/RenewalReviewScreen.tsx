import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, formatVnd, Icon, KerbTag, Money } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast, Skeleton } from '@/components/feedback';
import { isLiveApi } from '@/core/config/env';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import { useMockDb } from '@/mocks/db';
import { complianceApi, type WardRenewalDetail } from '../ward-api';
import { formatDateTimeVi, formatDueVi } from '../components/review/format';
import { DossierBlock, FactGrid, LegalNote } from '../components/review/Primitives';
import {
  ComplianceScorecard,
  ContractTimeline,
  DecisionDeskCard,
  DecisionRecord,
  FeeReceipt,
  PrerequisiteLock,
} from '../components/review/PermitDossierParts';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function vendorTypeLabel(type: string): string {
  return type === 'FIXED_STOREFRONT' ? 'Cửa hàng cố định' : 'Hàng rong lưu động';
}

const isReviewableRenewalStatus = (status: string) =>
  status === 'PENDING' || status === 'UNDER_REVIEW';

export function RenewalReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const mockRenewal = useMockDb((s) => s.renewals.find((r) => r.id === id));
  const mockContract = useMockDb((s) => s.contracts.find((c) => c.id === mockRenewal?.contractId));
  const mockSlot = useMockDb((s) => s.slots.find((sl) => sl.id === mockContract?.slotId));
  const approveMockRenewal = useMockDb((s) => s.approveRenewal);

  const [detail, setDetail] = useState<WardRenewalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isLiveApi || !id) return;
    setLoading(true);
    complianceApi
      .getRenewal(id)
      .then(setDetail)
      .catch((err) => {
        console.warn('Could not load live renewal detail, falling back to mock:', err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Where the decision desk goes: the right column on wide screens, the bottom bar
  // otherwise. Exactly one set of decision buttons is rendered at any time.
  const wide = useMediaQuery('(min-width: 1280px)');

  if (!mockRenewal && !detail && !loading) {
    return (
      <Screen>
        <ErrorState message="Không tìm thấy yêu cầu gia hạn tại địa bàn." />
        <div className="flex justify-center">
          <Button
            label="Quay lại"
            variant="outline"
            fullWidth={false}
            onPress={() => navigate(-1)}
          />
        </div>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen width="wide">
        <AppHeader title="Đang tải..." back />
        <div role="status" className="flex flex-col gap-lg">
          <span className="sr-only">Đang tải yêu cầu gia hạn…</span>
          <div className="flex flex-wrap gap-xs">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-36" />
          </div>
          <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-xl">
            <div className="flex flex-col gap-lg">
              <Skeleton className="h-[220px] rounded-[24px]" />
              <div className="grid grid-cols-2 gap-sm md:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-[92px] rounded-[16px]" />
                ))}
              </div>
            </div>
            <Skeleton className="h-[260px] rounded-[24px]" />
          </div>
        </div>
      </Screen>
    );
  }

  const status = detail?.status ?? mockRenewal?.renewal_status ?? 'PENDING';
  const isOpen = isReviewableRenewalStatus(status);
  const isDecided = status === 'APPROVED' || status === 'REJECTED';
  const vendorName = detail?.vendorName ?? 'Hộ kinh doanh';
  const vendorPhone = detail?.vendorPhone ?? '';
  const vendorType = detail?.vendorType ?? 'FIXED_STOREFRONT';
  const slotCode = detail?.slotCode ?? mockSlot?.slot_code ?? '';
  const slotStreet = detail?.slotStreet ?? mockSlot?.street ?? '';
  const slotWidth = detail?.slotWidth ?? 2;
  const slotLength = detail?.slotLength ?? 1.5;
  const pricePerDay = detail?.pricePerDay ?? 50000;
  const requestedTermDays = detail?.requestedTermDays ?? 30;
  const currentEndDate = detail?.currentEndDate ?? mockContract?.end_date ?? '';
  const proposedEndDate = detail?.proposedEndDate ?? mockRenewal?.new_end_date ?? '';
  const remainingDays = detail?.remainingDaysOnCurrentContract ?? 0;
  const totalEstimatedFee = detail?.totalEstimatedFee ?? pricePerDay * requestedTermDays;
  const contractId = detail?.contractId ?? mockRenewal?.contractId ?? '';
  const registrationStatus = detail?.registrationStatus ?? 'APPROVED';
  const canApprove = detail?.canApprove ?? true;
  const isFastTrack = detail?.isFastTrackEligible ?? false;
  const blockers = detail?.blockers ?? [];
  const scorecard = detail?.scorecard;
  const reviewReason = detail?.reviewReason;
  const reviewedBy = detail?.reviewedBy;
  const reviewedAt = detail?.reviewedAt;

  const act = async (decision: 'APPROVE' | 'REJECT') => {
    if (decision === 'REJECT' && !note.trim()) {
      showToast('Vui lòng nhập lý do từ chối gia hạn');
      return;
    }

    if (decision === 'APPROVE' && !canApprove) {
      showToast(blockers[0] || 'Chưa đủ điều kiện gia hạn');
      return;
    }

    if (isLiveApi && id) {
      try {
        setSubmitting(true);
        const result = await complianceApi.decideRenewal(
          id,
          decision,
          note.trim() || 'Đủ điều kiện gia hạn hợp đồng sử dụng tạm thời hè phố',
          status,
        );
        setDetail(result);
        showToast(
          decision === 'APPROVE'
            ? 'Đã phê duyệt gia hạn! Hợp đồng và giấy phép số QR đã tự động cập nhật thời hạn mới.'
            : 'Đã từ chối yêu cầu gia hạn.',
        );
        navigate(-1);
        return;
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Lỗi xử lý yêu cầu gia hạn');
        return;
      } finally {
        setSubmitting(false);
      }
    }

    // Mock fallback
    if (mockRenewal) {
      if (decision === 'APPROVE') {
        approveMockRenewal(mockRenewal.id);
        showToast('Đã duyệt gia hạn hợp đồng');
      } else {
        showToast('Đã từ chối gia hạn');
      }
      navigate(-1);
    }
  };

  // Display only: loaded fields the review now shows.
  const submittedAt = formatDateTimeVi(detail?.createdAt ?? mockRenewal?.requested_at);
  const due = isOpen && detail ? formatDueVi(detail.slaDueAt) : null;
  const overdue = isOpen && !!detail?.isOverdue;
  const registrationLink =
    isLiveApi && detail?.registrationId
      ? `/ward/inbox/registrations/${detail.registrationId}`
      : null;

  const receipt = (
    <FeeReceipt
      title="Dự toán phí gia hạn sử dụng hè phố"
      rows={[
        { label: 'Mức thu theo ngày:', value: <Money amountVnd={pricePerDay} /> },
        { label: 'Thời hạn gia hạn:', value: `${requestedTermDays} ngày` },
      ]}
      totalLabel="Tổng phí gia hạn dự kiến:"
      totalValue={formatVnd(totalEstimatedFee)}
      totalAria={`Tổng phí gia hạn dự kiến ${totalEstimatedFee.toLocaleString('vi-VN')} đồng`}
      footnotes={<p>Theo biểu giá khu vực Phường</p>}
    />
  );
  const noteField = isOpen ? (
    <TextField
      label="Ghi chú phản hồi / Căn cứ quyết định"
      value={note}
      onChangeText={setNote}
      multiline
      placeholder="Nhập ghi chú hoặc lý do từ chối gia hạn (bắt buộc khi từ chối)..."
    />
  ) : null;
  const approveIcon = (
    <Icon
      name={canApprove ? 'check-circle-outline' : 'lock-outline'}
      size={19}
      color="currentColor"
    />
  );
  const decisionRecord =
    isDecided && reviewReason ? (
      <DecisionRecord
        status={status}
        reason={reviewReason}
        officerLine={`Cán bộ: ${reviewedBy ?? '-'} · ${fmtDateTime(reviewedAt)}`}
      />
    ) : null;

  return (
    <Screen
      width="wide"
      footer={
        isOpen && !wide ? (
          <StickyActions>
            <div className="flex-1">
              <Button
                label="Từ chối"
                variant="danger"
                disabled={submitting}
                onPress={() => act('REJECT')}
              />
            </div>
            <div className="flex-1">
              <Button
                label="Duyệt gia hạn"
                variant="approve"
                icon={approveIcon}
                disabled={!canApprove || submitting}
                onPress={() => act('APPROVE')}
              />
            </div>
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader
        title={`Gia hạn · Ô ${slotCode}`}
        subtitle={`Hợp đồng #${contractId} · WARD-09`}
        back
      />

      {/* Status row */}
      <div className="flex flex-wrap items-center gap-xs">
        <StatusChip code={status} />
        <StatusChip label={vendorTypeLabel(vendorType)} tone="neutral" />
        {isFastTrack ? <StatusChip label="[AI] Đủ điều kiện xét nhanh" tone="ok" /> : null}
        {remainingDays <= 7 && remainingDays > 0 ? (
          <StatusChip label={`Còn ${remainingDays} ngày`} tone="pending" />
        ) : null}
        {remainingDays <= 0 && isOpen ? <StatusChip label="Đã hết hạn" tone="danger" /> : null}
        {overdue ? <StatusChip label="Quá hạn xử lý" tone="danger" /> : null}
        {due && !overdue ? (
          <span className="flex items-center gap-1 text-body-sm font-medium text-text/80">
            <Icon name="timer-outline" size={15} color="currentColor" />
            {due}
          </span>
        ) : null}
        {submittedAt ? (
          <span className="flex items-center gap-1 text-body-sm text-muted">
            <Icon name="clock-outline" size={15} color="currentColor" />
            Nộp lúc <span className="font-tabular">{submittedAt}</span>
          </span>
        ) : null}
      </div>

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-lg">
          {/* Contract term ruler */}
          <section
            aria-labelledby="renewal-term-title"
            className="flex flex-col gap-md rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
          >
            <div className="flex flex-wrap items-center justify-between gap-xs">
              <h2 id="renewal-term-title" className="font-sign text-[19px] font-bold text-text">
                Thời hạn gia hạn đề nghị
              </h2>
              {slotCode ? <KerbTag code={slotCode} place={slotStreet} /> : null}
            </div>
            <ContractTimeline
              currentEnd={currentEndDate}
              proposedEnd={proposedEndDate}
              currentLabel={fmtDate(currentEndDate)}
              proposedLabel={fmtDate(proposedEndDate)}
              remainingDays={remainingDays}
              termDays={requestedTermDays}
              isOpen={isOpen}
            />
            <dl className="grid grid-cols-2 gap-sm border-t border-border pt-md md:grid-cols-4">
              <div>
                <dt className="text-body-sm text-muted">Hết hạn hiện tại</dt>
                <dd className="font-sign text-[18px] font-bold text-text font-tabular">
                  {fmtDate(currentEndDate)}
                </dd>
              </div>
              <div>
                <dt className="text-body-sm text-muted">Hết hạn mới (đề nghị)</dt>
                <dd className="font-sign text-[18px] font-bold text-[#8A3200] font-tabular dark:text-[#FFB98A]">
                  {fmtDate(proposedEndDate)}
                </dd>
              </div>
              <div>
                <dt className="text-body-sm text-muted">Thời hạn gia hạn thêm</dt>
                <dd className="font-sign text-[18px] font-bold text-text font-tabular">
                  +{requestedTermDays} ngày
                </dd>
              </div>
              {remainingDays > 0 ? (
                <div>
                  <dt className="text-body-sm text-muted">Còn lại trên hợp đồng hiện tại</dt>
                  <dd
                    className={`font-sign text-[18px] font-bold font-tabular ${remainingDays <= 7 ? 'text-[#8F1717] dark:text-[#FF9A90]' : 'text-text'}`}
                  >
                    {remainingDays} ngày
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          {/* Blocker alerts */}
          {blockers.length > 0 ? (
            <PrerequisiteLock title="Chưa đủ điều kiện gia hạn" blockers={blockers} />
          ) : null}

          {/* Vendor Compliance Scorecard */}
          {scorecard ? (
            <DossierBlock title="Lịch sử tuân thủ hộ kinh doanh" icon="shield-check-outline">
              <ComplianceScorecard
                clean={scorecard.isCleanRecord}
                cells={[
                  { label: 'Lần kiểm tra', value: scorecard.totalInspections },
                  {
                    label: 'Vi phạm',
                    value: scorecard.violationCount,
                    alert: scorecard.violationCount > 0,
                  },
                  {
                    label: 'Phạt chưa nộp',
                    value: scorecard.unpaidPenaltyCount,
                    alert: scorecard.unpaidPenaltyCount > 0,
                  },
                  {
                    label: 'Tổng tiền phạt',
                    value: (
                      <span className="text-[20px] md:text-[24px]">
                        {scorecard.totalPenaltyAmount > 0
                          ? `${scorecard.totalPenaltyAmount.toLocaleString('vi-VN')} đ`
                          : '0 đ'}
                      </span>
                    ),
                  },
                  { label: 'Phản ánh cộng đồng', value: scorecard.reportCount },
                  {
                    label: 'Trạng thái giấy phép',
                    value: (
                      <span className="block pt-1">
                        <StatusChip code={scorecard.currentPermitStatus} />
                      </span>
                    ),
                  },
                ]}
              />
            </DossierBlock>
          ) : null}

          {wide ? null : receipt}
          {wide ? null : decisionRecord}

          {/* Contract & Vendor Info */}
          <DossierBlock
            title="Thông tin hợp đồng & hộ kinh doanh"
            icon="storefront-outline"
            aside={
              registrationLink ? (
                <button
                  type="button"
                  onClick={() => navigate(registrationLink)}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full px-sm text-body-sm font-semibold text-indigo transition-colors hover:bg-tint-indigo"
                >
                  <Icon name="file-document-outline" size={16} color="currentColor" />
                  Mở hồ sơ điểm kinh doanh
                </button>
              ) : null
            }
          >
            <FactGrid
              columns={3}
              facts={[
                { label: 'Tên hộ kinh doanh', value: vendorName, emphasis: true },
                { label: 'Số điện thoại', value: vendorPhone || 'Đã liên kết tài khoản' },
                { label: 'Loại hình kinh doanh', value: vendorTypeLabel(vendorType) },
                {
                  label: 'Hồ sơ điểm kinh doanh (BR-16)',
                  value: (
                    <span className="flex flex-wrap items-center gap-xs">
                      <span>Mã hồ sơ: {detail?.registrationId ?? '-'}</span>
                      <StatusChip code={registrationStatus} />
                    </span>
                  ),
                },
                { label: 'Mã ô', value: `${slotCode} · Đường ${slotStreet}` },
                { label: 'Kích thước ô', value: `${slotWidth}m rộng × ${slotLength}m dài` },
                { label: 'Số hợp đồng', value: `#${contractId}` },
              ]}
            />
          </DossierBlock>

          {/* Legal basis */}
          <LegalNote title="Căn cứ pháp lý">
            * Thẩm quyền quyết định hành chính, trình tự thủ tục và hạn xử lý hồ sơ (≤3 ngày làm
            việc) căn cứ <strong>Luật Đường bộ 2024 (Điều 77)</strong>,{' '}
            <strong>Nghị định 165/2024/NĐ-CP (Điều 21)</strong> được sửa đổi bởi{' '}
            <strong>Nghị định 241/2026/NĐ-CP</strong>. Việc thu phí sử dụng hè phố cho hoạt động
            kinh doanh thực hiện theo{' '}
            <strong>
              Đề án/Quyết định thí điểm quản lý, khai thác hè phố của UBND thành phố Đà Nẵng
            </strong>{' '}
            (cần cập nhật số hiệu văn bản chính thức khi ban hành) — các trường hợp liệt kê tại Điều
            21 NĐ 165/2024 là trường hợp phi thương mại (sự kiện, phòng chống thiên tai, thi
            công...), không trực tiếp bao gồm kinh doanh hàng hóa. Sau khi phê duyệt, hệ thống tự
            động gia hạn hợp đồng, cập nhật giấy phép số QR và tạo lịch thu phí gia hạn mới.
          </LegalNote>

          {/* Officer note */}
          {wide ? null : noteField}
        </div>

        {wide ? (
          <div className="flex flex-col gap-md pb-[88px] xl:sticky xl:top-md">
            {receipt}
            {isOpen ? (
              <DecisionDeskCard title="Quyết định gia hạn">
                {noteField}
                <div className="flex flex-col gap-sm">
                  <span className="block" title={!canApprove ? blockers[0] : undefined}>
                    <Button
                      label="Duyệt gia hạn"
                      variant="approve"
                      icon={approveIcon}
                      disabled={!canApprove || submitting}
                      onPress={() => act('APPROVE')}
                    />
                  </span>
                  <div className="pt-xs">
                    <Button
                      label="Từ chối"
                      variant="danger"
                      disabled={submitting}
                      onPress={() => act('REJECT')}
                    />
                  </div>
                </div>
              </DecisionDeskCard>
            ) : (
              decisionRecord
            )}
          </div>
        ) : null}
      </div>
    </Screen>
  );
}
