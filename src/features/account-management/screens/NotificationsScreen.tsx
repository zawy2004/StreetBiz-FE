import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/common';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { ErrorState } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { useNotifications } from '../notifications-api';
import { groupByDay } from '../components/account-format';
import {
  DayPlate,
  NotificationRow,
  NotificationsEmpty,
  NotificationsSkeleton,
  UnreadCounter,
} from '../components/NotificationParts';
import '../account.css';

type Filter = 'all' | 'unread';

/** The list is capped at the newest 50 by the API. */
const PAGE_SIZE = 50;

export function NotificationsScreen() {
  const { items, isLoading, isError, error, refetch, markRead, markAllRead } = useNotifications();
  const hasUnread = items.some((n) => !n.read);
  // Local view filter only: no request, nothing remembered.
  const [filter, setFilter] = useState<Filter>('all');
  const unreadCount = items.filter((n) => !n.read).length;

  // Say "Đã đọc hết" to screen readers once the server-confirmed list has nothing unread left.
  const hadUnread = useRef(hasUnread);
  const [announce, setAnnounce] = useState('');
  useEffect(() => {
    if (hadUnread.current && !hasUnread && items.length > 0) setAnnounce('Đã đọc hết');
    hadUnread.current = hasUnread;
  }, [hasUnread, items.length]);

  const shown = filter === 'unread' ? items.filter((n) => !n.read) : items;
  const groups = groupByDay(shown, (n) => n.sentAt);
  let order = 0;

  return (
    <Screen>
      <AppHeader title="Thông báo" back />
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      {isLoading ? (
        <NotificationsSkeleton />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} />
      ) : items.length === 0 ? (
        <NotificationsEmpty />
      ) : (
        <div className="grid grid-cols-1 items-start gap-lg lg:grid-cols-[minmax(0,600px)_minmax(0,1fr)] lg:gap-xl xl:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
          {/* First in reading order (count, then "Đọc hết", then the filter); placed right on wide screens. */}
          <aside
            aria-label="Tóm tắt thông báo"
            className="flex flex-col gap-md rounded-[24px] bg-card p-md shadow-card ring-1 ring-border lg:sticky lg:top-lg lg:col-start-2 lg:row-start-1 lg:p-lg"
          >
            <div className="flex flex-wrap items-center justify-between gap-md lg:flex-col lg:items-stretch">
              <UnreadCounter unread={unreadCount} total={items.length} />
              {hasUnread ? (
                <div className="lg:w-full lg:[&>button]:w-full">
                  <Button
                    label="Đọc hết"
                    variant="outline"
                    fullWidth={false}
                    onPress={markAllRead}
                  />
                </div>
              ) : null}
            </div>
            <SegmentedControl<Filter>
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'unread', label: 'Chưa đọc' },
              ]}
              value={filter}
              onChange={setFilter}
            />
            <p className="hidden border-t border-dashed border-border pt-md text-body-sm text-muted lg:block">
              Thông báo do hệ thống gửi khi phí đến hạn, hồ sơ có kết quả hoặc có đơn hàng mới. Bấm
              vào một thông báo để đánh dấu đã đọc.
            </p>
          </aside>

          <div className="flex min-w-0 flex-col gap-md lg:col-start-1 lg:row-start-1">
            {shown.length === 0 ? (
              <div className="flex flex-col items-start gap-sm rounded-[20px] bg-[#E6F6EC] p-md dark:bg-tertiary/15">
                <p className="text-body-md font-semibold text-[#0B5D33] dark:text-tertiary">
                  Bạn đã đọc hết thông báo.
                </p>
                <Button
                  label="Xem tất cả"
                  variant="outline"
                  size="sm"
                  fullWidth={false}
                  onPress={() => setFilter('all')}
                />
              </div>
            ) : (
              groups.map((group) => (
                <section
                  key={group.key}
                  aria-labelledby={`notice-day-${group.key}`}
                  className="flex flex-col"
                >
                  <DayPlate
                    id={`notice-day-${group.key}`}
                    label={group.label}
                    count={group.items.length}
                  />
                  <div className="overflow-hidden rounded-[20px] bg-card ring-1 ring-border">
                    {group.items.map((n, i) => (
                      <div key={n.id} className={i > 0 ? 'border-t border-border' : undefined}>
                        <NotificationRow
                          item={n}
                          order={order++}
                          onPress={() => (n.read ? undefined : markRead(n.id))}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
            {items.length >= PAGE_SIZE ? (
              <p className="text-center text-body-sm text-muted">Hiển thị 50 thông báo mới nhất.</p>
            ) : null}
          </div>
        </div>
      )}
    </Screen>
  );
}
