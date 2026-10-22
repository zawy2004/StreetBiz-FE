import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, type ApiRegistration } from '@/core/api';
import type {
  AssistDraft,
  AssistQuestion,
  AssistTurnResult,
} from '@/features/business-registrations/voice/voice-registration.types';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test', goongMaptilesKey: '' },
  isDev: true,
  isLiveApi: true,
}));

const voiceApi = vi.hoisted(() => ({ turn: vi.fn(), confirm: vi.fn() }));
vi.mock('@/features/business-registrations/voice/voice-registration-api', () => ({
  voiceRegistrationApi: voiceApi,
}));

const submitSpy = vi.hoisted(() => vi.fn());
vi.mock('@/features/business-registrations/submit-registration', () => ({
  submitRegistrationDraft: submitSpy,
}));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return {
    ...actual,
    vendorRegistrationApi: { ...actual.vendorRegistrationApi, list: vi.fn().mockResolvedValue([]) },
    referenceApi: {
      ...actual.referenceApi,
      listWards: vi.fn().mockResolvedValue([
        { unitId: 10, unitName: 'Phường Hải Châu', unitType: 'WARD', parentName: null },
        { unitId: 11, unitName: 'Phường Thanh Khê', unitType: 'WARD', parentName: null },
      ]),
    },
  };
});

// The map needs WebGL; the interview tests never reach it, but keep the import inert.
vi.mock('@/features/sidewalk-slots/components/LocationPicker', () => ({
  LocationPicker: () => <div>map</div>,
}));

const state = await import('@/features/business-registrations/voice/interview-state');
const { encodeWav } = await import('@/features/business-registrations/voice/wav');
const { useVoiceSessionStore } = await import('@/features/business-registrations/voice/voice-session-store');
const { useNewRegistrationStore } = await import('@/features/business-registrations/new-registration-store');
const { VoiceRegistrationScreen } = await import(
  '@/features/business-registrations/voice/VoiceRegistrationScreen'
);
const { buildCardGroups, missingRows } = await import(
  '@/features/business-registrations/voice/confirm-card-model'
);

const voiceQuestion = (key: string, text: string, field: AssistQuestion['field'] = null): AssistQuestion => ({
  key,
  text,
  input: 'VOICE',
  choices: [],
  field,
  skippable: false,
});

const turn = (draft: AssistDraft, next: AssistQuestion | null, extra: Partial<AssistTurnResult> = {}): AssistTurnResult => ({
  transcript: null,
  proposals: [],
  location: null,
  slotPreview: [],
  nextQuestion: next,
  warnings: [],
  done: next === null,
  isAiGenerated: false,
  draft,
  ...extra,
});

/** Everything the interview collects, all numbers confirmed. */
const finished: AssistDraft = {
  businessLine: 'Bún bò, bánh mì',
  vendorType: 'ITINERANT',
  locationText: 'chợ Cồn',
  latitude: 16.06864,
  longitude: 108.219763,
  locationConfirmed: true,
  wardUnitId: 10,
  capitalAmount: 30_000_000,
  laborCount: 2,
  plannedStartDate: '2026-10-26',
  contactSameAsPermanent: true,
  hours: '06:00-10:00',
  cartWidthSkipped: true,
  confirmed: ['capitalAmount', 'laborCount', 'plannedStartDate'],
  salutation: 'cô',
};

function Where() {
  const location = useLocation();
  return <p>at {location.pathname + location.hash}</p>;
}

function mount() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/vendor/registrations/new/voice']}>
        <Routes>
          <Route path="/vendor/registrations/new/voice" element={<VoiceRegistrationScreen />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function fillOwnerFromCccd() {
  const w = useNewRegistrationStore.getState();
  w.setField('ownerDateOfBirth', '1975-03-02');
  w.setField('ownerGender', 'FEMALE');
  w.setField('ownerNationality', 'Việt Nam');
  w.setField('idIssuedDate', '2021-07-01');
  w.setField('idIssuedPlace', 'Cục Cảnh sát QLHC về TTXH');
  w.setField('permanentAddress', '12 Hùng Vương, Hải Châu, Đà Nẵng');
  const file = new File(['x'], 'id.jpg', { type: 'image/jpeg' });
  w.addEvidence({ evidenceType: 'IDENTITY_DOCUMENT', uri: 'blob-1', label: 'CCCD', file });
  w.addEvidence({ evidenceType: 'IDENTITY_DOCUMENT_BACK', uri: 'blob-2', label: 'CCCD', file });
}

function startCard(overrides: Partial<ReturnType<typeof useVoiceSessionStore.getState>> = {}) {
  useVoiceSessionStore.setState({
    active: true,
    phase: 'card',
    voiceConsent: true,
    startedAt: Date.now() - 120_000,
    turns: 5,
    draft: finished,
    location: { label: 'Chợ Cồn, Hải Châu, Đà Nẵng', latitude: 16.06864, longitude: 108.219763 },
    sources: { businessLine: 'VOICE', capitalAmount: 'VOICE', laborCount: 'VOICE', plannedStartDate: 'VOICE', vendorType: 'CHOSEN' },
    kyc: {
      fullName: 'NGUYỄN THỊ HOA',
      confidencePercent: 92,
      needsManualVerification: false,
      filled: ['ownerDateOfBirth', 'ownerGender', 'ownerNationality', 'idIssuedDate', 'idIssuedPlace', 'permanentAddress'],
    },
    displayName: 'Bún bò Cô Hoa',
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useNewRegistrationStore.getState().reset();
  useVoiceSessionStore.getState().clear();
});

afterEach(() => cleanup());

describe('interview rules (pure, shared with the app)', () => {
  it('addresses the vendor from the CCCD: 45+ is cô/chú, younger chị/anh, unknown stays bạn', () => {
    expect(state.salutationFor('FEMALE', '1975-03-02', '2026-10-23')).toBe('cô');
    expect(state.salutationFor('MALE', '1970-01-01', '2026-10-23')).toBe('chú');
    expect(state.salutationFor('FEMALE', '1981-10-24', '2026-10-23')).toBe('chị'); // 44 until tomorrow
    expect(state.salutationFor('MALE', '1995-05-05', '2026-10-23')).toBe('anh');
    expect(state.salutationFor(null, '1975-03-02', '2026-10-23')).toBe('bạn');
    expect(state.greeting('cô', 'NGUYỄN THỊ HOA')).toBe('Chào cô Nguyễn Thị Hoa');
  });

  it('suggests a shop name from the first dish and the vendor', () => {
    expect(state.suggestDisplayName('bún bò, bánh mì', 'cô', 'NGUYỄN THỊ HOA')).toBe('Bún bò Cô Hoa');
    expect(state.suggestDisplayName('Cà phê', 'bạn', 'Trần Văn Nam')).toBe('Cà phê');
  });

  it('"Đúng rồi" confirms a number; "Nói lại" drops it and counts a try (two tries → typing)', () => {
    const confirmQ: AssistQuestion = {
      key: 'CONFIRM:capitalAmount',
      text: 'Ba mươi triệu đồng, đúng không ạ?',
      input: 'CONFIRM',
      choices: [],
      field: 'capitalAmount',
      skippable: false,
    };
    const draft: AssistDraft = { capitalAmount: 30_000_000 };
    expect(state.answerChoice(draft, confirmQ, 'yes').confirmed).toEqual(['capitalAmount']);
    const again = state.answerChoice(draft, confirmQ, 'no');
    expect(again.capitalAmount).toBeNull();
    expect(again.attempts).toEqual({ CAPITAL: 1 });
    expect(state.baseQuestionKey(confirmQ)).toBe('CAPITAL');
  });

  it('takes typed values as typed, within the server limits', () => {
    const q = (field: AssistQuestion['field']) => ({ ...voiceQuestion('CAPITAL', '', field), input: 'MANUAL' as const });
    const typed = state.typedAnswer({}, q('capitalAmount'), '30.000.000');
    expect('draft' in typed && typed.draft.capitalAmount).toBe(30_000_000);
    expect('draft' in typed && typed.draft.confirmed).toEqual(['capitalAmount']);
    expect(state.typedAnswer({}, q('laborCount'), '0')).toHaveProperty('error');
    expect(state.typedAnswer({}, q('plannedStartDate'), '2026-10-01', '2026-10-23')).toHaveProperty('error');
    expect(state.typedAnswer({}, q('plannedStartDate'), '2026-11-02', '2026-10-23')).not.toHaveProperty('error');
  });

  it('never maps an unconfirmed amount or date onto the wizard', () => {
    const fields = state.interviewToWizard(
      { ...finished, confirmed: ['laborCount'], capitalAmount: 300_000_000 },
      'Bún bò Cô Hoa',
    );
    expect(fields.capitalAmount).toBe('');
    expect(fields.plannedStartDate).toBe('');
    expect(fields.laborCount).toBe('2');
    expect(fields.addressLatitude).toBe(16.06864);
  });

  it('formats the start date and hours the way they are read back', () => {
    expect(state.formatStartDate('2026-10-26')).toBe('Thứ Hai, 26/10/2026');
    expect(state.formatHours('06:00-10:00')).toBe('6:00 – 10:00');
    expect(state.formatHours('18:00-')).toBe('từ 18:00');
  });

  it('wraps 16 kHz PCM in a valid WAV header', async () => {
    const wav = encodeWav([new Int16Array(16_000)]);
    const buffer = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(wav);
    });
    const bytes = new DataView(buffer);
    expect(wav.type).toBe('audio/wav');
    expect(wav.size).toBe(44 + 32_000);
    expect(bytes.getUint32(24, true)).toBe(16_000);
    expect(String.fromCharCode(bytes.getUint8(8), bytes.getUint8(9), bytes.getUint8(10), bytes.getUint8(11))).toBe('WAVE');
  });
});

describe('voice interview screen', () => {
  it('answers by typing, reads a number back and only moves on after the tap (T3)', async () => {
    useVoiceSessionStore.getState().start(true);
    useVoiceSessionStore.getState().setPhase('interview');
    const opening = voiceQuestion('OPENING', 'Bạn bán món gì, thường bán ở đâu, mấy giờ ạ?');
    const heard: AssistDraft = { salutation: 'bạn', businessLine: 'Bún bò', capitalAmount: 30_000_000 };
    const confirm: AssistQuestion = {
      key: 'CONFIRM:capitalAmount',
      text: 'Ba mươi triệu đồng, đúng không ạ?',
      input: 'CONFIRM',
      choices: [
        { value: 'yes', label: 'Đúng rồi' },
        { value: 'no', label: 'Nói lại' },
      ],
      field: 'capitalAmount',
      skippable: false,
    };
    voiceApi.turn
      .mockResolvedValueOnce(turn({ salutation: 'bạn' }, opening))
      .mockResolvedValueOnce(
        turn(heard, confirm, {
          transcript: 'bán bún bò, vốn ba chục triệu',
          proposals: [
            { field: 'businessLine', value: 'Bún bò', confidence: 0.95, evidence: 'bún bò', readBack: null, needsConfirmation: false, source: 'AI' },
            { field: 'capitalAmount', value: '30000000', confidence: 1, evidence: 'ba chục triệu', readBack: 'Ba mươi triệu đồng', needsConfirmation: true, source: 'PARSER' },
          ],
        }),
      )
      .mockResolvedValueOnce(turn({ ...heard, confirmed: ['capitalAmount'] }, voiceQuestion('LABOR', 'Có mấy người cùng bán?', 'laborCount')));

    mount();
    expect(await screen.findByText(opening.text)).toBeInTheDocument();
    expect(voiceApi.turn).toHaveBeenLastCalledWith(
      expect.objectContaining({ questionKey: 'OPENING', text: undefined, audio: undefined }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Gõ thay' }));
    fireEvent.change(screen.getByLabelText('Gõ câu trả lời'), { target: { value: 'bán bún bò, vốn ba chục triệu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));

    expect(await screen.findByText(confirm.text)).toBeInTheDocument();
    expect(voiceApi.turn).toHaveBeenCalledWith(
      expect.objectContaining({ questionKey: 'OPENING', text: 'bán bún bò, vốn ba chục triệu', voiceConsent: true }),
    );
    expect(screen.getByText(/chờ bạn xác nhận/)).toBeInTheDocument();
    // Heard, read back, not confirmed: the wizard draft is untouched.
    expect(useNewRegistrationStore.getState().capitalAmount).toBe('');
    expect(useNewRegistrationStore.getState().businessLine).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Đúng rồi' }));
    expect(await screen.findByText('Có mấy người cùng bán?')).toBeInTheDocument();
    const planned = voiceApi.turn.mock.calls[2]![0];
    expect(planned.questionKey).toBe('CAPITAL');
    expect(planned.text).toBeUndefined();
    expect(planned.draft.confirmed).toEqual(['capitalAmount']);
    expect(useNewRegistrationStore.getState().capitalAmount).toBe('');
  });

  it('AI down (503): offers manual entry and carries what was said into the wizard (T7)', async () => {
    useVoiceSessionStore.getState().start(true);
    useVoiceSessionStore.getState().setPhase('interview');
    useVoiceSessionStore.getState().setDraft({ salutation: 'bạn', businessLine: 'Bánh mì', vendorType: 'ITINERANT' });
    voiceApi.turn
      .mockResolvedValueOnce(turn(useVoiceSessionStore.getState().draft, voiceQuestion('LOCATION', 'Bạn hay đứng bán gần đâu?', 'locationText')))
      .mockRejectedValueOnce(new ApiError('ai_unavailable', 503, 'Trợ lý AI đang bận.'));

    mount();
    await screen.findByText('Bạn hay đứng bán gần đâu?');
    fireEvent.click(screen.getByRole('button', { name: 'Gõ thay' }));
    fireEvent.change(screen.getByLabelText('Gõ câu trả lời'), { target: { value: 'gần chợ Hàn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));

    const manual = await screen.findByRole('button', { name: 'Điền tiếp bằng tay' });
    fireEvent.click(manual);
    expect(await screen.findByText('at /vendor/registrations/new/type')).toBeInTheDocument();
    expect(useNewRegistrationStore.getState().businessLine).toBe('Bánh mì');
    expect(useVoiceSessionStore.getState().handedOff).toBe(true);
  });
});

describe('confirm card', () => {
  it('labels every value with its source and tints a shaky CCCD reading', async () => {
    fillOwnerFromCccd();
    startCard({
      kyc: { fullName: 'NGUYỄN THỊ HOA', confidencePercent: 61, needsManualVerification: true, filled: ['ownerDateOfBirth'] },
    });
    mount();
    expect(await screen.findByText('Phường Hải Châu')).toBeInTheDocument();
    expect(screen.getAllByText('[AI] từ lời kể').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('Từ CCCD')).toBeInTheDocument();
    expect(screen.getByText('Mặc định')).toBeInTheDocument();
    expect(screen.getByText('Kiểm tra kỹ dòng này')).toBeInTheDocument();
    expect(screen.getByText('30.000.000 đ')).toBeInTheDocument();
    expect(screen.getByText('Thứ Hai, 26/10/2026')).toBeInTheDocument();
  });

  it('"Đúng, nộp" stays off until the food-safety commitment is ticked', async () => {
    fillOwnerFromCccd();
    startCard();
    mount();
    await screen.findByText('Phường Hải Châu');
    const submit = screen.getByRole('button', { name: 'Đúng, nộp' });
    expect(submit).toBeDisabled();
    expect(screen.getByText('Bật cam kết an toàn thực phẩm để nộp.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Đúng, nộp' })).toBeEnabled();
  });

  it('files through the wizard\'s own submitRegistrationDraft, then records the acceptance (T4)', async () => {
    fillOwnerFromCccd();
    startCard();
    let filed: Record<string, unknown> = {};
    submitSpy.mockImplementation(async () => {
      filed = { ...useNewRegistrationStore.getState() };
      return { registrationId: 77, displayName: 'Bún bò Cô Hoa', registrationStatus: 'SUBMITTED' } as ApiRegistration;
    });
    voiceApi.confirm.mockResolvedValue({ aiLogId: 1, registrationId: 77, confirmedAt: '2026-10-23T03:00:00Z' });

    mount();
    await screen.findByText('Phường Hải Châu');
    // Nothing is in the wizard draft until the tap.
    expect(useNewRegistrationStore.getState().businessLine).toBe('');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Đúng, nộp' }));

    expect(await screen.findByText('Đã nộp hồ sơ Bún bò Cô Hoa')).toBeInTheDocument();
    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(filed).toMatchObject({
      vendorType: 'ITINERANT',
      displayName: 'Bún bò Cô Hoa',
      wardUnitId: 10,
      businessLine: 'Bún bò, bánh mì',
      capitalAmount: '30000000',
      laborCount: '2',
      plannedStartDate: '2026-10-26',
      addressLatitude: 16.06864,
      contactAddress: '',
      foodSafetyCommitment: true,
      ownerDateOfBirth: '1975-03-02',
      idType: 'CCCD',
    });
    expect(voiceApi.confirm).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        turns: 5,
        aiFields: expect.arrayContaining(['businessLine', 'capitalAmount', 'laborCount', 'plannedStartDate']),
        editedFields: [],
      }),
    );
    expect(voiceApi.confirm.mock.calls[0]![1].durationSeconds).toBeGreaterThanOrEqual(119);
  });

  it('"Sửa" copies the interview into the wizard and opens the matching step', async () => {
    fillOwnerFromCccd();
    startCard();
    mount();
    const scale = screen.getByRole('heading', { name: 'Quy mô' }).closest('section')!;
    fireEvent.click(scale.querySelector('button:last-of-type')!);
    expect(await screen.findByText('at /vendor/registrations/new/owner#reg-owner-business')).toBeInTheDocument();
    expect(useNewRegistrationStore.getState().capitalAmount).toBe('30000000');
    expect(useVoiceSessionStore.getState().handedOff).toBe(true);
  });

  it('flags what is still missing and keeps edits apart from AI values', () => {
    const groups = buildCardGroups({
      values: {
        vendorType: 'FIXED_STOREFRONT',
        displayName: 'Bún bò Cô Hoa',
        declaredAddress: '',
        addressLatitude: null,
        addressLongitude: null,
        wardUnitId: 10,
        businessLine: 'Bún bò',
        capitalAmount: '',
        laborCount: '2',
        plannedStartDate: '2026-10-26',
        contactAddress: '',
        foodSafetyCommitment: false,
        ownerDateOfBirth: '1975-03-02',
        ownerGender: 'FEMALE',
        ownerNationality: 'Việt Nam',
        ownerEthnicity: '',
        idIssuedDate: '2021-07-01',
        idIssuedPlace: 'Cục CS',
        permanentAddress: '12 Hùng Vương',
      },
      session: {
        kyc: null,
        lowConfidence: ['businessLine'],
        sources: { businessLine: 'VOICE', laborCount: 'VOICE' },
        draft: { vendorType: 'FIXED_STOREFRONT' },
        location: null,
      },
      evidence: ['IDENTITY_DOCUMENT', 'IDENTITY_DOCUMENT_BACK'],
      wardName: 'Phường Hải Châu',
      edited: ['laborCount'],
    });
    expect(missingRows(groups).map((r) => r.key)).toEqual(['declaredAddress', 'capitalAmount', 'license']);
    const rows = groups.flatMap((g) => g.rows);
    expect(rows.find((r) => r.key === 'laborCount')?.source).toBe('EDITED');
    expect(rows.find((r) => r.key === 'businessLine')).toMatchObject({ source: 'VOICE', warn: true });
  });
});

describe('vendor entry and wizard hand-off', () => {
  it('the wizard offers the way back to the card while a voice draft is being edited', async () => {
    const { VoiceReturnBanner } = await import('@/features/business-registrations/voice/VoiceReturnBanner');
    startCard({ handedOff: true, phase: 'interview' });
    render(
      <MemoryRouter initialEntries={['/vendor/registrations/new/details']}>
        <Routes>
          <Route path="/vendor/registrations/new/details" element={<VoiceReturnBanner />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại thẻ xác nhận' }));
    expect(await screen.findByText('at /vendor/registrations/new/voice')).toBeInTheDocument();
    expect(useVoiceSessionStore.getState().phase).toBe('card');
  });

  it('a registration the wizard files after "Sửa" still gets the acceptance recorded', async () => {
    const { afterWizardFiled } = await import('@/features/business-registrations/voice/voice-filing');
    startCard({ handedOff: true, snapshot: {} });
    voiceApi.confirm.mockResolvedValue({ aiLogId: 2, registrationId: 81, confirmedAt: '' });
    await act(() => afterWizardFiled({ registrationId: 81 } as ApiRegistration));
    expect(voiceApi.confirm).toHaveBeenCalledWith(81, expect.objectContaining({ turns: 5 }));
    await waitFor(() => expect(useVoiceSessionStore.getState().active).toBe(false));
  });

  it('a plain wizard filing records nothing', async () => {
    const { afterWizardFiled } = await import('@/features/business-registrations/voice/voice-filing');
    await afterWizardFiled({ registrationId: 82 } as ApiRegistration);
    expect(voiceApi.confirm).not.toHaveBeenCalled();
  });
});
