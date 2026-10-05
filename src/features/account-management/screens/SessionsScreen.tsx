import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Divider, Icon, IconButton, ListRow } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { colors } from '@/theme';
import { authApi, errorMessage, type ApiSession } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { describeDevice } from '@/core/utils/user-agent';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

function formatWhen(value: string | null): string {
  if (!value) return 'chưa rõ';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'chưa rõ' : parsed.toLocaleString('vi-VN');
}

function formatDay(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'chưa rõ' : parsed.toLocaleDateString('vi-VN');
}

/** A phone or tablet gets a phone icon so the list reads at a glance. */
function iconFor(rawDevice: string | null): string {
  return rawDevice && /iphone|ipad|android|mobile/i.test(rawDevice) ? 'cellphone' : 'laptop';
}

/** AUTH-08 / AUTH-09: list the caller's active sessions, sign one or all the others out. */
export function SessionsScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  // Which session is waiting for the user to confirm, and which request is in flight.
  const [confirming, setConfirming] = useState<ApiSession | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);

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
    onSettled: () => setConfirming(null),
  });

  const revokeOthers = useMutation({
    mutationFn: () => authApi.revokeOtherSessions(),
    onSuccess: async () => {
      showToast('Đã đăng xuất mọi thiết bị khác');
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (err) => showToast(errorMessage(err)),
    onSettled: () => setConfirmingAll(false),
  });

  const sessions: (ApiSession & { rawDevice: string | null })[] = isLiveApi
    ? // The backend stores the raw browser User-Agent as deviceInfo; turn it into
      // something readable rather than showing "Mozilla/5.0 (Windows NT ...)".
      (query.data ?? []).map((s) => ({ ...s, rawDevice: s.deviceInfo, deviceInfo: describeDevice(s.deviceInfo) }))
    : mockSessions.map((sess, index) => ({
        sessionId: index,
        deviceInfo: sess.device,
        rawDevice: sess.device,
        ipAddress: sess.location,
        createdAt: sess.last_active,
        lastActiveAt: sess.last_active,
        expiresAt: sess.last_active,
        isCurrent: sess.current,
      }));

  const others = sessions.filter((s) => !s.isCurrent);

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
                subtitle={`${sess.ipAddress ?? 'IP ẩn'} · Hoạt động gần nhất ${formatWhen(sess.lastActiveAt)} · Hết hạn ${formatDay(sess.expiresAt)}`}
                leading={<Icon name={iconFor(sess.rawDevice)} size={20} color={colors.muted} />}
                trailing={
                  sess.isCurrent ? (
                    <StatusChip label="Đang dùng" tone="ok" />
                  ) : (
                    <IconButton
                      icon="close-circle-outline"
                      accessibilityLabel={`Đăng xuất ${sess.deviceInfo ?? 'thiết bị'}`}
                      color={colors.error}
                      disabled={revoke.isPending && revoke.variables === sess.sessionId}
                      onPress={() => setConfirming(sess)}
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

      {others.length > 0 ? (
        <Button
          label={`Đăng xuất ${others.length} thiết bị khác`}
          variant="outline"
          loading={revokeOthers.isPending}
          onPress={() => setConfirmingAll(true)}
        />
      ) : null}
      <Button
        label="Xem lịch sử đăng nhập"
        variant="ghost"
        onPress={() => navigate('/account/security-history')}
      />

      <ConfirmDialog
        visible={confirming !== null}
        title="Đăng xuất thiết bị này?"
        description={confirming ? `${confirming.deviceInfo ?? 'Thiết bị'} sẽ phải đăng nhập lại.` : undefined}
        confirmLabel="Đăng xuất"
        confirmVariant="danger"
        loading={revoke.isPending}
        onConfirm={() => {
          if (!confirming) return;
          if (isLiveApi) {
            revoke.mutate(confirming.sessionId);
          } else {
            revokeMock(mockSessions[confirming.sessionId]!.id);
            setConfirming(null);
          }
        }}
        onCancel={() => {
          if (!revoke.isPending) setConfirming(null);
        }}
      />
      <ConfirmDialog
        visible={confirmingAll}
        title="Đăng xuất mọi thiết bị khác?"
        description="Chỉ thiết bị này được giữ lại. Dùng khi bạn nghi ngờ có người khác đang truy cập tài khoản."
        confirmLabel="Đăng xuất tất cả"
        confirmVariant="danger"
        loading={revokeOthers.isPending}
        onConfirm={() => {
          if (isLiveApi) revokeOthers.mutate();
          else {
            others.forEach((s) => revokeMock(mockSessions[s.sessionId]!.id));
            setConfirmingAll(false);
          }
        }}
        onCancel={() => {
          if (!revokeOthers.isPending) setConfirmingAll(false);
        }}
      />
    </Screen>
  );
}
