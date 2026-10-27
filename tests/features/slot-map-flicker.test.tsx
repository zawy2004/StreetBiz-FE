import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

const searchSlots = vi.hoisted(() => vi.fn());
const mapMounts = vi.hoisted(() => ({ count: 0 }));

vi.mock('@/core/api/side-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api/side-api')>();
  return { ...actual, sideApi: { ...actual.sideApi, searchSlots } };
});
vi.mock('@/features/sidewalk-slots/useHolds', () => ({ useHolds: () => ({ holds: [] }) }));

// Stands in for the Goong map: like the real one, it reports its own viewport once mounted,
// and that viewport is never exactly the screen's default box.
vi.mock('@/features/sidewalk-slots/components/SlotMapView', () => ({
  SlotMapView: ({
    onBoundsChange,
    error,
  }: {
    onBoundsChange: (b: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void;
    error: unknown;
  }) => {
    useEffect(() => {
      mapMounts.count += 1;
      const n = mapMounts.count;
      onBoundsChange({ minLat: 16 + n / 1000, maxLat: 16.1, minLng: 108.2, maxLng: 108.3 });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <p>MAP{error ? ' (lỗi)' : ''}</p>;
  },
}));

const { SlotMapScreen } = await import('@/features/sidewalk-slots/screens/SlotMapScreen');

describe('slot workspace when the slot search fails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapMounts.count = 0;
  });

  it('keeps the map on screen with its error instead of flickering back to the skeleton', async () => {
    searchSlots.mockRejectedValue(new Error('An unexpected error occurred.'));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SlotMapScreen />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('MAP (lỗi)')).toBeInTheDocument();
    // The map's own viewport starts one more search; the map must survive it.
    await waitFor(() => expect(searchSlots).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(mapMounts.count).toBe(1);
    expect(searchSlots).toHaveBeenCalledTimes(2);
    expect(screen.getByText('MAP (lỗi)')).toBeInTheDocument();
  });
});
