import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ listHolds: vi.fn(), getSlot: vi.fn() }));
const registrations = vi.hoisted(() => ({ list: [] as unknown[] }));

vi.mock('@/core/api/side-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api/side-api')>();
  return { ...actual, sideApi: { ...actual.sideApi, ...api } };
});
vi.mock('@/features/business-registrations/useRegistrations', () => ({
  useRegistrations: () => ({ registrations: registrations.list }),
}));

const { VendorTopBar } = await import('@/layouts/VendorTopBar');
const { useWorkspaceStore } = await import('@/features/sidewalk-slots/workspace-store');
const { useAuthStore } = await import('@/store/auth-store');

const NOW = Date.now();
const isoIn = (minutes: number) => new Date(NOW + minutes * 60_000).toISOString();

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  // jsdom has no matchMedia; report a desktop-width viewport so the full top bar renders.
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  registrations.list = [{ registrationId: 7, registrationStatus: 'APPROVED', displayName: 'Xe banh mi' }];
  api.listHolds.mockResolvedValue([]);
  useAuthStore.setState({
    user: {
      id: '1',
      fullName: 'Nguyen Van A',
      phone: '0905888001',
      password: '',
      role_code: 'VENDOR',
      account_status: 'ACTIVE',
    } as never,
  });
  useWorkspaceStore.setState({ zones: [], searchIndex: [], zoneId: null, selectedSlotId: null });
});

describe('VendorTopBar', () => {
  it('shows the derived HKD code, the hold count and a link to notifications', async () => {
    api.listHolds.mockResolvedValue([
      { slotId: 10, registrationId: 7, heldAt: isoIn(-1), expiresAt: isoIn(14) },
      { slotId: 11, registrationId: 7, heldAt: isoIn(-1), expiresAt: isoIn(10) },
    ]);
    renderWithProviders(<VendorTopBar />);

    expect(await screen.findByLabelText('Giỏ giữ chỗ (2)')).toBeInTheDocument();
    expect(screen.getByLabelText('Thông báo')).toHaveAttribute('href', '/account/notifications');
    expect(screen.getByText('Mã định danh: HKD-0007')).toBeInTheDocument();
    expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    // No workspace mounted, so there is nothing to select a route from or search in.
    expect(screen.queryByLabelText('Tuyến')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tìm ô')).not.toBeInTheDocument();
  });

  it('shows the route select and search only while the workspace has registered its zones', async () => {
    useWorkspaceStore.setState({
      zones: [
        { zoneId: 1, zoneName: 'Đường Nguyễn Văn Linh' },
        { zoneId: 2, zoneName: 'Phố đi bộ' },
      ],
      zoneId: 1,
      searchIndex: [{ slotId: 10, slotCode: 'NVL-01', zoneId: 1, zoneName: 'Đường Nguyễn Văn Linh' }],
    });
    renderWithProviders(<VendorTopBar />);

    expect(await screen.findByLabelText('Tuyến')).toHaveValue('1');
    await userEvent.selectOptions(screen.getByLabelText('Tuyến'), '2');
    expect(useWorkspaceStore.getState().zoneId).toBe(2);
  });

  it('jumps to a searched slot: selects its zone and the slot', async () => {
    useWorkspaceStore.setState({
      zones: [{ zoneId: 1, zoneName: 'Đường Nguyễn Văn Linh' }],
      zoneId: 1,
      searchIndex: [{ slotId: 10, slotCode: 'NVL-01', zoneId: 1, zoneName: 'Đường Nguyễn Văn Linh' }],
    });
    renderWithProviders(<VendorTopBar />);

    await userEvent.type(await screen.findByLabelText('Tìm ô'), 'nvl-01');
    await userEvent.click(await screen.findByRole('button', { name: /NVL-01/ }));

    expect(useWorkspaceStore.getState().selectedSlotId).toBe(10);
  });
});
