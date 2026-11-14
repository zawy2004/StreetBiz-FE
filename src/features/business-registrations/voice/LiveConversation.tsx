import { useEffect, useRef } from 'react';

import { Button, Icon } from '@/components/common';
import type { LiveCaption, LiveStatus } from './live-interview';

const STATUS_TEXT: Record<LiveStatus, string> = {
  idle: 'Sẵn sàng',
  connecting: 'Đang kết nối với trợ lý…',
  listening: 'Trợ lý đang nghe — cứ nói',
  thinking: 'Trợ lý đang ghi lại…',
  speaking: 'Trợ lý đang nói',
  muted: 'Đã tắt micro',
  reconnecting: 'Đang nối lại…',
  ended: 'Đã dừng',
};

/** Before the conversation: one tap opens the microphone (browsers need the tap). */
export function LiveStart({
  question,
  onStart,
  onTapToTalk,
}: {
  question: string | null;
  onStart: () => void;
  onTapToTalk: () => void;
}) {
  return (
    <section className="flex flex-col gap-md rounded-[28px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
      <div className="flex items-start gap-md">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_12px_24px_-12px_rgb(var(--c-primary)/0.9)]">
          <Icon name="account-voice" size={30} color="currentColor" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-sign text-[24px] font-extrabold leading-[30px] text-text md:text-[28px] md:leading-[34px]">
            Trò chuyện với trợ lý
          </h2>
          <p className="text-body-lg text-text/80">
            Bấm bắt đầu, trợ lý chào và hỏi; bạn cứ trả lời như nói chuyện. Số tiền, ngày, bản đồ vẫn
            hiện trên màn hình để bạn bấm xác nhận.
          </p>
          {question ? <p className="text-body-md text-muted">Câu đang hỏi: “{question}”</p> : null}
        </div>
      </div>
      <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
        <div className="sm:w-[300px]">
          <Button
            label="Bắt đầu trò chuyện"
            size="lg"
            icon={<Icon name="microphone" size={20} color="currentColor" weight="fill" />}
            onPress={onStart}
          />
        </div>
        <Button label="Bấm để nói từng câu" variant="ghost" fullWidth={false} onPress={onTapToTalk} />
      </div>
    </section>
  );
}

/**
 * While talking: who is speaking, the last few lines of both sides (the assistant's marked [AI],
 * BR-42), and the two controls the vendor needs -- microphone off/on, and stop.
 */
export function LivePanel({
  status,
  captions,
  notice,
  muted,
  level,
  onMute,
  onStop,
}: {
  status: LiveStatus;
  captions: LiveCaption[];
  notice: string;
  muted: boolean;
  level: () => number;
  onMute: (muted: boolean) => void;
  onStop: () => void;
}) {
  const ring = useRef<HTMLSpanElement>(null);

  // The ring follows whoever is speaking.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (ring.current) ring.current.style.transform = `scale(${1 + level() * 0.4})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [level]);

  const speaking = status === 'speaking';
  return (
    <section
      aria-label="Trò chuyện với trợ lý"
      className="flex flex-col gap-md rounded-[28px] bg-[#FFF3E8] p-md ring-1 ring-brand/20 md:p-lg dark:bg-[#2A2420]"
    >
      <div className="flex items-center gap-md">
        <span className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <span
            ref={ring}
            aria-hidden="true"
            className={`absolute inset-0 rounded-full transition-transform duration-75 ${speaking ? 'bg-tertiary/30' : 'bg-primary/25'}`}
          />
          <span
            className={`relative flex h-14 w-14 items-center justify-center rounded-full text-on-primary ${
              muted ? 'bg-muted' : speaking ? 'bg-tertiary' : 'bg-primary'
            }`}
          >
            <Icon
              name={muted ? 'microphone-off' : speaking ? 'account-voice' : 'microphone'}
              size={28}
              color="currentColor"
              weight="fill"
            />
          </span>
        </span>
        <p aria-live="polite" className="min-w-0 flex-1 text-[17px] font-bold text-text">
          {STATUS_TEXT[status]}
        </p>
      </div>

      {captions.length > 0 ? (
        <ul aria-label="Lời trò chuyện" className="flex flex-col gap-xs">
          {captions.map((c) => (
            <li
              key={c.id}
              className={`rounded-[14px] px-sm py-xs text-body-md ${
                c.who === 'vendor' ? 'self-end bg-card text-text ring-1 ring-border' : 'self-start bg-secondary-bg text-on-secondary'
              }`}
            >
              <span className="mr-1 text-[12px] font-bold uppercase tracking-[0.04em] opacity-70">
                {c.who === 'vendor' ? 'Bạn' : '[AI] Trợ lý'}
              </span>
              {c.text}
            </li>
          ))}
        </ul>
      ) : null}

      {notice ? <p className="text-body-md font-medium text-[#8A5300] dark:text-[#FFD27A]">{notice}</p> : null}

      <div className="flex flex-wrap gap-sm">
        <Button
          label={muted ? 'Bật micro' : 'Tắt micro'}
          variant="outline"
          fullWidth={false}
          icon={<Icon name={muted ? 'microphone' : 'microphone-off'} size={18} color="currentColor" />}
          onPress={() => onMute(!muted)}
        />
        <Button
          label="Dừng trò chuyện"
          variant="ghost"
          fullWidth={false}
          icon={<Icon name="stop" size={18} color="currentColor" />}
          onPress={onStop}
        />
      </div>
    </section>
  );
}
