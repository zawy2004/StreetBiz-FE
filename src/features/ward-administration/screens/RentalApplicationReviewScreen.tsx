import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { isLiveApi } from '@/core/config/env';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import { useMockDb } from '@/mocks/db';
import { complianceApi, type WardRentalApplicationDetail } from '../ward-api';
import { formatDateTimeVi } from '../components/review/format';
import {
  DossierBlock,
  FactGrid,
  LegalNote,
  LoadingBar,
  RecordedDecision,
} from '../components/review/Primitives';
import {
  DecisionDeskCard,
  FeeReceipt,
  IssuanceStrip,
  PrerequisiteLock,
  SlotPlanDiagram,
} from '../components/review/PermitDossierParts';

export function RentalApplicationReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Mock DB fallback
  const mockApplication = useMockDb((s) => s.applications.find((a) => a.id === id));
  const slots = useMockDb((s) => s.slots);
  const vendors = useMockDb((s) => s.vendors);
  const registrations = useMockDb((s) => s.registrations);
  const approveMock = useMockDb((s) => s.approveRentalApplication);
  const rejectMock = useMockDb((s) => s.rejectRentalApplication);

  const [liveDetail, setLiveDetail] = useState<WardRentalApplicationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isLiveApi || !id) return;
    setLoading(true);
    complianceApi
      .getRentalApplication(id)
      .then(setLiveDetail)
      .catch((err) => {
        console.warn('Could not load live rental application, falling back to mock:', err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Where the decision desk goes: the right column on wide screens, the bottom bar
  // otherwise. Exactly one set of decision buttons is rendered at any time.
  const wide = useMediaQuery('(min-width: 1280px)');
  // Display only: hovering the size row strengthens the drawing's dimension lines.
  const [dimHover, setDimHover] = useState(false);

  if (!mockApplication && !liveDetail && !loading) {
    return (
      <Screen>
        <ErrorState message="Không tìm thấy hồ sơ đề nghị cấp phép sử dụng hè phố." />
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

  // Mock data mapping
  const mockVendor = mockApplication
    ? vendors.find((v) => v.id === mockApplication.vendorId)
    : null;
  const mockRegistration = mockVendor
    ? registrations.find((r) => r.vendorId === mockVendor.id)
    : null;
  const mockSlot = mockApplication?.slotIds[0]
    ? slots.find((s) => s.id === mockApplication.slotIds[0])
    : null;

  // Determining BR-16 compliance in mock mode
  const mockIsRegApproved = mockRegistration?.registration_status === 'APPROVED';
  const mockBlockers: string[] = [];
  if (mockApplication && !mockIsRegApproved) {
    mockBlockers.push(
      `Hồ sơ điểm kinh doanh của hộ "${mockVendor?.business_name || 'Hộ kinh doanh'}" đang ở trạng thái "${mockRegistration?.registration_status || 'CHƯA ĐĂNG KÝ'}". Theo quy định BR-16, hồ sơ điểm bán phải được xác nhận ĐỦ ĐIỀU KIỆN (APPROVED) trước khi cấp phép sử dụng hè phố.`,
    );
  }

  const vendorName = liveDetail?.vendorName ?? mockVendor?.business_name ?? 'Hộ kinh doanh';
  const ownerName = mockVendor?.owner_name ?? 'Đại diện hộ kinh doanh';
  const vendorPhone = liveDetail?.vendorPhone ?? mockVendor?.phone ?? '';
  const status = liveDetail?.status ?? mockApplication?.application_status ?? 'PENDING';
  const slotCode = liveDetail?.slotCode ?? mockSlot?.slot_code ?? '';
  const slotStreet = liveDetail?.slotStreet ?? mockSlot?.street ?? '';
  const sizeM2 = mockSlot?.size_m2 ?? 3;
  const width = liveDetail?.slotWidth ?? 2;
  const length = liveDetail?.slotLength ?? (sizeM2 > 0 ? +(sizeM2 / 2).toFixed(1) : 1.5);
  const timeWindow = mockSlot?.time_window ?? '06:00 - 10:30';
  const monthlyFee = mockSlot?.price_monthly ?? 450000;
  const pricePerDay = liveDetail?.pricePerDay ?? Math.round(monthlyFee / 30);
  const requestedTermDays = liveDetail?.requestedTermDays ?? 30;
  const totalFee = pricePerDay * requestedTermDays;

  const canApprove = liveDetail ? liveDetail.canApprove : mockBlockers.length === 0;
  const blockers = liveDetail?.blockers ?? mockBlockers;

  const act = async (decision: 'APPROVE' | 'REJECT') => {
    if (decision === 'REJECT' && !note.trim()) {
      showToast('Vui lòng nhập lý do từ chối');
      return;
    }

    if (decision === 'APPROVE' && !canApprove) {
      showToast(blockers[0] || 'Chưa đủ điều kiện cấp phép (Vi phạm quy định BR-16)');
      return;
    }

    if (isLiveApi && id) {
      try {
        await complianceApi.decideRentalApplication(
          id,
          decision,
          note.trim() || 'Đủ điều kiện cấp Giấy phép sử dụng tạm thời lòng đường, vỉa hè',
          status,
        );
        showToast(
          decision === 'APPROVE'
            ? 'Đã duyệt! Giấy phép số QR và Lịch thu phí hè phố đã được tạo thành công.'
            : 'Đã từ chối cấp phép',
        );
        navigate(-1);
        return;
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Lỗi xử lý hồ sơ cấp phép');
        return;
      }
    }

    // Mock fallback
    if (mockApplication) {
      if (decision === 'APPROVE') {
        approveMock(mockApplication.id);
        showToast(
          'Đã duyệt cấp phép! Hợp đồng điện tử, Giấy phép số QR và Lịch thu phí đã được tạo.',
        );
      } else {
        rejectMock(mockApplication.id, note || 'Không phù hợp quy hoạch hè phố');
        showToast('Đã từ chối cấp phép');
      }
      navigate(-1);
    }
  };

  // Display only: the drawing waits for real values (live: the server's record).
  const diagramReady = isLiveApi ? !!liveDetail : !!mockApplication;
  const submittedAt = formatDateTimeVi(liveDetail?.createdAt ?? mockApplication?.submitted_at);
  const registrationLink =
    isLiveApi && liveDetail?.registrationId && blockers.length > 0
      ? `/ward/inbox/registrations/${liveDetail.registrationId}`
      : null;

  const receipt = (
    <FeeReceipt
      title="Dự toán phí sử dụng tạm thời hè phố (Nộp NSNN)"
      rows={[
        { label: 'Mức thu theo ngày:', value: `${pricePerDay.toLocaleString('vi-VN')} đ / ngày` },
        { label: 'Thời hạn đề nghị', value: `× ${requestedTermDays} ngày` },
      ]}
      totalLabel="Tổng phí dự kiến thu:"
      totalValue={`${totalFee.toLocaleString('vi-VN')} đ`}
      totalAria={`Tổng phí dự kiến thu ${totalFee.toLocaleString('vi-VN')} đồng`}
      footnotes={
        <>
          <p className="flex items-baseline justify-between gap-sm">
            <span>Mức thu theo tháng ({requestedTermDays} ngày):</span>
            <span className="font-tabular">{monthlyFee.toLocaleString('vi-VN')} đ / tháng</span>
          </p>
          <p>Mức thu theo biểu giá khu vực Phường đã cấu hình (PricingZones)</p>
        </>
      }
    />
  );
  const noteField = (
    <TextField
      label="Ghi chú phản hồi / Căn cứ quyết định"
      value={note}
      onChangeText={setNote}
      multiline
      placeholder="Nhập ghi chú hoặc lý do từ chối (bắt buộc khi từ chối)..."
    />
  );
  const approveIcon = (
    <Icon
      name={canApprove ? 'check-circle-outline' : 'lock-outline'}
      size={19}
      color="currentColor"
    />
  );

  return (
    <Screen
      width="wide"
      footer={
        wide ? undefined : (
          <StickyActions>
            <div className="flex-1">
              <Button label="Từ chối" variant="danger" onPress={() => act('REJECT')} />
            </div>
            <div className="flex-1">
              <Button
                label="Duyệt & Cấp phép số"
                variant="approve"
                icon={approveIcon}
                disabled={!canApprove}
                onPress={() => act('APPROVE')}
              />
            </div>
          </StickyActions>
        )
      }
    >
      <AppHeader
        title={vendorName || 'Thẩm định cấp phép'}
        subtitle="Giấy phép sử dụng tạm thời lòng đường, vỉa hè (WARD-07/08)"
        back
      />
      <div className="flex flex-wrap items-center gap-xs">
        <StatusChip code={status} />
        {mockApplication?.application_type === 'STOREFRONT_ADJACENT' ? (
          <StatusChip label="Hè phố liền kề cửa hàng" tone="neutral" />
        ) : (
          <StatusChip label="Ô hè phố mở (Lưu động)" tone="neutral" />
        )}
        {submittedAt ? (
          <span className="flex items-center gap-1 text-body-sm text-muted">
            <Icon name="clock-outline" size={15} color="currentColor" />
            Nộp lúc <span className="font-tabular">{submittedAt}</span>
          </span>
        ) : null}
      </div>

      {loading ? <LoadingBar /> : null}

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-lg">
          {liveDetail?.reviewReason || liveDetail?.reviewedBy ? (
            <RecordedDecision
              reason={liveDetail.reviewReason}
              officer={liveDetail.reviewedBy}
              at={formatDateTimeVi(liveDetail.reviewedAt)}
            />
          ) : null}

          {/* Business Rule Blocker Alert (BR-16) */}
          {blockers.length > 0 ? (
            <PrerequisiteLock
              title="Chưa đủ điều kiện cấp phép (Ràng buộc BR-16)"
              blockers={blockers}
            >
              <p className="mt-xs flex flex-wrap items-center gap-x-1 border-t border-[#8F1717]/20 pt-xs dark:border-[#FF9A90]/25 text-[14px] leading-[22px] text-text/80">
                <strong className="text-current">Hướng xử lý:</strong> Cán bộ cần vào Hộp duyệt
                <Icon name="chevron-right" size={14} color="currentColor" />
                Thẩm định và duyệt hồ sơ điểm kinh doanh của hộ trước, sau đó mới có thể cấp phép sử
                dụng hè phố.
              </p>
              {registrationLink ? (
                <div className="mt-xs sm:w-fit">
                  <Button
                    label="Mở hồ sơ điểm kinh doanh của hộ"
                    variant="outline"
                    icon={<Icon name="file-document-outline" size={18} color="currentColor" />}
                    onPress={() => navigate(registrationLink)}
                  />
                </div>
              ) : null}
            </PrerequisiteLock>
          ) : null}

          {/* Sidewalk Slot & Usage Parameters */}
          <SlotPlanDiagram
            slotCode={slotCode}
            street={slotStreet}
            width={diagramReady ? width : null}
            length={diagramReady ? length : null}
            ready={diagramReady}
            highlight={dimHover}
          />

          {wide ? null : receipt}

          <DossierBlock title="Vị trí & Thông số hè phố đề nghị sử dụng" icon="ruler-square">
            <div onMouseEnter={() => setDimHover(true)} onMouseLeave={() => setDimHover(false)}>
              <FactGrid
                facts={[
                  {
                    label: 'Mã ô cấp phép',
                    value: `${slotCode} · Đường ${slotStreet}`,
                    emphasis: true,
                  },
                  {
                    label: 'Kích thước & Diện tích',
                    value: `${sizeM2} m² (${width}m rộng x ${length}m dài) · Bảo đảm lối đi bộ tối thiểu 1.5m`,
                  },
                  { label: 'Khung giờ được phép kinh doanh', value: `${timeWindow} hàng ngày` },
                  {
                    label: 'Thời hạn đề nghị cấp phép',
                    value: `${requestedTermDays} ngày (Thời hạn xử lý hồ sơ ≤ 3 ngày làm việc)`,
                  },
                ]}
              />
            </div>
          </DossierBlock>

          {/* Vendor & Business Info */}
          <DossierBlock title="Thông tin hộ đề nghị cấp phép" icon="storefront-outline">
            <FactGrid
              facts={[
                { label: 'Tên hộ kinh doanh', value: vendorName, emphasis: true },
                { label: 'Chủ hộ / Đại diện', value: ownerName },
                { label: 'Số điện thoại liên hệ', value: vendorPhone || 'Đã liên kết tài khoản' },
                {
                  label: 'Hồ sơ điểm kinh doanh liên kết (BR-16)',
                  value: (
                    <span className="flex flex-wrap items-center gap-xs">
                      <span>
                        {mockRegistration ? `Mã hồ sơ: ${mockRegistration.id}` : 'Chưa có hồ sơ'}
                      </span>
                      <StatusChip
                        code={
                          mockRegistration?.registration_status ||
                          (liveDetail?.registrationStatus ?? 'NOT_FOUND')
                        }
                      />
                    </span>
                  ),
                },
              ]}
            />
          </DossierBlock>

          <IssuanceStrip ready={canApprove} />

          <LegalNote title="Căn cứ pháp lý hành chính công">
            * Thẩm quyền quyết định hành chính, trình tự thủ tục và hạn xử lý hồ sơ căn cứ{' '}
            <strong>Luật Đường bộ 2024 (Điều 77)</strong>,{' '}
            <strong>Nghị định 165/2024/NĐ-CP (Điều 21)</strong> được sửa đổi bởi{' '}
            <strong>Nghị định 241/2026/NĐ-CP</strong> (hiệu lực 01/07/2026 — rút thời hạn xử lý còn
            ≤3 ngày làm việc, tang lễ ≤1 ngày; thẩm quyền cấp phép các trường hợp còn lại thuộc UBND
            cấp xã) và <strong>Luật Phí và Lệ phí 2015</strong> (thẩm quyền thu phí nộp Ngân sách
            Nhà nước). Việc cho phép sử dụng hè phố cho hoạt động kinh doanh cụ thể thực hiện theo{' '}
            <strong>
              Đề án/Quyết định thí điểm quản lý, khai thác hè phố của UBND thành phố Đà Nẵng
            </strong>{' '}
            (cần cập nhật số hiệu văn bản chính thức khi ban hành) — các trường hợp liệt kê tại Điều
            21 NĐ 165/2024 là trường hợp phi thương mại, không trực tiếp bao gồm kinh doanh hàng
            hóa. Sau khi phê duyệt, hệ thống tự động phát hành Hợp đồng điện tử, Giấy phép số QR và
            Lịch thu phí.
          </LegalNote>

          {wide ? null : noteField}
        </div>

        {wide ? (
          <div className="flex flex-col gap-md pb-[88px] xl:sticky xl:top-md">
            {receipt}
            <DecisionDeskCard title="Quyết định cấp phép">
              {noteField}
              <div className="flex flex-col gap-sm">
                <Button
                  label="Duyệt & Cấp phép số"
                  variant="approve"
                  icon={approveIcon}
                  disabled={!canApprove}
                  onPress={() => act('APPROVE')}
                />
                {!canApprove ? (
                  <p className="flex items-start gap-xs text-body-sm text-muted">
                    <Icon
                      name="lock-outline"
                      size={15}
                      color="currentColor"
                      className="mt-0.5 shrink-0"
                    />
                    Chưa đủ điều kiện cấp phép (BR-16)
                  </p>
                ) : null}
                <div className="pt-xs">
                  <Button label="Từ chối" variant="danger" onPress={() => act('REJECT')} />
                </div>
              </div>
            </DecisionDeskCard>
          </div>
        ) : null}
      </div>
    </Screen>
  );
}
