/**
 * Getting a person's attention when the app has news and they are not looking:
 * a system notification and a count in the tab title. Shared by new orders and
 * new chat messages, so both mark the same title and follow the same rules.
 */

const UNSEEN = /^\((\d+)\) /;

/** What the browser allows for system notifications, or 'unsupported'. */
export function notificationPermission(): NotificationPermission | 'unsupported' {
  return typeof window !== 'undefined' && 'Notification' in window
    ? window.Notification.permission
    : 'unsupported';
}

/** Asks once; only call from a tap. Returns the browser's answer. */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (notificationPermission() !== 'default') return notificationPermission();
  try {
    return await window.Notification.requestPermission();
  } catch {
    return notificationPermission();
  }
}

/** "(2) StreetBiz": how much arrived while the tab was hidden. No-op when visible. */
export function markUnseen(): void {
  if (!document.hidden) return;
  const waiting = Number(UNSEEN.exec(document.title)?.[1] ?? 0) + 1;
  document.title = `(${waiting}) ${document.title.replace(UNSEEN, '')}`;
}

/** Clears the title count when the person comes back. Returns the cleanup. */
export function clearUnseenOnReturn(): () => void {
  const restore = () => {
    if (!document.hidden) document.title = document.title.replace(UNSEEN, '');
  };
  document.addEventListener('visibilitychange', restore);
  return () => document.removeEventListener('visibilitychange', restore);
}

/**
 * A system notification, only while the tab is hidden - in view, the in-app
 * toast says the same thing without the OS getting involved. `tag` makes a
 * repeat for the same thing replace the earlier one instead of stacking.
 */
export function systemNotify(options: {
  title: string;
  body: string;
  tag: string;
  onClick: () => void;
}): boolean {
  if (!document.hidden || notificationPermission() !== 'granted') return false;
  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: '/favicon.png',
      tag: options.tag,
    });
    notification.onclick = () => {
      window.focus();
      options.onClick();
      notification.close();
    };
    return true;
  } catch {
    // Some mobile browsers only allow notifications from a service worker; the
    // sound, the toast and the title already carry the news.
    return false;
  }
}
