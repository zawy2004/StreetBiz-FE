import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

import { useToastStore } from '@/components/feedback';
import { InboxScreen } from '@/features/ward-administration/screens/InboxScreen';
import { RegistrationReviewScreen } from '@/features/ward-administration/screens/RegistrationReviewScreen';
import { RentalApplicationReviewScreen } from '@/features/ward-administration/screens/RentalApplicationReviewScreen';
import { VendorReportReviewScreen } from '@/features/ward-administration/screens/VendorReportReviewScreen';
import { WardDashboardScreen } from '@/features/ward-administration/screens/WardDashboardScreen';
import { useAuthStore } from '@/store/auth-store';

// Mock mode (vitest.config forces VITE_USE_MOCK_API=true): the ward review journey
// runs on the in-browser mock DB seed (REG-002 under review, APP-002 pending).

function mount(path: string, pattern: string, element: ReactElement) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={element} />
          <Route path="/ward/inbox" element={<p>inbox page</p>} />
          <Route path="/ward/slots" element={<p>slots page</p>} />
          <Route path="/ward/reports" element={<p>reports page</p>} />
          <Route path="/ward/inbox/registrations/:id" element={<p>registration page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ward review screens (mock mode)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'USR-WARD',
        fullName: 'Phạm Văn Sơn',
        phone: '0905000004',
        password: '',
        role_code: 'WARD_AUTHORITY',
        wardUnitType: 'Phường Hải Châu 1',
        account_status: 'ACTIVE',
      },
      sessionExpired: false,
    });
    useToastStore.getState().hide();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.setState({ user: null, sessionExpired: false });
  });

  it('dashboard: pending count is registrations + applications, and the board numbers navigate', () => {
    mount('/ward/dashboard', '/ward/dashboard', <WardDashboardScreen />);
    const pending = screen.getByRole('button', { name: /^Hồ sơ chờ duyệt: 2\./ });
    expect(screen.queryByRole('button', { name: /Tỷ lệ lấp đầy/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Hộp duyệt Hồ sơ đăng ký/ })).toBeInTheDocument();
    fireEvent.click(pending);
    expect(screen.getByText('inbox page')).toBeInTheDocument();
  });

  it('dashboard: the pavement strip opens the slot grid', () => {
    mount('/ward/dashboard', '/ward/dashboard', <WardDashboardScreen />);
    fireEvent.click(screen.getByRole('button', { name: /ô trên toàn phường$/ }));
    expect(screen.getByText('slots page')).toBeInTheDocument();
  });

  it('inbox (mock): demo subtitle, report chip, no live signposts, rows open the case', () => {
    mount('/ward/inbox', '/ward/inbox', <InboxScreen />);
    expect(screen.getByText('Dữ liệu giả lập (không có Backend)')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Phản ánh/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Hồ sơ vị trí/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mở hồ sơ Bánh mì Hội An' }));
    expect(screen.getByText('registration page')).toBeInTheDocument();
  });

  it('registration review (mock): one decision bar, no downloads, reject needs a note', () => {
    mount(
      '/ward/inbox/registrations/REG-002',
      '/ward/inbox/registrations/:id',
      <RegistrationReviewScreen />,
    );
    expect(screen.queryByRole('button', { name: 'Tải .docx' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Duyệt điểm bán' })).toHaveLength(1);
    expect(screen.getByRole('list', { name: 'Các bước thẩm định' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
    expect(useToastStore.getState().message).toBe('Vui lòng nhập lý do quyết định');
  });

  it('rental review (mock): BR-16 blocks approval and the plan is drawn from the slot size', () => {
    mount(
      '/ward/inbox/rental-applications/APP-002',
      '/ward/inbox/rental-applications/:id',
      <RentalApplicationReviewScreen />,
    );
    expect(screen.getByRole('button', { name: 'Duyệt & Cấp phép số' })).toBeDisabled();
    expect(screen.getByText('Chưa đủ điều kiện cấp phép (Ràng buộc BR-16)')).toBeInTheDocument();
    const plan = screen.getByRole('img', { name: /^Sơ đồ ô / });
    expect(plan.getAttribute('aria-label')).toMatch(/rộng 2 mét/);
    expect(plan.getAttribute('aria-label')).not.toMatch(/m²/);
  });

  it('vendor report: unknown id says so and offers a way back', () => {
    mount(
      '/ward/inbox/vendor-reports/RPT-404',
      '/ward/inbox/vendor-reports/:id',
      <VendorReportReviewScreen />,
    );
    expect(screen.getByText('Không tìm thấy phản ánh.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeInTheDocument();
  });
});
