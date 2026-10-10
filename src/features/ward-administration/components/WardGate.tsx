import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import { AppHeader, Screen } from '@/components/layout';
import { ApiError } from '@/core/api';
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
export function WardGate({ children }: { children: ReactNode }) {
  const userId = useAuthStore((state) => state.user?.id);

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
        <AppHeader title="Hàng đợi hồ sơ" back />
        <div className="overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border">
          <div className="flex flex-col items-start gap-md p-md md:flex-row md:items-center md:gap-lg md:p-lg">
            <UnpluggedServerArt />
            <div className="flex min-w-0 flex-col gap-xs">
              <p className="font-sign text-[20px] font-bold leading-tight text-text">
                Cần kết nối máy chủ thật
              </p>
              <p className="max-w-[62ch] text-body-md leading-[24px] text-text/80">
                Hàng đợi hồ sơ của phường đọc dữ liệu thật từ Backend. Đặt{' '}
                <code className="rounded-[6px] bg-sunken px-1.5 py-0.5 text-[13px]">
                  VITE_USE_MOCK_API=false
                </code>{' '}
                và{' '}
                <code className="rounded-[6px] bg-sunken px-1.5 py-0.5 text-[13px]">
                  VITE_API_BASE_URL
                </code>{' '}
                trong{' '}
                <code className="rounded-[6px] bg-sunken px-1.5 py-0.5 text-[13px]">.env</code>, sau
                đó tải lại trang.
              </p>
            </div>
          </div>
        </div>
      </Screen>
    );
  }

  if (profile.isPending) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex h-11 shrink-0 items-center gap-sm border-b border-border bg-card px-md">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Screen>
          <p role="status" className="text-body-md text-muted">
            Đang xác minh tài khoản cán bộ…
          </p>
          <Skeleton className="h-9 w-2/3 max-w-[420px]" />
          <div className="grid grid-cols-3 gap-sm">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-[16px] opacity-70 md:h-[120px]" />
            ))}
          </div>
          <Skeleton className="h-24 rounded-[20px] opacity-60" />
        </Screen>
      </div>
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
          <div className="overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border">
            <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
            <div className="flex flex-col items-start gap-md p-md md:flex-row md:gap-lg md:p-lg">
              <UnstampedBadgeArt />
              <div className="flex min-w-0 flex-col gap-xs">
                <h2 className="font-sign text-[22px] font-bold leading-tight text-text">
                  Tài khoản chưa được gán phường
                </h2>
                <p
                  role="alert"
                  className={`rounded-[12px] px-sm py-xs text-body-md font-medium ${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink}`}
                >
                  {error.message}
                </p>
                <p className="text-body-md text-muted">
                  Liên hệ quản trị viên hệ thống để được gán đơn vị phường, sau đó đăng nhập lại.
                </p>
                <Link
                  to="/account"
                  className="mt-xs inline-flex min-h-12 w-fit items-center gap-xs rounded-[12px] px-md text-[15px] font-semibold text-primary ring-1 ring-inset ring-border transition-colors hover:bg-tint-primary"
                >
                  <Icon name="account-circle-outline" size={20} color="currentColor" />
                  Xem tài khoản của tôi
                </Link>
              </div>
            </div>
          </div>
        </Screen>
      );
    }

    // 401 means the interceptor already cleared the session; RoleGuard redirects
    // on the next render, so this is only the frame in between.
    return (
      <Screen>
        <div
          className={`flex flex-col items-start gap-sm rounded-[20px] p-md md:p-lg ${VERDICT_TONES.danger.wash}`}
        >
          <p
            role="alert"
            className={`flex items-start gap-xs text-[16px] font-semibold leading-6 ${VERDICT_TONES.danger.ink}`}
          >
            <Icon
              name="alert-circle-outline"
              size={20}
              color="currentColor"
              className="mt-0.5 shrink-0"
            />
            {error.message}
          </p>
          {!(error instanceof ApiError && error.code === 'unauthorized') && (
            <Button
              label="Thử lại"
              variant="outline"
              fullWidth={false}
              onPress={() => {
                void profile.refetch();
              }}
            />
          )}
        </div>
      </Screen>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-11 shrink-0 items-center gap-sm border-b border-border bg-card px-md py-1.5">
        <Icon
          name="shield-check-outline"
          size={20}
          color="currentColor"
          weight="fill"
          className="shrink-0 text-tertiary"
        />
        <span className="min-w-0 truncate text-body-md font-semibold text-text">
          {profile.data?.name} · Phường #{profile.data?.wardId}
        </span>
        <span className="hidden shrink-0 text-body-sm text-muted sm:inline">
          Tài khoản cán bộ đã xác minh
        </span>
      </div>
      {children}
    </div>
  );
}

/** An officer badge whose ward stamp is still an empty dashed ring. */
function UnstampedBadgeArt() {
  return (
    <svg viewBox="0 0 132 96" aria-hidden="true" className="h-[96px] w-[132px] shrink-0">
      <rect
        x="4"
        y="6"
        width="124"
        height="84"
        rx="12"
        className="fill-[#FFF3E8] stroke-text"
        strokeWidth="2.5"
      />
      <rect x="4" y="6" width="124" height="16" rx="12" className="fill-brand" />
      <rect x="4" y="16" width="124" height="6" className="fill-brand" />
      <circle cx="34" cy="50" r="13" className="fill-card stroke-text" strokeWidth="2" />
      <path
        d="M22 76c2-9 7-13 12-13s10 4 12 13"
        className="fill-card stroke-text"
        strokeWidth="2"
      />
      <rect x="56" y="40" width="34" height="5" rx="2.5" className="fill-text/70" />
      <rect x="56" y="52" width="24" height="4" rx="2" className="fill-muted/60" />
      <circle
        cx="104"
        cy="62"
        r="17"
        className="fill-none stroke-[#8F1717] dark:stroke-[#FF9A90]"
        strokeWidth="2.5"
        strokeDasharray="5 4"
      />
      <path
        d="M98 62h12"
        className="stroke-[#8F1717] dark:stroke-[#FF9A90]"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A server box with its plug pulled out. */
function UnpluggedServerArt() {
  return (
    <svg viewBox="0 0 132 96" aria-hidden="true" className="h-[96px] w-[132px] shrink-0">
      <rect
        x="10"
        y="10"
        width="64"
        height="30"
        rx="7"
        className="fill-card stroke-text"
        strokeWidth="2.5"
      />
      <rect
        x="10"
        y="46"
        width="64"
        height="30"
        rx="7"
        className="fill-card stroke-text"
        strokeWidth="2.5"
      />
      <circle cx="24" cy="25" r="3.5" className="fill-tertiary" />
      <circle cx="24" cy="61" r="3.5" className="fill-accent" />
      <rect x="34" y="23" width="30" height="4" rx="2" className="fill-muted/50" />
      <rect x="34" y="59" width="30" height="4" rx="2" className="fill-muted/50" />
      <path d="M74 61h10" className="stroke-text" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="84" y="55" width="8" height="12" rx="2" className="fill-text" />
      <path d="M100 52h12a6 6 0 0 1 6 6v6a6 6 0 0 1-6 6h-12z" className="fill-primary" />
      <path
        d="M100 56h-6M100 66h-6"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M118 61h10" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M93 47l4-6M97 50l6-3"
        className="stroke-brand"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
