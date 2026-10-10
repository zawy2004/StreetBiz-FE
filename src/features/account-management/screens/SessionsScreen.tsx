import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppHeader, Screen } from '@/components/layout';
import { EmptyState, ErrorState, showToast } from '@/components/feedback';
import { authApi, errorMessage, type ApiSession } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { describeDevice } from '@/core/utils/user-agent';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import {
  CurrentDeviceCard,
  DeviceRow,
  OnlyThisDevice,
  SessionSafetyNote,
  SessionsSkeleton,
  type SessionView,
} from '../components/SessionParts';
import { useLeavingRows } from '../components/leaving-rows';
import '../account.css';

function formatWhen(value: string | null): string {
  if (!value) return 'chưa rõ';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'chưa rõ' : parsed.toLocaleString('vi-VN');
}

function toView(sess: ApiSession): SessionView {
  return {
    sessionId: sess.sessionId,
    name: sess.deviceInfo ?? 'Thiết bị không xác định',
    revokeLabel: `Đăng xuất ${sess.deviceInfo ?? 'thiết bị'}`,
    subtitle: `${sess.ipAddress ?? 'IP ẩn'} · Hoạt động gần nhất ${formatWhen(sess.lastActiveAt)}`,
    lastActiveAt: sess.lastActiveAt,
    createdAt: sess.createdAt,
    expiresAt: sess.expiresAt,
  };
}

/** AUTH-08 / AUTH-09: list the caller's active sessions and revoke one. */
export function SessionsScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const mockSessions = useMockDb((s) => s.sessions).filter((sess) => sess.userId === user?.id);
  const revokeMock = useMockDb((s) => s.revokeSession);

  const query = useQuery({
    queryKey: ['sessions'],
    queryFn: () => authApi.listSessions(),
    enabled: isLiveApi,
  });

  const revoke = useMutation({
    mutationFn: (sessionId: number) => authApi.revokeSession(sessionId),
    onSuccess: async () => {
      showToast('Đã đăng xuất thiết bị');
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (err) => showToast(errorMessage(err)),
  });

  const sessions: ApiSession[] = isLiveApi
    ? // The backend stores the raw browser User-Agent as deviceInfo; turn it into
      // something readable rather than showing "Mozilla/5.0 (Windows NT ...)".
      (query.data ?? []).map((s) => ({ ...s, deviceInfo: describeDevice(s.deviceInfo) }))
    : mockSessions.map((sess, index) => ({
        sessionId: index,
        deviceInfo: sess.device,
        ipAddress: sess.location,
        createdAt: sess.last_active,
        lastActiveAt: sess.last_active,
        expiresAt: sess.last_active,
        isCurrent: sess.current,
      }));

  // "This device" is drawn apart; the rest keep the server's order.
  const current = sessions.find((sess) => sess.isCurrent);
  const others = sessions.filter((sess) => !sess.isCurrent);
  const otherRows = useLeavingRows(others, (sess) => sess.sessionId);

  const revokeOne = (sess: ApiSession) => {
    if (isLiveApi) revoke.mutate(sess.sessionId);
    // In mock mode sessionId is the session's index in the mock list.
    else revokeMock(mockSessions[sess.sessionId]!.id);
  };

  const body = () => {
    if (isLiveApi && query.isLoading) return <SessionsSkeleton />;
    if (isLiveApi && query.isError) {
      return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />;
    }
    if (sessions.length === 0) {
      return <EmptyState icon="devices" title="Không có phiên đăng nhập nào" />;
    }

    return (
      <div className="flex flex-col gap-lg">
        <p className="flex flex-wrap items-baseline gap-x-sm">
          <span className="font-sign text-[40px] font-bold leading-[44px] text-text font-tabular lg:text-[52px] lg:leading-[56px]">
            {sessions.length}
          </span>
          <span className="text-body-lg text-muted">thiết bị đang đăng nhập</span>
        </p>

        <div className="grid grid-cols-1 items-start gap-lg lg:grid-cols-[minmax(0,600px)_minmax(0,1fr)] lg:gap-xl xl:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-lg">
            {current ? <CurrentDeviceCard session={toView(current)} /> : null}

            {otherRows.length > 0 ? (
              <section aria-labelledby="sessions-others" className="flex flex-col gap-sm">
                <h2
                  id="sessions-others"
                  className="font-heading text-[19px] font-bold leading-6 text-text"
                >
                  Thiết bị khác
                </h2>
                <ul className="ml-[5px] flex flex-col border-l-2 border-border">
                  {otherRows.map(({ item, leaving }) => (
                    <li
                      key={item.sessionId}
                      className="sb-acct-row"
                      data-leaving={leaving || undefined}
                      aria-hidden={leaving || undefined}
                    >
                      <div>
                        <DeviceRow
                          session={toView(item)}
                          pending={
                            isLiveApi && revoke.isPending && revoke.variables === item.sessionId
                          }
                          onRevoke={() => {
                            if (!leaving) revokeOne(item);
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : current ? (
              <OnlyThisDevice />
            ) : null}
          </div>

          <div className="lg:sticky lg:top-lg">
            <SessionSafetyNote />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Screen>
      <AppHeader title="Phiên đăng nhập" back subtitle="Thiết bị đang truy cập tài khoản của bạn" />
      {body()}
    </Screen>
  );
}
