import { useInfiniteQuery } from '@tanstack/react-query';

import { Button, Card, Divider, Icon, ListRow } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { colors } from '@/theme';
import { authApi, errorMessage, type ApiSecurityEvent } from '@/core/api';
import { isLiveApi } from '@/core/config/env';

const PAGE = 20;

type EventCopy = { title: string; icon: string; concerning?: boolean };

const EVENT_COPY: Record<string, EventCopy> = {
  LOGIN_SUCCESS: { title: 'Đăng nhập', icon: 'login' },
  LOGIN_FAILED: { title: 'Đăng nhập sai mật khẩu', icon: 'alert-circle-outline', concerning: true },
  ACCOUNT_LOCKED: { title: 'Tài khoản bị khoá tạm thời', icon: 'lock-outline', concerning: true },
  PASSWORD_CHANGED: { title: 'Đổi mật khẩu', icon: 'lock-reset' },
  PASSWORD_RESET: { title: 'Đặt lại mật khẩu bằng OTP', icon: 'lock-reset' },
  SESSION_REVOKED: { title: 'Đăng xuất một thiết bị', icon: 'logout' },
  OTHER_SESSIONS_REVOKED: { title: 'Đăng xuất mọi thiết bị khác', icon: 'logout' },
};

function describeEvent(event: ApiSecurityEvent): EventCopy {
  return EVENT_COPY[event.action] ?? { title: event.action, icon: 'shield-outline' };
}

/** The caller's own sign-in and security history, so an unfamiliar sign-in is easy to spot. */
export function SecurityHistoryScreen() {
  const query = useInfiniteQuery({
    queryKey: ['security-history'],
    queryFn: ({ pageParam }) => authApi.loginHistory(pageParam, PAGE),
    initialPageParam: undefined as number | undefined,
    // The backend pages backwards by id; a short page means the history is exhausted.
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1]!.id : undefined),
    enabled: isLiveApi,
  });

  const events = (query.data?.pages ?? []).flat();

  const body = () => {
    if (!isLiveApi) {
      return <EmptyState icon="shield-outline" title="Lịch sử đăng nhập chỉ có khi kết nối máy chủ" compact />;
    }
    if (query.isLoading) return <LoadingState />;
    if (query.isError) return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />;
    if (events.length === 0) {
      return <EmptyState icon="shield-outline" title="Chưa có hoạt động nào được ghi lại" compact />;
    }

    return (
      <>
        <Card padded={false}>
          <div className="px-md">
            {events.map((event, index) => {
              const copy = describeEvent(event);
              return (
                <div key={event.id}>
                  {index > 0 ? <Divider /> : null}
                  <ListRow
                    title={copy.title}
                    subtitle={`${new Date(event.createdAt).toLocaleString('vi-VN')}${event.details ? ` · ${event.details}` : ''}`}
                    leading={<Icon name={copy.icon} size={20} color={copy.concerning ? colors.error : colors.muted} />}
                  />
                </div>
              );
            })}
          </div>
        </Card>
        {query.hasNextPage ? (
          <Button
            label="Xem thêm"
            variant="outline"
            loading={query.isFetchingNextPage}
            onPress={() => query.fetchNextPage()}
          />
        ) : null}
      </>
    );
  };

  return (
    <Screen>
      <AppHeader title="Lịch sử đăng nhập" back subtitle="Nếu thấy hoạt động lạ, hãy đổi mật khẩu và đăng xuất các thiết bị khác" />
      {body()}
    </Screen>
  );
}
