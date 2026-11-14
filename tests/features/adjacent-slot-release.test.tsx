import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  sideApi,
  type AddressChangeRequest,
  type RentalContract,
} from '@/core/api/side-api';
import {
  AddressChangeHistory,
  ReleaseSlotPicker,
} from '@/features/business-registrations/components/lifecycle/AdjacentSlotRelease';
import { actionLabels } from '@/features/ward-administration/ward-api';

vi.mock('@/features/business-registrations/useRegistrations', () => ({
  useRegistrationDetail: () => ({
    registration: {
      registrationId: 7,
      vendorType: 'FIXED_STOREFRONT',
      registrationStatus: 'APPROVED',
      displayName: 'Bánh mì Cô Ba',
      declaredAddress: '12 Nguyễn Văn Linh',
      evidence: [],
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

const { AddressUpdateScreen } = await import(
  '@/features/business-registrations/screens/AddressUpdateScreen'
);

const contract = (extra: Partial<RentalContract> = {}): RentalContract => ({
  contractId: 5,
  applicationId: 3,
  slotId: 9,
  slotCode: 'NVL-014',
  zoneName: 'Khu Nguyễn Văn Linh',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  contractStatus: 'ACTIVE',
  cancellationReason: null,
  cancelledAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  ...extra,
});

const change = (extra: Partial<AddressChangeRequest> = {}): AddressChangeRequest => ({
  addressChangeId: 1,
  registrationId: 7,
  newAddress: '88 Lê Duẩn',
  newLatitude: null,
  newLongitude: null,
  releasedContractId: 5,
  requestedNewSlotId: null,
  changeStatus: 'PENDING',
  conflictResolutionNote: null,
  reviewedAt: null,
  createdAt: '2026-10-01T03:00:00Z',
  releasedSlotCode: 'NVL-014',
  releaseState: 'PENDING_RELEASE',
  releaseGraceEndsOn: '2026-10-08',
  releaseBlockedByDebt: false,
  ...extra,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SIDE-10 release picker', () => {
  it('offers each active slot, defaults to none, and explains the grace period', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ReleaseSlotPicker contracts={[contract()]} value={null} onChange={onChange} />);

    expect(screen.getByRole('radio', { name: 'Chưa trả ô nào' })).toBeChecked();
    expect(screen.getByText(/sau 7 ngày ân hạn/)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Trả ô NVL-014/ }));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('shows nothing when the vendor has no active slot', () => {
    const { container } = render(<ReleaseSlotPicker contracts={[]} value={null} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('SIDE-10 earlier requests', () => {
  it('says which slot is waiting and until when', () => {
    render(<AddressChangeHistory changes={[change()]} />);

    expect(screen.getByText(/Ô NVL-014 chờ trả, ân hạn đến 08\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Phường có thể gia hạn hoặc cho bạn giữ ô/)).toBeInTheDocument();
  });

  it('warns that a debt is holding the slot back', () => {
    render(<AddressChangeHistory changes={[change({ releaseBlockedByDebt: true })]} />);

    expect(screen.getByText(/còn phí quá hạn hoặc tiền phạt chưa nộp nên ô chưa thể được trả/)).toBeInTheDocument();
  });

  it('confirms a slot that has gone back and says nothing about a request that names no slot', () => {
    render(
      <AddressChangeHistory
        changes={[
          change({ releaseState: 'RELEASED', releaseGraceEndsOn: null }),
          change({ addressChangeId: 2, newAddress: '5 Hàm Nghi', releaseState: null, releasedSlotCode: null, releaseGraceEndsOn: null }),
        ]}
      />,
    );

    expect(screen.getByText('Đã trả ô NVL-014.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText(/chờ trả/)).not.toBeInTheDocument();
  });
});

describe('Ward actions for the waiting slot', () => {
  it('are named in words the officer reads', () => {
    expect(actionLabels.EXTEND_GRACE).toBe('Gia hạn thời gian trả ô cũ');
    expect(actionLabels.CANCEL_RELEASE).toBe('Giữ nguyên ô cũ');
  });
});

describe('AddressUpdateScreen (SIDE-09/10)', () => {
  beforeEach(() => {
    vi.spyOn(sideApi, 'listContracts').mockResolvedValue([contract()]);
    vi.spyOn(sideApi, 'listAddressChanges').mockResolvedValue([change()]);
  });

  const open = () =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/vendor/registrations/7/address']}>
          <Routes>
            <Route path="/vendor/registrations/:id/address" element={<AddressUpdateScreen />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it('sends the address alone when no slot is chosen', async () => {
    const request = vi.spyOn(sideApi, 'requestAddressChange').mockResolvedValue({
      message: 'Đã gửi',
      data: change({ releasedContractId: null, releaseState: null }),
    });
    const user = userEvent.setup();
    open();

    await user.type(await screen.findByLabelText('Địa chỉ kinh doanh mới'), '99 Hàm Nghi');
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith({
        registrationId: 7,
        newAddress: '99 Hàm Nghi',
        releasedContractId: null,
      }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks before giving a slot back, then sends the contract to release', async () => {
    const request = vi.spyOn(sideApi, 'requestAddressChange').mockResolvedValue({
      message: 'Đã gửi',
      data: change(),
    });
    const user = userEvent.setup();
    open();

    await user.type(await screen.findByLabelText('Địa chỉ kinh doanh mới'), '99 Hàm Nghi');
    await user.click(await screen.findByRole('radio', { name: /Trả ô NVL-014/ }));
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Trả ô NVL-014 sau thời gian ân hạn/)).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Gửi và trả ô' }));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith({
        registrationId: 7,
        newAddress: '99 Hàm Nghi',
        releasedContractId: 5,
      }),
    );
  });

  it('lists the earlier request and where its slot stands', async () => {
    open();

    const history = await screen.findByRole('region', { name: 'Yêu cầu đổi địa chỉ đã gửi' });
    expect(within(history).getByText('88 Lê Duẩn')).toBeInTheDocument();
    expect(within(history).getByText(/ân hạn đến 08\/10\/2026/)).toBeInTheDocument();
  });
});
