import { useId, useState, type FormEvent } from 'react';

import { Button, Icon } from '@/components/common';
import { inputShellClass } from '@/components/forms';
import { CHAT_MESSAGE_MAX_LENGTH } from '../types/chat.types';

type Props = {
  sending?: boolean;
  error?: string;
  /** Rejects when the message could not be sent, so the draft survives. */
  onSend: (body: string) => Promise<unknown>;
};

/** Start counting characters once this few are left before the limit. */
const COUNT_FROM = 200;

/**
 * The composer is its own bottom bar rather than a `StickyActions` child: that
 * component sizes its children like buttons on wide screens (min-width 200px,
 * flex-none), which collapses a text input next to them. It also uses the raw
 * input shell instead of `TextField`, so the label-column grid `.field` picks up
 * inside a `.cq` container can never squeeze the box either.
 *
 * Drawn as the stall's counter top: a thin painted kerb along its upper edge.
 */
export function MessageComposer({ sending, error, onSend }: Props) {
  const [draft, setDraft] = useState('');
  const body = draft.trim();
  const canSend = Boolean(body) && !sending;
  const errorId = useId();
  const remaining = CHAT_MESSAGE_MAX_LENGTH - draft.length;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    try {
      await onSend(body);
      setDraft('');
    } catch {
      // Keep what was typed: clearing it on a failed send loses the message
      // while the error tells the user to try again.
    }
  };

  return (
    <div data-chat-composer="" className="relative shrink-0 bg-card/95 lg:backdrop-blur">
      <div aria-hidden="true" className="sb-kerb" style={{ height: 3, animation: 'none' }} />
      <form onSubmit={submit} className="mx-auto w-full max-w-[760px] p-md md:px-lg">
        <div className="flex items-center gap-sm">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Nhập tin nhắn…"
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
            aria-label="Nội dung tin nhắn"
            aria-describedby={error ? errorId : undefined}
            className={`${inputShellClass()} h-12 min-w-0 flex-1 rounded-[14px] px-sm text-body-lg text-text placeholder:text-muted/80 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted`}
          />
          <Button
            label="Gửi"
            type="submit"
            fullWidth={false}
            disabled={!canSend}
            loading={sending}
            icon={<Icon name="send-outline" size={18} color="currentColor" />}
          />
        </div>
        {remaining <= COUNT_FROM ? (
          <p className="mt-xs text-right font-sign text-[12px] font-semibold text-muted font-tabular">
            {`${draft.length.toLocaleString('vi-VN')}/${CHAT_MESSAGE_MAX_LENGTH.toLocaleString('vi-VN')}`}
          </p>
        ) : null}
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="mt-xs flex items-start gap-xs text-body-md text-error"
          >
            <Icon
              name="alert-circle-outline"
              size={18}
              color="currentColor"
              className="mt-0.5 shrink-0"
            />
            <span>{error}</span>
          </p>
        ) : null}
      </form>
    </div>
  );
}
