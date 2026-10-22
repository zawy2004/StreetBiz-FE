import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import type { ApiRegistration } from '@/core/api';
import { financeApi } from '@/core/api/finance-api';
import { sideApi } from '@/core/api/side-api';

const api = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return { ...actual, vendorRegistrationApi: { ...actual.vendorRegistrationApi, list: api.list } };
});

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true };
});

const { VendorHomeScreen } = await import('@/features/vendor-home/screens/VendorHomeScreen');
const { useAuthStore } = await import('@/store/auth-store');

const needsInfoRegistration: ApiRegistration = {
  registrationId: 42,
  vendorType: 'FIXED_STOREFRONT',
  displayName: 'Xoi ga Ba Nam',
  declaredAddress: '12 Le Duan',
  addressLatitude: null,
  addressLongitude: null,
  wardUnitId: 10,
  registrationStatus: 'MORE_INFORMATION_REQUIRED',
  fastTrackFlag: false,
  reviewDecisionReason: 'Ảnh CCCD bị mờ',
  reviewedAt: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: null,
  ownerDateOfBirth: null,
  ownerGender: null,
  ownerEthnicity: null,
  ownerNationality: null,
  idType: null,
  idIssuedDate: null,
  idIssuedPlace: null,
  permanentAddress: null,
  contactAddress: null,
  businessLine: null,
  businessLineCode: null,
  capitalAmount: null,
  laborCount: null,
  plannedStartDate: null,
  foodSafetyCommitmentAt: null,
  identityVerifiedAt: null,
  identityVerificationNote: null,
  householdMembers: [],
};

function SlotsProbe() {
  const location = useLocation();
  return <div>slot workspace {location.search}</div>;
}

function renderVendorHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/vendor/home']}>
        <Routes>
          <Route path="/vendor/home" element={<VendorHomeScreen />} />
          <Route path="/vendor/registrations/:id" element={<div>registration detail</div>} />
          <Route path="/vendor/slots" element={<SlotsProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('VendorHomeScreen (live API)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // The home screen also loads fees, penalties and contracts in live mode.
    vi.spyOn(financeApi, 'fees').mockResolvedValue([]);
    vi.spyOn(financeApi, 'penalties').mockResolvedValue([]);
    vi.spyOn(sideApi, 'listContracts').mockResolvedValue([]);
    useAuthStore.setState({
      user: {
        id: '1',
        fullName: 'Nguyen Van A',
        phone: '0905000001',
        password: '',
        role_code: 'VENDOR',
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

  it('surfaces a real registration needing more information as a todo, not the mock-data empty state', async () => {
    api.list.mockResolvedValue([needsInfoRegistration]);

    renderVendorHome();

    expect(await screen.findByText('Bổ sung hồ sơ: Xoi ga Ba Nam')).toBeInTheDocument();
    // The vendor does have a registration, so the "no registration yet" empty
    // state — which used to always show, since this screen only read the mock
    // store — must not appear.
    expect(screen.queryByText('Chưa có hồ sơ đăng ký')).not.toBeInTheDocument();
  });

  it('navigates to the registration detail screen from the todo item', async () => {
    api.list.mockResolvedValue([needsInfoRegistration]);
    const user = userEvent.setup();

    renderVendorHome();

    await user.click(await screen.findByText('Bổ sung hồ sơ: Xoi ga Ba Nam'));

    expect(await screen.findByText('registration detail')).toBeInTheDocument();
  });

  it('after approval, counts the free slots near the registered spot and opens that street', async () => {
    api.list.mockResolvedValue([
      {
        ...needsInfoRegistration,
        registrationStatus: 'APPROVED',
        displayName: 'Bun bo Co Hoa',
        addressLatitude: 16.06864,
        addressLongitude: 108.219763,
      },
    ]);
    vi.spyOn(sideApi, 'listApplications').mockResolvedValue([]);
    const search = vi.spyOn(sideApi, 'searchSlots').mockResolvedValue([
      { slotId: 9, zoneId: 4, zoneName: 'Hùng Vương', distanceMeters: 220 },
      { slotId: 7, zoneId: 3, zoneName: 'Ông Ích Khiêm', distanceMeters: 80 },
    ] as never);
    const user = userEvent.setup();

    renderVendorHome();

    await user.click(await screen.findByText('Hồ sơ đã duyệt — có 2 ô trống gần chỗ bạn bán'));
    expect(search).toHaveBeenCalledWith({ lat: 16.06864, lng: 108.219763, radiusMeters: 300, take: 50 });
    expect(await screen.findByText('slot workspace ?zone=3&slot=7')).toBeInTheDocument();
  });

  it('says nothing about slots once the vendor already applied for one', async () => {
    api.list.mockResolvedValue([
      { ...needsInfoRegistration, registrationStatus: 'APPROVED', addressLatitude: 16.07, addressLongitude: 108.22 },
    ]);
    vi.spyOn(sideApi, 'listApplications').mockResolvedValue([{ applicationStatus: 'PENDING' }] as never);
    const search = vi.spyOn(sideApi, 'searchSlots').mockResolvedValue([]);

    renderVendorHome();

    expect(await screen.findByText('Việc cần làm')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(search).not.toHaveBeenCalled();
    expect(screen.queryByText(/Hồ sơ đã duyệt/)).not.toBeInTheDocument();
  });

  it('shows the empty state once the real registration list is confirmed empty', async () => {
    api.list.mockResolvedValue([]);

    renderVendorHome();

    expect(await screen.findByText('Chưa có hồ sơ đăng ký')).toBeInTheDocument();
  });
});
