import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { env } from '@/core/config/env';
import { StoreScreen } from '@/features/storefronts/screens/StoreScreen';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

// The offline demo of STO-01/02 (VITE_USE_MOCK_API=true): gated behind the phase-2 flag.
const flags = env as { enablePhase2: boolean };
const initialPhase2 = flags.enablePhase2;

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname}</div>;
}

function mount() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/vendor/store']}>
        <Routes>
          <Route path="/vendor/store" element={<StoreScreen />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const vendorUser = () => useMockDb.getState().users.find((u) => u.id === 'USR-VEN-1')!;

beforeEach(() => {
  flags.enablePhase2 = true;
  useAuthStore.setState({ user: vendorUser() });
});

afterEach(() => {
  cleanup();
  flags.enablePhase2 = initialPhase2;
});

describe('StoreScreen (demo mode)', () => {
  it('says the feature is still in development when phase 2 is off', () => {
    flags.enablePhase2 = false;
    mount();

    expect(screen.getByText('Tính năng đang phát triển')).toBeInTheDocument();
  });

  it('shows the seeded stall, switches its status and opens the menu', async () => {
    const user = userEvent.setup();
    const vendorId = vendorUser().vendorId;
    const stall = useMockDb.getState().storefronts.find((s) => s.vendorId === vendorId);
    expect(stall).toBeDefined();
    mount();

    expect(screen.getAllByRole('heading', { name: stall!.name }).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('tab', { name: 'Tạm dừng' }));
    expect(useMockDb.getState().storefronts.find((s) => s.id === stall!.id)!.availability_status).toBe('PAUSED');
    await user.click(screen.getByRole('tab', { name: 'Đang mở' }));

    await user.click(screen.getByRole('button', { name: 'Quản lý thực đơn' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/store/menu');
  });

  it('a vendor without approval and an active contract is told what is missing', async () => {
    useAuthStore.setState({ user: { ...vendorUser(), vendorId: 'VEN-NOBODY' } });
    const user = userEvent.setup();
    mount();

    expect(screen.getByText('Chưa đủ điều kiện mở gian hàng')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thuê ô vỉa hè' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/slots');
  });
});
