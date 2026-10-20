import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import type { RentalApplication, RentalContract, SlotTransferRequest } from '@/core/api/side-api';
import { summarizeMySlots } from '@/features/sidewalk-slots/my-slots-summary';

const api = vi.hoisted(() => ({ listApplications: vi.fn(), listContracts: vi.fn(), listTransfers: vi.fn() }));

vi.mock('@/core/api/side-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api/side-api')>();
  return { ...actual, sideApi: { ...actual.sideApi, ...api } };
});

const { MySlotsScreen } = await import('@/features/sidewalk-slots/screens/MySlotsScreen');

const application = (status: string) => ({ applicationId: 1, applicationStatus: status }) as RentalApplication;
const contract = (status: string) => ({ contractId: 1, contractStatus: status }) as RentalContract;
const transfer = (status: string) => ({ transferId: 1, transferStatus: status }) as SlotTransferRequest;

describe('summarizeMySlots', () => {
  it('counts open applications and flags the ones that need more information', () => {
    const open = summarizeMySlots({ applications: [application('PENDING'), application('UNDER_REVIEW'), application('APPROVED')] });
    expect(open.applications).toEqual({ text: '2 đơn đang chờ duyệt', attention: false });

    const needInfo = summarizeMySlots({ applications: [application('PENDING'), application('MORE_INFORMATION_REQUIRED')] });
    expect(needInfo.applications).toEqual({ text: '1 đơn cần bổ sung', attention: true });

    expect(summarizeMySlots({ applications: [] }).applications.text).toBe('Chưa có đơn nào đang chờ');
  });

  it('counts only active contracts', () => {
    expect(summarizeMySlots({ contracts: [contract('ACTIVE'), contract('EXPIRED'), contract('ACTIVE')] }).contracts.text).toBe(
      '2 hợp đồng đang hiệu lực',
    );
    expect(summarizeMySlots({ contracts: [contract('CANCELLED')] }).contracts.text).toBe('Chưa có hợp đồng hiệu lực');
  });

  it('flags incoming transfers still waiting on the vendor', () => {
    const waiting = summarizeMySlots({ incomingTransfers: [transfer('PENDING'), transfer('APPROVED')] });
    expect(waiting.transfers).toEqual({ text: '1 yêu cầu chờ bạn xác nhận', attention: true });
    expect(summarizeMySlots({ incomingTransfers: [] }).transfers.attention).toBe(false);
  });

  it('gives a neutral line, not a zero, while a list has not loaded', () => {
    const summary = summarizeMySlots({});
    expect(summary.applications.text).toBe('Theo dõi đơn đã nộp');
    expect(summary.contracts.text).toBe('Xem hợp đồng, gia hạn, trả ô');
    expect(summary.transfers.text).toBe('Chuyển ô cho hộ khác hoặc nhận ô');
    expect(summary.applications.attention || summary.contracts.attention || summary.transfers.attention).toBe(false);
  });
});

describe('MySlotsScreen', () => {
  function renderScreen() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/vendor/slots/mine']}>
          <Routes>
            <Route path="/vendor/slots/mine" element={<MySlotsScreen />} />
            <Route path="/vendor/slots/contracts" element={<div>contracts page</div>} />
            <Route path="/vendor/slots/transfers" element={<div>transfers page</div>} />
            <Route path="/vendor/slots/rental-applications" element={<div>applications page</div>} />
            <Route path="/vendor/slots/slot-proposals/new" element={<div>proposal page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    vi.resetAllMocks();
    api.listApplications.mockResolvedValue([application('PENDING')]);
    api.listContracts.mockResolvedValue([contract('ACTIVE')]);
    api.listTransfers.mockResolvedValue([transfer('PENDING')]);
  });

  it('lists the four sections with a live summary for each', async () => {
    renderScreen();

    expect(await screen.findByText('1 đơn đang chờ duyệt')).toBeInTheDocument();
    expect(screen.getByText('1 hợp đồng đang hiệu lực')).toBeInTheDocument();
    expect(screen.getByText('1 yêu cầu chờ bạn xác nhận')).toBeInTheDocument();
    expect(screen.getByText('Đề xuất ô mới')).toBeInTheDocument();
  });

  it('still opens every section when a list fails to load', async () => {
    api.listApplications.mockRejectedValue(new Error('boom'));
    renderScreen();

    await userEvent.click(await screen.findByText('Đơn thuê ô'));

    expect(await screen.findByText('applications page')).toBeInTheDocument();
  });

  it('navigates to the contracts page', async () => {
    renderScreen();

    await userEvent.click(await screen.findByText('Hợp đồng thuê ô'));

    expect(await screen.findByText('contracts page')).toBeInTheDocument();
  });
});
