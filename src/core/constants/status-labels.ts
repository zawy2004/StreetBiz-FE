import type { StatusTone } from '@/theme';

/**
 * Maps backend status codes (see StreetBiz-BE docs/database-reverse-engineering.md
 * — registration_status, application_status, slot_status, permit_status,
 * contract_status, renewal_status, change_status, transfer_status,
 * penalty_status, item_status, order_status, report_status, transaction_status)
 * to a short Vietnamese label and one of the 3 status tones.
 */
export const STATUS_LABELS: Record<string, { label: string; tone: StatusTone }> = {
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  PENDING: { label: 'Chờ duyệt', tone: 'pending' },
  UNDER_REVIEW: { label: 'Đang xét', tone: 'pending' },
  NEEDS_INFO: { label: 'Cần bổ sung', tone: 'pending' },
  APPROVED: { label: 'Đã duyệt', tone: 'ok' },
  ACTIVE: { label: 'Đang hoạt động', tone: 'ok' },
  VALID: { label: 'Hợp lệ', tone: 'ok' },
  AVAILABLE: { label: 'Còn trống', tone: 'ok' },
  OPEN: { label: 'Đang mở', tone: 'ok' },
  PAID: { label: 'Đã thanh toán', tone: 'ok' },
  RESOLVED: { label: 'Đã xử lý', tone: 'ok' },
  ACCEPTED: { label: 'Đã chấp nhận', tone: 'ok' },
  COMPLETED: { label: 'Hoàn tất', tone: 'ok' },
  READY_FOR_PICKUP: { label: 'Sẵn sàng lấy', tone: 'ok' },
  PICKED_UP: { label: 'Đã lấy món', tone: 'ok' },
  RENTED: { label: 'Đã thuê', tone: 'neutral' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  EXPIRED: { label: 'Hết hạn', tone: 'danger' },
  OVERDUE: { label: 'Quá hạn', tone: 'danger' },
  SUSPENDED: { label: 'Tạm ngưng', tone: 'danger' },
  REVOKED: { label: 'Đã thu hồi', tone: 'danger' },
  CANCELLED: { label: 'Đã huỷ', tone: 'danger' },
  WITHDRAWN: { label: 'Đã rút', tone: 'neutral' },
  FAILED: { label: 'Thất bại', tone: 'danger' },
  CLOSED: { label: 'Đã đóng', tone: 'neutral' },
  PAUSED: { label: 'Tạm dừng', tone: 'pending' },
  SOLD_OUT: { label: 'Hết món', tone: 'danger' },
  PREPARING: { label: 'Đang chuẩn bị', tone: 'pending' },
  HIDDEN: { label: 'Đã ẩn', tone: 'neutral' },
};

export function statusLabel(code: string) {
  return STATUS_LABELS[code] ?? { label: code, tone: 'neutral' as const };
}
