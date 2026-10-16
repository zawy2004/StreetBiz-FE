import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import type { RoleCode } from '@/core/types/role';
import { relativeTime } from '@/features/account-management/components/account-format';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme';

import {
  NOTIFICATION_LIMIT,
  useNotificationUnreadCount,
  useNotifications,
  type NotificationItem,
} from './notifications-api';
import {
  notificationTarget,
  notificationVisual,
  splitByRecency,
  type NotificationTone,
} from './notification-routing';

type Props = {
  /** Which edge of the bell the panel lines up with on wide screens. */
  align?: 'left' | 'right';
  /** `ghost` sits flat in a bar; `ring` is the outlined round button of the vendor bar. */
  variant?: 'ring' | 'ghost';
};

type Filter = 'all' | 'unread';

/**
 * The bell and its dropdown: the newest notifications in place, without leaving
 * the screen. A notice opens what it is about (when the signed-in role can see
 * it) and is marked read on the way.
 */
export function NotificationBell({ align = 'right', variant = 'ring' }: Props) {
  const unread = useNotificationUnreadCount();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={[
          'relative flex items-center justify-center rounded-full transition-colors',
          variant === 'ring'
            ? 'h-12 w-12 bg-card ring-1 ring-border hover:bg-sunken lg:h-11 lg:w-11'
            : 'h-10 w-10 text-text hover:bg-sunken',
          open ? 'bg-tint-primary ring-primary/40 hover:bg-tint-primary' : '',
        ].join(' ')}
      >
        <Icon
          name="bell-outline"
          size={22}
          color={open ? colors.primaryPressed : colors.text}
          weight={unread > 0 || open ? 'fill' : 'regular'}
        />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-badge font-tabular text-white ring-2 ring-card">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <NotificationPanel id={panelId} align={align} anchorRef={buttonRef} onClose={close} />
      ) : null}
    </div>
  );
}

/**
 * Where the panel sits: under the bell on wide screens, across the width on phones.
 * The panel is portalled to <body> so no bar's stacking context (backdrop blur,
 * z-index) can let the page paint over it; its place is measured from the bell.
 */
function usePanelPlacement(
  anchorRef: RefObject<HTMLButtonElement | null>,
  align: 'left' | 'right',
  isDesktop: boolean,
) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' });
  useLayoutEffect(() => {
    const place = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const top = rect.bottom + 8;
      if (!isDesktop) {
        setStyle({ top, left: 8, right: 8 });
      } else if (align === 'left') {
        setStyle({ top, left: Math.max(8, rect.left), width: 380 });
      } else {
        setStyle({ top, right: Math.max(8, window.innerWidth - rect.right), width: 380 });
      }
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchorRef, align, isDesktop]);
  return style;
}

function NotificationPanel({
  id,
  align,
  anchorRef,
  onClose,
}: {
  id: string;
  align: 'left' | 'right';
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: (returnFocus: boolean) => void;
}) {
  const isDesktop = useIsDesktop();
  const placement = usePanelPlacement(anchorRef, align, isDesktop);
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role_code);
  const { items, isLoading, isError, error, refetch, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = `${id}-title`;

  // Reload on every open, so the list matches the badge that invited the click.
  useEffect(() => {
    refetch();
    panelRef.current?.focus();
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (menuOpen) setMenuOpen(false);
      else onClose(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, onClose]);

  const unreadCount = items.filter((n) => !n.read).length;
  const shown = filter === 'unread' ? items.filter((n) => !n.read) : items;
  const { recent, earlier } = splitByRecency(shown);

  const open = (item: NotificationItem) => {
    if (!item.read) markRead(item.id);
    const to = notificationTarget(item, role);
    if (to) {
      onClose(false);
      navigate(to);
    }
  };

  return createPortal(
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng thông báo"
        className="fixed inset-0 z-[59] cursor-default"
        onClick={() => onClose(false)}
      />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={placement}
        className="sb-pop fixed z-[60] flex max-h-[min(78vh,640px)] flex-col overflow-hidden rounded-[16px] bg-card shadow-sheet outline-none ring-1 ring-border"
      >
        <div className="flex items-center justify-between gap-sm px-md pb-xs pt-md">
          <h2 id={titleId} className="font-heading text-[24px] font-bold leading-none text-text">
            Thông báo
          </h2>
          <div className="relative">
            <button
              type="button"
              aria-label="Tuỳ chọn thông báo"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-text"
            >
              <Icon name="dots-horizontal" size={22} color="currentColor" weight="fill" />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-10 z-10 w-[240px] rounded-[12px] bg-card p-1 shadow-sheet ring-1 ring-border"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={unreadCount === 0}
                  onClick={() => {
                    markAllRead();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-sm rounded-[8px] px-sm py-xs text-left text-body-md text-text transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent"
                >
                  <Icon name="check-all" size={20} color="currentColor" />
                  Đánh dấu tất cả là đã đọc
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div role="group" aria-label="Lọc thông báo" className="flex gap-xs px-md pb-sm">
          {(
            [
              ['all', 'Tất cả'],
              ['unread', 'Chưa đọc'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={[
                'h-9 rounded-full px-md text-label font-semibold transition-colors',
                filter === value
                  ? 'bg-tint-primary text-primary-pressed'
                  : 'text-text/80 hover:bg-sunken',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-xs pb-xs">
          {isLoading ? (
            <PanelSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-start gap-xs px-sm py-md">
              <p className="text-body-md text-error">{errorMessage(error)}</p>
              <button
                type="button"
                onClick={refetch}
                className="rounded-full px-sm py-1 text-label font-semibold text-primary-pressed hover:bg-tint-primary"
              >
                Thử lại
              </button>
            </div>
          ) : shown.length === 0 ? (
            <PanelEmpty unreadOnly={filter === 'unread' && items.length > 0} />
          ) : (
            <>
              <Section title="Mới" items={recent} onOpen={open} role={role} />
              <Section title="Trước đó" items={earlier} onOpen={open} role={role} />
              {items.length >= NOTIFICATION_LIMIT ? (
                <p className="px-sm py-xs text-center text-body-sm text-muted">
                  Hiển thị {NOTIFICATION_LIMIT} thông báo mới nhất.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

function Section({
  title,
  items,
  onOpen,
  role,
}: {
  title: string;
  items: NotificationItem[];
  onOpen: (item: NotificationItem) => void;
  role: RoleCode | undefined;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title}>
      <h3 className="px-sm pb-1 pt-xs text-[16px] font-bold text-text">{title}</h3>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id}>
            <Row
              item={item}
              linked={notificationTarget(item, role) !== null}
              onPress={() => onOpen(item)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

const TONES: Record<NotificationTone, string> = {
  primary: 'bg-primary text-on-primary',
  success: 'bg-tertiary text-on-tertiary',
  warning: 'bg-[#F2B233] text-[#3A2600]',
  error: 'bg-error text-white',
  neutral: 'bg-muted text-white',
};

function Row({
  item,
  linked,
  onPress,
}: {
  item: NotificationItem;
  linked: boolean;
  onPress: () => void;
}) {
  const unread = !item.read;
  const { icon, tone } = notificationVisual(item);
  const when = relativeTime(item.sentAt);
  return (
    <button
      type="button"
      onClick={onPress}
      title={linked ? undefined : 'Thông báo này không có trang để mở'}
      className="flex w-full items-start gap-sm rounded-[10px] px-sm py-xs text-left transition-colors hover:bg-sunken focus-visible:bg-sunken"
    >
      <span
        aria-hidden="true"
        className={`relative mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${TONES[tone]}`}
      >
        <Icon name={icon} size={24} color="currentColor" weight="fill" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        {unread ? <span className="sr-only">Chưa đọc. </span> : null}
        <span
          className={`line-clamp-2 text-body-md ${unread ? 'font-semibold text-text' : 'text-text/80'}`}
        >
          {item.title}
        </span>
        <span className={`line-clamp-2 text-body-sm ${unread ? 'text-text/80' : 'text-muted'}`}>
          {item.body}
        </span>
        {when ? (
          <span
            className={`mt-0.5 text-body-xs ${unread ? 'font-semibold text-primary-pressed' : 'text-muted'}`}
          >
            {when}
          </span>
        ) : null}
      </span>
      {unread ? (
        <span aria-hidden="true" className="mt-5 h-3 w-3 shrink-0 rounded-full bg-primary" />
      ) : null}
    </button>
  );
}

function PanelEmpty({ unreadOnly }: { unreadOnly: boolean }) {
  return (
    <div className="flex flex-col items-center gap-xs px-lg py-xl text-center">
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-sunken text-muted"
      >
        <Icon name={unreadOnly ? 'check-circle-outline' : 'bell-outline'} size={28} color="currentColor" />
      </span>
      <p className="text-body-md font-semibold text-text">
        {unreadOnly ? 'Bạn đã đọc hết thông báo' : 'Chưa có thông báo'}
      </p>
      {unreadOnly ? null : (
        <p className="max-w-[32ch] text-body-sm text-muted">
          Khi có đơn mới, phí đến hạn hay hồ sơ có kết quả, thông báo sẽ hiện ở đây.
        </p>
      )}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div role="status" aria-label="Đang tải" className="flex flex-col gap-xs px-sm py-xs">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-sm">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
