import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { ApiError, errorMessage, EVIDENCE_TYPE, VENDOR_TYPE, type ApiEvidenceType } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useWards } from '@/core/auth/useWards';
import { LegalBasisLink } from '@/features/legal/components/LegalBasisLink';
import { IdCardScanner } from '../components/IdCardScanner';
import { DocPicker } from '../components/wizard/DocPicker';
import { ConsentRow } from '../components/wizard/OwnerParts';
import { DocMiniArt } from '../components/wizard/TypeParts';
import { EVIDENCE_LABELS, evidenceFileProblem, useNewRegistrationStore } from '../new-registration-store';
import { REGISTRATIONS_KEY, useRegistrations } from '../useRegistrations';
import { buildCardGroups, type EditTarget } from './confirm-card-model';
import { ConfirmCard } from './ConfirmCard';
import {
  answerChoice,
  baseQuestionKey,
  cardFieldOf,
  confirmPin,
  greeting,
  skipQuestion,
  suggestDisplayName,
  typedAnswer,
  type CardField,
  type FieldSource,
} from './interview-state';
import { InterviewStep } from './InterviewStep';
import { useReadAloud } from './useReadAloud';
import { cardValues, copyInterviewToWizard, editedFields, fileAssistedRegistration } from './voice-filing';
import { voiceRegistrationApi } from './voice-registration-api';
import type { AssistAudio, AssistDraft } from './voice-registration.types';
import { useVoiceSessionStore, type VoicePhase } from './voice-session-store';

const STEPS: { phase: VoicePhase[]; label: string }[] = [
  { phase: ['consent'], label: 'Đồng ý' },
  { phase: ['identity'], label: 'CCCD' },
  { phase: ['interview', 'photos'], label: 'Kể chuyện' },
  { phase: ['card', 'done'], label: 'Xác nhận' },
];

const WIZARD_ROUTE: Record<Exclude<EditTarget, 'photos'>, string> = {
  'owner-person': '/vendor/registrations/new/owner#reg-owner-person',
  'owner-business': '/vendor/registrations/new/owner#reg-owner-business',
  details: '/vendor/registrations/new/details',
};

/**
 * X01 "Kể chuyện là xong": register by talking. Consent → CCCD (eKYC, as in the wizard) → a short
 * interview → optional stall photo → one confirm card → "Đúng, nộp", which files through the
 * wizard's own submit. The assistant only proposes; the step-by-step wizard stays one tap away.
 */
export function VoiceRegistrationScreen() {
  const phase = useVoiceSessionStore((s) => s.phase);
  const active = useVoiceSessionStore((s) => s.active);
  const top = useRef<HTMLDivElement>(null);

  // Each step starts at its top, not where the last one was scrolled to.
  useEffect(() => {
    top.current?.scrollIntoView?.({ block: 'start' });
  }, [phase, active]);

  return (
    <Screen>
      <div ref={top} className="scroll-mt-md" />
      <AppHeader title="Nói để đăng ký" subtitle="Kể vài câu, trợ lý điền hồ sơ giúp bạn" back />
      {!isLiveApi ? (
        <DemoNotice />
      ) : phase === 'done' ? (
        <DoneStep />
      ) : (
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-lg">
          <VoiceProgress phase={active ? phase : 'consent'} />
          {!active ? <ConsentStep /> : <ActiveSession />}
        </div>
      )}
    </Screen>
  );
}

function VoiceProgress({ phase }: { phase: VoicePhase }) {
  const current = STEPS.findIndex((s) => s.phase.includes(phase));
  return (
    <ol aria-label="Các bước" className="grid grid-cols-4 gap-1.5">
      {STEPS.map((s, i) => (
        <li key={s.label} aria-current={i === current ? 'step' : undefined} className="min-w-0">
          <span
            aria-hidden="true"
            className={`block h-2 rounded-[4px] ${i < current ? 'bg-brand' : i === current ? 'bg-primary' : 'bg-sunken'}`}
          />
          <span className={`mt-1.5 block truncate text-[13px] font-semibold ${i === current ? 'text-text' : 'text-muted'}`}>
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function DemoNotice() {
  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-md rounded-[24px] bg-card p-lg shadow-card ring-1 ring-border">
      <p className="text-body-lg text-text">
        Trợ lý giọng nói cần kết nối máy chủ StreetBiz nên không chạy ở chế độ demo.
      </p>
      <Link
        to="/vendor/registrations/new/type"
        className="inline-flex min-h-12 items-center justify-center rounded-[12px] bg-primary px-lg text-[15px] font-semibold text-on-primary"
      >
        Tự điền từng bước
      </Link>
    </div>
  );
}

/** "Bạn đang dùng trợ lý AI" + two separate consents (voice; CCCD/face), each optional. */
function ConsentStep() {
  const start = useVoiceSessionStore((s) => s.start);
  const { registrations, isLoading } = useRegistrations();
  const [voice, setVoice] = useState(true);
  const [biometric, setBiometric] = useState(true);
  // BR-09: the server refuses a second registration while one is SUBMITTED / UNDER_REVIEW.
  const pending = registrations.find(
    (r) => r.registrationStatus === 'SUBMITTED' || r.registrationStatus === 'UNDER_REVIEW',
  );
  // Not blocked, but the ward is waiting on that one; voice does not edit it in v1.
  const needsInfo = registrations.find((r) => r.registrationStatus === 'MORE_INFORMATION_REQUIRED');

  const begin = () => {
    // A new registration: never carry over a half-finished wizard draft (it would turn "create"
    // into "update").
    const wizard = useNewRegistrationStore.getState();
    wizard.reset();
    wizard.setField('biometricConsent', biometric);
    start(voice);
  };

  return (
    <div className="flex flex-col gap-lg">
      <section className="flex flex-col gap-md rounded-[28px] bg-[#FFF3E8] p-md ring-1 ring-brand/20 md:p-lg dark:bg-[#2A2420]">
        <span className="inline-flex w-fit items-center gap-xs rounded-full bg-card px-sm py-1 text-[13px] font-bold text-primary ring-1 ring-brand/30">
          <Icon name="creation" size={16} color="currentColor" weight="fill" />
          Bạn đang dùng trợ lý AI
        </span>
        <h2 className="font-sign text-[26px] font-extrabold leading-[32px] tracking-[-0.015em] text-text md:text-[32px] md:leading-[38px]">
          Chụp CCCD, kể 5–7 câu, xem lại rồi nộp.
        </h2>
        <p className="text-body-lg text-text/80">
          Trợ lý nghe giọng bạn để điền hồ sơ đăng ký kinh doanh. <strong>Ghi âm không được lưu</strong>
          {' '}— chuyển thành chữ xong là bỏ. Trợ lý chỉ soạn giúp; hồ sơ chỉ được nộp khi chính bạn
          bấm “Đúng, nộp”.
        </p>
        <ol className="grid gap-xs sm:grid-cols-3">
          {[
            { icon: 'account-circle-outline', text: 'Chụp 2 mặt CCCD' },
            { icon: 'microphone', text: 'Trả lời vài câu hỏi' },
            { icon: 'check-circle-outline', text: 'Xem thẻ, bấm nộp' },
          ].map((s, i) => (
            <li key={s.text} className="flex items-center gap-sm rounded-[16px] bg-card p-sm ring-1 ring-border">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-sign text-[15px] font-bold text-on-primary">
                {i + 1}
              </span>
              <span className="text-[15px] font-semibold text-text">{s.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-sm rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
        <h3 className="text-headline-md text-text">Bạn đồng ý cho trợ lý</h3>
        <ConsentRow checked={voice} onChange={setVoice}>
          <strong>Ghi âm giọng nói</strong> để chuyển thành chữ và điền hồ sơ. Không đồng ý thì bạn gõ
          câu trả lời thay vì nói.
        </ConsentRow>
        <ConsentRow checked={biometric} onChange={setBiometric}>
          <strong>Đọc ảnh CCCD và so khuôn mặt</strong> để tự điền phần chủ hộ. Không đồng ý thì bạn
          tự nhập phần đó; cán bộ phường đối chiếu giấy tờ. <LegalBasisLink anchor="du-lieu" />
        </ConsentRow>
      </section>

      {pending ?? needsInfo ? (
        <div className="flex flex-col gap-xs rounded-[16px] bg-[#FFF3D1] p-md text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
          <p className="text-[15px] font-medium leading-[22px]">
            {pending
              ? `Bạn đang có hồ sơ ${pending.displayName} chờ phường xét. Mỗi người chỉ có một hồ sơ đang chờ — muốn sửa thì mở hồ sơ đó.`
              : `Hồ sơ ${needsInfo!.displayName} đang cần bổ sung theo yêu cầu của phường. Nên bổ sung hồ sơ đó thay vì làm hồ sơ mới.`}
          </p>
          <Link
            to={`/vendor/registrations/${(pending ?? needsInfo)!.registrationId}`}
            className="inline-flex min-h-11 w-fit items-center gap-1 text-[15px] font-bold underline underline-offset-4"
          >
            Mở hồ sơ {(pending ?? needsInfo)!.displayName}
            <Icon name="chevron-right" size={16} color="currentColor" />
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
        <div className="sm:w-[280px]">
          <Button
            label="Bắt đầu"
            size="lg"
            disabled={isLoading || !!pending}
            icon={<Icon name="microphone" size={20} color="currentColor" weight="fill" />}
            onPress={begin}
          />
        </div>
        <Link
          to="/vendor/registrations/new/type"
          className="inline-flex min-h-12 items-center justify-center px-md text-[15px] font-semibold text-primary underline underline-offset-4"
        >
          Tự điền từng bước
        </Link>
      </div>
    </div>
  );
}

function ActiveSession() {
  const phase = useVoiceSessionStore((s) => s.phase);
  if (phase === 'identity') return <IdentityStep />;
  if (phase === 'photos') return <PhotoStep />;
  if (phase === 'card') return <CardStep />;
  return <InterviewContainer />;
}

/** CCCD through the same eKYC component as the wizard; the reading greets the vendor by name. */
function IdentityStep() {
  const setKyc = useVoiceSessionStore((s) => s.setKyc);
  const setPhase = useVoiceSessionStore((s) => s.setPhase);
  const kyc = useVoiceSessionStore((s) => s.kyc);
  const salutation = useVoiceSessionStore((s) => s.draft.salutation ?? 'bạn');
  const evidence = useNewRegistrationStore((s) => s.evidence);
  const has = (t: ApiEvidenceType) => evidence.some((e) => e.evidenceType === t);
  const ready = has(EVIDENCE_TYPE.identityDocument) && has(EVIDENCE_TYPE.identityDocumentBack);

  return (
    <div className="flex flex-col gap-lg">
      <IdCardScanner onExtraction={setKyc} />
      {kyc?.fullName ? (
        <p className="sb-pop font-sign text-[24px] font-extrabold text-text">
          {greeting(salutation, kyc.fullName)}!
        </p>
      ) : null}
      <div className="flex flex-col gap-xs">
        <Button
          label="Tiếp tục — bắt đầu kể"
          size="lg"
          disabled={!ready}
          icon={<Icon name="microphone" size={20} color="currentColor" weight="fill" />}
          onPress={() => setPhase('interview')}
        />
        {!ready ? (
          <p className="text-body-md text-muted">Chụp đủ 2 mặt CCCD để tiếp tục (đọc thông tin là tuỳ chọn).</p>
        ) : null}
      </div>
    </div>
  );
}

function InterviewContainer() {
  const navigate = useNavigate();
  const session = useVoiceSessionStore();
  const { wards } = useWards();
  const reader = useReadAloud();
  const [busy, setBusy] = useState(false);
  const [aiDown, setAiDown] = useState(false);
  const [error, setError] = useState<string>();
  const [autoRead, setAutoRead] = useState(true);
  const [typing, setTyping] = useState(false);

  const wardName = useCallback(
    (unitId: number | null | undefined) => wards.find((w) => w.unitId === unitId)?.unitName ?? null,
    [wards],
  );

  // One turn at a time: a double tap, or React running the first-question effect twice in
  // development, must not spend two calls of the vendor's rate limit.
  const inFlight = useRef(false);
  const send = useCallback(
    async (draft: AssistDraft, answer?: { text?: string; audio?: AssistAudio }) => {
      if (inFlight.current) return;
      inFlight.current = true;
      const s = useVoiceSessionStore.getState();
      setBusy(true);
      setError(undefined);
      try {
        const result = await voiceRegistrationApi.turn({
          questionKey: baseQuestionKey(s.question),
          draft,
          text: answer?.text,
          audio: answer?.audio,
          voiceConsent: s.voiceConsent,
        });
        s.applyTurn(result, !!answer);
        if (result.done) {
          const now = useVoiceSessionStore.getState();
          if (!now.displayName)
            now.setDisplayName(
              suggestDisplayName(result.draft.businessLine, now.draft.salutation ?? 'bạn', now.kyc?.fullName),
            );
          now.setPhase('photos');
        }
      } catch (err) {
        if (err instanceof ApiError && (err.code === 'ai_unavailable' || err.status === 503)) {
          setAiDown(true);
        } else if (err instanceof ApiError && err.status === 429) {
          setError('Bạn thao tác hơi nhanh. Chờ một chút rồi thử lại, hoặc điền tiếp bằng tay.');
        } else {
          setError(errorMessage(err));
        }
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [],
  );

  // First question (and after a reload of a session whose question was lost).
  useEffect(() => {
    if (!session.question && !busy && !error && !aiDown) void send(session.draft);
  }, [session.question]); // eslint-disable-line react-hooks/exhaustive-deps

  const toWizard = () => {
    copyInterviewToWizard();
    navigate('/vendor/registrations/new/type');
  };

  const afterTap = (draft: AssistDraft, sources?: Partial<Record<CardField, FieldSource>>) => {
    session.setDraft(draft, sources);
    void send(draft);
  };

  const question = session.question;
  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <span className="inline-flex items-center gap-xs rounded-full bg-secondary-bg px-sm py-1 text-[13px] font-bold text-on-secondary">
          <Icon name="creation" size={15} color="currentColor" weight="fill" />
          Bạn đang nói chuyện với trợ lý AI
        </span>
        <div className="flex items-center gap-xs">
          {reader.supported ? (
            <Button
              label={autoRead ? 'Tắt đọc to' : 'Bật đọc to'}
              variant="ghost"
              size="sm"
              fullWidth={false}
              icon={<Icon name="volume-high" size={16} color="currentColor" />}
              onPress={() => {
                reader.stop();
                setAutoRead((v) => !v);
              }}
            />
          ) : null}
          <Button label="Điền từng bước" variant="ghost" size="sm" fullWidth={false} onPress={toWizard} />
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-sm rounded-[14px] bg-[#FDEBEA] p-sm text-[15px] font-medium leading-[22px] text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90] sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          {!question ? (
            <Button label="Thử lại" variant="outline" size="sm" fullWidth={false} onPress={() => void send(session.draft)} />
          ) : null}
        </div>
      ) : null}

      {question ? (
        <InterviewStep
          question={question}
          draft={session.draft}
          busy={busy}
          transcript={session.transcript}
          warnings={session.warnings}
          location={session.location}
          slotPreview={session.slotPreview}
          wardName={wardName}
          aiDown={aiDown}
          voiceConsent={session.voiceConsent}
          typing={typing}
          onTypingChange={setTyping}
          reader={reader}
          autoRead={autoRead}
          onVoice={(clip) => void send(session.draft, { audio: { body: clip, fileName: 'answer.wav' } })}
          onText={(text) => void send(session.draft, { text })}
          onChoice={(value) => {
            const field = question.input === 'CONFIRM' ? null : cardFieldOf(question.field);
            const sources: Partial<Record<CardField, FieldSource>> = field ? { [field]: 'CHOSEN' } : {};
            afterTap(answerChoice(session.draft, question, value), sources);
          }}
          onTyped={(text) => {
            const typed = typedAnswer(session.draft, question, text);
            if ('error' in typed) return typed.error;
            const field = cardFieldOf(question.field);
            afterTap(typed.draft, field ? { [field]: 'TYPED' } : undefined);
            return undefined;
          }}
          onPin={(pin) => afterTap(confirmPin(session.draft, pin.latitude, pin.longitude))}
          onSkip={() => afterTap(skipQuestion(session.draft, question))}
          onWizard={toWizard}
        />
      ) : busy ? (
        <div className="h-[240px] animate-pulse rounded-[28px] bg-sunken" aria-label="Đang chuẩn bị câu hỏi" />
      ) : aiDown ? (
        <div className="flex flex-col gap-sm rounded-[18px] bg-[#FFF3D1] p-md text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
          <p className="text-[15px] font-semibold">Trợ lý AI đang bận. Bạn điền tiếp bằng tay nhé.</p>
          <Button label="Điền tiếp bằng tay" size="lg" onPress={toWizard} />
        </div>
      ) : null}
    </div>
  );
}

/** Optional photo of the cart or stall (OTHER); a fixed storefront also needs its licence. */
function PhotoStep() {
  const setPhase = useVoiceSessionStore((s) => s.setPhase);
  const vendorType = useVoiceSessionStore((s) => s.draft.vendorType);
  const handedOff = useVoiceSessionStore((s) => s.handedOff);
  const wizardType = useNewRegistrationStore((s) => s.vendorType);
  const evidence = useNewRegistrationStore((s) => s.evidence);
  const addEvidence = useNewRegistrationStore((s) => s.addEvidence);
  const removeEvidence = useNewRegistrationStore((s) => s.removeEvidence);
  const [error, setError] = useState<string>();
  const fixed = (handedOff ? wizardType : vendorType) === VENDOR_TYPE.fixedStorefront;
  const item = (t: ApiEvidenceType) => evidence.find((e) => e.evidenceType === t);
  const picker = (type: ApiEvidenceType, label: string, need?: string) => (
    <DocPicker
      label={label}
      uri={item(type)?.uri}
      fileType={item(type)?.file?.type}
      validate={evidenceFileProblem}
      onInvalid={setError}
      onChange={(uri, file) => {
        setError(undefined);
        addEvidence({ evidenceType: type, uri, file, label: EVIDENCE_LABELS[type] });
      }}
      onRemove={() => removeEvidence(type)}
      placeholder={
        <span className="flex flex-col items-center gap-xs">
          {type === EVIDENCE_TYPE.businessLicense ? (
            <DocMiniArt kind="license" className="h-14 w-14" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-primary ring-1 ring-brand/30">
              <Icon name="storefront-outline" size={30} color="currentColor" />
            </span>
          )}
          <span className="text-[15px] font-bold text-text">{label}</span>
          <span className="flex items-center gap-1 text-body-sm text-muted">
            <Icon name="camera-plus-outline" size={15} color="currentColor" />
            Bấm để chụp hoặc chọn ảnh{need ? ` · ${need}` : ''}
          </span>
        </span>
      }
      need={need}
      shape="sheet"
    />
  );

  return (
    <div className="flex flex-col gap-lg">
      <section className="flex flex-col gap-md rounded-[28px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
        <h2 className="font-sign text-[24px] font-extrabold leading-[32px] text-text md:text-[28px]">
          Chụp xe hoặc quầy của bạn để phường dễ xét
        </h2>
        <p className="text-body-lg text-muted">Không bắt buộc — bỏ qua được.</p>
        <div className={`grid gap-sm ${fixed ? 'sm:grid-cols-2' : 'sm:max-w-[360px]'}`}>
          {picker(EVIDENCE_TYPE.other, 'Ảnh xe hoặc quầy', 'không bắt buộc')}
          {fixed ? picker(EVIDENCE_TYPE.businessLicense, EVIDENCE_LABELS.BUSINESS_LICENSE, 'bắt buộc') : null}
        </div>
        {error ? (
          <p role="alert" className="text-body-md font-medium text-error">
            {error}
          </p>
        ) : null}
      </section>
      <Button label="Xem thẻ xác nhận" size="lg" onPress={() => setPhase('card')} />
    </div>
  );
}

function CardStep() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useVoiceSessionStore();
  const wizard = useNewRegistrationStore();
  const { wards } = useWards();
  const reader = useReadAloud();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  // Both stores are subscribed above, so this recomputes whenever either changes.
  const values = useMemo(() => cardValues(), [session, wizard]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(
    () =>
      buildCardGroups({
        values,
        session,
        evidence: wizard.evidence.map((e) => e.evidenceType),
        wardName: wards.find((w) => w.unitId === values.wardUnitId)?.unitName ?? null,
        edited: editedFields(),
      }),
    [values, session, wizard.evidence, wards],
  );

  const edit = (target: EditTarget) => {
    reader.stop();
    if (target === 'photos') {
      session.setPhase('photos');
      return;
    }
    copyInterviewToWizard();
    navigate(WIZARD_ROUTE[target]);
  };

  const setFoodSafety = (value: boolean) => {
    if (session.handedOff) wizard.setField('foodSafetyCommitment', value);
    else session.setFoodSafety(value);
  };

  const submit = async () => {
    reader.stop();
    setSubmitting(true);
    setError(undefined);
    try {
      const nearbySlots = useVoiceSessionStore.getState().slotPreview.length;
      const { registration, labelled } = await fileAssistedRegistration();
      await queryClient.invalidateQueries({ queryKey: REGISTRATIONS_KEY });
      useNewRegistrationStore.getState().reset();
      useVoiceSessionStore.getState().finish({
        registrationId: registration.registrationId,
        displayName: registration.displayName,
        nearbySlots,
        labelled,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ConfirmCard
      groups={groups}
      foodSafety={!!values.foodSafetyCommitment}
      onFoodSafety={setFoodSafety}
      onEdit={edit}
      onSubmit={() => void submit()}
      submitting={submitting}
      error={error}
      reader={reader}
    />
  );
}

function DoneStep() {
  const navigate = useNavigate();
  const result = useVoiceSessionStore((s) => s.result);
  const clear = useVoiceSessionStore((s) => s.clear);
  if (!result) return null;

  const leave = (path: string) => {
    clear();
    navigate(path, { replace: true });
  };

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-md rounded-[28px] bg-card p-lg text-center shadow-card ring-1 ring-border">
      <span className="sb-pop mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-tint-tertiary text-tertiary">
        <Icon name="check-circle" size={48} color="currentColor" weight="fill" />
      </span>
      <h2 className="font-sign text-[28px] font-extrabold leading-[34px] text-text">Đã nộp hồ sơ {result.displayName}</h2>
      <p className="text-body-lg text-text/80">Phường xét trong khoảng 3 ngày làm việc. Có kết quả, bạn sẽ nhận thông báo.</p>
      {result.nearbySlots > 0 ? (
        <p className="rounded-[16px] bg-[#EEF7F0] p-sm text-body-lg font-semibold text-text dark:bg-[#132119]">
          Có {result.nearbySlots} ô trống gần chỗ bạn — bạn sẽ xin ô sau khi được duyệt.
        </p>
      ) : null}
      {!result.labelled ? (
        <p className="text-body-sm text-muted">
          Chưa ghi được dấu “soạn bằng trợ lý” cho hồ sơ này; hồ sơ vẫn đã nộp bình thường.
        </p>
      ) : null}
      <div className="grid gap-sm sm:grid-cols-2">
        <Button label="Xem hồ sơ" size="lg" onPress={() => leave(`/vendor/registrations/${result.registrationId}`)} />
        <Button label="Về trang chủ" size="lg" variant="outline" onPress={() => leave('/vendor/home')} />
      </div>
    </div>
  );
}
