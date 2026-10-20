import { useState } from 'react';

import { Icon } from '@/components/common';
import { playChime, unlockChime } from '@/core/attention/chime';
import { notificationPermission, requestNotificationPermission } from '@/core/attention/notify';
import { VENDOR_ORDERS_REFRESH_MS } from '../hooks/useOrders';
import { useOrderAlertStore } from './order-alert-store';

/**
 * ORD-04: how fresh the board is, and whether new orders will ring - the two
 * things a seller needs to trust before they look away from the screen.
 *
 * Turning alerts on is a tap, which is also the gesture browsers require before
 * they allow sound or ask about notifications: so the tap unlocks audio, asks
 * for notification permission once, and plays the chime so the seller knows
 * what they will hear.
 */
export function OrderLiveBar() {
  const live = useOrderAlertStore((state) => state.live);
  const alerts = useOrderAlertStore((state) => state.alerts);
  const setAlerts = useOrderAlertStore((state) => state.setAlerts);
  const [permission, setPermission] = useState(notificationPermission);

  const askPermission = async () => setPermission(await requestNotificationPermission());

  const toggle = async () => {
    if (alerts) {
      setAlerts(false);
      return;
    }
    setAlerts(true);
    if (await unlockChime()) playChime();
    await askPermission();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-md gap-y-xs rounded-md border border-border bg-card px-sm py-xs">
      <p className="flex min-w-0 items-center gap-xs text-body-sm text-text" role="status">
        <span
          aria-hidden="true"
          className={[
            'h-2.5 w-2.5 shrink-0 rounded-full',
            live ? 'bg-tertiary shadow-[0_0_0_3px_rgb(var(--c-tertiary)/0.2)]' : 'bg-secondary',
          ].join(' ')}
        />
        {live
          ? 'Trực tiếp: đơn mới hiện ngay khi khách thanh toán'
          : `Đang kết nối lại, vẫn tự cập nhật mỗi ${VENDOR_ORDERS_REFRESH_MS / 1000} giây`}
      </p>
      <div className="flex items-center gap-xs">
        {alerts && permission === 'denied' ? (
          <span className="text-body-xs text-muted">
            Trình duyệt đang chặn thông báo; chuông vẫn kêu khi trang đang mở.
          </span>
        ) : null}
        {/* Alerts start on, but a browser only asks about notifications after
            a tap - so offer that tap rather than fail silently in a hidden tab. */}
        {alerts && permission === 'default' ? (
          <button
            type="button"
            onClick={() => void askPermission()}
            className="h-9 rounded-full px-sm text-label font-semibold text-primary hover:bg-tint-primary"
          >
            Cho phép báo khi ẩn tab
          </button>
        ) : null}
        <button
          type="button"
          role="switch"
          aria-checked={alerts}
          onClick={() => void toggle()}
          className={[
            'inline-flex h-9 shrink-0 items-center gap-xs rounded-full border px-sm text-label font-semibold transition-colors',
            alerts
              ? 'border-tertiary/40 bg-tertiary/10 text-tertiary'
              : 'border-border bg-sunken text-muted hover:text-text',
          ].join(' ')}
        >
          <Icon name="bell-outline" size={18} />
          {alerts ? 'Âm báo đơn mới: bật' : 'Âm báo đơn mới: tắt'}
        </button>
      </div>
    </div>
  );
}
