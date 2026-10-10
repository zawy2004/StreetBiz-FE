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
    <div className="sb-chat-bell flex flex-wrap items-center justify-between gap-x-md gap-y-xs rounded-[18px] bg-secondary-bg px-md py-sm">
      <p className="flex min-w-0 items-center gap-sm text-body-md text-on-secondary">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-card"
        >
          <Icon name="bell-ring" size={19} color="currentColor" weight="fill" />
        </span>
        Bật thông báo để biết có tin nhắn mới khi bạn đang ở tab khác.
      </p>
      <button
        type="button"
        onClick={async () => setPermission(await requestNotificationPermission())}
        className="h-11 shrink-0 rounded-full bg-card px-md text-label font-semibold text-primary-pressed shadow-card transition-colors hover:bg-tint-primary"
      >
        Bật thông báo
      </button>
    </div>
  );
}
