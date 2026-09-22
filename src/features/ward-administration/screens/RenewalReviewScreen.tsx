import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { Money } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { complianceApi, type WardRenewalDetail } from '../ward-api';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function vendorTypeLabel(type: string): string {
  return type === 'FIXED_STOREFRONT' ? 'Cửa hàng cố định' : 'Hàng rong lưu động';
}

const isReviewableRenewalStatus = (status: string) => status === 'PENDING' || status === 'UNDER_REVIEW';

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

  if (!mockRenewal && !detail && !loading) {
    return <ErrorState message="Không tìm thấy yêu cầu gia hạn tại địa bàn." />;
  }

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Đang tải..." back />
        <div className="flex items-center justify-center py-xl">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
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

  return (
    <Screen
      footer={
        isOpen ? (
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
        {remainingDays <= 0 && isOpen ? (
          <StatusChip label="Đã hết hạn" tone="danger" />
        ) : null}
      </div>

      {/* Decided review reason */}
      {isDecided && reviewReason ? (
        <div className="rounded-xl border border-border bg-surface-variant p-4">
          <p className="text-body-sm font-semibold text-foreground">Quyết định của cán bộ</p>
          <p className="mt-1 text-body-md text-text">{reviewReason}</p>
          <p className="mt-1 text-body-xs text-muted">
            Cán bộ: {reviewedBy ?? '-'} · {fmtDateTime(reviewedAt)}
          </p>
        </div>
      ) : null}

      {/* Blocker alerts */}
      {blockers.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-950/30">
          <div className="flex items-center gap-2 font-semibold text-danger">
            <span>Chưa đủ điều kiện gia hạn</span>
          </div>
          <ul className="mt-1 list-disc pl-5 text-body-sm text-danger/90 space-y-1">
            {blockers.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Contract & Vendor Info */}
      <Section title="Thông tin hợp đồng & hộ kinh doanh">
        <Card padded={false}>
          <div className="px-md">
            <ListRow title="Tên hộ kinh doanh" subtitle={vendorName} />
            <Divider />
            <ListRow title="Số điện thoại" subtitle={vendorPhone || 'Đã liên kết tài khoản'} />
            <Divider />
            <ListRow title="Loại hình kinh doanh" subtitle={vendorTypeLabel(vendorType)} />
            <Divider />
            <div className="flex items-center justify-between py-sm">
              <div>
                <p className="text-body-sm font-medium text-foreground">Hồ sơ điểm kinh doanh (BR-16)</p>
                <p className="text-body-xs text-muted">
                  Mã hồ sơ: {detail?.registrationId ?? '-'}
                </p>
              </div>
              <StatusChip code={registrationStatus} />
            </div>
          </div>
        </Card>
      </Section>

      {/* Sidewalk slot */}
      <Section title="Vị trí ô hè phố hiện tại">
        <Card padded={false}>
          <div className="px-md">
            <ListRow title="Mã ô" subtitle={`${slotCode} · Đường ${slotStreet}`} />
            <Divider />
            <ListRow
              title="Kích thước ô"
              subtitle={`${slotWidth}m rộng × ${slotLength}m dài`}
            />
            <Divider />
            <ListRow title="Số hợp đồng" subtitle={`#${contractId}`} />
          </div>
        </Card>
      </Section>

      {/* Renewal Time Comparison */}
      <Section title="Thời hạn gia hạn đề nghị">
        <Card>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <p className="text-body-sm text-muted">Hết hạn hiện tại</p>
              <p className="text-headline-sm text-text">{fmtDate(currentEndDate)}</p>
            </div>
            <div>
              <p className="text-body-sm text-muted">Hết hạn mới (đề nghị)</p>
              <p className="text-headline-sm text-primary font-semibold">{fmtDate(proposedEndDate)}</p>
            </div>
          </div>
          <Divider />
          <div className="flex items-center justify-between pt-sm">
            <span className="text-body-sm text-muted">Thời hạn gia hạn thêm</span>
            <span className="text-headline-sm font-bold text-primary">+{requestedTermDays} ngày</span>
          </div>
          {remainingDays > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-muted">Còn lại trên hợp đồng hiện tại</span>
              <span className={`text-body-md font-semibold ${remainingDays <= 7 ? 'text-danger' : 'text-foreground'}`}>
                {remainingDays} ngày
              </span>
            </div>
          ) : null}
        </Card>
      </Section>

      {/* Fee Calculation */}
      <Section title="Dự toán phí gia hạn sử dụng hè phố">
        <Card>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-muted">Mức thu theo ngày:</span>
              <Money amountVnd={pricePerDay} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-muted">Thời hạn gia hạn:</span>
              <span className="text-body-md font-semibold text-foreground">{requestedTermDays} ngày</span>
            </div>
            <Divider />
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-body-sm font-semibold text-foreground">Tổng phí gia hạn dự kiến:</p>
                <p className="text-body-xs text-muted">Theo biểu giá khu vực Phường</p>
              </div>
              <Money amountVnd={totalEstimatedFee} size="lg" color="var(--color-primary)" />
            </div>
          </div>
        </Card>
      </Section>

      {/* Vendor Compliance Scorecard */}
      {scorecard ? (
        <Section title="Lịch sử tuân thủ hộ kinh doanh">
          <Card>
            <div className="space-y-2">
              {scorecard.isCleanRecord ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-green-50 px-3 py-2 dark:bg-green-950/30">
                  <span className="text-body-sm font-semibold text-green-700 dark:text-green-400">
                    Hồ sơ sạch, chưa có vi phạm
                  </span>
                  <StatusChip label="[AI] Đề xuất: Phê duyệt nhanh" tone="ok" />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
                  <span className="text-body-sm font-semibold text-amber-700 dark:text-amber-400">
                    Có lịch sử cần rà soát trước khi quyết định
                  </span>
                  <StatusChip label="Cần xem xét kỹ" tone="pending" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-md gap-y-sm text-body-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Lần kiểm tra:</span>
                  <span className="font-semibold text-foreground">{scorecard.totalInspections}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Vi phạm:</span>
                  <span className={`font-semibold ${scorecard.violationCount > 0 ? 'text-danger' : 'text-foreground'}`}>
                    {scorecard.violationCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Phạt chưa nộp:</span>
                  <span className={`font-semibold ${scorecard.unpaidPenaltyCount > 0 ? 'text-danger' : 'text-foreground'}`}>
                    {scorecard.unpaidPenaltyCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Tổng tiền phạt:</span>
                  <span className="font-semibold text-foreground">
                    {scorecard.totalPenaltyAmount > 0 ? `${scorecard.totalPenaltyAmount.toLocaleString('vi-VN')} đ` : '0 đ'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Phản ánh cộng đồng:</span>
                  <span className="font-semibold text-foreground">{scorecard.reportCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Trạng thái giấy phép:</span>
                  <StatusChip code={scorecard.currentPermitStatus} />
                </div>
              </div>
            </div>
          </Card>
        </Section>
      ) : null}

      {/* Legal basis */}
      <Section title="Căn cứ pháp lý">
        <Card>
          <p className="text-body-sm text-muted">
            * Thẩm quyền quyết định hành chính, trình tự thủ tục và hạn xử lý hồ sơ (≤3 ngày làm việc) căn cứ{' '}
            <strong>Luật Đường bộ 2024 (Điều 77)</strong>, <strong>Nghị định 165/2024/NĐ-CP (Điều 21)</strong> được sửa
            đổi bởi <strong>Nghị định 241/2026/NĐ-CP</strong>. Việc thu phí sử dụng hè phố cho hoạt động kinh doanh
            thực hiện theo <strong>Đề án/Quyết định thí điểm quản lý, khai thác hè phố của UBND thành phố Đà Nẵng</strong>{' '}
            (cần cập nhật số hiệu văn bản chính thức khi ban hành) — các trường hợp liệt kê tại Điều 21 NĐ 165/2024 là
            trường hợp phi thương mại (sự kiện, phòng chống thiên tai, thi công...), không trực tiếp bao gồm kinh doanh
            hàng hóa. Sau khi phê duyệt, hệ thống tự động gia hạn hợp đồng, cập nhật giấy phép số QR và tạo lịch thu phí
            gia hạn mới.
          </p>
        </Card>
      </Section>

      {/* Officer note */}
      {isOpen ? (
        <Section title="Ghi chú phản hồi / Căn cứ quyết định">
          <TextField
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Nhập ghi chú hoặc lý do từ chối gia hạn (bắt buộc khi từ chối)..."
          />
        </Section>
      ) : null}
    </Screen>
  );
}
