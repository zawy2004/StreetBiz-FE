import { Button, Icon } from '@/components/common';

type Props = {
  /** "Đang mở, đóng lúc 21:00", or today's window when the hours and the server disagree. */
  status: string | null;
  isOpen: boolean;
  directionsHref: string;
  onVendor: () => void;
  /** Present only when the buyer may start a chat (signed-in customer, live API). */
  chat: { onPress: () => void; loading: boolean } | null;
  chatError: string | null;
};

/**
 * Right under the cover, in thumb reach: how today looks, then the three ways
 * on (walk there, message the seller, see the licensed vendor). The buttons wrap
 * and share the row, so none of them hides off the edge of a phone.
 */
export function ActionRow({ status, isOpen, directionsHref, onVendor, chat, chatError }: Props) {
  return (
    <div className="flex flex-col gap-sm">
      <p className="flex min-h-[26px] items-center gap-2 text-body-lg font-semibold text-text">
        {status ? (
          <>
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${isOpen ? 'bg-tertiary' : 'bg-muted'}`}
            />
            {status}
          </>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-sm">
        <a
          href={directionsHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 grow basis-[140px] items-center justify-center gap-xs rounded-[12px] bg-primary px-lg md:grow-0 md:basis-auto text-[15px] font-semibold text-on-primary shadow-[0_10px_22px_-12px_rgb(var(--c-primary)/0.9)] transition-colors hover:bg-primary-pressed"
        >
          <Icon name="walk" size={20} color="currentColor" />
          Chỉ đường
        </a>
        {chat ? (
          <div className="grow basis-[220px] md:grow-0 md:basis-auto">
            <Button
              label="Nhắn tin cho người bán"
              variant="outline"
              loading={chat.loading}
              icon={<Icon name="chat-outline" size={18} color="currentColor" />}
              onPress={chat.onPress}
            />
          </div>
        ) : null}
        <div className="grow basis-[140px] md:grow-0 md:basis-auto">
          <Button
            label="Hộ kinh doanh"
            variant="outline"
            icon={<Icon name="shield-check-outline" size={18} color="currentColor" />}
            onPress={onVendor}
          />
        </div>
      </div>
      {chatError ? (
        <p role="alert" className="flex items-center gap-1.5 text-body-md font-medium text-error">
          <Icon name="alert-circle-outline" size={18} color="currentColor" />
          {chatError}
        </p>
      ) : null}
    </div>
  );
}
