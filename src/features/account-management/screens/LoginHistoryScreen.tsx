import { useQuery } from '@tanstack/react-query';

import { Icon, type IconName } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState, ErrorState } from '@/components/feedback';
import { authApi, errorMessage, type SecurityEvent } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { relativeTime, shortDate } from '../components/account-format';
import '../account.css';

type ActionStyle = {
  label: string;
  icon: IconName;
  /** Tailwind classes for the icon chip. */
  tint: string;
  danger?: boolean;
};

/** Maps `SecurityActions.*` on the backend onto a readable row. */
const ACTIONS: Record<string, ActionStyle> = {
  LOGIN_SUCCESS: {
    label: 'Đăng nhập thành công',
    icon: 'login',
    tint: 'bg-secondary-bg text-on-secondary',
  },
  LOGIN_FAILED: {
    label: 'Đăng nhập thất bại',
    icon: 'alert-circle-outline',
    tint: 'bg-error/10 text-error',
    danger: true,
  },
  ACCOUNT_LOCKED: {
    label: 'Tài khoản bị tạm khoá',
    icon: 'lock-outline',
    tint: 'bg-error/10 text-error',
    danger: true,
  },
  PASSWORD_CHANGED: {
    label: 'Đổi mật khẩu',
    icon: 'lock-outline',
    tint: 'bg-sunken text-text',
  },
  PASSWORD_RESET: {
    label: 'Đặt lại mật khẩu',
    icon: 'lock-helper',
    tint: 'bg-sunken text-text',
  },
  SESSION_REVOKED: {
    label: 'Đăng xuất một thiết bị',
    icon: 'logout',
    tint: 'bg-sunken text-text',
  },
  OTHER_SESSIONS_REVOKED: {
    label: 'Đăng xuất các thiết bị khác',
    icon: 'logout',
    tint: 'bg-sunken text-text',
  },
  SECURITY_ALERT: {
    label: 'Cảnh báo bảo mật',
    icon: 'shield-alert-outline',
    tint: 'bg-error/10 text-error',
    danger: true,
  },
};

function styleFor(action: string): ActionStyle {
  return (
    ACTIONS[action] ?? {
      label: action,
      icon: 'history',
      tint: 'bg-sunken text-text',
    }
  );
}

function HistoryRow({ event }: { event: SecurityEvent }) {
  const style = styleFor(event.action);
  return (
    <li className="flex items-start gap-sm py-sm">
      <span
        aria-hidden="true"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${style.tint}`}
      >
        <Icon name={style.icon} size={18} color="currentColor" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-body-lg font-semibold ${style.danger ? 'text-error' : 'text-text'}`}>
          {style.label}
        </p>
        {event.details ? (
          <p className="truncate text-body-sm text-muted">{event.details}</p>
        ) : null}
      </div>
      <time
        dateTime={event.createdAt}
        title={shortDate(event.createdAt)}
        className="shrink-0 text-body-sm text-muted"
      >
        {relativeTime(event.createdAt)}
      </time>
    </li>
  );
}

function HistorySkeleton() {
  return (
    <ul className="flex flex-col divide-y divide-border" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-center gap-sm py-sm">
          <span className="h-9 w-9 shrink-0 animate-pulse rounded-[10px] bg-sunken" />
          <span className="h-4 w-40 animate-pulse rounded bg-sunken" />
        </li>
      ))}
    </ul>
  );
}

/** Read-only view of the caller's own sign-in & security history (GET /auth/login-history). */
export function LoginHistoryScreen() {
  const query = useQuery({
    queryKey: ['login-history'],
    queryFn: () => authApi.listLoginHistory(50),
    enabled: isLiveApi,
  });

  const body = () => {
    if (!isLiveApi) {
      return (
        <EmptyState
          icon="history"
          title="Chưa có dữ liệu ở chế độ demo"
          description="Lịch sử đăng nhập hiển thị khi kết nối với máy chủ StreetBiz."
        />
      );
    }
    if (query.isLoading) return <HistorySkeleton />;
    if (query.isError) {
      return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />;
    }
    const events = query.data ?? [];
    if (events.length === 0) {
      return <EmptyState icon="history" title="Chưa có hoạt động nào" />;
    }
    return (
      <ul className="flex flex-col divide-y divide-border">
        {events.map((event) => (
          <HistoryRow key={event.id} event={event} />
        ))}
      </ul>
    );
  };

  return (
    <Screen>
      <AppHeader
        title="Hoạt động đăng nhập"
        back
        subtitle="Các lần đăng nhập và thay đổi bảo mật gần đây trên tài khoản của bạn"
      />
      {body()}
    </Screen>
  );
}
