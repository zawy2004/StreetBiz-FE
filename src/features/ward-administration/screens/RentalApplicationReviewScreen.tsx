import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { complianceApi, type WardRentalApplicationDetail } from '../ward-api';

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

  if (!mockApplication && !liveDetail && !loading) {
    return <ErrorState message="Không tìm thấy hồ sơ đề nghị cấp phép sử dụng hè phố." />;
  }

  // Mock data mapping
  const mockVendor = mockApplication ? vendors.find((v) => v.id === mockApplication.vendorId) : null;
  const mockRegistration = mockVendor ? registrations.find((r) => r.vendorId === mockVendor.id) : null;
  const mockSlot = mockApplication?.slotIds[0] ? slots.find((s) => s.id === mockApplication.slotIds[0]) : null;

  // Determining BR-16 compliance in mock mode
  const mockIsRegApproved = mockRegistration?.registration_status === 'APPROVED';
  const mockBlockers: string[] = [];
  if (mockApplication && !mockIsRegApproved) {
    mockBlockers.push(
      `Hồ sơ điểm kinh doanh của hộ "${mockVendor?.business_name || 'Hộ kinh doanh'}" đang ở trạng thái "${mockRegistration?.registration_status || 'CHƯA ĐĂNG KÝ'}". Theo quy định BR-16, hồ sơ điểm bán phải được xác nhận ĐỦ ĐIỀU KIỆN (APPROVED) trước khi cấp phép sử dụng hè phố.`
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

  const canApprove = liveDetail ? liveDetail.canApprove : (mockBlockers.length === 0);
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
        showToast('Đã duyệt cấp phép! Hợp đồng điện tử, Giấy phép số QR và Lịch thu phí đã được tạo.');
      } else {
        rejectMock(mockApplication.id, note || 'Không phù hợp quy hoạch hè phố');
        showToast('Đã từ chối cấp phép');
      }
      navigate(-1);
    }
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="flex-1">
            <Button
              label="Từ chối"
              variant="danger"
              onPress={() => act('REJECT')}
            />
          </div>
          <div className="flex-1">
            <Button
              label="Duyệt & Cấp phép số"
              variant="approve"
              disabled={!canApprove}
              onPress={() => act('APPROVE')}
            />
          </div>
        </StickyActions>
      }
    >
      <AppHeader
        title={vendorName || 'Thẩm định cấp phép'}
        subtitle="Giấy phép sử dụng tạm thời lòng đường, vỉa hè (WARD-07/08)"
        back
      />
      <div className="flex flex-row items-center gap-xs">
        <StatusChip code={status} />
        {mockApplication?.application_type === 'STOREFRONT_ADJACENT' ? (
          <StatusChip label="Hè phố liền kề cửa hàng" tone="neutral" />
        ) : (
          <StatusChip label="Ô hè phố mở (Lưu động)" tone="neutral" />
        )}
      </div>

      {/* Business Rule Blocker Alert (BR-16) */}
      {blockers.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-950/30">
          <div className="flex items-center gap-2 font-semibold text-danger">
            <span>⛔</span>
            <span>Chưa đủ điều kiện cấp phép (Ràng buộc BR-16)</span>
          </div>
          <ul className="mt-1 list-disc pl-5 text-body-sm text-danger/90 space-y-1">
            {blockers.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <p className="mt-2 border-t border-red-200 pt-1 text-body-xs text-muted dark:border-red-800/40">
            👉 <strong>Hướng xử lý:</strong> Cán bộ cần vào Hộp duyệt $\rightarrow$ Thẩm định và duyệt hồ sơ điểm kinh doanh của hộ trước, sau đó mới có thể cấp phép sử dụng hè phố.
          </p>
        </div>
      ) : null}

      {/* Vendor & Business Info */}
      <Section title="Thông tin hộ đề nghị cấp phép">
        <Card padded={false}>
          <div className="px-md">
            <ListRow title="Tên hộ kinh doanh" subtitle={vendorName} />
            <Divider />
            <ListRow title="Chủ hộ / Đại diện" subtitle={ownerName} />
            <Divider />
            <ListRow title="Số điện thoại liên hệ" subtitle={vendorPhone || 'Đã liên kết tài khoản'} />
            <Divider />
            <div className="flex items-center justify-between py-sm">
              <div>
                <p className="text-body-sm font-medium text-foreground">Hồ sơ điểm kinh doanh liên kết (BR-16)</p>
                <p className="text-body-xs text-muted">
                  {mockRegistration ? `Mã hồ sơ: ${mockRegistration.id}` : 'Chưa có hồ sơ'}
                </p>
              </div>
              <StatusChip code={mockRegistration?.registration_status || (liveDetail?.registrationStatus ?? 'NOT_FOUND')} />
            </div>
          </div>
        </Card>
      </Section>

      {/* Sidewalk Slot & Usage Parameters */}
      <Section title="Vị trí & Thông số hè phố đề nghị sử dụng">
        <Card padded={false}>
          <div className="px-md">
            <ListRow title="Mã ô cấp phép" subtitle={`${slotCode} · Đường ${slotStreet}`} />
            <Divider />
            <ListRow
              title="Kích thước & Diện tích"
              subtitle={`${sizeM2} m² (${width}m rộng x ${length}m dài) · Bảo đảm lối đi bộ tối thiểu 1.5m`}
            />
            <Divider />
            <ListRow
              title="Khung giờ được phép kinh doanh"
              subtitle={`${timeWindow} hàng ngày`}
            />
            <Divider />
            <ListRow title="Thời hạn đề nghị cấp phép" subtitle={`${requestedTermDays} ngày (Thời hạn xử lý hồ sơ ≤ 3 ngày làm việc)`} />
          </div>
        </Card>
      </Section>

      {/* Calculated Public Fee */}
      <Section title="Dự toán phí sử dụng tạm thời hè phố (Nộp NSNN)">
        <Card>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-muted">Mức thu theo ngày:</span>
              <span className="text-body-md font-semibold text-foreground">
                {pricePerDay.toLocaleString('vi-VN')} đ / ngày
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-muted">Mức thu theo tháng ({requestedTermDays} ngày):</span>
              <span className="text-body-md font-semibold text-foreground">
                {monthlyFee.toLocaleString('vi-VN')} đ / tháng
              </span>
            </div>
            <Divider />
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-body-sm font-semibold text-foreground">Tổng phí dự kiến thu:</p>
                <p className="text-body-xs text-muted">Mức thu theo biểu giá khu vực Phường đã cấu hình (PricingZones)</p>
              </div>
              <span className="text-headline-lg font-bold text-primary">
                {totalFee.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Căn cứ pháp lý hành chính công">
        <Card>
          <p className="text-body-sm text-muted">
            * Căn cứ <strong>Luật Đường bộ 2024 (Điều 77)</strong>, <strong>Nghị định 165/2024/NĐ-CP (Điều 21)</strong> được sửa đổi bởi <strong>Nghị định 241/2026/NĐ-CP</strong> (hiệu lực 01/07/2026 — rút thời hạn xử lý còn ≤3 ngày làm việc, tang lễ ≤1 ngày; thẩm quyền cấp phép các trường hợp còn lại thuộc UBND cấp xã) và <strong>Luật Phí và Lệ phí 2015</strong>: Việc phê duyệt đơn này là quyết định hành chính cấp Giấy phép sử dụng tạm thời lòng đường, vỉa hè vào mục đích khác có thời hạn và có thu phí nộp Ngân sách Nhà nước. Sau khi phê duyệt, hệ thống tự động phát hành Hợp đồng điện tử, Giấy phép số QR và Lịch thu phí.
          </p>
        </Card>
      </Section>

      <Section title="Ghi chú phản hồi / Căn cứ quyết định">
        <TextField
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Nhập ghi chú hoặc lý do từ chối (bắt buộc khi từ chối)..."
        />
      </Section>
    </Screen>
  );
}
