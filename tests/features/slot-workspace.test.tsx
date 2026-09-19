import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import type { FeeQuote, SlotHold } from '@/core/api/side-api';
import { FeatureCard } from '@/features/sidewalk-slots/components/FeatureCard';
import { SlotCard } from '@/features/sidewalk-slots/components/SlotCard';
import { makeFeature, makeSlot } from './slot-fixtures';

const api = vi.hoisted(() => ({
  getSlotQuote: vi.fn(),
  listHolds: vi.fn(),
  createHold: vi.fn(),
  releaseHold: vi.fn(),
  getSlot: vi.fn(),
  submitOpenSlotApplication: vi.fn(),
}));
const registrations = vi.hoisted(() => ({ list: [] as unknown[] }));

vi.mock('@/core/api/side-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api/side-api')>();
  return { ...actual, sideApi: { ...actual.sideApi, ...api } };
});
vi.mock('@/features/business-registrations/useRegistrations', () => ({
  useRegistrations: () => ({ registrations: registrations.list }),
}));

const { SlotApplyForm } = await import('@/features/sidewalk-slots/components/SlotApplyForm');
const { useAuthStore } = await import('@/store/auth-store');

const NOW = Date.parse('2026-09-19T08:00:00Z');
const isoIn = (minutes: number) => new Date(NOW + minutes * 60_000).toISOString();

const slot = makeSlot({ slotId: 10, slotCode: 'NVL-01', latitude: 16.06, longitude: 108.21 });

const quote: FeeQuote = {
  slotId: 10,
  termDays: 90,
  total: 3_620_000,
  lines: [
    { kind: 'RENT', label: null, calcBasis: 'PER_DAY', unitAmount: 30000, quantity: 90, amount: 2_700_000 },
    { kind: 'FEE', label: 'Phí vệ sinh', calcBasis: 'PER_DAY', unitAmount: 3000, quantity: 90, amount: 270_000 },
    { kind: 'FEE', label: 'Tiền đặt cọc', calcBasis: 'PER_TERM', unitAmount: 500000, quantity: 1, amount: 500_000 },
  ],
};

const approvedRegistration = { registrationId: 7, registrationStatus: 'APPROVED', displayName: 'Xe banh mi' };

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
  vi.useRealTimers();
  // jsdom has no matchMedia; report a desktop-width viewport so the full top bar renders.
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  registrations.list = [approvedRegistration];
  api.getSlotQuote.mockResolvedValue(quote);
  api.listHolds.mockResolvedValue([]);
  api.getSlot.mockResolvedValue(slot);
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
});

describe('SlotCard', () => {
  const base = { selected: false, mine: false, matchesFilters: true, widthPx: 136, nowMs: NOW, onSelect: vi.fn() };

  it('shows the daily price on an available slot and reports a click', async () => {
    const onSelect = vi.fn();
    render(<SlotCard {...base} slot={slot} state="AVAILABLE" onSelect={onSelect} />);

    expect(screen.getByText('30k/ngày')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('slot-card-NVL-01'));
    expect(onSelect).toHaveBeenCalledWith(slot);
  });

  it('shows a countdown on a held slot, saying so when the caller holds it', () => {
    const held = makeSlot({ slotCode: 'NVL-02', latitude: 1, longitude: 1, holdExpiresAt: isoIn(12) });

    const { rerender } = render(<SlotCard {...base} slot={held} state="HELD" />);
    expect(screen.getByText('Giữ chỗ: 12:00')).toBeInTheDocument();

    rerender(<SlotCard {...base} slot={held} state="HELD" mine />);
    expect(screen.getByText('Bạn giữ chỗ: 12:00')).toBeInTheDocument();
  });

  it('names the tenant on a rented slot and never shows a price to apply at', () => {
    const rented = makeSlot({ slotCode: 'NVL-09', latitude: 1, longitude: 1, slotStatus: 'ACTIVE', tenantName: 'Trà sữa Toco' });

    render(<SlotCard {...base} slot={rented} state="ACTIVE" />);

    expect(screen.getByText('Trà sữa Toco')).toBeInTheDocument();
    expect(screen.getByText('ĐÃ CHO THUÊ')).toBeInTheDocument();
    expect(screen.queryByText(/\/ngày/)).not.toBeInTheDocument();
  });

  it('marks the selected card and says the size is unknown rather than guessing', () => {
    const unmeasured = makeSlot({ slotCode: 'NVL-18', latitude: 1, longitude: 1, widthMeters: null, lengthMeters: null });

    render(<SlotCard {...base} slot={unmeasured} state="AVAILABLE" selected />);

    expect(screen.getByText('ĐANG CHỌN')).toBeInTheDocument();
    expect(screen.getByText('Chưa đo')).toBeInTheDocument();
    expect(screen.getByTestId('slot-card-NVL-18')).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('FeatureCard', () => {
  it('flags a corridor that blocks business, and only that one', () => {
    const { rerender } = render(
      <FeatureCard feature={makeFeature({ featureId: 1, featureType: 'TRANSFORMER', label: 'Trạm biến áp', blocksBusiness: true, latitude: 1, longitude: 1 })} />,
    );
    expect(screen.getByText('CẤM KINH DOANH')).toBeInTheDocument();

    rerender(<FeatureCard feature={makeFeature({ featureId: 2, featureType: 'TREE', label: 'Cây xanh', latitude: 1, longitude: 1 })} />);
    expect(screen.queryByText('CẤM KINH DOANH')).not.toBeInTheDocument();
  });
});

describe('SlotApplyForm', () => {
  it('keeps "nộp hồ sơ" disabled until both commitments are ticked, then submits with them accepted', async () => {
    api.submitOpenSlotApplication.mockResolvedValue({ message: 'ok', data: { applicationId: 1 } });
    renderWithProviders(<SlotApplyForm slot={slot} />);

    const submit = await screen.findByRole('button', { name: /Đăng ký & nộp hồ sơ/ });
    expect(submit).toBeDisabled();

    for (const box of screen.getAllByRole('checkbox')) await userEvent.click(box);
    expect(submit).toBeEnabled();

    await userEvent.click(submit);
    await waitFor(() =>
      expect(api.submitOpenSlotApplication).toHaveBeenCalledWith({
        registrationId: 7,
        slotId: 10,
        requestedTermDays: 90,
        commitmentsAccepted: true,
      }),
    );
  });

  it('shows the fee lines and the estimated total from the quote', async () => {
    renderWithProviders(<SlotApplyForm slot={slot} />);

    expect(await screen.findByText(/Phí vệ sinh \(3k\/ngày × 90 ngày\)/)).toBeInTheDocument();
    expect(screen.getByText(/Tiền đặt cọc \(một lần\)/)).toBeInTheDocument();
    expect(screen.getByText('3.620.000 đ')).toBeInTheDocument();
    expect(api.getSlotQuote).toHaveBeenCalledWith(10, 90);
  });

  it('holds the slot for the approved registration', async () => {
    api.createHold.mockResolvedValue({ message: 'held', data: {} });
    renderWithProviders(<SlotApplyForm slot={slot} />);

    await userEvent.click(await screen.findByRole('button', { name: /Giữ chỗ 15 phút/ }));

    await waitFor(() => expect(api.createHold).toHaveBeenCalledWith({ registrationId: 7, slotId: 10 }));
  });

  it('offers to release a hold the caller already owns', async () => {
    const mine: SlotHold = { slotId: 10, registrationId: 7, heldAt: isoIn(-1), expiresAt: isoIn(14) };
    api.listHolds.mockResolvedValue([mine]);
    api.releaseHold.mockResolvedValue({ message: 'released' });
    renderWithProviders(<SlotApplyForm slot={{ ...slot, holdExpiresAt: mine.expiresAt }} />);

    await userEvent.click(await screen.findByRole('button', { name: /Nhả chỗ/ }));

    await waitFor(() => expect(api.releaseHold).toHaveBeenCalledWith(10, 7));
  });

  it('does not let the caller hold or apply for a slot someone else holds', async () => {
    renderWithProviders(<SlotApplyForm slot={{ ...slot, holdExpiresAt: new Date(Date.now() + 10 * 60_000).toISOString() }} />);

    expect(await screen.findByRole('button', { name: /Giữ chỗ 15 phút/ })).toBeDisabled();
    expect(screen.getByText(/đang được hộ khác giữ chỗ/)).toBeInTheDocument();
    for (const box of screen.getAllByRole('checkbox')) await userEvent.click(box);
    expect(screen.getByRole('button', { name: /Đăng ký & nộp hồ sơ/ })).toBeDisabled();
  });

  it('asks for an approved registration instead of showing a form that cannot work', async () => {
    registrations.list = [{ registrationId: 8, registrationStatus: 'SUBMITTED', displayName: 'x' }];
    renderWithProviders(<SlotApplyForm slot={slot} />);

    expect(await screen.findByText(/hồ sơ kinh doanh đã được duyệt/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Đăng ký & nộp hồ sơ/ })).not.toBeInTheDocument();
  });

  it('refuses a term outside 1-365 days', async () => {
    renderWithProviders(<SlotApplyForm slot={slot} />);
    const input = await screen.findByLabelText(/Số ngày thuê/);

    await userEvent.clear(input);
    await userEvent.type(input, '400');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    for (const box of screen.getAllByRole('checkbox')) await userEvent.click(box);
    expect(screen.getByRole('button', { name: /Đăng ký & nộp hồ sơ/ })).toBeDisabled();
  });
});
