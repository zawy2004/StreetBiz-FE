import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { useWardSession, wardApi, wardRequest } from '../ward-api';

export function WardConnection({ children }: { children: ReactNode }) {
  const { token, generation, connect, disconnect } = useWardSession();
  const client = useQueryClient();
  const [credential, setCredential] = useState('');
  const [mode, setMode] = useState<'token' | 'development'>('token');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const profile = useQuery({
    queryKey: ['ward', generation, 'me'],
    queryFn: () => wardApi.me(),
    enabled: !!token,
  });

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const accessToken =
        mode === 'development'
          ? (
              await wardRequest<{ accessToken: string }>(
                '/dev/ward-session',
                { method: 'POST', body: JSON.stringify({ accessKey: credential }) },
                '',
              )
            ).accessToken
          : credential.trim();
      await wardApi.me(accessToken);
      client.removeQueries({ queryKey: ['ward'] });
      connect(accessToken);
      setCredential('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!token)
    return (
      <Screen>
        <AppHeader title="Kết nối cán bộ phường" back subtitle="WARD-16 • WARD-17 • WARD-18" />
        <Card>
          <p className="mb-md text-body-md">
            Kết nối tài khoản Backend để xử lý hồ sơ thực tế của phường.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="flex flex-col gap-md"
          >
            {import.meta.env.DEV && (
              <label>
                Phương thức kết nối
                <select
                  className="mt-xs w-full rounded-sm border border-border p-sm"
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value as typeof mode);
                    setCredential('');
                    setError('');
                  }}
                >
                  <option value="token">Access token từ hệ thống đăng nhập</option>
                  <option value="development">Khóa phát triển cục bộ</option>
                </select>
              </label>
            )}
            <label>
              {mode === 'token' ? 'Access token' : 'Khóa phát triển'}
              <input
                type="password"
                autoComplete="off"
                className="mt-xs w-full rounded-sm border border-border p-sm"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                required
                disabled={busy}
              />
            </label>
            {error && (
              <p role="alert" className="text-error">
                {error}
              </p>
            )}
            <Button type="submit" label="Kết nối" loading={busy} disabled={!credential.trim()} />
          </form>
        </Card>
      </Screen>
    );
  if (profile.isPending)
    return (
      <Screen>
        <p role="status">Đang xác minh tài khoản cán bộ…</p>
      </Screen>
    );
  if (profile.error)
    return (
      <Screen>
        <p role="alert" className="text-error">
          {profile.error.message}
        </p>
        <Button
          label="Thử lại"
          onPress={() => {
            void profile.refetch();
          }}
        />
        <Button label="Kết nối lại" onPress={disconnect} variant="outline" />
      </Screen>
    );
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-sm border-b border-border bg-card px-md py-xs">
        <span className="text-body-sm">
          {profile.data?.name} · Phường #{profile.data?.wardId}
        </span>
        <button
          className="text-body-sm text-indigo"
          onClick={() => {
            disconnect();
            client.removeQueries({ queryKey: ['ward'] });
          }}
        >
          Ngắt kết nối
        </button>
      </div>
      {children}
    </div>
  );
}
