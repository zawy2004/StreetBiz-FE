import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { vendorRegistrationApi, type ApiRegistration } from '@/core/api';
import { VendorOnboardingScreen } from '@/features/vendor-home/screens/VendorOnboardingScreen';

// The new vendor's path from account to selling, driven by where their registration stands.
vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname}</div>;
}

function mount() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/vendor/onboarding']}>
        <Routes>
          <Route path="/vendor/onboarding" element={<VendorOnboardingScreen />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const reg = (registrationId: number, registrationStatus: string, createdAt = '2026-10-01T00:00:00Z') =>
  ({ registrationId, registrationStatus, createdAt }) as ApiRegistration;

const step = (title: string) => screen.getByRole('heading', { name: title }).closest('li')!;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('VendorOnboardingScreen', () => {
  it('with nothing filed, the registration is the step to do now', async () => {
    vi.spyOn(vendorRegistrationApi, 'list').mockResolvedValue([]);
    const user = userEvent.setup();
    mount();

    const file = await screen.findByRole('heading', { name: 'Hoàn tất hồ sơ đăng ký hộ kinh doanh' });
    expect(screen.getByText('1/6')).toBeInTheDocument();
    expect(within(step('Thuê chỗ trên vỉa hè')).queryByRole('button')).not.toBeInTheDocument();
    await user.click(within(file.closest('li')!).getByRole('button', { name: 'Bắt đầu hồ sơ' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/registrations/new/type');
  });

  it('a submitted file moves the vendor to waiting on the ward', async () => {
    vi.spyOn(vendorRegistrationApi, 'list').mockResolvedValue([reg(4, 'SUBMITTED')]);
    const user = userEvent.setup();
    mount();

    expect(await screen.findByText('Phường đang xem xét hồ sơ của bạn.')).toBeInTheDocument();
    expect(screen.getByText('2/6')).toBeInTheDocument();
    await user.click(within(step('Chờ phường xét duyệt')).getByRole('button', { name: 'Xem tiến độ' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/registrations/4');
  });

  it('a file sent back asks for the missing information', async () => {
    vi.spyOn(vendorRegistrationApi, 'list').mockResolvedValue([reg(4, 'MORE_INFORMATION_REQUIRED')]);
    const user = userEvent.setup();
    mount();

    expect(await screen.findByText('Phường yêu cầu bổ sung — hãy cập nhật và nộp lại.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bổ sung hồ sơ' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/registrations/4');
  });

  it('after a rejection the vendor may start a new file', async () => {
    vi.spyOn(vendorRegistrationApi, 'list').mockResolvedValue([reg(4, 'REJECTED')]);
    mount();

    expect(await screen.findByText('Hồ sơ bị từ chối. Bạn có thể nộp hồ sơ mới.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bắt đầu hồ sơ' })).toBeInTheDocument();
  });

  it('an approved file wins over newer ones and opens slots, stall and ATTP', async () => {
    vi.spyOn(vendorRegistrationApi, 'list').mockResolvedValue([
      reg(5, 'SUBMITTED', '2026-11-01T00:00:00Z'),
      reg(4, 'APPROVED', '2026-10-01T00:00:00Z'),
    ]);
    const user = userEvent.setup();
    mount();

    expect(await screen.findByText('Hồ sơ đã được duyệt.')).toBeInTheDocument();
    expect(screen.getByText('3/6')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở gian hàng' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Khai giấy ATTP' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tìm chỗ' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/slots');
  });

  it('a withdrawn file counts as nothing filed', async () => {
    vi.spyOn(vendorRegistrationApi, 'list').mockResolvedValue([reg(4, 'WITHDRAWN')]);
    mount();

    expect(await screen.findByText(/Khai thông tin chủ hộ, ngành nghề/)).toBeInTheDocument();
  });

  it('offers a retry when the registrations cannot load', async () => {
    vi.spyOn(vendorRegistrationApi, 'list').mockRejectedValue(new Error('Mất kết nối'));
    mount();

    expect(await screen.findByText(/Mất kết nối/)).toBeInTheDocument();
  });
});
