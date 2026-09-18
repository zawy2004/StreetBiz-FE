import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { LocationReview } from '@/features/ward-administration/components/LocationReview';
import { wardApi, type WardCase } from '@/features/ward-administration/ward-api';

describe('ward proposal location', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  it('requires verification for the exact coordinates being saved', async () => {
    vi.spyOn(wardApi, 'verify').mockResolvedValue({
      inside: true,
      wardId: 1,
      boundaryVersion: 'test',
    });
    const pin = vi.spyOn(wardApi, 'pin').mockResolvedValue({} as WardCase);
    const onSaved = vi.fn();
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <LocationReview
          record={
            {
              id: '1',
              kind: 'proposals',
              status: 'PENDING',
              location: { latitude: 10, longitude: 106 },
            } as WardCase
          }
          onSaved={onSaved}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: 'Lưu tọa độ đề xuất' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra ranh giới' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Lưu tọa độ đề xuất' })).toBeEnabled(),
    );
    fireEvent.change(screen.getByLabelText('Vĩ độ'), { target: { value: '11' } });
    expect(screen.getByRole('button', { name: 'Lưu tọa độ đề xuất' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra ranh giới' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Lưu tọa độ đề xuất' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tọa độ đề xuất' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(pin).toHaveBeenCalledWith('1', { latitude: 11, longitude: 106 });
  });
});
