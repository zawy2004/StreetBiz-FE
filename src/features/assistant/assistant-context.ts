import type { AssistantPageContext, AssistantRole } from './types';

export const ROLE_LABEL: Record<AssistantRole, string> = {
  GUEST: 'Khách',
  CUSTOMER: 'Người dùng cộng đồng',
  VENDOR: 'Hộ kinh doanh',
  WARD_AUTHORITY: 'Cán bộ phường',
  PLATFORM_ADMIN: 'Quản trị nền tảng',
};

export function welcome(role: AssistantRole) {
  const content: Record<AssistantRole, { title: string; description: string }> = {
    GUEST: {
      title: 'Khám phá StreetBiz cùng bạn',
      description:
        'Tìm hiểu đăng ký kinh doanh, ô vỉa hè và cách kiểm tra giấy phép. Bắt đầu bằng một câu hỏi.',
    },
    CUSTOMER: {
      title: 'Bạn muốn khám phá điều gì?',
      description:
        'Tìm người bán, hiểu thông tin công khai và biết cách kiểm tra giấy phép trước khi lựa chọn.',
    },
    VENDOR: {
      title: 'Việc kinh doanh, rõ ràng hơn',
      description: 'Cùng xem hồ sơ, hợp đồng và các khoản phí của bạn để tìm bước tiếp theo.',
    },
    WARD_AUTHORITY: {
      title: 'Thông tin rõ, đối chiếu dễ',
      description:
        'Tra cứu trong phạm vi phường, tóm tắt hồ sơ và chuẩn bị những điểm cần đối chiếu.',
    },
    PLATFORM_ADMIN: {
      title: 'Nắm bắt việc cần xem xét',
      description: 'Hỗ trợ tra cứu danh mục, nội dung kiểm duyệt và hướng dẫn vận hành nền tảng.',
    },
  };
  return content[role];
}

export function contextLabel(context: AssistantPageContext) {
  const labels: Record<string, string> = {
    'vendor.slot': 'Ô vỉa hè',
    'vendor.registration': 'Hồ sơ kinh doanh',
    'vendor.contract': 'Hợp đồng',
    'vendor.permit': 'Giấy phép',
    'vendor.finance': 'Tài chính',
    'ward.registration': 'Hồ sơ kinh doanh',
    'ward.rental': 'Đơn thuê ô',
    'ward.dashboard': 'Tổng quan phường',
    'admin.report': 'Nội dung kiểm duyệt',
    'public.vendor': 'Hồ sơ người bán',
  };
  return `${labels[context.pageKey] ?? 'Trang đang mở'}${context.entityId ? ` · #${context.entityId}` : ''}`;
}

export function pageContext(path: string, role: AssistantRole): AssistantPageContext | undefined {
  const routes: [AssistantRole, RegExp, string][] = [
    ['VENDOR', /^\/vendor\/slots\/(\d+)$/, 'vendor.slot'],
    ['VENDOR', /^\/vendor\/registrations\/(\d+)$/, 'vendor.registration'],
    ['VENDOR', /^\/vendor\/slots\/contracts\/(\d+)\/permit$/, 'vendor.permit'],
    ['VENDOR', /^\/vendor\/slots\/contracts\/(\d+)$/, 'vendor.contract'],
    ['VENDOR', /^\/vendor\/finance$/, 'vendor.finance'],
    ['WARD_AUTHORITY', /^\/ward\/inbox\/registrations\/(\d+)$/, 'ward.registration'],
    ['WARD_AUTHORITY', /^\/ward\/inbox\/rental-applications\/(\d+)$/, 'ward.rental'],
    ['WARD_AUTHORITY', /^\/ward\/dashboard$/, 'ward.dashboard'],
    ['PLATFORM_ADMIN', /^\/platform\/moderation\/content\/(\d+)$/, 'admin.report'],
    ['CUSTOMER', /^\/customer\/explore\/vendors\/(\d+)$/, 'public.vendor'],
  ];
  for (const [allowedRole, pattern, key] of routes) {
    const match = path.match(pattern);
    if (allowedRole === role && match)
      return { pageKey: key, ...(match[1] ? { entityId: match[1] } : {}) };
  }
  return undefined;
}

export function suggestions(role: AssistantRole, path: string): string[] {
  if (pageContext(path, role))
    return [
      'Tóm tắt thông tin trên trang này',
      'Tôi nên làm gì tiếp theo?',
      'Thông tin nào cần đối chiếu?',
    ];
  switch (role) {
    case 'VENDOR':
      return [
        'Hồ sơ kinh doanh của tôi đang ở bước nào?',
        'Tôi cần đóng khoản phí nào?',
        'Hợp đồng của tôi khi nào hết hạn?',
      ];
    case 'WARD_AUTHORITY':
      return [
        'Tóm tắt tình hình phường',
        'Hồ sơ nào đang chờ xử lý?',
        'Giải thích báo cáo thu của phường',
      ];
    case 'PLATFORM_ADMIN':
      return [
        'Nội dung nào đang chờ kiểm duyệt?',
        'Các danh mục hiện có',
        'Quyền của quản trị nền tảng gồm những gì?',
      ];
    case 'CUSTOMER':
      return [
        'Làm sao kiểm tra giấy phép người bán?',
        'Tìm người bán trên bản đồ',
        'Tôi muốn gửi phản ánh cộng đồng',
      ];
    default:
      return [
        'StreetBiz giúp tôi làm gì?',
        'Tôi muốn đăng ký bán hàng',
        'Làm sao kiểm tra giấy phép?',
      ];
  }
}

export function safeRoute(route: string, role: AssistantRole): boolean {
  if (
    !route.startsWith('/') ||
    route.startsWith('//') ||
    /[\\?#%\s]/.test(route) ||
    route.split('/').some((s) => s === '.' || s === '..')
  )
    return false;
  if (route === '/assistant') return true;
  if (route === '/account' || route.startsWith('/account/')) return role !== 'GUEST';
  if (role === 'GUEST')
    return /^\/(auth\/(register|sign-in)|customer\/(explore|scan))$/.test(route);
  const prefix = {
    CUSTOMER: '/customer/',
    VENDOR: '/vendor/',
    WARD_AUTHORITY: '/ward/',
    PLATFORM_ADMIN: '/platform/',
  }[role];
  return route.startsWith(prefix);
}
