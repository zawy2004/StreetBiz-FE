import { Button, Card, Divider, Icon } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { colors } from '@/theme';
import { useNotifications } from '../notifications-api';

function formatSentAt(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleString('vi-VN');
}

export function NotificationsScreen() {
  const { items, isLoading, isError, error, refetch, markRead, markAllRead } = useNotifications();
  const hasUnread = items.some((n) => !n.read);

  return (
    <Screen>
      <AppHeader
        title="Thông báo"
        back
        right={
          hasUnread ? (
            <Button label="Đọc hết" variant="outline" fullWidth={false} onPress={markAllRead} />
          ) : undefined
        }
      />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="bell-outline" title="Chưa có thông báo" />
      ) : (
        <Card padded={false}>
          <div className="px-md">
            {items.map((n, i) => (
              <div key={n.id}>
                {i > 0 ? <Divider /> : null}
                <button
                  type="button"
                  onClick={() => (n.read ? undefined : markRead(n.id))}
                  className="flex w-full items-start gap-sm py-sm text-left"
                >
                  <Icon
                    name={n.read ? 'bell-outline' : 'bell-ring'}
                    size={20}
                    color={n.read ? colors.muted : colors.primary}
                  />
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-headline-sm text-text">{n.title}</span>
                    <span className="text-body-md text-muted">{n.body}</span>
                    <span className="text-body-sm text-muted">{formatSentAt(n.sentAt)}</span>
                  </div>
                  {!n.read ? (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </Screen>
  );
}
