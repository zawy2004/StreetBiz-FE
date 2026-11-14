import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastStore } from '@/components/feedback';
import {
  platformApi,
  PlatformApiError,
  usePlatformSession,
  type OrderComplaint,
  type PlatformDashboard,
  type PlatformAccount,
  type PlatformExport,
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

describe('P01 platform dashboard (ADM-06)', () => {
  const metric = (value: number, previous = 0, changePercent: number | null = null) => ({
    value,
    previous,
    changePercent,
  });
  const dashboard = (extra: Partial<PlatformDashboard> = {}): PlatformDashboard => ({
    from: '2026-10-01',
    to: '2026-10-03',
    previousFrom: '2026-09-28',
    previousTo: '2026-09-30',
    users: {
      newUsers: metric(4, 2, 100),
      total: 40,
      customers: 30,
      vendors: 8,
      wardAuthorities: 1,
      platformAdmins: 1,
      suspended: 2,
    },
    marketplace: {
      vendorAccounts: 8,
      storefrontsOpen: 5,
      storefrontsPaused: 2,
      storefrontsClosed: 1,
      storefrontsHidden: 1,
    },
    orders: {
      placed: metric(12, 10, 20),
      completed: metric(9, 8, 12.5),
      gmv: metric(1_250_000, 1_000_000, 25),
      cancelRejectRate: metric(16.7, 10, 67),
      byStatus: [
        { status: 'COMPLETED', count: 9 },
        { status: 'CANCELLED', count: 2 },
      ],
    },
    moderation: {
      pendingReports: 3,
      reportsFiled: metric(5, 0, null),
      averageReviewHours: 6,
      openComplaints: 2,
      pendingRefunds: 1,
      pendingRefundAmount: 20_000,
    },
    ordersByDay: [
      { day: '2026-10-01', ordersPlaced: 3, ordersCompleted: 2, gmv: 150_000 },
      { day: '2026-10-02', ordersPlaced: 0, ordersCompleted: 0, gmv: 0 },
      { day: '2026-10-03', ordersPlaced: 9, ordersCompleted: 7, gmv: 1_100_000 },
    ],
    topStorefronts: [
      { storefrontId: 2, storefrontName: 'Quán Hai', completedOrders: 5, revenue: 800_000 },
    ],
    ...extra,
  });
  const open = () => mount('/platform/dashboard', '/platform/dashboard', <PlatformDashboardScreen />);

  beforeEach(() => {
    connectAdmin();
    vi.spyOn(platformApi, 'me').mockResolvedValue({ userId: 9, name: 'Đỗ Quốc Anh' });
  });

  it('shows live figures with the previous-period comparison and no sample-data banner', async () => {
    vi.spyOn(platformApi, 'dashboard').mockResolvedValue(dashboard());
    open();

    const orders = await screen.findByRole('region', { name: 'Đơn hàng' });
    expect(within(orders).getByText('12')).toBeInTheDocument();
    expect(within(orders).getByText('+20%')).toBeInTheDocument();
    expect(within(orders).getByText('Kỳ trước: 10')).toBeInTheDocument();
    const gmv = screen.getByRole('region', { name: 'Giá trị đơn hoàn tất' });
    expect(within(gmv).getByText('1.250.000 đ')).toBeInTheDocument();
    expect(screen.getByText('Quán Hai')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Tổng 12 đơn trong 3 ngày' })).toBeInTheDocument();
    expect(screen.queryByText(/Số liệu mẫu/)).not.toBeInTheDocument();
  });

  it('says there is no earlier period to compare with instead of showing a percentage', async () => {
    vi.spyOn(platformApi, 'dashboard').mockResolvedValue(dashboard());
    open();

    const reports = await screen.findByRole('region', { name: 'Báo cáo nội dung mới' });
    expect(within(reports).getByText('Kỳ trước chưa có số liệu')).toBeInTheDocument();
    expect(within(reports).queryByText(/%/)).not.toBeInTheDocument();
  });

  it('shows a calm empty state for an empty period', async () => {
    vi.spyOn(platformApi, 'dashboard').mockResolvedValue(
      dashboard({
        orders: {
          placed: metric(0),
          completed: metric(0),
          gmv: metric(0),
          cancelRejectRate: metric(0),
          byStatus: [],
        },
        ordersByDay: [{ day: '2026-10-01', ordersPlaced: 0, ordersCompleted: 0, gmv: 0 }],
        topStorefronts: [],
      }),
    );
    open();

    expect(await screen.findByText('Chưa có đơn nào trong kỳ này.')).toBeInTheDocument();
    expect(screen.getByText('Chưa có đơn hoàn tất nào trong kỳ này.')).toBeInTheDocument();
    expect(screen.getByText('Chưa có đơn hàng nào trong kỳ')).toBeInTheDocument();
  });

  it('asks again for the chosen range', async () => {
    const load = vi.spyOn(platformApi, 'dashboard').mockResolvedValue(dashboard());
    const user = userEvent.setup();
    open();
    await screen.findByRole('region', { name: 'Đơn hàng' });
    expect(load).toHaveBeenCalledTimes(1);
    const first = load.mock.calls[0]![0]!;
    expect(first.from! < first.to!).toBe(true);

    await user.click(screen.getByRole('tab', { name: '7 ngày' }));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    const second = load.mock.calls[1]![0]!;
    expect(second.to).toBe(first.to);
    expect(second.from! > first.from!).toBe(true);
  });

  it('blocks a reversed custom range without calling the server', async () => {
    const load = vi.spyOn(platformApi, 'dashboard').mockResolvedValue(dashboard());
    const user = userEvent.setup();
    open();
    await screen.findByRole('region', { name: 'Đơn hàng' });

    await user.click(screen.getByRole('tab', { name: 'Tuỳ chọn' }));
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-10-20' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-10-01' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('tối đa 366 ngày');
    const calls = load.mock.calls.length;
    await new Promise((r) => setTimeout(r, 50));
    expect(load.mock.calls.length).toBe(calls);
  });

  it('keeps every entry point', async () => {
    vi.spyOn(platformApi, 'dashboard').mockResolvedValue(dashboard());
    const user = userEvent.setup();
    open();

    await user.click(await screen.findByRole('button', { name: /^Chờ kiểm duyệt/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/platform/moderation');
  });

  it('opens accounts from the panel and the account page from the icon', async () => {
    vi.spyOn(platformApi, 'dashboard').mockResolvedValue(dashboard());
    const user = userEvent.setup();
    const { unmount } = open();
    await user.click(await screen.findByRole('button', { name: /^Tài khoản: \d+$/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/platform/accounts');
    unmount();

    open();
    await user.click(await screen.findByRole('button', { name: 'Tài khoản' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/account');
  });

  it('offers a retry when the figures cannot be loaded', async () => {
    const load = vi
      .spyOn(platformApi, 'dashboard')
      .mockRejectedValueOnce(new PlatformApiError(500, 'Máy chủ lỗi.'))
      .mockResolvedValue(dashboard());
    const user = userEvent.setup();
    open();

    expect(await screen.findByText('Máy chủ lỗi.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('region', { name: 'Đơn hàng' })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('P02 accounts (ADM-02)', () => {
  const account = (extra: Partial<PlatformAccount> = {}): PlatformAccount => ({
    userId: 31,
    fullName: 'Trần Hồng Anh',
    maskedPhone: '090****003',
    roleCode: 'CUSTOMER',
    accountStatus: 'ACTIVE',
    createdAt: '2026-09-01T03:00:00Z',
    lastLoginAt: '2026-10-20T03:00:00Z',
    activeSessions: 2,
    storefrontCount: 0,
    ...extra,
  });
  const open = () => mount('/platform/accounts', '/platform/accounts', <AccountsScreen />);

  beforeEach(() => {
    connectAdmin();
    vi.spyOn(platformApi, 'me').mockResolvedValue({ userId: 9, name: 'Đỗ Quốc Anh' });
  });

  it('lists live accounts with the masked phone and no officers', async () => {
    const list = vi
      .spyOn(platformApi, 'accounts')
      .mockResolvedValue(
        page([account(), account({ userId: 32, roleCode: 'VENDOR', fullName: 'Lê Văn Minh' })]),
      );
    open();

    const rows = await screen.findByRole('list', { name: 'Danh sách tài khoản' });
    expect(within(rows).getAllByRole('listitem')).toHaveLength(2);
    expect(within(rows).getAllByText('090****003').length).toBeGreaterThan(0);
    expect(list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(screen.queryByText('Không áp dụng')).not.toBeInTheDocument();
  });

  it('sends the role filter and a debounced search, and restarts at page one', async () => {
    const list = vi.spyOn(platformApi, 'accounts').mockResolvedValue(page([account()], 45));
    const user = userEvent.setup();
    open();
    await screen.findByRole('list', { name: 'Danh sách tài khoản' });

    await user.click(screen.getByRole('button', { name: 'Trang sau' }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 }));

    await user.click(screen.getByRole('tab', { name: /Hộ kinh doanh/ }));
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({ role: 'VENDOR', page: 1, pageSize: 20 }),
    );

    await user.type(screen.getByRole('textbox'), 'Minh');
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({ role: 'VENDOR', q: 'Minh', page: 1, pageSize: 20 }),
    );
  });

  it('will not suspend without a reason, then sends it with the expected status', async () => {
    vi.spyOn(platformApi, 'accounts').mockResolvedValue(page([account()]));
    const suspend = vi
      .spyOn(platformApi, 'suspendAccount')
      .mockResolvedValue({ account: account({ accountStatus: 'SUSPENDED' }), history: [] });
    const user = userEvent.setup();
    open();

    await user.click((await screen.findAllByRole('button', { name: 'Khoá tài khoản' }))[0]!);
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Khoá tài khoản' });
    expect(confirm).toBeDisabled();

    await user.type(within(dialog).getByLabelText('Lý do khoá (bắt buộc)'), 'ab');
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Lý do khoá (bắt buộc)'), 'c Bán hàng giả');
    await user.click(confirm);

    await waitFor(() => expect(suspend).toHaveBeenCalledWith(31, 'abc Bán hàng giả'));
    await waitFor(() =>
      expect(useToastStore.getState().message).toBe('Đã khoá tài khoản Trần Hồng Anh'),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reloads the list and keeps the dialog on a 409', async () => {
    const list = vi.spyOn(platformApi, 'accounts').mockResolvedValue(page([account()]));
    vi.spyOn(platformApi, 'suspendAccount').mockRejectedValue(
      new PlatformApiError(409, 'Trạng thái tài khoản đã thay đổi.'),
    );
    const user = userEvent.setup();
    open();

    await user.click((await screen.findAllByRole('button', { name: 'Khoá tài khoản' }))[0]!);
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Lý do khoá (bắt buộc)'), 'Vi phạm');
    await user.click(within(dialog).getByRole('button', { name: 'Khoá tài khoản' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Dữ liệu đã thay đổi');
    await waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(1));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('reactivates without a note', async () => {
    vi.spyOn(platformApi, 'accounts').mockResolvedValue(
      page([account({ accountStatus: 'SUSPENDED' })]),
    );
    const reactivate = vi
      .spyOn(platformApi, 'reactivateAccount')
      .mockResolvedValue({ account: account(), history: [] });
    const user = userEvent.setup();
    open();

    expect(await screen.findByText('ĐÃ KHOÁ')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Mở khoá' })[0]!);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mở khoá' }));
    await waitFor(() => expect(reactivate).toHaveBeenCalledWith(31, undefined));
  });

  it('shows the history of a suspension in the detail dialog', async () => {
    vi.spyOn(platformApi, 'accounts').mockResolvedValue(page([account()]));
    vi.spyOn(platformApi, 'accountDetail').mockResolvedValue({
      account: account(),
      history: [
        {
          action: 'ADM_ACCOUNT_SUSPEND',
          actorName: 'Quản trị A',
          reason: 'Bán hàng giả',
          createdAt: '2026-10-10T03:00:00Z',
        },
      ],
    });
    const user = userEvent.setup();
    open();

    await user.click((await screen.findAllByRole('button', { name: 'Chi tiết' }))[0]!);
    expect(await screen.findByText('Bán hàng giả')).toBeInTheDocument();
    expect(screen.getByText(/Quản trị A/)).toBeInTheDocument();
  });

  it('offers a retry when the network fails', async () => {
    const list = vi
      .spyOn(platformApi, 'accounts')
      .mockRejectedValueOnce(new PlatformApiError(0, 'Không kết nối được Backend.'))
      .mockResolvedValue(page([account()]));
    const user = userEvent.setup();
    open();

    expect(await screen.findByText('Không kết nối được Backend.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('list', { name: 'Danh sách tài khoản' })).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('says so when nothing matches', async () => {
    vi.spyOn(platformApi, 'accounts').mockResolvedValue(page<PlatformAccount>([]));
    open();
    expect(await screen.findByText('Không có tài khoản nào khớp')).toBeInTheDocument();
  });
});

describe('P07 export report (ADM-07)', () => {
  const dashboardStub = {
    from: '2026-10-01',
    to: '2026-10-03',
    previousFrom: '2026-09-28',
    previousTo: '2026-09-30',
    users: { newUsers: { value: 0, previous: 0, changePercent: null }, total: 0, customers: 0, vendors: 0, wardAuthorities: 0, platformAdmins: 0, suspended: 0 },
    marketplace: { vendorAccounts: 0, storefrontsOpen: 0, storefrontsPaused: 0, storefrontsClosed: 0, storefrontsHidden: 0 },
    orders: {
      placed: { value: 0, previous: 0, changePercent: null },
      completed: { value: 0, previous: 0, changePercent: null },
      gmv: { value: 0, previous: 0, changePercent: null },
      cancelRejectRate: { value: 0, previous: 0, changePercent: null },
      byStatus: [],
    },
    moderation: { pendingReports: 0, reportsFiled: { value: 0, previous: 0, changePercent: null }, averageReviewHours: null, openComplaints: 0, pendingRefunds: 0, pendingRefundAmount: 0 },
    ordersByDay: [],
    topStorefronts: [],
  } satisfies PlatformDashboard;

  const historyItem = (extra: Partial<PlatformExport> = {}): PlatformExport => ({
    exportId: 55,
    reportType: 'ORDERS',
    from: '2026-10-01',
    to: '2026-10-03',
    format: 'xlsx',
    status: 'READY',
    failureReason: null,
    fileName: 'streetbiz-orders-20261001-20261003.xlsx',
    requestedAt: '2026-10-04T03:00:00Z',
    completedAt: '2026-10-04T03:00:02Z',
    ...extra,
  });

  const click = vi.fn();

  beforeEach(() => {
    connectAdmin();
    vi.spyOn(platformApi, 'me').mockResolvedValue({ userId: 9, name: 'Đỗ Quốc Anh' });
    vi.spyOn(platformApi, 'dashboard').mockResolvedValue(dashboardStub);
    vi.spyOn(platformApi, 'exports').mockResolvedValue(page([historyItem()]));
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(click);
    click.mockClear();
  });

  const openPanel = async () => {
    const user = userEvent.setup();
    mount('/platform/dashboard', '/platform/dashboard', <PlatformDashboardScreen />);
    await user.click(await screen.findByRole('button', { name: 'Xuất báo cáo' }));
    return { user, dialog: screen.getByRole('dialog') };
  };

  it('sends the chosen type, range and format, downloads the file and refreshes the history', async () => {
    const exportReport = vi.spyOn(platformApi, 'exportReport').mockResolvedValue({
      blob: new Blob(['x']),
      fileName: 'streetbiz-accounts-20261001-20261003.csv',
      exportId: 56,
    });
    const { user, dialog } = await openPanel();

    await user.click(within(dialog).getByRole('radio', { name: /Tài khoản/ }));
    await user.click(within(dialog).getByRole('radio', { name: 'CSV (.csv)' }));
    fireEvent.change(within(dialog).getByLabelText('Từ ngày'), { target: { value: '2026-10-01' } });
    fireEvent.change(within(dialog).getByLabelText('Đến ngày'), { target: { value: '2026-10-03' } });
    await user.click(within(dialog).getByRole('button', { name: 'Xuất báo cáo' }));

    await waitFor(() =>
      expect(exportReport).toHaveBeenCalledWith({
        reportType: 'ACCOUNTS',
        from: '2026-10-01',
        to: '2026-10-03',
        format: 'csv',
      }),
    );
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(useToastStore.getState().message).toBe('Đã xuất streetbiz-accounts-20261001-20261003.csv');
  });

  it('will not export a reversed or oversized range', async () => {
    const exportReport = vi.spyOn(platformApi, 'exportReport');
    const { dialog } = await openPanel();
    const confirm = within(dialog).getByRole('button', { name: 'Xuất báo cáo' });

    fireEvent.change(within(dialog).getByLabelText('Từ ngày'), { target: { value: '2026-10-20' } });
    fireEvent.change(within(dialog).getByLabelText('Đến ngày'), { target: { value: '2026-10-01' } });
    expect(confirm).toBeDisabled();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('không được sau');

    fireEvent.change(within(dialog).getByLabelText('Từ ngày'), { target: { value: '2025-01-01' } });
    fireEvent.change(within(dialog).getByLabelText('Đến ngày'), { target: { value: '2026-10-01' } });
    expect(confirm).toBeDisabled();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('tối đa 366 ngày');
    expect(exportReport).not.toHaveBeenCalled();
  });

  it('shows the server error and saves no file when the export fails', async () => {
    vi.spyOn(platformApi, 'exportReport').mockRejectedValue(
      new PlatformApiError(422, 'Báo cáo vượt quá 50.000 dòng. Hãy chọn khoảng thời gian ngắn hơn.'),
    );
    const { user, dialog } = await openPanel();

    await user.click(within(dialog).getByRole('button', { name: 'Xuất báo cáo' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('vượt quá 50.000 dòng');
    expect(click).not.toHaveBeenCalled();
  });

  it('lists the history and downloads an earlier file again, offering nothing for a failed one', async () => {
    vi.spyOn(platformApi, 'exports').mockResolvedValue(
      page([historyItem(), historyItem({ exportId: 54, status: 'FAILED', failureReason: 'Quá nhiều dòng', fileName: null })]),
    );
    const download = vi.spyOn(platformApi, 'downloadExport').mockResolvedValue({
      blob: new Blob(['x']),
      fileName: 'streetbiz-orders-20261001-20261003.xlsx',
      exportId: 55,
    });
    const { user, dialog } = await openPanel();

    const history = await within(dialog).findByRole('region', { name: 'Lịch sử xuất' });
    expect(within(history).getByText(/Lỗi: Quá nhiều dòng/)).toBeInTheDocument();
    expect(within(history).getAllByRole('button', { name: 'Tải lại' })).toHaveLength(1);

    await user.click(within(history).getByRole('button', { name: 'Tải lại' }));
    await waitFor(() => expect(download).toHaveBeenCalledWith(55));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
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

  it('lets the admin restore hidden content, sending the HIDDEN status after confirming', async () => {
    vi.spyOn(platformApi, 'reportedContentDetail').mockResolvedValue(
      report({ status: 'HIDDEN', reviewedAt: '2026-10-09T01:00:00Z', reviewedByName: 'Admin' }),
    );
    const restore = vi
      .spyOn(platformApi, 'restoreReportedContent')
      .mockResolvedValue(report({ status: 'DISMISSED' }));
    const user = userEvent.setup();
    mount(
      '/platform/moderation/content/11',
      '/platform/moderation/content/:reportId',
      <ReportedContentReviewScreen />,
    );
    await user.click(await screen.findByRole('button', { name: 'Khôi phục nội dung' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('tạm ngưng');
    await user.click(within(dialog).getByRole('button', { name: 'Khôi phục' }));
    await waitFor(() => expect(restore).toHaveBeenCalledWith('11', 'HIDDEN'));
  });

  it('offers no restore for a pending or dismissed report, and locks it when the content is gone', async () => {
    const detail = vi.spyOn(platformApi, 'reportedContentDetail');
    detail.mockResolvedValue(report({ status: 'DISMISSED', reviewedAt: '2026-10-09T01:00:00Z' }));
    const view = mount(
      '/platform/moderation/content/11',
      '/platform/moderation/content/:reportId',
      <ReportedContentReviewScreen />,
    );
    await screen.findByText('Báo cáo đã được xử lý');
    expect(screen.queryByRole('button', { name: 'Khôi phục nội dung' })).not.toBeInTheDocument();
    view.unmount();

    detail.mockResolvedValue(
      report({ status: 'HIDDEN', reviewedAt: '2026-10-09T01:00:00Z', contentExists: false }),
    );
    mount(
      '/platform/moderation/content/11',
      '/platform/moderation/content/:reportId',
      <ReportedContentReviewScreen />,
    );
    expect(await screen.findByRole('button', { name: 'Khôi phục nội dung' })).toBeDisabled();
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
