import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { ApiError } from '@/core/api';
import { useWards } from '@/core/auth/useWards';
import { isLiveApi } from '@/core/config/env';
import { useAuthStore } from '@/store/auth-store';
import { wardApi } from '../ward-api';

/**
 * Confirms the signed-in officer can actually work a ward queue, and shows who
 * they are while they do.
 *
 * It does no authentication of its own: `/ward/*` already sits behind
 * `RoleShell role="WARD_AUTHORITY"`, so a user is present and the axios client
 * carries their token. The only question left is whether the backend will accept
 * them as a ward actor - `WardActorResolver` also requires an ACTIVE account and
 * a non-null ward assignment, and answers 403 when either is missing.
 *
 * This replaces WardConnection, which asked officers to paste an access token
 * into a form because the ward queue ran on a separate auth system.
 */
export function WardGate({
  title = 'Hàng đợi hồ sơ',
  children,
}: {
  /** The wrapped screen's own title, shown while the gate stands in for it. */
  title?: string;
  children: ReactNode;
}) {
  const userId = useAuthStore((state) => state.user?.id);
  const { wards } = useWards();

  const profile = useQuery({
    queryKey: ['ward', userId, 'me'],
    queryFn: () => wardApi.me(),
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled: isLiveApi,
  });

  // The live queue has no mock data source, so say so rather than render an
  // empty list that looks like "no cases waiting".
  if (!isLiveApi) {
    return (
      <Screen>
        <AppHeader title={title} back />
        <Card>
          <p className="text-body-md">
            Trang này dùng dữ liệu thật từ máy chủ StreetBiz nên không có trong bản demo ngoại
            tuyến.
          </p>
        </Card>
      </Screen>
    );
  }

  if (profile.isPending) {
    return (
      <Screen>
        <p role="status">Đang xác minh tài khoản cán bộ…</p>
      </Screen>
    );
  }

  if (profile.error) {
    const error = profile.error;

    // 403 from WardActorResolver: the account is not a usable ward actor. There is
    // nothing the officer can do from here, so offer no retry - only who to ask.
    if (error instanceof ApiError && error.code === 'forbidden') {
      return (
        <Screen>
          <AppHeader title="Chưa thể duyệt hồ sơ" back />
          <Card>
            <h2 className="mb-xs text-title-sm">Tài khoản chưa được gán phường</h2>
            <p role="alert" className="mb-md text-body-md">
              {error.message}
            </p>
            <p className="text-body-sm text-muted">
              Liên hệ quản trị viên hệ thống để được gán đơn vị phường, sau đó đăng nhập lại.
            </p>
            <Link to="/account" className="mt-md inline-block text-body-sm text-indigo">
              Xem tài khoản của tôi
            </Link>
          </Card>
        </Screen>
      );
    }

    // 401 means the interceptor already cleared the session; RoleGuard redirects
    // on the next render, so this is only the frame in between.
    return (
      <Screen>
        <p role="alert" className="text-error">
          {error.message}
        </p>
        {!(error instanceof ApiError && error.code === 'unauthorized') && (
          <Button
            label="Thử lại"
            onPress={() => {
              void profile.refetch();
            }}
          />
        )}
      </Screen>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-sm border-b border-border bg-card px-md py-xs">
        <span className="text-body-sm">
          {/* /ward/me carries the officer's name and ward id; the ward's name comes from the unit list. */}
          {profile.data?.name} ·{' '}
          {wards.find((w) => w.unitId === profile.data?.wardId)?.unitName ??
            `Phường #${profile.data?.wardId}`}
        </span>
      </div>
      {children}
    </div>
  );
}
