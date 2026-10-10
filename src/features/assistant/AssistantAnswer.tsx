import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { m } from 'motion/react';
import {
  PiArrowClockwise,
  PiArrowRight,
  PiBookOpen,
  PiCheck,
  PiCheckCircle,
  PiCircleNotch,
  PiCopy,
  PiDatabase,
  PiImage,
  PiScales,
  PiSpeakerHigh,
  PiSpeakerSlash,
  PiThumbsDown,
  PiThumbsUp,
  PiWarningCircle,
  PiWaveform,
} from 'react-icons/pi';
import { isLiveApi } from '@/core/config/env';
import { apiAssetUrl } from '@/core/api/asset-url';
import { safeRoute } from './assistant-context';
import { followUps, useSmoothText } from './assistant-ux';
import { AssistantVendorResults } from './AssistantVendorResults';
import { DishCandidates } from './DishCandidates';
import { EmberOrb } from './EmberOrb';
import type { AssistantMessage, AssistantRole, AssistantSource } from './types';

const clock = (value: string) =>
  new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  });
const stamp = (value: string) =>
  new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
const PUBLIC_UPLOAD = /^\/api\/uploads\/menu-images\/[1-9][0-9]*\/[a-f0-9]{32}\.(jpg|png|webp)$/;
const SOURCE_KIND: Record<AssistantSource['kind'], { label: string; icon: typeof PiDatabase }> = {
  LIVE_DATA: { label: 'Dữ liệu trực tiếp', icon: PiDatabase },
  PRODUCT_GUIDE: { label: 'Hướng dẫn sản phẩm', icon: PiBookOpen },
  LEGAL_DOCUMENT: { label: 'Văn bản pháp lý', icon: PiScales },
  IMAGE_ANALYSIS: { label: '[AI] Nhận định từ ảnh', icon: PiImage },
};

export type ReadAloud = {
  supported: boolean;
  speaking?: string;
  toggle: (id: string, text: string) => void;
};

export function ActivityTrail({ items, done }: { items: string[]; done?: boolean }) {
  if (!items.length) return null;
  return (
    <ol className="sb-trail" aria-live="polite">
      {items.map((item, i) => {
        const finished = done || i < items.length - 1;
        return (
          <m.li
            key={`${i}-${item}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={finished ? 'is-done' : ''}
          >
            {finished ? (
              <PiCheckCircle aria-hidden="true" />
            ) : (
              <PiCircleNotch aria-hidden="true" className="sb-ai-spin" />
            )}
            <span className={finished ? '' : 'sb-ai-shimmer'}>{item}</span>
          </m.li>
        );
      })}
    </ol>
  );
}

export function MessageBubble({
  message,
  role,
  onNavigate,
  onRetry,
  onFeedback,
  busy,
  onAsk,
  readAloud,
  trail = [],
}: {
  message: AssistantMessage;
  role: AssistantRole;
  onNavigate: (route: string) => void;
  onRetry: () => void;
  onFeedback: (helpful: boolean) => Promise<boolean | undefined>;
  busy: boolean;
  onAsk?: (question: string) => void;
  readAloud?: ReadAloud;
  trail?: string[];
}) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<boolean>();
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [expandedCards, setExpandedCards] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const generating = message.status === 'GENERATING';
  const text = useSmoothText(message.content, generating);
  // Display only: an answer that was still being written while on screen gets
  // the "printed slip" moment when it completes; answers loaded from history do not.
  const watchedGenerating = useRef(generating);
  useEffect(() => {
    if (generating) watchedGenerating.current = true;
  }, [generating]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  if (message.sender === 'USER')
    return (
      <m.div
        className="sb-user"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {(message.hasAttachments || message.channel === 'VOICE') && (
          <span className="sb-user-tag">
            {message.channel === 'VOICE' ? (
              <>
                <PiWaveform aria-hidden="true" /> Nói bằng giọng
              </>
            ) : (
              <>
                <PiImage aria-hidden="true" /> Câu hỏi có ảnh
              </>
            )}
          </span>
        )}
        <div className="sb-user-bubble">{message.content}</div>
      </m.div>
    );

  const actions = message.actions.filter((a) => safeRoute(a.route, role));
  const dishCard = message.cards.find((card) => card.kind === 'dish_match');
  const vendorCards =
    role === 'CUSTOMER'
      ? message.cards.filter((card) => card.actionId?.startsWith('public.food:'))
      : [];
  const otherCards = message.cards.filter(
    (card) => !vendorCards.includes(card) && card !== dishCard,
  );
  const failed = ['FAILED', 'INTERRUPTED', 'CANCELLED'].includes(message.status);
  const live = message.sources.find((s) => s.kind === 'LIVE_DATA' && s.observedAt);
  const kinds = [...new Set(message.sources.map((s) => s.kind))];
  const suggestions = onAsk ? followUps(message, role) : [];
  const copy = async () => {
    try {
      const cards = message.cards
        .map((c) => `${c.title}\n${c.fields.map((f) => `${f.label}: ${f.value}`).join('\n')}`)
        .join('\n\n');
      const checklist = message.checklist?.map((s, i) => `${i + 1}. ${s.text}`).join('\n') ?? '';
      const sources = message.sources
        .map((s) => `${s.title}${s.observedAt ? ` · ${stamp(s.observedAt)}` : ''}`)
        .join('\n');
      await navigator.clipboard.writeText(
        [`[AI] ${message.content}`, cards, checklist, sources].filter(Boolean).join('\n\n'),
      );
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };
  const rate = async (helpful: boolean) => {
    if (feedbackPending) return;
    setFeedbackPending(true);
    try {
      if (await onFeedback(helpful)) setFeedback(helpful);
    } finally {
      setFeedbackPending(false);
    }
  };
  const block = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } };
  return (
    <m.article
      className={`sb-answer${generating ? ' is-generating' : ''}${
        watchedGenerating.current && message.status === 'COMPLETED' ? ' is-fresh' : ''
      }`}
      aria-label="Câu trả lời AI"
      aria-busy={generating}
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
    >
      <m.header variants={block} className="sb-answer-head">
        <EmberOrb size={22} state={generating ? 'thinking' : failed ? 'error' : 'idle'} />
        <span className="sb-answer-name">[AI] Trợ lý StreetBiz</span>
        <span className="sb-answer-kind">
          {message.channel === 'VOICE' && <PiWaveform aria-hidden="true" />}
          {message.sources.some((s) => s.kind === 'IMAGE_ANALYSIS')
            ? 'Nhận định từ ảnh'
            : message.cards.length
              ? 'Kết quả tra cứu'
              : 'Hỗ trợ bạn'}
        </span>
        {!generating && (
          <time dateTime={message.createdAt}>
            {clock(message.completedAt ?? message.createdAt)}
          </time>
        )}
      </m.header>
      {generating && <ActivityTrail items={trail} />}
      {generating && !text && (
        <div className="sb-skeleton" role="status" aria-label="Đang soạn câu trả lời">
          <span />
          <span />
          <span />
        </div>
      )}
      {text && (
        <m.div variants={block} className="sb-md">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            skipHtml
            components={{
              a: ({ children }) => <span>{children}</span>,
              img: () => null,
              iframe: () => null,
              table: ({ children }) => (
                <div className="sb-table">
                  <table>{children}</table>
                </div>
              ),
            }}
          >
            {text}
          </ReactMarkdown>
          {generating && <span className="sb-caret" aria-hidden="true" />}
        </m.div>
      )}
      {dishCard && (
        <m.div variants={block}>
          <DishCandidates card={dishCard} disabled={busy || !onAsk} onAsk={(q) => onAsk?.(q)} />
        </m.div>
      )}
      {vendorCards.length > 0 && (
        <m.div variants={block}>
          <AssistantVendorResults cards={vendorCards} actions={actions} onNavigate={onNavigate} />
        </m.div>
      )}
      {otherCards.length > 0 && (
        <m.div variants={block} className="sb-cards-wrap">
          {live?.observedAt && (
            <p className="sb-live">
              <span className="sb-live-dot" aria-hidden="true" /> Dữ liệu trực tiếp ·{' '}
              {clock(live.observedAt)}
            </p>
          )}
          <div
            className={`sb-cards${otherCards.length >= 3 && !expandedCards ? ' is-carousel' : ''}`}
          >
            {(expandedCards ? otherCards : otherCards.slice(0, 4)).map((card, i) => (
              <div className="sb-card" key={`${card.title}-${i}`}>
                {card.imageUrl && PUBLIC_UPLOAD.test(card.imageUrl) && (
                  <img
                    src={apiAssetUrl(card.imageUrl)}
                    alt={`Ảnh công khai: ${card.title}`}
                    loading="lazy"
                    decoding="async"
                    className="sb-card-photo"
                    onError={(event) => {
                      event.currentTarget.hidden = true;
                    }}
                  />
                )}
                <h4>{card.title}</h4>
                <dl>
                  {card.fields.map((f, j) => (
                    <div key={j}>
                      <dt>{f.label}</dt>
                      <dd>{f.value}</dd>
                    </div>
                  ))}
                </dl>
                {actions
                  .filter((a) => a.id === card.actionId)
                  .map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      className="sb-link"
                      onClick={() => onNavigate(action.route)}
                    >
                      {action.label}
                      <PiArrowRight aria-hidden="true" />
                    </button>
                  ))}
              </div>
            ))}
          </div>
          {otherCards.length > 4 && (
            <button
              type="button"
              className="sb-link"
              aria-expanded={expandedCards}
              onClick={() => setExpandedCards(!expandedCards)}
            >
              {expandedCards ? 'Thu gọn kết quả' : `Xem thêm ${otherCards.length - 4} kết quả`}
            </button>
          )}
        </m.div>
      )}
      {Boolean(message.checklist?.length) && (
        <m.details
          variants={block}
          className="sb-steps"
          open={message.responseStyle === 'steps' ? true : undefined}
        >
          <summary>
            Các bước tiếp theo <span>{message.checklist?.length} bước</span>
          </summary>
          <p>Hướng dẫn đối chiếu; chưa xác nhận các bước đã hoàn tất.</p>
          <ol>
            {message.checklist?.map((step, i) => {
              const action = actions.find((a) => a.id === step.actionId);
              return (
                <li key={i}>
                  <span className="sb-step-number" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    {step.text}
                    {action && (
                      <button
                        type="button"
                        className="sb-link"
                        onClick={() => onNavigate(action.route)}
                      >
                        {action.label}
                        <PiArrowRight aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </m.details>
      )}
      {actions.length > 0 && !generating && (
        <m.div variants={block} className="sb-actions">
          {actions
            .filter((a) => !message.cards.some((c) => c.actionId === a.id))
            .slice(0, 3)
            .map((a, i) => (
              <button
                key={a.id}
                type="button"
                className={`sb-btn ${i === 0 ? 'is-soft' : 'is-ghost'}`}
                onClick={() => onNavigate(a.route)}
              >
                {a.label}
                <PiArrowRight aria-hidden="true" />
              </button>
            ))}
        </m.div>
      )}
      {message.sources.length > 0 && (
        <m.details variants={block} className="sb-sources">
          <summary>
            {kinds.map((kind) => {
              const Icon = SOURCE_KIND[kind].icon;
              return (
                <span key={kind} className={`sb-source-chip is-${kind.toLowerCase()}`}>
                  <Icon aria-hidden="true" /> {SOURCE_KIND[kind].label}
                </span>
              );
            })}
            <span className="sb-sources-count">Nguồn đã tra cứu ({message.sources.length})</span>
          </summary>
          <ul>
            {message.sources.map((source) => (
              <li key={source.id}>
                <strong>{source.title}</strong>
                <span>
                  {source.observedAt
                    ? `${source.kind === 'IMAGE_ANALYSIS' ? 'Phân tích' : 'Tra cứu'} lúc ${stamp(source.observedAt)}${source.kind === 'LIVE_DATA' ? ' · cần tra cứu lại khi xác minh hiện tại' : ''}`
                    : source.documentVersion}
                </span>
                {actions
                  .filter((a) => a.id === source.actionId)
                  .map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="sb-link"
                      onClick={() => onNavigate(a.route)}
                    >
                      {a.label}
                      <PiArrowRight aria-hidden="true" />
                    </button>
                  ))}
              </li>
            ))}
          </ul>
        </m.details>
      )}
      {failed && (
        <div role="status" className="sb-inline-error">
          <PiWarningCircle aria-hidden="true" />
          <span>{message.error?.message ?? 'Câu trả lời đã dừng.'}</span>
          {message.error?.retryable !== false && (
            <button type="button" className="sb-link" disabled={busy} onClick={onRetry}>
              {message.hasAttachments ? 'Thử lại câu hỏi có ảnh' : 'Hỏi lại'}
            </button>
          )}
        </div>
      )}
      {message.status === 'COMPLETED' && (
        <div className="sb-toolbar" role="toolbar" aria-label="Thao tác với câu trả lời">
          <button
            type="button"
            className="sb-tool"
            aria-label={copied ? 'Đã sao chép' : 'Sao chép câu trả lời'}
            onClick={() => void copy()}
          >
            {copied ? <PiCheck /> : <PiCopy />}
          </button>
          {readAloud?.supported && message.content && (
            <button
              type="button"
              className="sb-tool"
              aria-pressed={readAloud.speaking === message.id}
              aria-label={readAloud.speaking === message.id ? 'Dừng đọc' : 'Đọc to câu trả lời'}
              onClick={() => readAloud.toggle(message.id, message.content)}
            >
              {readAloud.speaking === message.id ? <PiSpeakerSlash /> : <PiSpeakerHigh />}
            </button>
          )}
          {role !== 'GUEST' && isLiveApi && (
            <>
              <button
                type="button"
                className="sb-tool"
                aria-label="Câu trả lời hữu ích"
                aria-pressed={feedback === true}
                disabled={feedbackPending}
                onClick={() => void rate(true)}
              >
                <PiThumbsUp />
              </button>
              <button
                type="button"
                className="sb-tool"
                aria-label="Câu trả lời chưa hữu ích"
                aria-pressed={feedback === false}
                disabled={feedbackPending}
                onClick={() => void rate(false)}
              >
                <PiThumbsDown />
              </button>
              {message.channel !== 'VOICE' && (
                <button
                  type="button"
                  className="sb-tool"
                  aria-label="Tạo lại câu trả lời"
                  disabled={busy}
                  onClick={onRetry}
                >
                  <PiArrowClockwise />
                </button>
              )}
            </>
          )}
        </div>
      )}
      {copyError && (
        <p role="status" className="sb-hint">
          Trình duyệt chưa cho phép sao chép. Bạn có thể chọn nội dung để sao chép thủ công.
        </p>
      )}
      {suggestions.length > 0 && (
        <m.div variants={block} className="sb-followups" aria-label="Gợi ý hỏi tiếp">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              className="sb-chip"
              disabled={busy}
              onClick={() => onAsk?.(q)}
            >
              {q}
            </button>
          ))}
        </m.div>
      )}
    </m.article>
  );
}
