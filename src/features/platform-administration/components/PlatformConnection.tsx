import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card } from '@/components/common';
import { ErrorState, LoadingState } from '@/components/feedback';
import { PasswordField, PhoneField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { platformApi, PlatformApiError, usePlatformSession } from '../platform-api';

export function PlatformConnection({ children }: { children: ReactNode }) {
  const { token, generation, admin } = usePlatformSession();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const profile = useQuery({
    queryKey: ['platform', generation, 'me'],
    queryFn: () => platformApi.me(),
    enabled: Boolean(token),
  });
  const disconnect = async () => {
    await platformApi.logout().catch(() => undefined);
    queryClient.removeQueries({ queryKey: ['platform'] });
  };

  if (!token) {
    const connect = async () => {
      setBusy(true);
      setError(undefined);
      try {
        await platformApi.login(phone, password);
        queryClient.removeQueries({ queryKey: ['platform'] });
      } catch (reason) {
        setError(reason instanceof PlatformApiError ? reason.message : 'Không thể đăng nhập.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <Screen>
        <AppHeader title="Kết nối quản trị nền tảng" subtitle="ADM-01 · ADM-03 · ADM-04 · ADM-05" />
        <Card>
          <p className="mb-sm text-body-md text-muted">
            Đăng nhập Backend bằng tài khoản PLATFORM_ADMIN để thao tác dữ liệu thật.
          </p>
          <div className="flex flex-col gap-sm">
            <PhoneField value={phone} onChangeText={setPhone} />
            <PasswordField value={password} onChangeText={setPassword} error={error} />
            <Button
              label={busy ? 'Đang đăng nhập…' : 'Kết nối Backend'}
              onPress={connect}
              loading={busy}
              disabled={!phone.trim() || !password}
            />
          </div>
        </Card>
      </Screen>
    );
  }

  if (profile.isPending) return <LoadingState />;
  if (profile.isError) {
    return (
      <Screen>
        <ErrorState
          message={
            profile.error instanceof PlatformApiError
              ? profile.error.message
              : 'Không xác minh được tài khoản quản trị.'
          }
          onRetry={() => profile.refetch()}
        />
        <Button label="Kết nối lại" variant="outline" onPress={() => void disconnect()} />
      </Screen>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-sm border-b border-border bg-card px-md py-xs">
        <span className="text-body-sm">{profile.data?.name ?? admin?.name} · Platform Admin</span>
        <button
          type="button"
          className="text-body-sm text-indigo"
          onClick={() => void disconnect()}
        >
          Ngắt kết nối
        </button>
      </div>
      {children}
    </div>
  );
}
