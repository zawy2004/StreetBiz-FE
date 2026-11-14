import type { PayoutAccountDto } from '@/core/api';
import type { StatusTone } from '@/theme';
import type { PayoutOwner } from './usePayoutAccount';

/**
 * Pure helpers for the "Tài khoản nhận tiền" screens. The money never passes through StreetBiz:
 * a household's customers and a ward's households pay straight into the account connected here.
 */

export const OWNER_COPY: Record<
  PayoutOwner,
  { title: string; intro: string; whenOff: string; whoPays: string }
> = {
  vendor: {
    title: 'Tài khoản nhận tiền',
    intro:
      'Khách trả tiền món ăn thẳng vào tài khoản ngân hàng của bạn qua payOS. StreetBiz không giữ tiền của bạn và không chuyển tiền hộ.',
    whenOff:
      'Quán chưa nhận đặt món online: khách chỉ đặt và trả trước được khi bạn đã kết nối tài khoản nhận tiền.',
    whoPays: 'khách đặt món',
  },
  ward: {
    title: 'Tài khoản nhận phí thuê ô',
    intro:
      'Hộ kinh doanh trả phí thuê ô thẳng vào tài khoản ngân hàng của phường qua payOS. StreetBiz không giữ và không chuyển tiền hộ. Mọi cán bộ của phường dùng chung một tài khoản.',
    whenOff:
      'Hộ chưa thể trả phí thuê ô online: họ chỉ thấy hướng dẫn nộp trực tiếp tại phường cho đến khi phường kết nối tài khoản nhận tiền.',
    whoPays: 'hộ kinh doanh',
  },
};

export type AccountSummary = { label: string; tone: StatusTone; note: string };

/** What the connection means for the payer, in words. */
export function summarizeAccount(account: PayoutAccountDto, owner: PayoutOwner): AccountSummary {
  if (!account.connected || !account.status) {
    return { label: 'Chưa kết nối', tone: 'neutral', note: OWNER_COPY[owner].whenOff };
  }
  if (account.status === 'ACTIVE') {
    return {
      label: 'Đang hoạt động',
      tone: 'ok',
      note: `Tiền từ ${OWNER_COPY[owner].whoPays} về thẳng tài khoản bên dưới.`,
    };
  }
  if (account.status === 'ERROR') {
    return {
      label: 'Cần kết nối lại',
      tone: 'danger',
      note: 'payOS không chấp nhận khoá hiện tại nên đang tạm không nhận thanh toán mới. Nhập lại khoá để tiếp tục.',
    };
  }
  return {
    label: 'Đã ngắt kết nối',
    tone: 'neutral',
    note: 'Không nhận thanh toán mới. Các khoản đã tạo trước đó vẫn được ghi nhận khi tiền về.',
  };
}

/** How payments are noticed: payOS pushes them (webhook), or StreetBiz asks payOS regularly. */
export function webhookNote(account: PayoutAccountDto): string {
  if (account.webhookConfirmed) {
    return 'payOS báo ngay khi có tiền về (webhook đã đăng ký). Hệ thống còn tự đối soát định kỳ để không sót khoản nào.';
  }
  if (!account.webhookConfigured) {
    return 'Máy chủ chưa có địa chỉ công khai cho webhook, nên hệ thống tự hỏi payOS định kỳ để biết tiền đã về.';
  }
  return 'Chưa đăng ký được webhook với payOS. Hệ thống vẫn tự hỏi payOS định kỳ; bấm "Kiểm tra kết nối" để thử đăng ký lại.';
}

/** The three keys must all be present (payOS shows them once per channel, so they are pasted). */
export function keyErrors(values: { clientId: string; apiKey: string; checksumKey: string }) {
  const required = 'Cần nhập trường này.';
  return {
    clientId: values.clientId.trim() ? undefined : required,
    apiKey: values.apiKey.trim() ? undefined : required,
    checksumKey: values.checksumKey.trim() ? undefined : required,
  };
}

export const GUIDE_STEPS = [
  'Đăng nhập my.payos.vn bằng tài khoản của chủ tài khoản ngân hàng nhận tiền và tạo một kênh thanh toán.',
  'Mở kênh vừa tạo và sao chép Client ID, API Key, Checksum Key.',
  'Dán ba khoá vào form bên dưới. StreetBiz kiểm tra với payOS rồi tự đăng ký webhook.',
] as const;
