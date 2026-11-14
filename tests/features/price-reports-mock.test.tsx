import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MenuScreen } from '@/features/storefronts/screens/MenuScreen';
import { VendorReportReviewScreen } from '@/features/ward-administration/screens/VendorReportReviewScreen';
import { WardVendorReportsScreen } from '@/features/ward-administration/screens/WardVendorReportsScreen';
import { useMockDb } from '@/mocks/db';
import * as seed from '@/mocks/seed';
import { useAuthStore } from '@/store/auth-store';

// No env mock: vitest runs with VITE_USE_MOCK_API=true, the no-backend demo.

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

function mount(path: string, route: string, element: ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useMockDb.setState({
    reports: seed.VENDOR_REPORTS.map((r) => ({ ...r })),
    menuItems: seed.MENU_ITEMS.map((m) => ({ ...m })),
    priceHistory: seed.MENU_PRICE_HISTORY.map((h) => ({ ...h })),
  });
});

afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null });
});

describe('demo mode: ward reports (WARD-19)', () => {
  it('lists the demo reports with their type, due date and the overdue one marked', () => {
    mount('/ward/inbox/vendor-reports', '/ward/inbox/vendor-reports', <WardVendorReportsScreen />);

    const rows = screen.getAllByRole('button', { name: /Xôi gà Bà Năm/ });
    expect(rows).toHaveLength(2);
    // Overdue first, as the server orders them.
    expect(within(rows[0]!).getByText('Không treo bảng giá')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('Quá hạn')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Bán cao hơn giá niêm yết')).toBeInTheDocument();
  });

  it('mediates a demo overcharge within the amount charged and shows the outcome', async () => {
    const user = userEvent.setup();
    mount(
      '/ward/inbox/vendor-reports/RPT-001',
      '/ward/inbox/vendor-reports/:id',
      <VendorReportReviewScreen />,
    );

    expect(screen.getByRole('region', { name: 'Bằng chứng giá' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Ghi chú hòa giải'), 'Đã hoàn tiền tại quầy');
    fireEvent.change(screen.getByLabelText('Số tiền người bán hoàn (không bắt buộc)'), {
      target: { value: '90000' },
    });
    await user.click(screen.getByRole('button', { name: 'Xác nhận đã hòa giải' }));
    expect(useMockDb.getState().reports.find((r) => r.id === 'RPT-001')?.report_status).toBe(
      'PENDING',
    );

    fireEvent.change(screen.getByLabelText('Số tiền người bán hoàn (không bắt buộc)'), {
      target: { value: '20000' },
    });
    await user.click(screen.getByRole('button', { name: 'Xác nhận đã hòa giải' }));

    expect(useMockDb.getState().reports.find((r) => r.id === 'RPT-001')).toMatchObject({
      report_status: 'REVIEWED',
      resolution: 'MEDIATED',
      resolution_note: 'Đã hoàn tiền tại quầy',
      refund_amount: 20000,
    });
    expect(screen.getByText('Đã hòa giải')).toBeInTheDocument();
  });

  it('sends "Lập biên bản" to the record form with the report it closes', async () => {
    const user = userEvent.setup();
    mount(
      '/ward/inbox/vendor-reports/RPT-002',
      '/ward/inbox/vendor-reports/:id',
      <VendorReportReviewScreen />,
    );

    await user.click(screen.getByRole('radio', { name: /Lập biên bản/ }));
    await user.click(screen.getByRole('button', { name: 'Mở biểu mẫu biên bản' }));

    expect(screen.getByTestId('where')).toHaveTextContent(
      '/ward/patrol/violations/new?sourceReportId=RPT-002&vendorId=VEN-001&slotId=SLOT-022',
    );
  });
});

describe('demo mode: vendor menu with units and price history', () => {
  it('needs a unit for a new dish and records the change in the price history', async () => {
    useAuthStore.setState({ user: seed.USERS.find((u) => u.id === 'USR-VEN-1')! });
    const user = userEvent.setup();
    mount('/vendor/store/menu', '/vendor/store/menu', <MenuScreen />);

    expect(screen.getByText('25.000 đ / phần')).toBeInTheDocument();
    expect(screen.getByText(/Bảng giá bản số 2/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: 'Trà đá' } });
    fireEvent.change(screen.getByLabelText('Giá (đ)'), { target: { value: '5000' } });
    expect(screen.getByRole('button', { name: 'Thêm vào thực đơn' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'ly' }));
    await user.click(screen.getByRole('button', { name: 'Thêm vào thực đơn' }));

    expect(screen.getByText('5.000 đ / ly')).toBeInTheDocument();
    expect(screen.getByText(/Bảng giá bản số 3/)).toBeInTheDocument();
    const history = screen.getByRole('list', { name: 'Các lần đổi giá' });
    expect(within(history).getAllByRole('listitem')[0]).toHaveTextContent('Trà đá');
  });
});
