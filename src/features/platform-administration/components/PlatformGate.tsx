import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/common';
import { ErrorState, LoadingState } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { ApiError } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useAuthStore } from '@/store/auth-store';
import { platformApi } from '../platform-api';

/**
 * Confirms the signed-in administrator can use the admin API.
 *
 * It does no authentication of its own: `/platform/*` already sits behind
 * `RoleShell role="PLATFORM_ADMIN"`, so a user is present and the shared client
 * carries their token. This replaces PlatformConnection, which asked the
 * administrator to sign in a second time against a separate session.
 */
export function PlatformGate({ title, children }: { title: string; children: ReactNode }) {
  const userId = useAuthStore((state) => state.user?.id);

  const profile = useQuery({
    queryKey: ['platform', userId, 'me'],
    queryFn: () => platformApi.me(),
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled: isLiveApi,
  });

  // These pages have no offline demo data; say so plainly instead of showing an
  // empty list that reads as "nothing to moderate".
  if (!isLiveApi) {
    return (
      <Screen>
        <AppHeader title={title} />
        <Card>
          <p className="text-body-md text-text">
            Trang này dùng dữ liệu thật từ máy chủ StreetBiz nên không có trong bản demo ngoại
            tuyến.
          </p>
        </Card>
      </Screen>
    );
  }

  if (profile.isPending) return <LoadingState label="Đang xác minh tài khoản quản trị" />;

  if (profile.error) {
    // 403: signed in, but not an administrator the backend accepts. Retrying won't help.
    if (profile.error instanceof ApiError && profile.error.code === 'forbidden') {
      return (
        <Screen>
          <AppHeader title={title} />
          <Card>
            <p role="alert" className="text-body-md text-text">
              Tài khoản này không có quyền quản trị nền tảng. Hãy đăng nhập bằng tài khoản quản trị
              viên.
            </p>
          </Card>
        </Screen>
      );
    }
    // 401 means the client already cleared the session; RoleGuard redirects next render.
    return (
      <Screen>
        <AppHeader title={title} />
        <ErrorState
          message={profile.error.message}
          onRetry={
            profile.error instanceof ApiError && profile.error.code === 'unauthorized'
              ? undefined
              : () => void profile.refetch()
          }
        />
      </Screen>
    );
  }

  return <>{children}</>;
}
