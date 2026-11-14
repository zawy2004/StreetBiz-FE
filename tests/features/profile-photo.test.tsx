import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { accountApi } from '@/core/api';
import { ProfilePhotoActions } from '@/features/account-management/components/ProfilePhotoActions';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', () => ({
  env: {
    apiBaseUrl: 'https://api.example.test/api',
    useMockApi: false,
    appEnv: 'test',
    enablePhase2: true,
  },
  isDev: true,
  isLiveApi: true,
}));

function mount(hasPhoto: boolean) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <ProfilePhotoActions hasPhoto={hasPhoto} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: '5',
      fullName: 'Hoa',
      phone: '0905000101',
      password: '',
      role_code: 'VENDOR',
      account_status: 'ACTIVE',
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ProfilePhotoActions', () => {
  it('uploads a photo and keeps the absolute avatar URL on the signed-in user', async () => {
    const upload = vi
      .spyOn(accountApi, 'uploadAvatar')
      .mockResolvedValue({ avatarUrl: '/api/uploads/avatars/5/abc.jpg' });
    const user = userEvent.setup();
    mount(false);

    const photo = new File([new Uint8Array([1])], 'me.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Chọn ảnh đại diện'), photo);

    await waitFor(() => expect(upload).toHaveBeenCalledWith(photo));
    await waitFor(() =>
      expect(useAuthStore.getState().user?.avatarUrl).toBe(
        'https://api.example.test/api/uploads/avatars/5/abc.jpg',
      ),
    );
  });

  it('removes the photo', async () => {
    useAuthStore.setState((s) => ({
      user: { ...s.user!, avatarUrl: 'https://api.example.test/x.jpg' },
    }));
    const remove = vi.spyOn(accountApi, 'removeAvatar').mockResolvedValue({ avatarUrl: null });
    const user = userEvent.setup();
    mount(true);

    await user.click(screen.getByRole('button', { name: 'Gỡ ảnh' }));

    await waitFor(() => expect(remove).toHaveBeenCalled());
    await waitFor(() => expect(useAuthStore.getState().user?.avatarUrl).toBeUndefined());
  });

  it('refuses a file over 5 MB before uploading and shows the server error otherwise', async () => {
    const upload = vi.spyOn(accountApi, 'uploadAvatar').mockRejectedValue(new Error('Ảnh bị lỗi.'));
    const user = userEvent.setup();
    mount(false);

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText('Chọn ảnh đại diện'), big);
    expect(await screen.findByText('Ảnh tối đa 5 MB.')).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();

    await user.upload(
      screen.getByLabelText('Chọn ảnh đại diện'),
      new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' }),
    );
    expect(await screen.findByText('Ảnh bị lỗi.')).toBeInTheDocument();
  });
});
