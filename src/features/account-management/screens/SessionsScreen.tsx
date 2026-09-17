import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Card, Divider, Icon, IconButton, ListRow } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { colors } from '@/theme';
import { authApi, errorMessage, type ApiSession } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

function formatWhen(value: string | null): string {
  if (!value) return 'chưa rõ';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'chưa rõ' : parsed.toLocaleString('vi-VN');
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
    ? (query.data ?? [])
    : mockSessions.map((sess, index) => ({
        sessionId: index,
        deviceInfo: sess.device,
        ipAddress: sess.location,
        createdAt: sess.last_active,
        lastActiveAt: sess.last_active,
        expiresAt: sess.last_active,
        isCurrent: sess.current,
      }));

  const body = () => {
    if (isLiveApi && query.isLoading) return <LoadingState />;
    if (isLiveApi && query.isError) {
      return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />;
    }
    if (sessions.length === 0) {
      return <EmptyState icon="devices" title="Không có phiên đăng nhập nào" />;
    }

    return (
      <Card padded={false}>
        <div className="px-md">
          {sessions.map((sess, i) => (
            <div key={sess.sessionId}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                title={sess.deviceInfo ?? 'Thiết bị không xác định'}
                subtitle={`${sess.ipAddress ?? 'IP ẩn'} · Hoạt động gần nhất ${formatWhen(sess.lastActiveAt)}`}
                leading={<Icon name="laptop" size={20} color={colors.muted} />}
                trailing={
                  sess.isCurrent ? (
                    <StatusChip label="Đang dùng" tone="ok" />
                  ) : (
                    <IconButton
                      icon="close-circle-outline"
                      accessibilityLabel={`Đăng xuất ${sess.deviceInfo ?? 'thiết bị'}`}
                      color={colors.error}
                      onPress={() => {
                        if (isLiveApi) revoke.mutate(sess.sessionId);
                        else revokeMock(mockSessions[i]!.id);
                      }}
                    />
                  )
                }
              />
            </div>
          ))}
        </div>
      </Card>
    );
  };

  return (
    <Screen>
      <AppHeader
        title="Phiên đăng nhập"
        back
        subtitle="Thiết bị đang truy cập tài khoản của bạn"
      />
      {body()}
    </Screen>
  );
}
