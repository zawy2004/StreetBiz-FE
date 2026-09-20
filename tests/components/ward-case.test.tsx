import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { ApiError } from '@/core/api';
import { WardCaseScreen } from '@/features/ward-administration/screens/WardCaseScreen';
import { wardApi, type WardCase } from '@/features/ward-administration/ward-api';
import { useAuthStore } from '@/store/auth-store';

// WardGate shows a "needs a backend" notice unless the app is in live mode, so
// these screens can only be exercised with isLiveApi forced on.
vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

const record: WardCase = {
  id: '1',
  kind: 'transfers',
  title: 'Chuyển nhượng',
  status: 'ACCEPTED_BY_RECEIVER',
  slotCode: 'S-01',
  applicant: 'Vendor A',
  summary: 'Bên nhận: Vendor B',
  location: null,
  evidenceUrl: null,
  createdAt: '2026-09-17T00:00:00',
  reason: null,
  blockers: [],
  actions: ['APPROVE', 'REJECT'],
  queuePosition: null,
  contractTerm: '01/09 – 30/09',
  outstanding: 0,
  documents: null,
  fastTrack: false,
};
function mount() {
  useAuthStore.setState({
    user: {
      id: '1',
      fullName: 'Ward',
      phone: '0983000001',
      password: '',
      role_code: 'WARD_AUTHORITY',
      wardUnitId: 10,
      account_status: 'ACTIVE',
    },
    sessionExpired: false,
  });
  vi.spyOn(wardApi, 'me').mockResolvedValue({ userId: '1', wardId: 1, name: 'Ward' });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/ward-reviews/transfers/1']}>
        <Routes>
          <Route path="/ward-reviews/:kind/:id" element={<WardCaseScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
describe('ward review decisions', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.setState({ user: null, sessionExpired: false });
  });
  it('requires a reason and explicit confirmation before sending the decision', async () => {
    vi.spyOn(wardApi, 'get').mockResolvedValue(record);
    const decide = vi
      .spyOn(wardApi, 'decide')
      .mockResolvedValue({ ...record, status: 'APPROVED', actions: [] });
    mount();
    const approve = await screen.findByRole('button', { name: 'Phê duyệt' });
    expect(approve).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Đủ điều kiện' } });
    fireEvent.click(approve);
    expect(decide).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() => expect(decide).toHaveBeenCalledWith(record, 'APPROVE', 'Đủ điều kiện'));
  });
  it('does not offer approval when the server reports outstanding debt', async () => {
    vi.spyOn(wardApi, 'get').mockResolvedValue({
      ...record,
      actions: ['REJECT'],
      blockers: ['Còn nợ'],
      outstanding: 100,
    });
    mount();
    await screen.findByText('Còn nợ');
    expect(screen.queryByRole('button', { name: 'Phê duyệt' })).not.toBeInTheDocument();
  });
  it('shows stale-state errors and reloads instead of claiming success', async () => {
    const get = vi.spyOn(wardApi, 'get').mockResolvedValue(record);
    vi.spyOn(wardApi, 'decide').mockRejectedValue(new ApiError('conflict', 409, 'Hồ sơ đã thay đổi'));
    mount();
    await screen.findByRole('button', { name: 'Phê duyệt' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Đủ điều kiện' } });
    fireEvent.click(screen.getByRole('button', { name: 'Phê duyệt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    await screen.findByText('Hồ sơ đã thay đổi');
    expect(screen.queryByText('Quyết định đã được lưu vào Backend.')).not.toBeInTheDocument();
    expect(get.mock.calls.length).toBeGreaterThan(1);
  });
});
