import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { EmptyState, Skeleton } from '@/components/feedback';
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

    // No <form>: Enter does not send, exactly as before. The phone is sent as typed.
    return (
      <Screen>
        <AppHeader title="Kết nối quản trị nền tảng" subtitle="ADM-01 · ADM-03 · ADM-04 · ADM-05" />
        <section
          aria-label="Mở phiên quản trị"
          className="sb-pop w-full max-w-[560px] overflow-hidden rounded-[20px] bg-card shadow-sheet ring-1 ring-border"
        >
          <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
          <div className="flex flex-col gap-md p-md md:p-lg">
            <TwoKeysDiagram />
            <div className="flex flex-col gap-1">
              <p className="text-body-md text-text">
                Đăng nhập Backend bằng tài khoản PLATFORM_ADMIN để thao tác dữ liệu thật.
              </p>
              <p className="text-body-sm text-muted">
                Phiên này chỉ giữ trong thẻ trình duyệt hiện tại.
              </p>
            </div>
            <div className="flex flex-col gap-sm">
              <div className="flex flex-col gap-1">
                <PhoneField value={phone} onChangeText={setPhone} />
                <p className="flex items-center gap-1.5 text-body-sm text-muted">
                  <Icon name="information-outline" size={15} color="currentColor" />
                  Gõ đủ 10 số, bắt đầu bằng 0.
                </p>
              </div>
              <PasswordField value={password} onChangeText={setPassword} error={error} />
              <Button
                label={busy ? 'Đang đăng nhập…' : 'Kết nối Backend'}
                onPress={connect}
                loading={busy}
                disabled={!phone.trim() || !password}
              />
            </div>
          </div>
        </section>
      </Screen>
    );
  }

  if (profile.isPending) return <VerifyingSkeleton />;
  if (profile.isError) {
    const message =
      profile.error instanceof PlatformApiError
        ? profile.error.message
        : 'Không xác minh được tài khoản quản trị.';
    // The shared error panel's look and words, with "Kết nối lại" next to "Thử lại".
    return (
      <Screen>
        <EmptyState
          tone="danger"
          icon="alert-circle-outline"
          title="Không tải được dữ liệu"
          description={message}
          action={
            <div className="flex flex-wrap justify-center gap-sm">
              <Button
                label="Thử lại"
                variant="outline"
                fullWidth={false}
                onPress={() => profile.refetch()}
              />
              <Button
                label="Kết nối lại"
                variant="outline"
                fullWidth={false}
                onPress={() => void disconnect()}
              />
            </div>
          }
        />
      </Screen>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-x-sm gap-y-1 border-b border-border bg-card px-md py-1 md:px-lg">
        <span className="flex min-w-0 items-center gap-xs text-body-md text-text">
          <span aria-hidden="true" className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="sb-ping absolute inset-0 rounded-full bg-tertiary opacity-60" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-tertiary" />
          </span>
          <span className="truncate">{profile.data?.name ?? admin?.name} · Platform Admin</span>
        </span>
        <button
          type="button"
          className="inline-flex h-11 items-center gap-1.5 rounded-[10px] px-sm text-body-sm font-semibold text-primary transition-colors hover:bg-tint-primary md:h-9"
          onClick={() => void disconnect()}
        >
          <Icon name="logout" size={16} color="currentColor" />
          Ngắt kết nối
        </button>
      </div>
      {children}
    </div>
  );
}

/**
 * Why a second sign-in: the StreetBiz sign-in already happened (green, ticked),
 * this one opens the admin session that touches real data (orange, padlock).
 */
function TwoKeysDiagram() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col items-stretch gap-0 sm:flex-row sm:items-center"
    >
      <span className="flex h-14 min-w-0 flex-1 items-center gap-xs rounded-[12px] bg-[#E6F6EC] px-sm text-body-sm font-semibold text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]">
        <Icon name="check-circle" size={22} color="currentColor" />
        Đã đăng nhập StreetBiz
      </span>
      <span className="mx-auto h-5 w-0 border-l-2 border-dashed border-brand sm:mx-0 sm:h-0 sm:w-8 sm:border-l-0 sm:border-t-2" />
      <span className="flex h-14 min-w-0 flex-1 items-center gap-xs rounded-[12px] bg-tint-primary px-sm text-body-sm font-semibold text-primary ring-1 ring-brand/40">
        <Icon name="lock-outline" size={22} color="currentColor" weight="fill" />
        Phiên quản trị dữ liệu thật
      </span>
    </div>
  );
}

/** While GET /platform/me runs: the session bar, a title and three table rows, so nothing jumps. */
function VerifyingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang xác minh phiên quản trị"
      className="flex h-full min-h-0 flex-col bg-bg"
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-card px-md md:px-lg">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-md p-md md:px-lg lg:px-xl lg:py-lg">
        <p className="flex items-center gap-xs text-body-sm text-muted">
          <Icon name="shield-check-outline" size={16} color="currentColor" />
          Đang xác minh phiên quản trị
        </p>
        <Skeleton className="h-9 w-2/3 max-w-[360px]" />
        <Skeleton className="h-4 w-1/2 max-w-[420px]" />
        <div className="overflow-hidden rounded-[20px] bg-card ring-1 ring-border">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-md border-b border-border px-md py-md last:border-b-0"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
