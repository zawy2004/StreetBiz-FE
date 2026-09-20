import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

import { ApiError } from '@/core/api';
import { WardGate } from '@/features/ward-administration/components/WardGate';
import { wardApi } from '@/features/ward-administration/ward-api';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

function mount() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <WardGate>
          <p>Danh sách hồ sơ</p>
        </WardGate>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ward gate', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: '1',
        fullName: 'Nguyễn Thị Hồng Vân',
        phone: '0983000001',
        password: '',
        role_code: 'WARD_AUTHORITY',
        wardUnitId: 10,
        account_status: 'ACTIVE',
      },
      sessionExpired: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.setState({ user: null, sessionExpired: false });
  });

  it('uses the signed-in session and never asks for a pasted token', async () => {
    vi.spyOn(wardApi, 'me').mockResolvedValue({
      userId: '1',
      wardId: 10,
      name: 'Nguyễn Thị Hồng Vân',
    });

    mount();

    await screen.findByText('Danh sách hồ sơ');
    expect(screen.getByText(/Phường #10/)).toBeInTheDocument();
    // The old WardConnection made officers paste a JWT; nothing like it may remain.
    expect(screen.queryByLabelText(/Access token/i)).not.toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it('explains a missing ward assignment and offers no retry', async () => {
    // WardActorResolver answers 403 when the account is not an ACTIVE ward
    // officer with a ward assigned -- nothing the user can fix from here.
    vi.spyOn(wardApi, 'me').mockRejectedValue(
      new ApiError('forbidden', 403, 'Tài khoản hiện tại không phải cán bộ phường.'),
    );

    mount();

    await screen.findByText('Tài khoản chưa được gán phường');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tài khoản hiện tại không phải cán bộ phường.',
    );
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
    expect(screen.queryByText('Danh sách hồ sơ')).not.toBeInTheDocument();
  });

  it('offers a retry when the failure is only a connection problem', async () => {
    vi.spyOn(wardApi, 'me').mockRejectedValue(
      new ApiError('network_error', 0, 'Không kết nối được máy chủ.'),
    );

    mount();

    await screen.findByText('Không kết nối được máy chủ.');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});
