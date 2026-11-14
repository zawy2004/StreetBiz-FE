import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

import { DishDescriptionAssist } from '@/features/storefronts/components/menu/DishAiAssist';
import { aiApi } from '@/core/api/ai-api';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

function renderAssist(onUse = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DishDescriptionAssist name="Bún chả" imageUrl={null} hasDescription={false} onUse={onUse} />
    </QueryClientProvider>,
  );
  return onUse;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DishDescriptionAssist (AIP-01)', () => {
  it('records the suggestion as accepted only when the vendor uses it', async () => {
    vi.spyOn(aiApi, 'dishDescription').mockResolvedValue({
      available: true,
      description: 'Bún chả nướng than thơm, ăn kèm rau sống.',
      message: 'Gợi ý',
      aiLogId: 42,
    });
    const accept = vi.spyOn(aiApi, 'acceptDishDescription').mockResolvedValue(undefined);
    const onUse = renderAssist();

    fireEvent.click(screen.getByRole('button', { name: /Gợi ý mô tả bằng AI/ }));
    expect(await screen.findByText(/Bún chả nướng than thơm/)).toBeInTheDocument();
    expect(accept).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Dùng mô tả này' }));

    expect(onUse).toHaveBeenCalledWith('Bún chả nướng than thơm, ăn kèm rau sống.');
    await waitFor(() => expect(accept).toHaveBeenCalledWith(42));
  });

  it('does not record anything when the vendor dismisses it', async () => {
    vi.spyOn(aiApi, 'dishDescription').mockResolvedValue({
      available: true,
      description: 'Bún chả nướng than thơm, ăn kèm rau sống.',
      message: 'Gợi ý',
      aiLogId: 42,
    });
    const accept = vi.spyOn(aiApi, 'acceptDishDescription').mockResolvedValue(undefined);
    const onUse = renderAssist();

    fireEvent.click(screen.getByRole('button', { name: /Gợi ý mô tả bằng AI/ }));
    await screen.findByText(/Bún chả nướng than thơm/);
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua' }));

    expect(onUse).not.toHaveBeenCalled();
    expect(accept).not.toHaveBeenCalled();
  });

  it('still fills the form when recording the acceptance fails', async () => {
    vi.spyOn(aiApi, 'dishDescription').mockResolvedValue({
      available: true,
      description: 'Bún chả nướng than thơm, ăn kèm rau sống.',
      message: 'Gợi ý',
      aiLogId: 42,
    });
    const accept = vi.spyOn(aiApi, 'acceptDishDescription').mockRejectedValue(new Error('offline'));
    const onUse = renderAssist();

    fireEvent.click(screen.getByRole('button', { name: /Gợi ý mô tả bằng AI/ }));
    await screen.findByText(/Bún chả nướng than thơm/);
    fireEvent.click(screen.getByRole('button', { name: 'Dùng mô tả này' }));

    await waitFor(() => expect(accept).toHaveBeenCalled());
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
