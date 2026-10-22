import { useEffect, useId, useRef, useState } from 'react';

import { Button, formatVnd, Icon } from '@/components/common';
import { TextField } from '@/components/forms';
import { MoneyEcho } from '../components/wizard/OwnerParts';
import { formatHours, formatStartDate, isConfirmed, todayInVietnam } from './interview-state';
import { LocationConfirm } from './LocationConfirm';
import { useClipRecorder } from './useClipRecorder';
import type { useReadAloud } from './useReadAloud';
import type { AssistDraft, AssistQuestion, AssistSlotPreview } from './voice-registration.types';

type Pin = { latitude: number; longitude: number };

type Props = {
  question: AssistQuestion;
  draft: AssistDraft;
  busy: boolean;
  transcript: string | null;
  warnings: string[];
  location: { label: string; latitude: number; longitude: number } | null;
  slotPreview: AssistSlotPreview[];
  wardName: (unitId: number | null | undefined) => string | null;
  /** Speech-to-text and the models are down (503): typing to the server will not help either. */
  aiDown: boolean;
  voiceConsent: boolean;
  /** Answering by typing instead of the microphone; kept for the whole interview once chosen. */
  typing: boolean;
  onTypingChange: (typing: boolean) => void;
  reader: ReturnType<typeof useReadAloud>;
  autoRead: boolean;
  onVoice: (clip: Blob) => void;
  onText: (text: string) => void;
  onChoice: (value: string) => void;
  /** MANUAL input: returns an error message, or undefined when the value was taken. */
  onTyped: (text: string) => string | undefined;
  onPin: (pin: Pin) => void;
  onSkip: () => void;
  onWizard: () => void;
};

/**
 * One interview turn: the question in signage type (read aloud), and the one way to answer it --
 * the big microphone, buttons, a pin on the map, or a box to type into after two misheard tries.
 * Below it the registration "grows" as fields are heard.
 */
export function InterviewStep(props: Props) {
  const { question, busy, reader, autoRead } = props;
  const questionId = useId();

  // Read each new question aloud once (the vendor may not read well).
  const lastRead = useRef<string>('');
  useEffect(() => {
    if (!autoRead || lastRead.current === question.text) return;
    lastRead.current = question.text;
    reader.speak(question.text);
  }, [autoRead, question.text, reader]);

  return (
    <div className="flex flex-col gap-lg">
      <section
        aria-labelledby={questionId}
        aria-busy={busy}
        className="flex flex-col gap-md rounded-[28px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
      >
        <div className="flex items-start gap-sm">
          <h2
            id={questionId}
            aria-live="polite"
            className="min-w-0 flex-1 font-sign text-[24px] font-extrabold leading-[32px] tracking-[-0.015em] text-text md:text-[30px] md:leading-[38px]"
          >
            {question.text}
          </h2>
          {reader.supported ? (
            <button
              type="button"
              onClick={() => (reader.speaking ? reader.stop() : reader.speak(question.text))}
              aria-label={reader.speaking ? 'Dừng đọc' : 'Đọc lại câu hỏi'}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary-bg text-on-secondary ring-1 ring-border transition hover:brightness-95"
            >
              <Icon name={reader.speaking ? 'stop' : 'volume-high'} size={22} color="currentColor" weight="fill" />
            </button>
          ) : null}
        </div>

        <Answer {...props} />

        {props.transcript ? (
          <p className="rounded-[14px] bg-sunken/70 px-md py-sm text-body-md text-muted">
            Trợ lý nghe được: <span className="text-text">“{props.transcript}”</span>
          </p>
        ) : null}
        {props.warnings.length > 0 && !busy ? (
          <ul className="flex flex-col gap-1 text-body-md font-medium text-[#8A5300] dark:text-[#FFD27A]">
            {props.warnings.map((w) => (
              <li key={w} className="flex items-start gap-xs">
                <Icon name="information-outline" size={18} color="currentColor" className="mt-0.5 shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <GrowingFile draft={props.draft} location={props.location} wardName={props.wardName} />
      {props.slotPreview.length > 0 ? <SlotPreviewList slots={props.slotPreview} /> : null}
    </div>
  );
}

function Answer(props: Props) {
  const { question, busy } = props;

  if (question.input === 'MAP') {
    return (
      <LocationConfirm
        position={
          props.draft.latitude != null && props.draft.longitude != null
            ? { latitude: props.draft.latitude, longitude: props.draft.longitude }
            : null
        }
        label={props.location?.label ?? null}
        busy={busy}
        onConfirm={props.onPin}
        onSkip={props.onSkip}
      />
    );
  }

  if (question.input === 'CHOICE' || question.input === 'CONFIRM') {
    const confirm = question.input === 'CONFIRM';
    return (
      <div className={`grid gap-sm ${question.choices.length > 3 ? 'sm:grid-cols-2' : ''}`}>
        {question.choices.map((choice, i) => (
          <Button
            key={choice.value}
            label={choice.label}
            size="lg"
            variant={confirm ? (i === 0 ? 'primary' : 'outline') : 'outline'}
            disabled={busy}
            loading={busy && i === 0}
            icon={
              confirm ? (
                <Icon name={i === 0 ? 'check' : 'replay'} size={20} color="currentColor" />
              ) : undefined
            }
            onPress={() => props.onChoice(choice.value)}
          />
        ))}
      </div>
    );
  }

  if (question.input === 'MANUAL') return <ManualAnswer {...props} />;
  return <VoiceAnswer {...props} />;
}

/** The microphone: tap to talk, tap again to send; "Gõ thay" types the same answer instead. */
function VoiceAnswer(props: Props) {
  const { busy, reader } = props;
  const typing = props.typing || !props.voiceConsent;
  const [text, setText] = useState('');
  const recorder = useClipRecorder((clip) => {
    if (clip) props.onVoice(clip);
  });
  const recording = recorder.state === 'recording';
  const ring = useRef<HTMLSpanElement>(null);

  // The ring breathes with the voice while recording.
  useEffect(() => {
    if (!recording) return;
    let frame = 0;
    const tick = () => {
      const level = Math.min(1, recorder.level() * 6);
      if (ring.current) ring.current.style.transform = `scale(${1 + level * 0.35})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [recording, recorder]);

  useEffect(() => {
    setText('');
  }, [props.question.key]);

  const toggle = () => {
    if (recording) {
      recorder.stop();
      return;
    }
    reader.stop();
    void recorder.start();
  };

  const send = () => {
    if (!text.trim()) return;
    props.onText(text);
    setText('');
  };

  if (props.aiDown) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-sm rounded-[18px] bg-[#FFF3D1] p-md text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]"
      >
        <p className="flex items-start gap-sm text-[15px] font-semibold leading-[22px]">
          <Icon name="alert-circle-outline" size={20} color="currentColor" className="mt-0.5 shrink-0" />
          Trợ lý AI đang bận nên chưa nghe được. Phần bạn đã kể vẫn được giữ — điền tiếp bằng tay
          nhé.
        </p>
        <Button label="Điền tiếp bằng tay" size="lg" onPress={props.onWizard} />
      </div>
    );
  }

  const remaining = recorder.maxSeconds - recorder.elapsed;
  return (
    <div className="flex flex-col items-center gap-md">
      {!typing ? (
        <>
          <button
            type="button"
            onClick={toggle}
            disabled={busy || recorder.state === 'requesting'}
            aria-pressed={recording}
            aria-label={recording ? 'Dừng và gửi câu trả lời' : 'Bấm để nói'}
            className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_16px_32px_-14px_rgb(var(--c-primary)/0.95)] transition active:scale-95 disabled:opacity-60 md:h-[120px] md:w-[120px]"
          >
            {recording ? (
              <span
                ref={ring}
                aria-hidden="true"
                className="absolute inset-[-10px] rounded-full bg-primary/25 transition-transform duration-75"
              />
            ) : null}
            <span className="relative">
              {busy ? (
                <span className="block h-9 w-9 animate-[sb-spin_0.9s_linear_infinite] rounded-full border-4 border-on-primary/40 border-t-on-primary" />
              ) : (
                <Icon name={recording ? 'stop' : 'microphone'} size={44} color="currentColor" weight="fill" />
              )}
            </span>
          </button>
          <p aria-live="polite" className="min-h-6 text-center text-[16px] font-semibold text-text">
            {busy
              ? 'Trợ lý đang nghe lại lời bạn…'
              : recording
                ? `Đang nghe… bấm lần nữa để gửi (còn ${remaining} giây)`
                : recorder.state === 'requesting'
                  ? 'Đang mở micro…'
                  : 'Bấm vào micro rồi nói'}
          </p>
          {recorder.error ? (
            <p role="alert" className="text-center text-body-md font-medium text-error">
              {recorder.error}
            </p>
          ) : null}
        </>
      ) : (
        <div className="flex w-full flex-col gap-sm">
          <TextField
            label="Gõ câu trả lời"
            value={text}
            onChangeText={setText}
            placeholder={TYPED_EXAMPLES[props.question.key] ?? TYPED_EXAMPLES.OPENING}
            multiline
            maxLength={500}
            autoFocus
          />
          <Button label="Gửi" size="lg" disabled={!text.trim()} loading={busy} onPress={send} />
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-sm">
        {props.voiceConsent ? (
          <Button
            label={typing ? 'Nói thay' : 'Gõ thay'}
            variant="ghost"
            fullWidth={false}
            disabled={busy || recording}
            icon={<Icon name={typing ? 'microphone' : 'keyboard-outline'} size={18} color="currentColor" />}
            onPress={() => {
              recorder.cancel();
              props.onTypingChange(!typing);
            }}
          />
        ) : null}
        {props.question.skippable ? (
          <Button label="Bỏ qua" variant="ghost" fullWidth={false} disabled={busy || recording} onPress={props.onSkip} />
        ) : null}
      </div>
    </div>
  );
}

/** After two misheard answers: a plain box for exactly this field, taken as typed (no AI). */
function ManualAnswer(props: Props) {
  const field = props.question.field;
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const today = todayInVietnam();

  useEffect(() => {
    setText('');
    setError(undefined);
  }, [props.question.key]);

  const submit = () => setError(props.onTyped(text));

  return (
    <div className="flex flex-col gap-sm">
      {field === 'plannedStartDate' ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-text">Ngày bắt đầu bán</span>
          <input
            type="date"
            min={today}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-14 rounded-[12px] bg-card px-md text-[17px] text-text ring-1 ring-inset ring-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {error ? <span className="text-body-sm font-medium text-error">{error}</span> : null}
        </label>
      ) : (
        <>
          <TextField
            label={MANUAL_LABELS[field ?? ''] ?? 'Câu trả lời'}
            value={text}
            onChangeText={setText}
            keyboardType={field === 'capitalAmount' || field === 'laborCount' ? 'number-pad' : 'default'}
            placeholder={MANUAL_PLACEHOLDERS[field ?? '']}
            error={error}
            autoFocus
          />
          {field === 'capitalAmount' ? <MoneyEcho text={text} /> : null}
        </>
      )}
      <Button label="Xong" size="lg" disabled={!text.trim()} loading={props.busy} onPress={submit} />
    </div>
  );
}

/** An example answer per question, in the words a vendor would say. */
const TYPED_EXAMPLES: Record<string, string> = {
  OPENING: 'VD: Bán bún bò gần chợ Cồn, sáng 6 giờ tới 10 giờ',
  BUSINESS_LINE: 'VD: Bún bò, bánh mì',
  LOCATION: 'VD: Gần chợ Hàn, đường Bạch Đằng',
  ADDRESS: 'VD: 12 Lê Duẩn',
  CAPITAL: 'VD: Ba chục triệu',
  LABOR: 'VD: Hai vợ chồng',
  START_DATE: 'VD: Thứ Hai tuần sau',
  CART_WIDTH: 'VD: Một mét hai',
};

const MANUAL_LABELS: Record<string, string> = {
  businessLine: 'Món hoặc mặt hàng bạn bán',
  declaredAddress: 'Địa chỉ cửa hàng',
  capitalAmount: 'Vốn ban đầu (đồng)',
  laborCount: 'Số người cùng bán, tính cả bạn',
};

const MANUAL_PLACEHOLDERS: Record<string, string> = {
  businessLine: 'VD: Bún bò, bánh mì',
  declaredAddress: 'VD: 12 Lê Duẩn',
  capitalAmount: 'VD: 30000000',
  laborCount: 'VD: 2',
};

/** The registration filling up as the vendor talks: one tile per field heard so far. */
function GrowingFile({
  draft,
  location,
  wardName,
}: {
  draft: AssistDraft;
  location: Props['location'];
  wardName: Props['wardName'];
}) {
  const waiting = (field: 'capitalAmount' | 'laborCount' | 'plannedStartDate') =>
    !isConfirmed(draft, field);
  const tiles: { key: string; label: string; value: string | null; pending?: boolean }[] = [
    { key: 'businessLine', label: 'Món bán', value: draft.businessLine ?? null },
    {
      key: 'vendorType',
      label: 'Cách bán',
      value: draft.vendorType
        ? draft.vendorType === 'FIXED_STOREFRONT'
          ? 'Cửa hàng cố định'
          : 'Xe đẩy, gánh, bán rong'
        : null,
    },
    { key: 'hours', label: 'Giờ bán', value: formatHours(draft.hours) || null },
    {
      key: 'location',
      label: 'Chỗ bán',
      value: draft.locationSkipped ? 'Chọn sau' : (location?.label ?? draft.locationText ?? null),
      pending: !draft.locationConfirmed && !draft.locationSkipped && draft.latitude != null,
    },
    { key: 'ward', label: 'Phường', value: wardName(draft.wardUnitId) },
    ...(draft.vendorType === 'FIXED_STOREFRONT'
      ? [{ key: 'declaredAddress', label: 'Địa chỉ', value: draft.declaredAddress ?? null }]
      : []),
    {
      key: 'capitalAmount',
      label: 'Vốn',
      value: draft.capitalAmount != null ? formatVnd(draft.capitalAmount) : null,
      pending: draft.capitalAmount != null && waiting('capitalAmount'),
    },
    {
      key: 'laborCount',
      label: 'Số người',
      value: draft.laborCount != null ? `${draft.laborCount} người` : null,
      pending: draft.laborCount != null && waiting('laborCount'),
    },
    {
      key: 'plannedStartDate',
      label: 'Bắt đầu bán',
      value: formatStartDate(draft.plannedStartDate) || null,
      pending: !!draft.plannedStartDate && waiting('plannedStartDate'),
    },
  ];
  const filled = tiles.filter((t) => t.value).length;

  return (
    <section aria-label="Hồ sơ đang điền" className="flex flex-col gap-sm">
      <div className="flex items-baseline justify-between gap-sm">
        <h3 className="text-headline-md text-text">Hồ sơ của bạn</h3>
        <span className="text-body-md font-semibold text-muted font-tabular">
          {filled}/{tiles.length} mục
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-xs md:grid-cols-3">
        {tiles.map((t) => (
          <li
            key={t.key}
            className={`flex min-h-[64px] flex-col justify-center rounded-[14px] px-sm py-xs ring-1 ${
              t.value
                ? t.pending
                  ? 'bg-[#FFF3D1] ring-[#F2C45A] dark:bg-[#3A2A08] dark:ring-[#8A6A1E]'
                  : 'sb-pop bg-tint-primary ring-brand/30'
                : 'bg-sunken/60 ring-border'
            }`}
          >
            <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
              {t.label}
            </span>
            <span
              className={`line-clamp-2 text-[15px] font-semibold leading-5 ${t.value ? 'text-text' : 'text-muted/70'}`}
            >
              {t.value ?? '—'}
            </span>
            {t.value && t.pending ? (
              <span className="text-[12px] font-semibold text-[#8A5300] dark:text-[#FFD27A]">
                chờ bạn xác nhận
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Up to three free slots near the spot -- a preview only; applying waits for approval (BR-16). */
function SlotPreviewList({ slots }: { slots: AssistSlotPreview[] }) {
  return (
    <section
      aria-label="Ô trống gần chỗ bạn bán"
      className="flex flex-col gap-sm rounded-[24px] bg-[#EEF7F0] p-md ring-1 ring-tertiary/25 dark:bg-[#132119]"
    >
      <div>
        <h3 className="text-headline-md text-text">{slots.length} ô trống gần chỗ bạn bán</h3>
        <p className="text-body-md text-muted">
          Chỉ để bạn xem trước. Bạn xin ô sau khi hồ sơ được phường duyệt.
        </p>
      </div>
      <ul className="grid gap-xs md:grid-cols-3">
        {slots.map((s) => (
          <li key={s.slotId} className="flex flex-col gap-1 rounded-[14px] bg-card p-sm ring-1 ring-border">
            <span className="flex items-center justify-between gap-xs">
              <strong className="font-sign text-[17px] text-text">{s.slotCode}</strong>
              <span className="text-body-sm font-semibold text-muted font-tabular">
                ~{Math.round(s.distanceMeters)} m
              </span>
            </span>
            <span className="line-clamp-1 text-body-sm text-muted">{s.zoneName}</span>
            <span className="text-body-sm text-text">
              {s.widthMeters != null && s.lengthMeters != null
                ? `${s.widthMeters} × ${s.lengthMeters} m · `
                : ''}
              {formatVnd(s.monthlyPrice)}/tháng
            </span>
            <span className="flex flex-wrap gap-1">
              {s.fitsCart === true ? <Fit ok>Vừa xe</Fit> : s.fitsCart === false ? <Fit>Hẹp hơn xe</Fit> : null}
              {s.fitsHours === true ? <Fit ok>Đúng giờ bán</Fit> : s.fitsHours === false ? <Fit>Khác giờ bán</Fit> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fit({ ok, children }: { ok?: boolean; children: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${
        ok ? 'bg-tertiary/15 text-tertiary' : 'bg-[#FFF3D1] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]'
      }`}
    >
      {children}
    </span>
  );
}
