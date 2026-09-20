import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import type { ApiRegistration } from '@/core/api';

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

function renderVendorHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/vendor/home']}>
        <Routes>
          <Route path="/vendor/home" element={<VendorHomeScreen />} />
          <Route path="/vendor/registrations/:id" element={<div>registration detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('VendorHomeScreen (live API)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

  it('shows the empty state once the real registration list is confirmed empty', async () => {
    api.list.mockResolvedValue([]);

    renderVendorHome();

    expect(await screen.findByText('Chưa có hồ sơ đăng ký')).toBeInTheDocument();
  });
});
