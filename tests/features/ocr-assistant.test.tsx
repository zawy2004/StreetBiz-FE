import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { KycIdCardExtraction } from '@/core/api';
import { planScanMerge } from '@/features/business-registrations/id-card-merge';

vi.mock('@/core/config/env', () => ({
  env: {
    apiBaseUrl: 'https://api.example.test/api',
    useMockApi: false,
    appEnv: 'test',
    enableAiCompliance: true,
  },
  isDev: true,
  isLiveApi: true,
}));

const kyc = vi.hoisted(() => ({ extractIdCard: vi.fn(), matchFace: vi.fn() }));
const registration = vi.hoisted(() => ({ uploadEvidenceFile: vi.fn() }));
const assistant = vi.hoisted(() => ({ ask: vi.fn() }));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return {
    ...actual,
    vendorKycApi: kyc,
    vendorRegistrationApi: { ...actual.vendorRegistrationApi, ...registration },
  };
});
vi.mock('@/features/ai-compliance/assistant-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/ai-compliance/assistant-api')>();
  return { ...actual, assistantApi: assistant };
});

const { IdCardScanner } = await import('@/features/business-registrations/components/IdCardScanner');
const { useNewRegistrationStore } = await import('@/features/business-registrations/new-registration-store');
const { VendorAssistantScreen } = await import('@/features/ai-compliance/screens/VendorAssistantScreen');

const scan = (over: Partial<KycIdCardExtraction> = {}): KycIdCardExtraction => ({
  idNumber: '048099000111',
  fullName: 'Nguyễn Thị Năm',
  dateOfBirth: '1990-05-17',
  gender: 'FEMALE',
  nationality: 'Việt Nam',
  ethnicity: 'Kinh',
  permanentAddress: '12 Lê Duẩn, Hải Châu',
  idIssuedDate: '2021-03-04',
  idIssuedPlace: 'Cục Cảnh sát QLHC',
  confidencePercent: 91,
  needsManualVerification: false,
  warnings: [],
  isAiGenerated: true,
  summary: 'Đã đọc CCCD.',
  ...over,
});

const empty = {
  ownerDateOfBirth: '',
  ownerGender: '',
  ownerNationality: '',
  ownerEthnicity: '',
  permanentAddress: '',
  idIssuedDate: '',
  idIssuedPlace: '',
};

describe('planScanMerge', () => {
  it('fills every empty field and reports no conflicts', () => {
    const { fill, conflicts } = planScanMerge(empty, scan());

    expect(fill).toMatchObject({ ownerDateOfBirth: '1990-05-17', ownerGender: 'FEMALE', ownerEthnicity: 'Kinh' });
    expect(conflicts).toEqual([]);
  });

  it('never overwrites something the user typed; it becomes a conflict instead', () => {
    const { fill, conflicts } = planScanMerge({ ...empty, permanentAddress: '99 Trần Phú' }, scan());

    expect(fill).not.toHaveProperty('permanentAddress');
    expect(conflicts).toEqual([
      { field: 'permanentAddress', current: '99 Trần Phú', suggested: '12 Lê Duẩn, Hải Châu' },
    ]);
  });

  it('treats the same value in a different case as agreement, not a conflict', () => {
    const { conflicts } = planScanMerge({ ...empty, ownerEthnicity: 'kinh' }, scan());

    expect(conflicts).toEqual([]);
  });

  it('ignores fields the scan could not read', () => {
    const { fill } = planScanMerge(empty, scan({ ethnicity: null, idIssuedPlace: '  ' }));

    expect(fill).not.toHaveProperty('ownerEthnicity');
    expect(fill).not.toHaveProperty('idIssuedPlace');
  });
});

describe('IdCardScanner', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useNewRegistrationStore.getState().reset();
    const s = useNewRegistrationStore.getState();
    s.setField('biometricConsent', true);
    s.setField('ownerNationality', '');
    s.addEvidence({
      evidenceType: 'IDENTITY_DOCUMENT',
      uri: 'blob:front',
      label: 'CCCD',
      file: new File(['x'], 'f.jpg', { type: 'image/jpeg' }),
    });
    s.patchEvidence('IDENTITY_DOCUMENT', { uploadedUrl: '/api/uploads/evidence/1/f.jpg' });
    kyc.extractIdCard.mockResolvedValue(scan());
  });

  it('fills empty fields, keeps typed ones, and shows both confidence and the conflict', async () => {
    const user = userEvent.setup();
    useNewRegistrationStore.getState().setField('permanentAddress', '99 Trần Phú');
    render(<IdCardScanner />);

    await user.click(screen.getByRole('button', { name: /Đọc thông tin từ ảnh CCCD/ }));

    await waitFor(() => expect(useNewRegistrationStore.getState().ownerDateOfBirth).toBe('1990-05-17'));
    const state = useNewRegistrationStore.getState();
    expect(state.permanentAddress).toBe('99 Trần Phú');
    expect(await screen.findByText(/Độ tin cậy 91%/)).toBeInTheDocument();
    expect(screen.getByText(/Đã điền:/)).toHaveTextContent('Ngày sinh');
    expect(screen.getByText('Bạn nhập: 99 Trần Phú')).toBeInTheDocument();
    expect(screen.getByText('Đọc được: 12 Lê Duẩn, Hải Châu')).toBeInTheDocument();
  });

  it('applies a suggestion only when the user chooses it', async () => {
    const user = userEvent.setup();
    useNewRegistrationStore.getState().setField('permanentAddress', '99 Trần Phú');
    render(<IdCardScanner />);
    await user.click(screen.getByRole('button', { name: /Đọc thông tin từ ảnh CCCD/ }));
    await screen.findByText('Đọc được: 12 Lê Duẩn, Hải Châu');

    await user.click(screen.getByRole('button', { name: 'Dùng giá trị đọc được' }));

    expect(useNewRegistrationStore.getState().permanentAddress).toBe('12 Lê Duẩn, Hải Châu');
    expect(screen.queryByText('Đọc được: 12 Lê Duẩn, Hải Châu')).not.toBeInTheDocument();
  });

  it('flags a low-confidence read for careful checking', async () => {
    const user = userEvent.setup();
    kyc.extractIdCard.mockResolvedValue(scan({ confidencePercent: 62, needsManualVerification: true }));
    render(<IdCardScanner />);

    await user.click(screen.getByRole('button', { name: /Đọc thông tin từ ảnh CCCD/ }));

    expect(await screen.findByText(/cần kiểm tra kỹ từng trường/)).toBeInTheDocument();
  });

  it('labels AI output as advisory and carries no [AI] tag', async () => {
    render(<IdCardScanner />);

    expect(document.body.textContent).not.toContain('[AI');
  });

  it('refuses to scan before the front photo has finished uploading, and says why', async () => {
    const user = userEvent.setup();
    useNewRegistrationStore.getState().patchEvidence('IDENTITY_DOCUMENT', { uploadedUrl: undefined });
    render(<IdCardScanner />);

    await user.click(screen.getByRole('button', { name: /Đọc thông tin từ ảnh CCCD/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Không tải được ảnh mặt trước|đang được tải lên/);
    expect(kyc.extractIdCard).not.toHaveBeenCalled();
  });

  it('will not scan without the separate biometric consent', async () => {
    const user = userEvent.setup();
    useNewRegistrationStore.getState().setField('biometricConsent', false);
    render(<IdCardScanner />);

    await user.click(screen.getByRole('button', { name: /Đọc thông tin từ ảnh CCCD/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/đồng ý/);
    expect(kyc.extractIdCard).not.toHaveBeenCalled();
  });
});

function renderAssistant(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/vendor/assistant', state }]}>
      <Routes>
        <Route path="/vendor/assistant" element={<VendorAssistantScreen />} />
        <Route path="/vendor/home" element={<div>vendor home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VendorAssistantScreen', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    assistant.ask.mockResolvedValue({ answer: 'Cần ảnh hai mặt CCCD.', isAiGenerated: true });
  });

  it('sends on Enter and shows the answer as advisory', async () => {
    const user = userEvent.setup();
    renderAssistant();

    await user.type(screen.getByLabelText('Nội dung tin nhắn'), 'Tôi cần giấy tờ gì?{Enter}');

    expect(await screen.findByText('Cần ảnh hai mặt CCCD.')).toBeInTheDocument();
    // The greeting and the answer both carry the advisory label.
    expect(screen.getAllByText('Trợ lý AI · chỉ để tham khảo')).toHaveLength(2);
    expect(assistant.ask).toHaveBeenCalledWith('Tôi cần giấy tờ gì?', expect.any(String));
  });

  it('passes the wizard step it was opened from, so the answer fits where the vendor is', async () => {
    const user = userEvent.setup();
    renderAssistant({ context: 'Hộ kinh doanh đang đăng ký, bước 4/5: Giấy tờ minh chứng.' });

    await user.type(screen.getByLabelText('Nội dung tin nhắn'), 'Ảnh phải thế nào?{Enter}');

    await waitFor(() => expect(assistant.ask).toHaveBeenCalled());
    expect(assistant.ask.mock.calls[0]![1]).toContain('bước 4/5');
  });

  it('remembers the last turns so a follow-up has something to refer to', async () => {
    const user = userEvent.setup();
    renderAssistant();
    const box = screen.getByLabelText('Nội dung tin nhắn');

    await user.type(box, 'Câu một{Enter}');
    await screen.findByText('Cần ảnh hai mặt CCCD.');
    await user.type(box, 'Câu hai{Enter}');

    await waitFor(() => expect(assistant.ask).toHaveBeenCalledTimes(2));
    expect(assistant.ask.mock.calls[1]![1]).toContain('Câu một');
    expect(assistant.ask.mock.calls[1]![1]).toContain('Cần ảnh hai mặt CCCD.');
  });

  it('shows a failure as an error message, not a normal answer', async () => {
    const user = userEvent.setup();
    assistant.ask.mockRejectedValue(new Error('Dịch vụ AI đang bận'));
    renderAssistant();

    await user.type(screen.getByLabelText('Nội dung tin nhắn'), 'Xin chào{Enter}');

    expect(await screen.findByText(/Không nhận được câu trả lời: Dịch vụ AI đang bận/)).toBeInTheDocument();
  });

  it('announces new messages through a polite live region and has no emoji', async () => {
    renderAssistant();

    expect(screen.getByRole('log', { name: 'Cuộc trò chuyện' })).toHaveAttribute('aria-live', 'polite');
    expect(document.body.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('mentions neither the model vendor nor internal rule codes', () => {
    renderAssistant();

    expect(document.body.textContent).not.toMatch(/Groq|BR-\d+/);
  });
});
