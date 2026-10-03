import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

import { AiSuggestionCard } from '@/features/ward-administration/components/AiSuggestionCard';
import { GeofenceDriftPanel } from '@/features/ward-administration/components/GeofenceDriftPanel';
import { complianceApi, type GeofenceDriftReport } from '@/features/ward-administration/ward-api';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

function withQueryClient(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {ui}
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, sessionExpired: false });
});

describe('AiSuggestionCard', () => {
  it('renders no accept/reject controls when there is no logged suggestion', () => {
    withQueryClient(<AiSuggestionCard title="Gợi ý [AI]" aiLogId={null} />);
    expect(screen.queryByRole('button', { name: 'Chấp nhận gợi ý' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Không chấp nhận' })).not.toBeInTheDocument();
  });

  it('sends the officer note with an accept decision and shows the recorded result', async () => {
    const feedback = vi.spyOn(complianceApi, 'aiFeedback').mockResolvedValue({
      aiLogId: 42,
      accepted: true,
      reviewedAt: '2026-10-03T08:00:00Z',
      reviewerName: 'Cán bộ phường',
    });
    withQueryClient(<AiSuggestionCard title="Gợi ý giá thuê [AI]" aiLogId={42} />);

    fireEvent.change(screen.getByPlaceholderText('Ghi chú (không bắt buộc)'), {
      target: { value: 'Đồng ý với mức giá đề xuất' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Chấp nhận gợi ý' }));

    await waitFor(() => expect(feedback).toHaveBeenCalledWith(42, true, 'Đồng ý với mức giá đề xuất'));
    expect(await screen.findByText(/Đã chấp nhận/)).toBeInTheDocument();
  });

  it('sends a reject decision and lets the officer change their mind afterwards', async () => {
    const feedback = vi.spyOn(complianceApi, 'aiFeedback').mockResolvedValue({
      aiLogId: 7,
      accepted: false,
      reviewedAt: '2026-10-03T08:00:00Z',
      reviewerName: 'Cán bộ phường',
    });
    withQueryClient(<AiSuggestionCard title="Gợi ý [AI]" aiLogId={7} />);

    fireEvent.click(screen.getByRole('button', { name: 'Không chấp nhận' }));
    await waitFor(() => expect(feedback).toHaveBeenCalledWith(7, false, undefined));
    expect(await screen.findByText(/Không chấp nhận/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đổi ý' }));
    expect(screen.getByRole('button', { name: 'Chấp nhận gợi ý' })).toBeInTheDocument();
  });
});

describe('GeofenceDriftPanel', () => {
  const report: GeofenceDriftReport = {
    windowDays: 30,
    toleranceMeters: 25,
    items: [
      {
        permitId: 1,
        contractId: 1,
        slotId: 1,
        slotCode: 'NVL-01',
        zoneName: 'HC1-NVL',
        vendorName: 'Hộ A',
        scanCount: 3,
        offSiteCount: 3,
        maxDistanceMeters: 95,
        meanOffsetMeters: 95,
        meanOffsetBearingDegrees: 0,
        level: 'DRIFT',
        pattern: 'CONSISTENT_DIRECTION',
        lastOffSiteAt: '2026-10-01T00:00:00Z',
        scans: [
          { scanId: 1, scannedAt: '2026-10-01T00:00:00Z', scanContext: 'WARD_INSPECTION', distanceMeters: 95, latitude: 16.06, longitude: 108.21 },
        ],
        explanation: '3/3 lần quét cách ô cấp phép quá 25 m, cùng hướng Bắc khoảng 95 m.',
        isAiGenerated: false,
        aiLogId: null,
      },
    ],
  };

  it('renders nothing while there are no drifting permits', async () => {
    vi.spyOn(complianceApi, 'geofenceDrift').mockResolvedValue({ windowDays: 30, toleranceMeters: 25, items: [] });
    const { container } = withQueryClient(<GeofenceDriftPanel />);
    await waitFor(() => expect(container.textContent).toBe(''));
  });

  it('lists a drifting permit with its scan count and can expand the scan history', async () => {
    vi.spyOn(complianceApi, 'geofenceDrift').mockResolvedValue(report);
    withQueryClient(<GeofenceDriftPanel />);

    expect(await screen.findByText(/NVL-01/)).toBeInTheDocument();
    expect(screen.getByText(/3\/3 lần quét lệch/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Xem 1 lượt quét/ }));
    expect(screen.getByText(/cán bộ quét/)).toBeInTheDocument();
  });
});
