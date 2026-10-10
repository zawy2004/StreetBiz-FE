import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, domAnimation, LazyMotion, m, MotionConfig } from 'motion/react';
import {
  PiArrowDown,
  PiArrowRight,
  PiArrowsOut,
  PiCamera,
  PiCheckCircle,
  PiClockCounterClockwise,
  PiDotsThreeOutline,
  PiImage,
  PiInfo,
  PiMapPin,
  PiMicrophone,
  PiPaperPlaneTiltFill,
  PiPlus,
  PiStopFill,
  PiTextAa,
  PiTrash,
  PiWarningCircle,
  PiWaveform,
  PiX,
} from 'react-icons/pi';
import { isLiveApi } from '@/core/config/env';
import { useAuthStore } from '@/store/auth-store';
import {
  contextLabel,
  pageContext,
  ROLE_LABEL,
  safeRoute,
  suggestions,
  welcome,
} from './assistant-context';
import { useAssistant } from './useAssistant';
import type { AssistantLocation, AssistantRole, Briefing, ResponseStyle } from './types';
import './assistant.css';
import { assistantApi } from './assistant-api';
import { useAssistantImage } from './useAssistantImage';
import { greeting, requestLocation, usePreference, useReadAloud } from './assistant-ux';
import { ActivityTrail, MessageBubble } from './AssistantAnswer';
import { AssistantWelcomeArt } from './AssistantWelcomeArt';
import { EmberOrb } from './EmberOrb';
import { VoiceMode } from './VoiceMode';
import { useVoiceSession } from './voice/useVoiceSession';

export { MessageBubble } from './AssistantAnswer';

type Props = {
  accountKey: string;
  role: AssistantRole;
  open: boolean;
  fullPage: boolean;
  onClose: () => void;
  /** An answer finished while the panel was closed. */
  onUnread?: () => void;
};
const historyTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
const clockTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  });
const VN_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
/** Saved conversations under "Hôm nay / Hôm qua / Trước đó" (Asia/Ho_Chi_Minh), order kept. */
function historyGroups<T extends { updatedAt: string }>(items: T[], now = new Date()) {
  const today = VN_DAY.format(now);
  const yesterday = VN_DAY.format(new Date(now.getTime() - 86_400_000));
  const groups: { key: string; label: string; items: T[] }[] = [
    { key: 'today', label: 'Hôm nay', items: [] },
    { key: 'yesterday', label: 'Hôm qua', items: [] },
    { key: 'earlier', label: 'Trước đó', items: [] },
  ];
  for (const item of items) {
    const at = new Date(item.updatedAt);
    const day = Number.isNaN(at.getTime()) ? '' : VN_DAY.format(at);
    groups[day === today ? 0 : day === yesterday ? 1 : 2]!.items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}
const HINTS: Partial<Record<AssistantRole, string>> = {
  VENDOR: 'Hỏi về hồ sơ, hợp đồng, phí, giấy phép…',
  WARD_AUTHORITY: 'Hỏi về hồ sơ chờ duyệt, ô HC-08, báo cáo thu…',
  PLATFORM_ADMIN: 'Hỏi về kiểm duyệt, danh mục, tài khoản…',
  CUSTOMER: 'Tìm món, quán, hoặc kiểm tra giấy phép…',
};

export function AssistantPanel({ accountKey, role, open, fullPage, onClose, onUnread }: Props) {
  const chat = useAssistant(role, accountKey);
  const photo = useAssistantImage();
  const readAloud = useReadAloud();
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [useContext, setUseContext] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newContent, setNewContent] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('concise');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [location, setLocation] = useState<AssistantLocation>();
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState('');
  const [briefing, setBriefing] = useState<Briefing>();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [easy, setEasy] = usePreference(`sb-assistant-easy:${accountKey}`, false);
  const [photoConsent, setPhotoConsent] = usePreference(
    `sb-assistant-photo-consent:${accountKey}`,
    false,
  );
  const [voiceConsent, setVoiceConsent] = usePreference(
    `sb-assistant-voice-consent:${accountKey}`,
    false,
  );
  const [rememberPhoto, setRememberPhoto] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const sending = useRef(false);
  const uploadAbort = useRef<AbortController | undefined>(undefined);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const firstMessage = useRef<string | undefined>(undefined);
  const scrollHeight = useRef(0);
  const context = pageContext(pathname, role);
  const quickReplies = suggestions(role, pathname);
  const canAttach = Boolean(chat.capabilities?.attachmentsEnabled);
  const canVoice = Boolean(chat.capabilities?.voiceEnabled) && isLiveApi && role !== 'GUEST';
  const unavailable =
    chat.capabilities?.enabled === false ||
    (role === 'GUEST' && chat.capabilities?.guestEnabled === false);
  // Spoken turns appear in the thread as they are saved, so the transcript is there when the overlay closes.
  const voice = useVoiceSession({
    onReady: (conversationId) => {
      if (mounted.current) void chat.select(conversationId);
    },
    onTurnSaved: (conversationId, messages) => chat.ingest(conversationId, messages),
    onEnded: () => void chat.loadConversations(),
  });

  const close = () => {
    if (voice.active) voice.end();
    if (fullPage)
      navigate(
        role === 'GUEST'
          ? '/'
          : role === 'VENDOR'
            ? '/vendor/home'
            : role === 'WARD_AUTHORITY'
              ? '/ward/dashboard'
              : role === 'PLATFORM_ADMIN'
                ? '/platform/dashboard'
                : '/customer/explore',
      );
    else onClose();
  };

  useEffect(() => {
    mounted.current = true;
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      mounted.current = false;
      uploadAbort.current?.abort();
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    textarea.current?.focus({ preventScroll: true });
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const first = chat.messages[0]?.id;
    if (
      scroll.current &&
      firstMessage.current &&
      first !== firstMessage.current &&
      chat.messages.some((m) => m.id === firstMessage.current)
    ) {
      scroll.current.scrollTop += scroll.current.scrollHeight - scrollHeight.current;
    } else if (atBottom.current && scroll.current) {
      scroll.current.scrollTop = scroll.current.scrollHeight;
      setNewContent(false);
    } else setNewContent(true);
    firstMessage.current = first;
    scrollHeight.current = scroll.current?.scrollHeight ?? 0;
  }, [chat.messages, open]);
  useEffect(() => {
    const field = textarea.current;
    if (field) {
      field.style.height = '42px';
      const height = Math.min(156, Math.max(42, field.scrollHeight));
      field.style.height = `${height}px`;
      field.classList.toggle('is-scrolling', field.scrollHeight > 156);
    }
  }, [input]);
  // A remembered consent applies to the next chosen photo; it is revocable from the menu.
  useEffect(() => {
    if (photo.image && photoConsent && !photo.consent) photo.setConsent(true);
  }, [photo.image, photoConsent]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (
      !open ||
      !isLiveApi ||
      (role !== 'VENDOR' && role !== 'WARD_AUTHORITY') ||
      chat.capabilities?.enabled === false
    )
      return;
    let live = true;
    assistantApi
      .briefing()
      .then((b) => live && setBriefing(b))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [open, role, chat.capabilities?.enabled]);

  const completedSeen = useRef(new Set<string>());
  useEffect(() => {
    for (const m of chat.messages)
      if (
        m.sender === 'ASSISTANT' &&
        m.status === 'COMPLETED' &&
        !completedSeen.current.has(m.id)
      ) {
        completedSeen.current.add(m.id);
        if (!open) onUnread?.();
      }
  }, [chat.messages, open, onUnread]);
  useEffect(() => {
    if (!menuOpen && !attachOpen) return;
    const outside = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest('.sb-menu-anchor')) {
        setMenuOpen(false);
        setAttachOpen(false);
      }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [menuOpen, attachOpen]);

  const onKeys = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Escape' || fullPage) return;
    e.stopPropagation();
    if (menuOpen || attachOpen) {
      setMenuOpen(false);
      setAttachOpen(false);
    } else if (historyOpen) setHistoryOpen(false);
    else if (voiceOpen) {
      voice.end();
      setVoiceOpen(false);
    } else onClose();
  };
  const send = async (text = input) => {
    const content =
      text.trim() || (photo.image ? 'Giúp tôi giải thích nội dung trong ảnh này.' : '');
    if (
      !content ||
      sending.current ||
      photo.preparing ||
      chat.busy ||
      uploading ||
      (isLiveApi && !online) ||
      unavailable
    )
      return;
    if (photo.image && (!photo.consent || !canAttach)) {
      photo.setError('Hãy đồng ý gửi ảnh để tiếp tục.');
      return;
    }
    sending.current = true;
    let uploadedId: string | undefined;
    let submitted = false;
    try {
      if (photo.image) {
        setUploading(true);
        uploadAbort.current = new AbortController();
        const result = await assistantApi.upload(photo.image.png, uploadAbort.current.signal);
        uploadedId = result.id;
        if (!mounted.current) return;
        setUploading(false);
        if (rememberPhoto) setPhotoConsent(true);
      }
      if (isLiveApi && !navigator.onLine) {
        photo.setError('Kết nối đã bị ngắt. Ảnh và câu hỏi vẫn được giữ để bạn gửi lại.');
        return;
      }
      atBottom.current = true;
      const sentImage = photo.image;
      setInput('');
      photo.clear();
      setRememberPhoto(false);
      submitted = true;
      const pageCtx = uploadedId ? undefined : useContext ? context : undefined;
      const ids = uploadedId ? [uploadedId] : undefined;
      const answer = location
        ? await chat.send(content, pageCtx, undefined, false, ids, responseStyle, location)
        : await chat.send(content, pageCtx, undefined, false, ids, responseStyle);
      if (mounted.current && sentImage && answer && answer.status !== 'COMPLETED')
        photo.remember(answer.clientRequestId, sentImage);
    } catch (e) {
      if (mounted.current) photo.setError(e instanceof Error ? e.message : 'Không tải được ảnh.');
    } finally {
      sending.current = false;
      // A lost HTTP response may still be processing server-side; keep its upload until consumption/TTL.
      if (uploadedId && !submitted)
        void assistantApi.removeAttachment(uploadedId).catch(() => undefined);
      if (mounted.current) setUploading(false);
    }
  };
  const chooseImage = (file?: File) => {
    setAttachOpen(false);
    if (!canAttach || chat.busy || uploading) return;
    void photo.choose(file);
  };
  const toggleLocation = async () => {
    setNotice('');
    if (location) {
      setLocation(undefined);
      return;
    }
    setLocating(true);
    try {
      setLocation(await requestLocation());
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Chưa lấy được vị trí.');
    } finally {
      setLocating(false);
    }
  };
  const startVoice = useCallback(() => {
    void voice.start(location, easy);
  }, [voice, location, easy]);
  const openVoice = () => {
    setVoiceOpen(true);
    if (voiceConsent && !voice.active) startVoice();
  };
  const onNavigate = (route: string) => {
    if (safeRoute(route, role)) {
      navigate(route);
      if (!fullPage) onClose();
    }
  };
  const newConversation = () => {
    photo.clear();
    setInput('');
    setHistoryOpen(false);
    void chat.select();
  };
  const busyOrUploading = chat.busy || uploading;
  // Vietnamese given name is the last word; a phone-number fallback is not a name.
  const lastWord = user?.fullName?.trim().split(/\s+/).at(-1);
  const name = lastWord && !/\d/.test(lastWord) ? lastWord : undefined;
  const showMic = canVoice && !input.trim() && !photo.image && !busyOrUploading;
  const headerState = voice.active ? 'listening' : chat.busy ? 'thinking' : 'idle';
  const maxQuestion = chat.capabilities?.maxQuestionCharacters ?? 4000;
  const voiceMinutes = chat.capabilities?.voiceMaxSeconds
    ? Math.max(1, Math.round(chat.capabilities.voiceMaxSeconds / 60))
    : undefined;
  const briefingWarnings = briefing?.items.filter((item) => item.tone === 'warning').length ?? 0;

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <section
          hidden={!open}
          className={`sb-assistant${fullPage ? ' sb-assistant-full' : ''}${easy ? ' sb-easy' : ''}${historyOpen ? ' has-history' : ''}`}
          role={fullPage ? 'region' : 'dialog'}
          aria-labelledby="assistant-title"
          data-surface={role === 'GUEST' || role === 'CUSTOMER' ? 'CUSTOMER' : role}
          onKeyDown={onKeys}
        >
          <header className="sb-head">
            <EmberOrb size={34} state={headerState} />
            <div className="sb-head-title">
              <h2 id="assistant-title">
                Trợ lý StreetBiz <span className="sb-ai-badge">[AI]</span>
              </h2>
              <p className="sb-head-sub" aria-live="polite">
                {chat.busy
                  ? chat.status || 'Đang trả lời…'
                  : role === 'GUEST'
                    ? 'Hướng dẫn công khai · Đăng nhập để tra cứu riêng'
                    : !isLiveApi
                      ? 'Chế độ mô phỏng'
                      : `${ROLE_LABEL[role]} · ${chat.connected ? 'Sẵn sàng' : 'Đồng bộ từ máy chủ'}`}
              </p>
            </div>
            <div className="sb-head-actions">
              <button
                type="button"
                className="sb-icon"
                aria-label="Cuộc trò chuyện mới"
                disabled={busyOrUploading}
                onClick={newConversation}
              >
                <PiPlus />
              </button>
              <button
                type="button"
                className="sb-icon"
                aria-label="Lịch sử hội thoại"
                aria-expanded={historyOpen}
                onClick={() => setHistoryOpen(!historyOpen)}
                disabled={busyOrUploading || role === 'GUEST' || !isLiveApi}
              >
                <PiClockCounterClockwise />
              </button>
              {canVoice && (
                <button
                  type="button"
                  className="sb-icon"
                  aria-label="Trò chuyện bằng giọng nói"
                  onClick={openVoice}
                  disabled={busyOrUploading}
                >
                  <PiWaveform />
                </button>
              )}
              <div className="sb-menu-anchor">
                <button
                  type="button"
                  className="sb-icon"
                  aria-label="Tùy chọn khác"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <PiDotsThreeOutline />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <m.div
                      role="menu"
                      className="sb-menu"
                      style={{ pointerEvents: menuOpen ? 'auto' : 'none' }}
                      initial={{ opacity: 0, scale: 0.96, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -4 }}
                      transition={{ duration: 0.16 }}
                    >
                      <button
                        role="menuitemcheckbox"
                        aria-checked={easy}
                        type="button"
                        onClick={() => setEasy(!easy)}
                      >
                        <PiTextAa aria-hidden="true" /> Chế độ dễ dùng
                        <small>Chữ lớn, câu ngắn, giọng nói chậm</small>
                      </button>
                      {photoConsent && (
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setPhotoConsent(false);
                            setMenuOpen(false);
                          }}
                        >
                          <PiImage aria-hidden="true" /> Thu hồi đồng ý gửi ảnh
                        </button>
                      )}
                      {voiceConsent && (
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setVoiceConsent(false);
                            setMenuOpen(false);
                          }}
                        >
                          <PiMicrophone aria-hidden="true" /> Thu hồi đồng ý dùng giọng nói
                        </button>
                      )}
                      {chat.conversationId && (
                        <button
                          role="menuitem"
                          type="button"
                          className="is-danger"
                          disabled={busyOrUploading}
                          onClick={() => {
                            setMenuOpen(false);
                            setConfirmDelete(true);
                          }}
                        >
                          <PiTrash aria-hidden="true" /> Xóa cuộc trò chuyện
                        </button>
                      )}
                      <p className="sb-menu-note">
                        <PiInfo aria-hidden="true" /> Lịch sử được lưu{' '}
                        {chat.capabilities?.retentionDays ?? 30} ngày. Ảnh và bản ghi âm không được
                        lưu.
                      </p>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
              {!fullPage && (
                <button
                  type="button"
                  className="sb-icon"
                  aria-label="Mở trang trợ lý"
                  onClick={() => navigate('/assistant')}
                >
                  <PiArrowsOut />
                </button>
              )}
              <button type="button" className="sb-icon" aria-label="Đóng trợ lý" onClick={close}>
                <PiX />
              </button>
            </div>
          </header>
          {context && !photo.image && (
            <div className="sb-context">
              <label>
                <input
                  type="checkbox"
                  checked={useContext}
                  disabled={busyOrUploading}
                  onChange={(e) => setUseContext(e.target.checked)}
                />
                <span>Đang xem: {contextLabel(context)}</span>
              </label>
            </div>
          )}
          <div className="sb-body">
            <AnimatePresence>
              {historyOpen && (
                <m.nav
                  className="sb-history"
                  aria-label="Các cuộc trò chuyện"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    className="sb-btn is-soft sb-history-new"
                    onClick={newConversation}
                  >
                    <PiPlus aria-hidden="true" /> Cuộc trò chuyện mới
                  </button>
                  {chat.conversations.length === 0 && (
                    <p className="sb-hint">Chưa có hội thoại được lưu.</p>
                  )}
                  {historyGroups(chat.conversations).map((group) => (
                    <div key={group.key} role="group" aria-labelledby={`sb-history-${group.key}`}>
                      <p id={`sb-history-${group.key}`} className="sb-history-day">
                        {group.label}
                      </p>
                      {group.items.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`sb-history-item${c.id === chat.conversationId ? ' is-current' : ''}`}
                          onClick={() => {
                            void chat.select(c.id);
                            photo.clear();
                            setInput('');
                            setHistoryOpen(false);
                          }}
                        >
                          <span>{c.title}</span>
                          <span className="sb-history-meta">
                            <time>{historyTime(c.updatedAt)}</time>
                            {c.activeMessageId && <em className="sb-history-live">Đang trả lời</em>}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                  {chat.conversationBefore && (
                    <button
                      type="button"
                      className="sb-link"
                      onClick={() => void chat.loadConversations(true)}
                    >
                      Xem thêm hội thoại
                    </button>
                  )}
                </m.nav>
              )}
            </AnimatePresence>
            <div
              ref={scroll}
              className="sb-scroll"
              onScroll={() => {
                const s = scroll.current;
                if (s) {
                  atBottom.current = s.scrollHeight - s.scrollTop - s.clientHeight < 80;
                  if (atBottom.current) setNewContent(false);
                }
              }}
            >
              <div className="sb-thread">
                {confirmDelete && (
                  <div className="sb-confirm" role="alertdialog" aria-label="Xác nhận xóa">
                    <p>Xóa nội dung cuộc trò chuyện này khỏi lịch sử của bạn?</p>
                    <div>
                      <button
                        type="button"
                        className="sb-btn is-danger"
                        onClick={() => {
                          setConfirmDelete(false);
                          void chat.remove();
                        }}
                      >
                        Xóa hội thoại
                      </button>
                      <button
                        type="button"
                        className="sb-btn is-ghost"
                        onClick={() => setConfirmDelete(false)}
                      >
                        Giữ lại
                      </button>
                    </div>
                  </div>
                )}
                {chat.before && (
                  <button
                    type="button"
                    className="sb-link sb-older"
                    onClick={() => void chat.loadOlder()}
                  >
                    Xem tin nhắn trước
                  </button>
                )}
                {chat.messages.length === 0 && (
                  <m.div
                    className="sb-welcome"
                    initial="initial"
                    animate="animate"
                    variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
                  >
                    <m.div
                      className="sb-welcome-hero"
                      variants={{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }}
                    >
                      <div className="sb-welcome-copy">
                        <EmberOrb size={84} state="idle" className="sb-welcome-orb" />
                        <h3>
                          {role === 'GUEST'
                            ? welcome(role).title
                            : `${greeting()}${name ? `, ${name}` : ''}.`}
                        </h3>
                        <p className="sb-welcome-sub">
                          {role === 'GUEST'
                            ? welcome(role).description
                            : `${welcome(role).title}. ${welcome(role).description}`}
                        </p>
                      </div>
                      <AssistantWelcomeArt role={role} />
                    </m.div>
                    {briefing && briefing.items.length > 0 && (
                      <m.section
                        className="sb-briefing"
                        aria-label="Việc cần làm hôm nay"
                        variants={{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }}
                      >
                        <div className="sb-briefing-head">
                          <p className="sb-eyebrow">Việc cần làm hôm nay · dữ liệu trực tiếp</p>
                          <p className="sb-briefing-count">
                            {`${briefing.items.length} việc${briefingWarnings ? ` · ${briefingWarnings} cần xử lý` : ''}`}
                            {briefing.observedAt && (
                              <small>{`Cập nhật lúc ${clockTime(briefing.observedAt)}`}</small>
                            )}
                          </p>
                        </div>
                        {briefing.items.map((item, i) => (
                          <div key={i} className={`sb-brief is-${item.tone}`}>
                            {item.tone === 'warning' ? (
                              <PiWarningCircle aria-hidden="true" />
                            ) : (
                              <PiCheckCircle aria-hidden="true" />
                            )}
                            <div>
                              <strong>{item.title}</strong>
                              <span>{item.detail}</span>
                            </div>
                            {item.action && safeRoute(item.action.route, role) && (
                              <button
                                type="button"
                                className="sb-link"
                                onClick={() => onNavigate(item.action!.route)}
                              >
                                {item.action.label} <PiArrowRight aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        ))}
                      </m.section>
                    )}
                    {(canAttach || canVoice) && (
                      <m.div
                        className="sb-entry"
                        variants={{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }}
                      >
                        {canAttach && (
                          <button
                            type="button"
                            className="sb-entry-tile"
                            disabled={busyOrUploading}
                            onClick={() => fileInput.current?.click()}
                          >
                            <PiCamera aria-hidden="true" />
                            <strong>Hỏi bằng ảnh</strong>
                            <span>
                              {role === 'CUSTOMER'
                                ? 'Chụp món, biết tên và quán bán'
                                : 'Gửi ảnh để được giải thích'}
                            </span>
                          </button>
                        )}
                        {canVoice && (
                          <button
                            type="button"
                            className="sb-entry-tile"
                            disabled={busyOrUploading}
                            onClick={openVoice}
                          >
                            <PiWaveform aria-hidden="true" />
                            <strong>Trò chuyện bằng giọng nói</strong>
                            <span>Nói tự nhiên, có thể ngắt lời</span>
                            {voiceMinutes && <small>{`Tối đa ${voiceMinutes} phút`}</small>}
                          </button>
                        )}
                      </m.div>
                    )}
                    <m.div
                      className="sb-suggestions"
                      variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
                    >
                      {quickReplies.map((q) => (
                        <m.button
                          key={q}
                          type="button"
                          className="sb-suggestion"
                          aria-label={q}
                          disabled={busyOrUploading}
                          onClick={() => void send(q)}
                          variants={{
                            initial: { opacity: 0, y: 6 },
                            animate: { opacity: 1, y: 0 },
                          }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <span>{q}</span>
                          <PiArrowRight aria-hidden="true" />
                        </m.button>
                      ))}
                    </m.div>
                    <p className="sb-fineprint">
                      Không gửi mật khẩu, OTP hoặc giấy tờ định danh. Các quyết định nghiệp vụ được
                      thực hiện tại màn hình tương ứng.
                    </p>
                  </m.div>
                )}
                {chat.messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    role={role}
                    busy={chat.busy}
                    trail={message.status === 'GENERATING' ? chat.trail : []}
                    readAloud={readAloud}
                    onAsk={(q) => void send(q)}
                    onNavigate={onNavigate}
                    onRetry={() => {
                      const question = chat.messages
                        .slice(0, index)
                        .reverse()
                        .find((m) => m.sender === 'USER');
                      if (!question) return;
                      if (message.hasAttachments || question.hasAttachments) {
                        setInput(question.content);
                        if (photo.restore(question.clientRequestId))
                          photo.setError(
                            'Ảnh được giữ tạm trên thiết bị. Xác nhận gửi ảnh rồi bấm Gửi để thử lại.',
                          );
                        else
                          photo.setError(
                            'Ảnh tạm đã hết hạn. Chọn lại ảnh để hỏi lại; ảnh không được lưu trong lịch sử.',
                          );
                        textarea.current?.focus();
                      } else
                        void chat.send(
                          question.content,
                          undefined,
                          message.id,
                          false,
                          undefined,
                          message.responseStyle ?? responseStyle,
                        );
                    }}
                    onFeedback={(helpful) => chat.feedback(message, helpful)}
                  />
                ))}
                {chat.busy && !chat.messages.some((m) => m.status === 'GENERATING') && (
                  <div role="status" className="sb-pending">
                    <EmberOrb size={22} state="thinking" />
                    <ActivityTrail items={chat.trail.length ? chat.trail : ['Đang trả lời…']} />
                  </div>
                )}
              </div>
            </div>
            <AnimatePresence>
              {voiceOpen && (
                <VoiceMode
                  voice={voice}
                  role={role}
                  consented={voiceConsent}
                  onConsent={() => setVoiceConsent(true)}
                  onStart={startVoice}
                  onNavigate={onNavigate}
                  onClose={() => {
                    if (voice.active) voice.end();
                    setVoiceOpen(false);
                    voice.reset();
                    textarea.current?.focus();
                  }}
                />
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {newContent && (
              <m.button
                type="button"
                className="sb-new-content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                onClick={() => {
                  atBottom.current = true;
                  setNewContent(false);
                  scroll.current?.scrollTo({
                    top: scroll.current.scrollHeight,
                    behavior: 'smooth',
                  });
                }}
              >
                <PiArrowDown aria-hidden="true" /> Tin mới
              </m.button>
            )}
          </AnimatePresence>
          {chat.error && (
            <div role="alert" className="sb-banner is-error">
              <PiWarningCircle aria-hidden="true" />
              <span>{chat.error}</span>
              {!chat.busy && (
                <button type="button" className="sb-link" onClick={() => void chat.retryRequest()}>
                  Thử lại yêu cầu
                </button>
              )}
            </div>
          )}
          {!online && (
            <p role="status" className="sb-banner">
              Bạn đang mất mạng. Không thể xác minh dữ liệu hiện tại.
            </p>
          )}
          {unavailable && (
            <p className="sb-banner">
              {role === 'GUEST' && chat.capabilities?.enabled !== false
                ? 'Đăng nhập để sử dụng trợ lý.'
                : 'Trợ lý đang tạm nghỉ. Các chức năng khác vẫn hoạt động.'}
            </p>
          )}
          <footer className="sb-composer">
            {canAttach && (
              <>
                <input
                  ref={fileInput}
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    chooseImage(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <input
                  ref={cameraInput}
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  capture="environment"
                  onChange={(e) => {
                    chooseImage(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </>
            )}
            <AnimatePresence>
              {photo.image && (
                <m.div
                  className="sb-attachment"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                >
                  <div className="sb-attachment-row">
                    <span className={`sb-attachment-thumb${uploading ? ' is-uploading' : ''}`}>
                      <img
                        src={`data:image/png;base64,${photo.image.png}`}
                        alt="Ảnh đính kèm đang chờ gửi"
                      />
                    </span>
                    <div className="sb-attachment-copy">
                      <strong>{uploading ? 'Đang tải ảnh lên…' : 'Ảnh đã sẵn sàng'}</strong>
                      <span>{photo.image.name}</span>
                      <small>Chỉ gửi khi bạn bấm gửi câu hỏi</small>
                    </div>
                    <button
                      type="button"
                      className="sb-btn is-ghost"
                      disabled={busyOrUploading}
                      onClick={photo.clear}
                    >
                      Bỏ ảnh
                    </button>
                  </div>
                  {photoConsent ? (
                    <p className="sb-consent is-granted">
                      <PiCheckCircle aria-hidden="true" /> Bạn đã cho phép gửi ảnh đến Gemini để
                      phân tích. Có thể thu hồi trong menu ⋯.
                    </p>
                  ) : (
                    <div className="sb-consent">
                      <label>
                        <input
                          type="checkbox"
                          checked={photo.consent}
                          disabled={busyOrUploading}
                          onChange={(e) => {
                            photo.setConsent(e.target.checked);
                            photo.setError('');
                          }}
                        />
                        <span>
                          Tôi đồng ý gửi ảnh đến Gemini để phân tích. Ảnh đã được che thông tin cá
                          nhân. Nếu lỗi, ảnh được giữ tạm trên thiết bị tối đa 5 phút để thử lại.
                        </span>
                      </label>
                      <label className="sb-consent-remember">
                        <input
                          type="checkbox"
                          checked={rememberPhoto}
                          disabled={busyOrUploading || !photo.consent}
                          onChange={(e) => setRememberPhoto(e.target.checked)}
                        />
                        <span>Ghi nhớ lựa chọn này cho các lần sau</span>
                      </label>
                    </div>
                  )}
                </m.div>
              )}
            </AnimatePresence>
            {(photo.error || notice) && (
              <p role="alert" className="sb-composer-error">
                {photo.error || notice}
              </p>
            )}
            <form
              className={`sb-input${dragging ? ' is-dragging' : ''}`}
              onDragOver={(e) => {
                if (canAttach && !busyOrUploading && e.dataTransfer.types.includes('Files')) {
                  e.preventDefault();
                  setDragging(true);
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
              }}
              onDrop={(e) => {
                if (!e.dataTransfer.files.length) return;
                e.preventDefault();
                setDragging(false);
                chooseImage(e.dataTransfer.files[0]);
              }}
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              {dragging && (
                <span className="sb-drop">
                  <PiImage aria-hidden="true" /> Thả ảnh để đặt câu hỏi
                </span>
              )}
              {canAttach && (
                <div className="sb-menu-anchor">
                  <button
                    type="button"
                    className="sb-icon sb-attach"
                    aria-label="Thêm ảnh"
                    aria-haspopup="menu"
                    aria-expanded={attachOpen}
                    disabled={busyOrUploading || photo.preparing || !online}
                    onClick={() => setAttachOpen(!attachOpen)}
                  >
                    {photo.preparing ? (
                      <span className="sb-dot-spin" aria-hidden="true" />
                    ) : (
                      <PiPlus />
                    )}
                  </button>
                  <AnimatePresence>
                    {attachOpen && (
                      <m.div
                        role="menu"
                        className="sb-menu is-up"
                        style={{ pointerEvents: attachOpen ? 'auto' : 'none' }}
                        initial={{ opacity: 0, scale: 0.96, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 4 }}
                        transition={{ duration: 0.16 }}
                      >
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => fileInput.current?.click()}
                        >
                          <PiImage aria-hidden="true" /> Chọn ảnh
                        </button>
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => cameraInput.current?.click()}
                        >
                          <PiCamera aria-hidden="true" /> Chụp ảnh
                        </button>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <textarea
                ref={textarea}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={1}
                aria-label="Câu hỏi cho Trợ lý StreetBiz"
                placeholder={
                  photo.image
                    ? 'Bạn muốn biết điều gì về ảnh này?'
                    : (HINTS[role] ?? 'Hỏi điều bạn đang cần…')
                }
                onPaste={(e) => {
                  const file = Array.from(e.clipboardData.items)
                    .find((item) => item.type.startsWith('image/'))
                    ?.getAsFile();
                  if (file && canAttach && !busyOrUploading) {
                    e.preventDefault();
                    chooseImage(file);
                  }
                }}
                maxLength={maxQuestion}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <AnimatePresence mode="popLayout" initial={false}>
                {uploading ? (
                  <m.button
                    key="cancel"
                    type="button"
                    className="sb-send is-stop"
                    aria-label="Hủy tải ảnh"
                    onClick={() => uploadAbort.current?.abort()}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                  >
                    <PiStopFill />
                  </m.button>
                ) : chat.busy ? (
                  <m.button
                    key="stop"
                    type="button"
                    className="sb-send is-stop"
                    onClick={() => void chat.stop()}
                    aria-label="Dừng trả lời"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                  >
                    <PiStopFill />
                  </m.button>
                ) : showMic ? (
                  <m.button
                    key="mic"
                    type="button"
                    className="sb-send is-mic"
                    aria-label="Trò chuyện bằng giọng nói"
                    onClick={openVoice}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                  >
                    <PiMicrophone />
                  </m.button>
                ) : (
                  <m.button
                    key="send"
                    type="submit"
                    className="sb-send"
                    disabled={
                      uploading ||
                      photo.preparing ||
                      (!input.trim() && !photo.image) ||
                      Boolean(photo.image && !photo.consent) ||
                      (!online && isLiveApi) ||
                      unavailable
                    }
                    aria-label="Gửi câu hỏi"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    whileTap={{ scale: 0.92 }}
                  >
                    <PiPaperPlaneTiltFill />
                  </m.button>
                )}
              </AnimatePresence>
            </form>
            <div className="sb-composer-meta">
              <label className="sb-style">
                <span className="sr-only">Cách trả lời</span>
                <select
                  aria-label="Cách trả lời"
                  value={responseStyle}
                  disabled={busyOrUploading}
                  onChange={(e) => setResponseStyle(e.target.value as ResponseStyle)}
                >
                  <option value="concise">Ngắn gọn</option>
                  <option value="detailed">Chi tiết</option>
                  <option value="steps">Từng bước</option>
                </select>
              </label>
              {isLiveApi && role === 'CUSTOMER' && (
                <button
                  type="button"
                  className={`sb-chip is-small${location ? ' is-active' : ''}`}
                  aria-pressed={Boolean(location)}
                  disabled={locating}
                  onClick={() => void toggleLocation()}
                >
                  <PiMapPin aria-hidden="true" />{' '}
                  {locating ? 'Đang định vị…' : location ? 'Đang dùng vị trí' : 'Gần tôi'}
                </button>
              )}
              {input.length >= maxQuestion * 0.9 && (
                <span className="sb-count is-near">
                  {`${input.length.toLocaleString('vi-VN')}/${maxQuestion.toLocaleString('vi-VN')}`}
                </span>
              )}
              <span className="sb-disclaimer">
                [AI] Có thể có sai sót. Kiểm tra nguồn và thời điểm tra cứu.
              </span>
            </div>
          </footer>
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}
