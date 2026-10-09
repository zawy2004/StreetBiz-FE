import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PiSparkleFill } from 'react-icons/pi';
import { env } from '@/core/config/env';
import { useAuthStore } from '@/store/auth-store';
import { EmberOrb } from './EmberOrb';
import './assistant.css';

const AssistantPanel = lazy(() =>
  import('./AssistantPanel').then((m) => ({ default: m.AssistantPanel })),
);

export function AssistantHost() {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const [unread, setUnread] = useState(false);
  const markUnread = useCallback(() => setUnread(true), []);
  const launcher = useRef<HTMLButtonElement>(null);
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const fullPage = pathname === '/assistant';
  if (!env.enableChatbot)
    return fullPage ? (
      <p className="p-6">Trợ lý đang tạm nghỉ. Vui lòng dùng các chức năng trên web.</p>
    ) : null;
  const accountKey = `${user?.id ?? 'guest'}:${user?.role_code ?? 'GUEST'}:${user?.wardUnitId ?? ''}`;
  return (
    <>
      {!open && !fullPage && (
        <button
          ref={launcher}
          type="button"
          aria-label={unread ? 'Mở Trợ lý StreetBiz, có câu trả lời mới' : 'Mở Trợ lý StreetBiz'}
          aria-haspopup="dialog"
          className="sb-launcher"
          onClick={() => {
            setVisited(true);
            setOpen(true);
            setUnread(false);
          }}
        >
          <EmberOrb size={38} />
          <PiSparkleFill className="sb-launcher-spark" aria-hidden="true" />
          {unread && <span className="sb-launcher-dot" aria-hidden="true" />}
          <span className="sb-launcher-label">Hỏi trợ lý</span>
        </button>
      )}
      {(visited || fullPage) && (
        <Suspense
          fallback={
            open || fullPage ? (
              <div className="sb-launcher is-loading" role="status">
                <EmberOrb size={38} state="thinking" />
                <span className="sb-launcher-label">Đang mở trợ lý…</span>
              </div>
            ) : null
          }
        >
          <AssistantPanel
            key={accountKey}
            accountKey={accountKey}
            role={user?.role_code ?? 'GUEST'}
            open={open || fullPage}
            fullPage={fullPage}
            onUnread={markUnread}
            onClose={() => {
              setOpen(false);
              requestAnimationFrame(() => launcher.current?.focus());
            }}
          />
        </Suspense>
      )}
    </>
  );
}
