import { Card, Divider, Icon } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState } from '@/components/feedback';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function NotificationsScreen() {
  const user = useAuthStore((s) => s.user);
  const notifications = useMockDb((s) => s.notifications)
    .filter((n) => n.userId === user?.id)
    .slice()
    .reverse();
  const markRead = useMockDb((s) => s.markNotificationRead);

  return (
    <Screen>
      <AppHeader title="Thông báo" back />
      {notifications.length === 0 ? (
        <EmptyState icon="bell-outline" title="Chưa có thông báo" />
      ) : (
        <Card padded={false}>
          <div className="px-md">
            {notifications.map((n, i) => (
              <div key={n.id}>
                {i > 0 ? <Divider /> : null}
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
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
