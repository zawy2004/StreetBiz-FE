import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Icon } from '@/components/common';
import type { ChatConversation } from '../types/chat.types';
import { StoreAvatar } from './ChatParts';

type Props = {
  conversation: ChatConversation | undefined;
  /** Buyers get a way into the stall they are talking to. */
  storeLink?: string;
};

/**
 * The stall's plate, stuck to the top of the thread so it is always clear who
 * you are talking to: back, the stall's sign, the name, and a kerb underneath.
 */
export function ThreadHeader({ conversation, storeLink }: Props) {
  const navigate = useNavigate();
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry?.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden="true" className="h-px" />
      <header
        data-scrolled={scrolled}
        className="sb-chat-plate sticky top-0 z-20 bg-card/95 transition-shadow duration-200 lg:bg-card/90 lg:backdrop-blur-md"
      >
        <div className="mx-auto flex h-14 w-full max-w-[760px] items-center gap-sm px-xs md:h-16 md:px-md">
          <button
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-text transition-colors hover:bg-sunken"
          >
            <Icon name="arrow-left" size={22} color="currentColor" />
          </button>
          <StoreAvatar uri={conversation?.storefrontImageUrl ?? null} size={44} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-[18px] font-bold leading-6 text-text">
              {conversation?.counterpartName ?? 'Tin nhắn'}
            </h1>
            {conversation?.storefrontName ? (
              <p className="flex min-w-0 items-center gap-1 text-body-sm text-muted">
                <Icon
                  name="storefront-outline"
                  size={14}
                  color="currentColor"
                  className="shrink-0"
                />
                <span className="truncate">{conversation.storefrontName}</span>
              </p>
            ) : null}
          </div>
          {storeLink ? (
            <Link
              to={storeLink}
              className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full bg-tint-primary px-sm text-label font-semibold text-primary-pressed transition-colors hover:bg-primary/15 md:px-md"
            >
              <Icon name="storefront-outline" size={17} color="currentColor" />
              <span className="hidden sm:inline">Xem quầy</span>
              <span className="sr-only sm:hidden">Xem quầy</span>
            </Link>
          ) : null}
        </div>
        <div aria-hidden="true" className="sb-kerb" style={{ height: 4 }} />
      </header>
    </>
  );
}
