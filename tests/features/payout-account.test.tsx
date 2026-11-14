import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { ApiError } from '@/core/api/problem';
import type { PayoutAccountDto } from '@/core/api';

/**
 * The receiving account a household (its orders) or a ward (its rental fees) connects: payers pay
 * straight into it, StreetBiz never holds the money. The three payOS keys are sent once and the
 * server never returns them, so nothing here may echo a key.
 */

const client = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('@/core/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/api/client')>()),
  apiGet: client.apiGet,
  apiPut: client.apiPut,
  apiPost: client.apiPost,
  apiDelete: client.apiDelete,
}));
vi.mock('@/core/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/config/env')>()),
  isLiveApi: true,
}));

const { wardApi } = await import('@/features/ward-administration/ward-api');
const { useAuthStore } = await import('@/store/auth-store');
const { VendorPayoutAccountScreen, WardPayoutAccountScreen } = await import(
  '@/features/payout-accounts/screens'
);

const none: PayoutAccountDto = {
  connected: false,
  status: null,
  provider: 'payOS',
  bankName: null,
  accountNumberMasked: null,
  accountName: null,
  clientIdMasked: null,
  webhookConfirmed: false,
  webhookConfigured: true,
  lastCheckedAt: null,
  lastError: null,
  connectedAt: null,
  updatedAt: null,
};

const active: PayoutAccountDto = {
  ...none,
  connected: true,
  status: 'ACTIVE',
  bankName: 'Vietcombank',
  accountNumberMasked: '••••••4321',
  accountName: 'PHAM THI LAN',
  clientIdMasked: '••••••t-id',
  webhookConfirmed: true,
  lastCheckedAt: '2026-11-02T18:29:50Z',
  connectedAt: '2026-11-02T18:29:50Z',
};

function mount(screen: 'vendor' | 'ward') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route
            path="/account"
            element={screen === 'vendor' ? <VendorPayoutAccountScreen /> : <WardPayoutAccountScreen />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const key = {
  clientId: 'demo-vendor1-client-id',
  apiKey: 'demo-vendor1-api-key',
  checksumKey: 'demo-vendor1-checksum-key',
};

async function fillKeys() {
  await userEvent.type(await screen.findByLabelText('Client ID'), key.clientId);
  await userEvent.type(screen.getByLabelText('API Key'), key.apiKey);
  await userEvent.type(screen.getByLabelText('Checksum Key'), key.checksumKey);
}

beforeEach(() => vi.resetAllMocks());
afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null, sessionExpired: false });
});

describe('household receiving account', () => {
  it('says the stall takes no online order until an account is connected', async () => {
    client.apiGet.mockResolvedValue(none);
    mount('vendor');

    expect(await screen.findByText('CHƯA KẾT NỐI')).toBeInTheDocument();
    expect(screen.getByText(/Quán chưa nhận đặt món online/)).toBeInTheDocument();
    expect(screen.getByText(/StreetBiz không giữ tiền của bạn/)).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Kết nối payOS' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kiểm tra kết nối' })).not.toBeInTheDocument();
    expect(client.apiGet).toHaveBeenCalledWith('/vendor/payout-account');
  });

  it('asks for all three keys before anything is sent', async () => {
    client.apiGet.mockResolvedValue(none);
    mount('vendor');

    await userEvent.click(await screen.findByRole('button', { name: 'Kết nối' }));

    expect(await screen.findAllByText('Cần nhập trường này.')).toHaveLength(3);
    expect(client.apiPut).not.toHaveBeenCalled();
  });

  it('connects with the three keys, shows the account masked and clears the form', async () => {
    client.apiGet.mockResolvedValue(none);
    client.apiPut.mockResolvedValue(active);
    mount('vendor');

    await fillKeys();
    await userEvent.click(screen.getByRole('button', { name: 'Kết nối' }));

    await waitFor(() => expect(client.apiPut).toHaveBeenCalledWith('/vendor/payout-account', key));
    expect(await screen.findByText('ĐANG HOẠT ĐỘNG')).toBeInTheDocument();
    expect(screen.getByText('Vietcombank')).toBeInTheDocument();
    expect(screen.getByText('••••••4321')).toBeInTheDocument();
    expect(screen.getByText('PHAM THI LAN')).toBeInTheDocument();
    // The form is blank again and now replaces keys: nothing the household typed stays on screen.
    expect(screen.getByRole('form', { name: 'Đổi khoá payOS' })).toBeInTheDocument();
    expect(screen.getByLabelText('Client ID')).toHaveValue('');
    expect(screen.getByLabelText('API Key')).toHaveValue('');
    expect(document.body).not.toHaveTextContent(key.apiKey);
    expect(document.body).not.toHaveTextContent(key.checksumKey);
    expect(screen.getByText(/payOS báo ngay khi có tiền về/)).toBeInTheDocument();
  });

  it('shows why payOS refused the keys and keeps what was typed so they can be fixed', async () => {
    client.apiGet.mockResolvedValue(none);
    client.apiPut.mockRejectedValue(
      new ApiError('domain_rule', 422, 'payOS từ chối khoá của kênh nhận tiền.'),
    );
    mount('vendor');

    await fillKeys();
    await userEvent.click(screen.getByRole('button', { name: 'Kết nối' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('payOS từ chối khoá của kênh nhận tiền.');
    expect(screen.getByLabelText('Client ID')).toHaveValue(key.clientId);
    expect(screen.getByText('CHƯA KẾT NỐI')).toBeInTheDocument();
  });

  it('checks the connection again and shows an account payOS no longer accepts', async () => {
    client.apiGet.mockResolvedValue(active);
    client.apiPost.mockResolvedValue({
      ...active,
      status: 'ERROR',
      lastError: 'payOS từ chối khoá (đã bị đổi).',
    });
    mount('vendor');

    await userEvent.click(await screen.findByRole('button', { name: 'Kiểm tra kết nối' }));

    await waitFor(() => expect(client.apiPost).toHaveBeenCalledWith('/vendor/payout-account/check'));
    expect(await screen.findByText('CẦN KẾT NỐI LẠI')).toBeInTheDocument();
    expect(screen.getByText('payOS từ chối khoá (đã bị đổi).')).toBeInTheDocument();
    expect(screen.getByText(/tạm không nhận thanh toán mới/)).toBeInTheDocument();
  });

  it('disconnects only after confirming, and says earlier payments are still recorded', async () => {
    client.apiGet.mockResolvedValue(active);
    client.apiDelete.mockResolvedValue({ ...active, status: 'DISABLED' });
    mount('vendor');

    await userEvent.click(await screen.findByRole('button', { name: 'Ngắt kết nối' }));
    const dialog = await screen.findByRole('dialog');
    expect(client.apiDelete).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/Khách sẽ không đặt và trả trước được cho quán/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ngắt kết nối' }));

    await waitFor(() => expect(client.apiDelete).toHaveBeenCalledWith('/vendor/payout-account'));
    expect(await screen.findByText('ĐÃ NGẮT KẾT NỐI')).toBeInTheDocument();
    expect(screen.getByText(/vẫn được ghi nhận khi tiền về/)).toBeInTheDocument();
    // Nothing left to check or disconnect on an account that is off.
    expect(screen.queryByRole('button', { name: 'Kiểm tra kết nối' })).not.toBeInTheDocument();
  });

  it('explains the fallback when payOS cannot push payments', async () => {
    client.apiGet.mockResolvedValue({ ...active, webhookConfirmed: false, webhookConfigured: false });
    mount('vendor');

    expect(await screen.findByText(/hệ thống tự hỏi payOS định kỳ/)).toBeInTheDocument();
  });
});

describe('ward receiving account', () => {
  it("is the ward's own, for rental fees, and any officer manages it", async () => {
    useAuthStore.setState({
      user: {
        id: '1', fullName: 'Ward', phone: '0983000001', password: '', role_code: 'WARD_AUTHORITY',
        wardUnitId: 1, account_status: 'ACTIVE',
      },
      sessionExpired: false,
    });
    vi.spyOn(wardApi, 'me').mockResolvedValue({
      userId: '1',
      wardId: 1,
      name: 'Ward',
      sanctionAuthorityTitle: null,
    });
    client.apiGet.mockResolvedValue(none);
    mount('ward');

    expect(await screen.findByRole('heading', { name: 'Tài khoản nhận phí thuê ô' })).toBeInTheDocument();
    expect(await screen.findByText(/Hộ chưa thể trả phí thuê ô online/)).toBeInTheDocument();
    expect(client.apiGet).toHaveBeenCalledWith('/ward/payout-account');
  });
});
