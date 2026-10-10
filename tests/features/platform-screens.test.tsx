import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastStore } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import {
  platformApi,
  PlatformApiError,
  usePlatformSession,
  type OrderComplaint,
  type PlatformPage,
  type ReportedContent,
} from '@/features/platform-administration/platform-api';

const flags = vi.hoisted(() => ({ live: false }));
vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return {
    ...actual,
    get isLiveApi() {
      return flags.live;
    },
  };
});

const {
  AccountsScreen,
  CategoriesScreen,
  ModerationScreen,
  OrderComplaintReviewScreen,
  PlatformDashboardScreen,
  ReportedContentReviewScreen,
} = await import('@/features/platform-administration/screens');

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}</p>;
}

function mount(path: string, route: string, element: ReactNode) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const connectAdmin = () =>
  usePlatformSession.setState({
    token: 'platform-token',
    admin: { userId: 9, name: 'Đỗ Quốc Anh' },
    generation: 1,
  });

const page = <T,>(items: T[], totalCount = items.length): PlatformPage<T> => ({
  items,
  page: 1,
  pageSize: 20,
  totalCount,
});

const report = (extra: Partial<ReportedContent> = {}): ReportedContent => ({
  reportId: 11,
  contentType: 'STOREFRONT',
  contentId: 12,
  contentTitle: 'Bánh xèo Cô Tư',
  contentBody: null,
  contentStatus: 'VISIBLE',
  contentExists: true,
  reporterName: 'Lê An',
  reason: 'Ảnh không đúng món',
  status: 'PENDING',
  reviewedByName: null,
  createdAt: '2026-10-08T07:20:00Z',
  reviewedAt: null,
  ...extra,
});

const complaint = (extra: Partial<OrderComplaint> = {}): OrderComplaint => ({
  complaintId: 21,
  orderId: 5,
  orderCode: 'DH-0005',
  orderStatus: 'COMPLETED',
  customerName: 'Nguyễn Văn A',
  storefrontName: 'Bún chả Hàng Mành',
  complaintType: 'REFUND_REQUEST',
  description: 'Thiếu một phần',
  requestedRefundAmount: 40_000,
  status: 'OPEN',
  resolutionNotes: null,
  resolvedByName: null,
  createdAt: '2026-10-09T05:05:00Z',
  resolvedAt: null,
  paymentAmount: 85_000,
  paymentProvider: 'MoMo',
  refundedAmount: 0,
  latestRefundId: null,
  latestRefundStatus: null,
  ...extra,
});

beforeEach(() => {
  useToastStore.setState({ message: null });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  usePlatformSession.setState({ token: '', admin: null, generation: 0 });
  sessionStorage.clear();
  flags.live = false;
});

describe('P01 platform dashboard', () => {
  it('shows the seed figures and keeps every entry point', async () => {
    const user = userEvent.setup();
    mount('/platform/dashboard', '/platform/dashboard', <PlatformDashboardScreen />);

    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByText('trên 1 gian hàng')).toBeInTheDocument();
    expect(screen.getByText('Không có báo cáo mới')).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: /Người mua \d+, Hộ kinh doanh \d+, Cán bộ Phường \d+, Quản trị viên \d+/,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Số liệu mẫu trong trình duyệt/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Chờ kiểm duyệt/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/platform/moderation');
  });

  it('opens accounts from the panel and the account page from the icon', async () => {
    const user = userEvent.setup();
    const { unmount } = mount(
      '/platform/dashboard',
      '/platform/dashboard',
      <PlatformDashboardScreen />,
    );
    await user.click(screen.getByRole('button', { name: /^Tài khoản: \d+$/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/platform/accounts');
    unmount();

    mount('/platform/dashboard', '/platform/dashboard', <PlatformDashboardScreen />);
    await user.click(screen.getByRole('button', { name: 'Tài khoản' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/account');
  });

  it('says the figures are browser samples when the app talks to the server', () => {
    flags.live = true;
    mount('/platform/dashboard', '/platform/dashboard', <PlatformDashboardScreen />);
    expect(screen.getByText('Số liệu mẫu trong trình duyệt, chưa nối máy chủ')).toBeInTheDocument();
  });
});

describe('P02 accounts', () => {
  afterEach(() => {
    useMockDb.getState().setAccountStatus('USR-CUS', 'ACTIVE');
  });

  it('locks a customer in the mock store and shows the new state at once', async () => {
    const user = userEvent.setup();
    mount('/platform/accounts', '/platform/accounts', <AccountsScreen />);

    expect(screen.getAllByText('Không áp dụng')).toHaveLength(2);
    const lock = screen.getAllByRole('button', { name: 'Khoá tài khoản' })[0]!;
    await user.click(lock);

    expect(useMockDb.getState().users.find((u) => u.id === 'USR-CUS')?.account_status).toBe(
      'SUSPENDED',
    );
    expect(screen.getByText('ĐÃ KHOÁ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở khoá' })).toBeInTheDocument();
    expect(screen.getByText('Đã khoá tài khoản Trần Hồng Anh')).toBeInTheDocument();
  });

  it('filters by chip and by phone typed with spaces', async () => {
    const user = userEvent.setup();
    mount('/platform/accounts', '/platform/accounts', <AccountsScreen />);

    await user.click(screen.getByRole('tab', { name: /Hộ kinh doanh/ }));
    const list = screen.getByRole('list', { name: 'Danh sách tài khoản' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);

    await user.type(screen.getByLabelText('Tìm tài khoản'), '0905 000 003');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Lê Văn Minh')).toBeInTheDocument();
  });
});

describe('PlatformConnection gate', () => {
  it('keeps the button locked until both fields are filled, and Enter does not send', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const user = userEvent.setup();
    mount('/platform/categories', '/platform/categories', <CategoriesScreen />);

    const connect = screen.getByRole('button', { name: 'Kết nối Backend' });
    expect(connect).toBeDisabled();
    await user.type(screen.getByLabelText('Số điện thoại'), '0905000005');
    expect(connect).toBeDisabled();
    await user.type(screen.getByLabelText('Mật khẩu'), 'secret{Enter}');
    expect(connect).toBeEnabled();
    expect(fetcher).not.toHaveBeenCalled();
    expect(screen.getByText('Gõ đủ 10 số, bắt đầu bằng 0.')).toBeInTheDocument();
  });
});

describe('P03 categories', () => {
  beforeEach(() => {
    connectAdmin();
    vi.spyOn(platformApi, 'me').mockResolvedValue({ userId: 9, name: 'Đỗ Quốc Anh' });
    vi.spyOn(platformApi, 'categories').mockResolvedValue([
      { categoryId: 1, categoryName: 'Bánh mì', itemCount: 3, createdByName: null },
      { categoryId: 2, categoryName: 'Chè', itemCount: 0, createdByName: 'Quản trị A' },
    ]);
  });

  it('only offers delete on empty categories and explains the padlock', async () => {
    mount('/platform/categories', '/platform/categories', <CategoriesScreen />);
    await screen.findByRole('img', { name: 'Không xoá được: còn 3 món' });
    expect(screen.getAllByRole('button', { name: 'Xoá danh mục' })).toHaveLength(1);
    expect(screen.getByText('Đỗ Quốc Anh · Platform Admin')).toBeInTheDocument();
  });

  it('previews the typed name and clears it after adding', async () => {
    const create = vi.spyOn(platformApi, 'createCategory').mockResolvedValue({
      categoryId: 3,
      categoryName: 'Bánh tráng trộn',
      itemCount: 0,
      createdByName: 'Đỗ Quốc Anh',
    });
    const user = userEvent.setup();
    mount('/platform/categories', '/platform/categories', <CategoriesScreen />);
    await screen.findAllByText('Bánh mì');

    const field = screen.getByLabelText('Danh mục mới');
    await user.type(field, 'Bánh tráng trộn');
    expect(screen.getByText('Mới')).toBeInTheDocument();
    expect(screen.getAllByText('Bánh tráng trộn').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Thêm danh mục' }));
    expect(create).toHaveBeenCalledWith('Bánh tráng trộn');
    await waitFor(() => expect(useToastStore.getState().message).toBe('Đã thêm danh mục'));
    expect(field).toHaveValue('');
  });

  it('keeps the delete dialog open on failure and shows the error under the new-category field', async () => {
    vi.spyOn(platformApi, 'deleteCategory').mockRejectedValue(
      new PlatformApiError(409, 'Danh mục đang được dùng.'),
    );
    const user = userEvent.setup();
    mount('/platform/categories', '/platform/categories', <CategoriesScreen />);

    await user.click(await screen.findByRole('button', { name: 'Xoá danh mục' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá' }));
    expect(await screen.findByText('Danh mục đang được dùng.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('P04 moderation queue', () => {
  beforeEach(() => {
    connectAdmin();
    vi.spyOn(platformApi, 'me').mockResolvedValue({ userId: 9, name: 'Đỗ Quốc Anh' });
  });

  it('loads only the open tab, groups by what needs action and is honest about paging', async () => {
    const reports = vi
      .spyOn(platformApi, 'reportedContent')
      .mockResolvedValue(
        page(
          [
            report(),
            report({ reportId: 12, status: 'HIDDEN', reviewedAt: '2026-10-09T01:00:00Z' }),
          ],
          5,
        ),
      );
    const complaints = vi
      .spyOn(platformApi, 'complaints')
      .mockResolvedValue(page([complaint({ status: 'UNDER_REVIEW' })]));
    const user = userEvent.setup();
    mount('/platform/moderation', '/platform/moderation', <ModerationScreen />);

    const open = await screen.findByRole('region', { name: 'Cần xử lý' });
    const done = screen.getByRole('region', { name: 'Đã xử lý' });
    expect(
      within(open).getByRole('button', { name: /Bánh xèo Cô Tư, Chờ duyệt/ }),
    ).toBeInTheDocument();
    expect(within(done).getAllByRole('button')).toHaveLength(1);
    expect(screen.getByText('Đang hiện 2 trên 5 mục')).toBeInTheDocument();
    expect(reports).toHaveBeenCalledTimes(1);
    expect(complaints).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: /Khiếu nại đơn hàng/ }));
    expect(complaints).toHaveBeenCalledTimes(1);
    const waiting = await screen.findByRole('region', { name: 'Cần xử lý' });
    await user.click(within(waiting).getByRole('button', { name: /DH-0005/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/platform/moderation/complaints/21');
  });
});

describe('P05 reported content review', () => {
  beforeEach(() => {
    connectAdmin();
    vi.spyOn(platformApi, 'me').mockResolvedValue({ userId: 9, name: 'Đỗ Quốc Anh' });
  });

  it('locks "Ẩn nội dung" when the content is gone but still allows dismissing', async () => {
    vi.spyOn(platformApi, 'reportedContentDetail').mockResolvedValue(
      report({ contentExists: false, contentStatus: 'MISSING' }),
    );
    mount(
      '/platform/moderation/content/11',
      '/platform/moderation/content/:reportId',
      <ReportedContentReviewScreen />,
    );
    expect(await screen.findByRole('button', { name: 'Ẩn nội dung' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bỏ qua báo cáo' })).toBeEnabled();
  });

  it('sends hide with the expected status after confirming, and keeps the dialog on error', async () => {
    vi.spyOn(platformApi, 'reportedContentDetail').mockResolvedValue(report());
    const decide = vi
      .spyOn(platformApi, 'decideReportedContent')
      .mockRejectedValue(new PlatformApiError(409, 'Báo cáo đã được xử lý.'));
    const user = userEvent.setup();
    mount(
      '/platform/moderation/content/11',
      '/platform/moderation/content/:reportId',
      <ReportedContentReviewScreen />,
    );
    await user.click(await screen.findByRole('button', { name: 'Ẩn nội dung' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Ẩn nội dung' }),
    );
    await waitFor(() => expect(decide).toHaveBeenCalledWith('11', 'hide', 'PENDING'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Báo cáo đã được xử lý.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the stamp and no decision buttons once hidden', async () => {
    vi.spyOn(platformApi, 'reportedContentDetail').mockResolvedValue(
      report({ status: 'HIDDEN', reviewedAt: '2026-10-09T01:00:00Z', reviewedByName: 'Admin' }),
    );
    mount(
      '/platform/moderation/content/11',
      '/platform/moderation/content/:reportId',
      <ReportedContentReviewScreen />,
    );
    expect(await screen.findByRole('img', { name: /^Đã ẩn, 09\/10\/2026$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ẩn nội dung' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bỏ qua báo cáo' })).not.toBeInTheDocument();
  });

  it('offers retry and a way back to the queue when the report cannot be loaded', async () => {
    vi.spyOn(platformApi, 'reportedContentDetail').mockRejectedValue(
      new PlatformApiError(404, 'Không tìm thấy.'),
    );
    mount(
      '/platform/moderation/content/99',
      '/platform/moderation/content/:reportId',
      <ReportedContentReviewScreen />,
    );
    expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về hàng đợi kiểm duyệt' })).toHaveAttribute(
      'href',
      '/platform/moderation',
    );
  });
});

describe('P06 order complaint review', () => {
  beforeEach(() => {
    connectAdmin();
    vi.spyOn(platformApi, 'me').mockResolvedValue({ userId: 9, name: 'Đỗ Quốc Anh' });
  });

  const open = () =>
    mount(
      '/platform/moderation/complaints/21',
      '/platform/moderation/complaints/:complaintId',
      <OrderComplaintReviewScreen />,
    );

  it('fills the maximum refund and sends it on resolve', async () => {
    vi.spyOn(platformApi, 'complaintDetail').mockResolvedValue(
      complaint({ refundedAmount: 10_000 }),
    );
    const decide = vi.spyOn(platformApi, 'decideComplaint').mockResolvedValue(complaint());
    const user = userEvent.setup();
    open();

    const resolve = await screen.findByRole('button', { name: 'Giải quyết' });
    const reject = screen.getByRole('button', { name: 'Từ chối' });
    expect(resolve).toBeDisabled();
    expect(reject).toBeDisabled();
    // min(40 000 − 10 000, 85 000 − 10 000) = 30 000
    expect(screen.getByText('Tối đa 30.000₫; để trống nếu không hoàn tiền')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Ghi chú xử lý'), 'Đã xác minh');
    await user.type(screen.getByLabelText('Số tiền hoàn được duyệt (không bắt buộc)'), '30001');
    expect(
      screen.getByText('Số tiền hoàn không hợp lệ hoặc vượt mức còn lại.'),
    ).toBeInTheDocument();
    expect(resolve).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /^Điền mức tối đa/ }));
    expect(screen.getByLabelText('Số tiền hoàn được duyệt (không bắt buộc)')).toHaveValue('30000');
    expect(resolve).toBeEnabled();

    await user.click(resolve);
    await waitFor(() =>
      expect(decide).toHaveBeenCalledWith('21', {
        decision: 'RESOLVE',
        notes: 'Đã xác minh',
        expectedStatus: 'OPEN',
        approvedRefundAmount: 30_000,
      }),
    );
  });

  it('rejects without an amount', async () => {
    vi.spyOn(platformApi, 'complaintDetail').mockResolvedValue(complaint());
    const decide = vi.spyOn(platformApi, 'decideComplaint').mockResolvedValue(complaint());
    open();
    fireEvent.change(await screen.findByLabelText('Ghi chú xử lý'), {
      target: { value: 'Không đủ căn cứ' },
    });
    fireEvent.change(screen.getByLabelText('Số tiền hoàn được duyệt (không bắt buộc)'), {
      target: { value: '20000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
    await waitFor(() =>
      expect(decide).toHaveBeenCalledWith('21', {
        decision: 'REJECT',
        notes: 'Không đủ căn cứ',
        expectedStatus: 'OPEN',
        approvedRefundAmount: undefined,
      }),
    );
  });

  it('shows the outcome and no action bar once resolved', async () => {
    vi.spyOn(platformApi, 'complaintDetail').mockResolvedValue(
      complaint({
        status: 'RESOLVED',
        resolutionNotes: 'Đã hoàn 40.000 đ',
        resolvedAt: '2026-10-09T08:00:00Z',
      }),
    );
    open();
    expect(await screen.findByText('Kết quả xử lý')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Giải quyết' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ghi chú xử lý')).not.toBeInTheDocument();
  });
});
