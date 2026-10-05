import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { RegistrationTimeline } from '@/features/business-registrations/components/RegistrationTimeline';
import { NewRegistrationReviewScreen } from '@/features/business-registrations/screens/NewRegistrationReviewScreen';
import { NewRegistrationTypeScreen } from '@/features/business-registrations/screens/NewRegistrationTypeScreen';
import {
  hasDraftContent,
  useNewRegistrationStore,
} from '@/features/business-registrations/new-registration-store';
import { useAuthStore } from '@/store/auth-store';

const NEW = '/vendor/registrations/new';

function renderWizard(path: string, element: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="*" element={<div>elsewhere</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function signIn(id: string) {
  useAuthStore.setState({
    user: {
      id,
      fullName: 'Vendor',
      phone: '0905000101',
      password: '',
      role_code: 'VENDOR',
      account_status: 'ACTIVE',
    },
  });
}

function fillBasics() {
  const s = useNewRegistrationStore.getState();
  s.setField('displayName', 'Xôi gà Bà Năm');
  s.setField('wardUnitId', 10);
  s.setField('declaredAddress', '12 Lê Duẩn');
  s.setField('businessLine', 'Bán xôi');
}

beforeEach(() => {
  localStorage.clear();
  useNewRegistrationStore.getState().reset();
  signIn('u1');
});

describe('RegistrationTimeline', () => {
  it('marks a draft as still being written and nothing sent yet', () => {
    render(<RegistrationTimeline status="DRAFT" createdAt="2026-10-01T00:00:00Z" reviewedAt={null} />);

    expect(screen.getByText('Soạn hồ sơ').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Phường xem xét')).toBeInTheDocument();
  });

  it('shows where a filed registration is waiting', () => {
    render(<RegistrationTimeline status="SUBMITTED" createdAt="2026-10-01T00:00:00Z" reviewedAt={null} />);

    expect(screen.getByText('Nộp cho phường').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('names a request for more information instead of a generic review step', () => {
    render(
      <RegistrationTimeline status="MORE_INFORMATION_REQUIRED" createdAt="2026-10-01T00:00:00Z" reviewedAt={null} />,
    );

    expect(screen.getByText('Phường yêu cầu bổ sung')).toBeInTheDocument();
    expect(screen.getByText('Cập nhật hồ sơ rồi gửi lại')).toBeInTheDocument();
  });

  it('ends a withdrawn file where it stopped', () => {
    render(<RegistrationTimeline status="WITHDRAWN" createdAt="2026-10-01T00:00:00Z" reviewedAt={null} />);

    expect(screen.getByText('Đã rút hồ sơ')).toBeInTheDocument();
    expect(screen.queryByText('Phường xem xét')).not.toBeInTheDocument();
  });

  it('dates the decision', () => {
    render(
      <RegistrationTimeline status="APPROVED" createdAt="2026-10-01T00:00:00Z" reviewedAt="2026-10-05T00:00:00Z" />,
    );

    expect(screen.getByText('Đã được duyệt')).toBeInTheDocument();
    expect(screen.getByText(/^Ngày /)).toBeInTheDocument();
  });
});

describe('draft persistence', () => {
  it('keeps the form across a reload but never the picked files', () => {
    fillBasics();
    useNewRegistrationStore.getState().addEvidence({
      evidenceType: 'IDENTITY_DOCUMENT',
      uri: 'blob:preview',
      label: 'CCCD',
      file: new File(['x'], 'id.jpg', { type: 'image/jpeg' }),
    });

    const saved = JSON.parse(localStorage.getItem('streetbiz-registration-draft') ?? '{}') as {
      state?: Record<string, unknown>;
    };

    expect(saved.state?.displayName).toBe('Xôi gà Bà Năm');
    expect(saved.state).not.toHaveProperty('evidence');
  });

  it('counts a started form, or a registration already created on the server, as resumable', () => {
    expect(hasDraftContent(useNewRegistrationStore.getState())).toBe(false);

    useNewRegistrationStore.getState().setField('displayName', 'Xôi gà');
    expect(hasDraftContent(useNewRegistrationStore.getState())).toBe(true);

    useNewRegistrationStore.getState().reset();
    useNewRegistrationStore.getState().setField('createdRegistrationId', 5);
    expect(hasDraftContent(useNewRegistrationStore.getState())).toBe(true);
  });
});

describe('NewRegistrationTypeScreen', () => {
  it('offers to resume the draft the signed-in vendor left behind', () => {
    fillBasics();
    useNewRegistrationStore.getState().setField('draftOwnerId', 'u1');

    renderWizard(`${NEW}/type`, <NewRegistrationTypeScreen />);

    expect(screen.getByText('Bạn đang soạn dở một hồ sơ')).toBeInTheDocument();
  });

  it('never shows one account the draft another account started', () => {
    fillBasics();
    useNewRegistrationStore.getState().setField('draftOwnerId', 'someone-else');

    renderWizard(`${NEW}/type`, <NewRegistrationTypeScreen />);

    expect(screen.queryByText('Bạn đang soạn dở một hồ sơ')).not.toBeInTheDocument();
    expect(useNewRegistrationStore.getState().displayName).toBe('');
  });

  it('starts over on request', async () => {
    const user = userEvent.setup();
    fillBasics();
    useNewRegistrationStore.getState().setField('draftOwnerId', 'u1');
    renderWizard(`${NEW}/type`, <NewRegistrationTypeScreen />);

    await user.click(screen.getByRole('button', { name: 'Bắt đầu lại' }));

    expect(useNewRegistrationStore.getState().displayName).toBe('');
  });
});

describe('NewRegistrationReviewScreen', () => {
  it('sends a visitor with nothing entered back to the first step', () => {
    renderWizard(`${NEW}/review`, <NewRegistrationReviewScreen />);

    expect(screen.getByText('elsewhere')).toBeInTheDocument();
  });

  it('reads the entered details back and flags the missing documents', () => {
    fillBasics();
    renderWizard(`${NEW}/review`, <NewRegistrationReviewScreen />);

    expect(screen.getByText('Xôi gà Bà Năm')).toBeInTheDocument();
    expect(screen.getAllByText('Còn thiếu')).toHaveLength(2);
  });

  it('refuses to submit until the required documents are on file', async () => {
    const user = userEvent.setup();
    fillBasics();
    renderWizard(`${NEW}/review`, <NewRegistrationReviewScreen />);

    await user.click(screen.getByRole('button', { name: 'Nộp hồ sơ' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Còn thiếu/);
  });
});
