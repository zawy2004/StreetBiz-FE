import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import {
  PiArrowRight,
  PiClosedCaptioning,
  PiKeyboard,
  PiMicrophone,
  PiMicrophoneSlash,
  PiPhoneDisconnect,
  PiShieldCheck,
} from 'react-icons/pi';
import { safeRoute } from './assistant-context';
import { AssistantVendorResults } from './AssistantVendorResults';
import { EmberOrb, type OrbState } from './EmberOrb';
import type { AssistantRole } from './types';
import { formatClock, STATE_LABEL, summaryLine } from './voice/voice-protocol';
import type { useVoiceSession } from './voice/useVoiceSession';

type Voice = ReturnType<typeof useVoiceSession>;

const ORB: Record<string, OrbState> = {
  listening: 'listening',
  speaking: 'speaking',
  thinking: 'thinking',
  connecting: 'thinking',
  reconnecting: 'thinking',
  requesting: 'thinking',
  muted: 'muted',
  error: 'error',
};

/** Live, full-duplex conversation surface. Cards from tools appear beside the speech so amounts can be checked. */
export function VoiceMode({
  voice,
  role,
  consented,
  onConsent,
  onStart,
  onClose,
  onNavigate,
}: {
  voice: Voice;
  role: AssistantRole;
  consented: boolean;
  onConsent: () => void;
  onStart: () => void;
  onClose: () => void;
  onNavigate: (route: string) => void;
}) {
  const [captionsOn, setCaptionsOn] = useState(true);
  const endButton = useRef<HTMLButtonElement>(null);
  const label =
    voice.state === 'thinking' && voice.activity ? voice.activity : STATE_LABEL[voice.state];
  useEffect(() => {
    if (voice.active) endButton.current?.focus({ preventScroll: true });
  }, [voice.active]);
  // Only the latest lookup is shown: the conversation moves on, older cards stay in the chat history.
  const latest = [...voice.results].reverse().find((r) => r.cards.length > 0);
  const actions = latest?.actions.filter((a) => safeRoute(a.route, role)) ?? [];
  const stalls = role === 'CUSTOMER' ? (latest?.cards.filter((c) => c.actionId?.startsWith('public.food:')) ?? []) : [];
  const facts = (latest?.cards ?? []).filter((c) => !stalls.includes(c)).slice(0, 6);
  const hasResults = stalls.length > 0 || facts.length > 0;

  return (
    <m.div
      className={`sb-voice${hasResults ? ' has-results' : ''}`}
      role="region"
      aria-label="Trò chuyện bằng giọng nói"
      initial={{ opacity: 0, clipPath: 'circle(0% at 88% 92%)' }}
      animate={{ opacity: 1, clipPath: 'circle(150% at 88% 92%)' }}
      exit={{ opacity: 0, clipPath: 'circle(0% at 88% 92%)' }}
      transition={{ duration: 0.36, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {!consented ? (
        <div className="sb-voice-consent">
          <PiShieldCheck aria-hidden="true" className="sb-voice-consent-icon" />
          <h3>Trò chuyện bằng giọng nói</h3>
          <p>
            Âm thanh của bạn được truyền trực tiếp tới dịch vụ AI để nghe và trả lời theo thời gian thực. StreetBiz{' '}
            <strong>không lưu bản ghi âm</strong>; chỉ phụ đề và thẻ dữ liệu được lưu vào lịch sử trò chuyện như tin
            nhắn thường.
          </p>
          <ul>
            <li>Bạn có thể nói chen ngang để ngắt lời trợ lý bất cứ lúc nào.</li>
            <li>Số tiền và hiệu lực giấy phép luôn hiện kèm thẻ dữ liệu để đối chiếu.</li>
            <li>Không đọc mật khẩu, OTP hoặc số giấy tờ tùy thân.</li>
          </ul>
          <div className="sb-voice-consent-actions">
            <button type="button" className="sb-btn is-ghost" onClick={onClose}>
              Để sau
            </button>
            <button
              type="button"
              className="sb-btn is-primary"
              onClick={() => {
                onConsent();
                onStart();
              }}
            >
              <PiMicrophone aria-hidden="true" /> Bắt đầu nói
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="sb-voice-top">
            <span className="sb-ai-badge">[AI]</span>
            <span>Trợ lý StreetBiz</span>
            {voice.secondsLeft !== undefined && (
              <span className={`sb-voice-clock${voice.secondsLeft <= 30 ? ' is-low' : ''}`} aria-label="Thời lượng còn lại">
                {formatClock(voice.secondsLeft)}
              </span>
            )}
          </div>
          <m.div layout className="sb-voice-stage" transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
            <m.span layout className="sb-voice-orb-wrap">
              <EmberOrb
                size={hasResults ? 52 : 164}
                state={ORB[voice.state] ?? 'idle'}
                level={voice.active ? voice.level : undefined}
                className="sb-voice-orb"
              />
            </m.span>
            <m.div layout="position" className="sb-voice-status">
              <p className="sb-voice-state" role="status" aria-live="polite">
                {label}
              </p>
              {voice.notice && <p className="sb-voice-notice">{voice.notice}</p>}
              {!voice.active && voice.summary && (
                <p className="sb-voice-summary">{summaryLine(voice.summary)}</p>
              )}
              {voice.error && (
                <p className="sb-voice-error" role="alert">
                  {voice.error}
                </p>
              )}
            </m.div>
          </m.div>
          {captionsOn && (
            <div className="sb-captions" aria-live="polite" aria-label="Phụ đề trực tiếp">
              <AnimatePresence initial={false}>
                {voice.captions.slice(-2).map((c) => (
                  <m.p
                    key={c.id}
                    layout="position"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`sb-caption is-${c.who}`}
                  >
                    <span className="sr-only">{c.who === 'user' ? 'Bạn: ' : 'Trợ lý: '}</span>
                    {c.text}
                  </m.p>
                ))}
              </AnimatePresence>
              {voice.active && voice.captions.length === 0 && (
                <p className="sb-caption is-hint">Cứ nói tự nhiên, ví dụ “Phí tháng này của tôi là bao nhiêu?”</p>
              )}
            </div>
          )}
          <AnimatePresence mode="wait">
            {hasResults && latest && (
              <m.div
                key={latest.id}
                className="sb-voice-dock"
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              >
                <p className="sb-voice-dock-head">
                  <span className="sb-live-dot" aria-hidden="true" />
                  <span>{stalls.length ? 'Quầy phù hợp' : 'Dữ liệu trực tiếp'}</span>
                  <small>để đối chiếu · chạm để xem</small>
                </p>
                {stalls.length > 0 && (
                  <AssistantVendorResults compact cards={stalls} actions={actions} onNavigate={onNavigate} />
                )}
                {facts.length > 0 && (
                  <div className="sb-fact-rail">
                    {facts.map((card, i) => {
                      const action = actions.find((a) => a.id === card.actionId);
                      const rows = card.fields.filter((f) => f.label !== 'Lưu ý' && f.label !== 'Cơ sở gợi ý').slice(0, 3);
                      return (
                        <div className="sb-fact" key={`${card.title}-${i}`}>
                          <strong>{card.title}</strong>
                          <dl>
                            {rows.map((f, j) => (
                              <div key={j}>
                                <dt>{f.label}</dt>
                                <dd>{f.value}</dd>
                              </div>
                            ))}
                          </dl>
                          {action && (
                            <button type="button" className="sb-link" onClick={() => onNavigate(action.route)}>
                              {action.label} <PiArrowRight aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </m.div>
            )}
          </AnimatePresence>
          <div className="sb-voice-controls">
            <button
              type="button"
              className="sb-round"
              aria-pressed={voice.muted}
              aria-label={voice.muted ? 'Bật micro' : 'Tắt micro'}
              disabled={!voice.active}
              onClick={() => voice.setMuted(!voice.muted)}
            >
              {voice.muted ? <PiMicrophoneSlash /> : <PiMicrophone />}
            </button>
            <button
              type="button"
              className="sb-round"
              aria-pressed={captionsOn}
              aria-label={captionsOn ? 'Ẩn phụ đề' : 'Hiện phụ đề'}
              onClick={() => setCaptionsOn(!captionsOn)}
            >
              <PiClosedCaptioning />
            </button>
            <button
              type="button"
              className="sb-round"
              aria-label="Chuyển sang gõ phím"
              onClick={() => {
                voice.end();
                onClose();
              }}
            >
              <PiKeyboard />
            </button>
            {voice.active ? (
              <button ref={endButton} type="button" className="sb-round is-end" aria-label="Kết thúc trò chuyện" onClick={voice.end}>
                <PiPhoneDisconnect />
              </button>
            ) : (
              <button type="button" className="sb-round is-start" aria-label="Bắt đầu nói lại" onClick={onStart}>
                <PiMicrophone />
              </button>
            )}
          </div>
          {!voice.active && (
            <button type="button" className="sb-link sb-voice-back" onClick={onClose}>
              Quay lại cuộc trò chuyện
            </button>
          )}
        </>
      )}
    </m.div>
  );
}
