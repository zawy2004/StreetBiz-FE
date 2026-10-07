import { useState } from 'react';

import { Icon } from '@/components/common';
import { notificationPermission, requestNotificationPermission } from '@/core/attention/notify';

/**
 * CHAT-02: a browser only shows system notifications once the person has said
 * yes, and only asks after a tap. This is that tap - shown while the browser
 * has not been asked, and gone once it has, whatever the answer.
 */
export function ChatNotificationPrompt() {
  const [permission, setPermission] = useState(notificationPermission);
  if (permission !== 'default') return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-md gap-y-xs rounded-md border border-border bg-card px-sm py-xs">
      <p className="flex min-w-0 items-center gap-xs text-body-sm text-text">
        <Icon name="bell-outline" size={18} />
        Bật thông báo để biết có tin nhắn mới khi bạn đang ở tab khác.
      </p>
      <button
        type="button"
        onClick={async () => setPermission(await requestNotificationPermission())}
        className="h-9 shrink-0 rounded-full px-sm text-label font-semibold text-primary hover:bg-tint-primary"
      >
        Bật thông báo
      </button>
    </div>
  );
}
