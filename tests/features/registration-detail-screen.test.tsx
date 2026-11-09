import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { vendorRegistrationApi, type ApiRegistration } from '@/core/api';
import { useNewRegistrationStore } from '@/features/business-registrations/new-registration-store';
import { RegistrationDetailScreen } from '@/features/business-registrations/screens/RegistrationDetailScreen';

// REG-03 detail, REG-04 edit and REG-05 withdraw against the live API.
vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname}</div>;
}

function mount(id = '5') {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[`/vendor/registrations/${id}`]}>
        <Routes>
          <Route path="/vendor/registrations/:id" element={<RegistrationDetailScreen />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const registration = (extra: Partial<ApiRegistration> = {}): ApiRegistration => ({
  registrationId: 5,
  vendorType: 'FIXED_STOREFRONT',
  displayName: 'Quán Bún Chả Cô Ba',
  declaredAddress: '12 Bạch Đằng',
  addressLatitude: null,
  addressLongitude: null,
  wardUnitId: 10,
  registrationStatus: 'SUBMITTED',
  fastTrackFlag: false,
  reviewDecisionReason: null,
  reviewedAt: null,
  createdAt: '2026-11-01T02:00:00Z',
  updatedAt: null,
  ownerDateOfBirth: '1990-01-02',
  ownerGender: 'FEMALE',
  ownerEthnicity: 'Kinh',
  ownerNationality: 'Việt Nam',
  idType: 'CCCD',
  idIssuedDate: '2021-01-01',
  idIssuedPlace: 'Cục CS QLHC',
  permanentAddress: '1 Lê Lợi',
  contactAddress: null,
  businessLine: 'Ăn uống',
  businessLineCode: '5610',
  capitalAmount: 50_000_000,
  laborCount: 2,
  plannedStartDate: '2026-12-01',
  foodSafetyCommitmentAt: '2026-11-01T02:00:00Z',
  identityVerifiedAt: null,
  identityVerificationNote: null,
  householdMembers: [],
  ...extra,
});

function stubDetail(extra: Partial<ApiRegistration> = {}) {
  return vi.spyOn(vendorRegistrationApi, 'get').mockResolvedValue({ registration: registration(extra), evidence: [] } as never);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useNewRegistrationStore.getState().reset();
});

describe('RegistrationDetailScreen', () => {
  it('shows a submitted file with edit and withdraw, and no documents yet', async () => {
    stubDetail();
    mount();

    expect(await screen.findAllByText('Quán Bún Chả Cô Ba')).not.toHaveLength(0);
    expect(screen.getByText(/Chưa có giấy tờ nào\. Chọn "Chỉnh sửa" để tải lên\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chỉnh sửa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rút hồ sơ' })).toBeInTheDocument();
  });

  it('"Chỉnh sửa" loads the file into the wizard and opens its first step', async () => {
    stubDetail({ capitalAmount: null, laborCount: 3 });
    const user = userEvent.setup();
    mount();

    await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa' }));

    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/registrations/new/type');
    expect(useNewRegistrationStore.getState()).toMatchObject({
      registrationId: 5,
      displayName: 'Quán Bún Chả Cô Ba',
      capitalAmount: '',
      laborCount: '3',
      foodSafetyCommitment: true,
    });
  });

  it('a file sent back for more information shows the ward reason and an update button', async () => {
    stubDetail({ registrationStatus: 'MORE_INFORMATION_REQUIRED', reviewDecisionReason: 'Ảnh CCCD bị mờ' });
    const user = userEvent.setup();
    mount();

    expect(await screen.findByText(/Ảnh CCCD bị mờ/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cập nhật hồ sơ' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/registrations/new/type');
  });

  it('an approved storefront offers the address update but not editing; a rejected one offers nothing', async () => {
    stubDetail({ registrationStatus: 'APPROVED' });
    mount();

    expect((await screen.findAllByRole('button', { name: /Cập nhật địa chỉ kinh doanh/ })).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa' })).not.toBeInTheDocument();
    // Live mode hides the adjacent-slot shortcut until SIDE-03A has a real picker.
    expect(screen.queryByText('Thuê ô vỉa hè liền kề')).not.toBeInTheDocument();
    cleanup();

    stubDetail({ registrationStatus: 'REJECTED', reviewDecisionReason: 'Sai địa chỉ' });
    mount();
    await screen.findByText(/Sai địa chỉ/);
    expect(screen.queryByRole('button', { name: 'Rút hồ sơ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa' })).not.toBeInTheDocument();
  });

  it('an approved itinerant file points to renting a slot separately (BR-08)', async () => {
    stubDetail({ vendorType: 'ITINERANT', registrationStatus: 'APPROVED' });
    const user = userEvent.setup();
    mount();

    const [rent] = await screen.findAllByRole('button', { name: /Thuê ô vỉa hè/ });
    await user.click(rent!);
    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/slots');
  });

  it('withdraws only after confirmation and goes back to the list', async () => {
    stubDetail();
    const withdraw = vi.spyOn(vendorRegistrationApi, 'withdraw').mockResolvedValue({ message: 'ok' });
    const user = userEvent.setup();
    mount();

    await user.click(await screen.findByRole('button', { name: 'Rút hồ sơ' }));
    expect(withdraw).not.toHaveBeenCalled();
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Rút hồ sơ' }));

    await waitFor(() => expect(withdraw).toHaveBeenCalledWith(5));
    expect(await screen.findByTestId('where')).toHaveTextContent('/vendor/registrations');
  });

  it('stays on the file when the backend refuses the withdrawal (BR-16)', async () => {
    stubDetail({ registrationStatus: 'APPROVED' });
    vi.spyOn(vendorRegistrationApi, 'withdraw').mockRejectedValue(new Error('Hồ sơ đang gắn với hợp đồng thuê ô.'));
    const user = userEvent.setup();
    mount();

    await user.click(await screen.findByRole('button', { name: 'Rút hồ sơ' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Rút hồ sơ' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('downloads Mẫu số 01 under the registration number', async () => {
    stubDetail({ registrationStatus: 'APPROVED' });
    const download = vi.spyOn(vendorRegistrationApi, 'downloadDocument').mockResolvedValue(new Blob(['pdf']));
    const createObjectURL = vi.fn(() => 'blob:form01');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    mount();

    const [pdf] = await screen.findAllByRole('button', { name: 'Tải .pdf' });
    await user.click(pdf!);

    await waitFor(() => expect(download).toHaveBeenCalledWith(5, 'pdf'));
    expect(click).toHaveBeenCalled();
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('DangKyHKD_5.pdf');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:form01');
  });

  it('shows the API error with a retry, and a not-found state with a way back', async () => {
    vi.spyOn(vendorRegistrationApi, 'get').mockRejectedValueOnce(new Error('Lỗi máy chủ'));
    mount();
    expect(await screen.findByText(/Lỗi máy chủ/)).toBeInTheDocument();
    cleanup();

    vi.spyOn(vendorRegistrationApi, 'get').mockResolvedValue({ registration: undefined, evidence: [] } as never);
    mount('6');
    expect(await screen.findByText('Không tìm thấy hồ sơ.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Về danh sách hồ sơ/ })).toHaveAttribute('href', '/vendor/registrations');
  });
});
