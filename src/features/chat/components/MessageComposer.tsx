import { useState, type FormEvent } from 'react';

import { Button } from '@/components/common';
import { inputShellClass } from '@/components/forms';
import { CHAT_MESSAGE_MAX_LENGTH } from '../types/chat.types';

type Props = {
  sending?: boolean;
  placeholder?: string;
  error?: string;
  /** Rejects when the message could not be sent, so the draft survives. */
  onSend: (body: string) => Promise<unknown>;
};

/**
 * The composer is its own bottom bar rather than a `StickyActions` child: that
 * component sizes its children like buttons on wide screens (min-width 200px,
 * flex-none), which collapses a text input next to them. It also uses the raw
 * input shell instead of `TextField`, so the label-column grid `.field` picks up
 * inside a `.cq` container can never squeeze the box either.
 */
export function MessageComposer({ sending, error, onSend, placeholder = 'Nhập tin nhắn…' }: Props) {
  const [draft, setDraft] = useState('');
  const body = draft.trim();
  const canSend = Boolean(body) && !sending;

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
    <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur">
      <form onSubmit={submit} className="mx-auto w-full max-w-[1040px] p-md md:px-lg lg:px-xl">
        <div className="flex items-center gap-sm">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
            aria-label="Nội dung tin nhắn"
            className={`${inputShellClass()} h-12 min-w-0 flex-1 px-sm text-body-lg text-text placeholder:text-muted/80 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted`}
          />
          <Button
            label="Gửi"
            type="submit"
            fullWidth={false}
            disabled={!canSend}
            loading={sending}
          />
        </div>
        {error ? <p className="mt-xs text-body-md text-error">{error}</p> : null}
      </form>
    </div>
  );
}
