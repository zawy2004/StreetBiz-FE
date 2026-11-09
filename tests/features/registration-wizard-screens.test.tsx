import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';

import { useNewRegistrationStore } from '@/features/business-registrations/new-registration-store';
import { NewRegistrationDetailsScreen } from '@/features/business-registrations/screens/NewRegistrationDetailsScreen';
import { NewRegistrationEvidenceScreen } from '@/features/business-registrations/screens/NewRegistrationEvidenceScreen';
import { NewRegistrationOwnerScreen } from '@/features/business-registrations/screens/NewRegistrationOwnerScreen';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

// REG-01 steps 2-4 in mock mode: what each step insists on before moving on, and the final filing.
function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname}</div>;
}

function mount(path: string, element: ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const setField = useNewRegistrationStore.getState().setField;

function fillOwnerStep() {
  setField('ownerDateOfBirth', '1990-01-02');
  setField('ownerGender', 'FEMALE');
  setField('ownerNationality', 'Việt Nam');
  setField('idType', 'CCCD');
  setField('idIssuedDate', '2021-01-01');
  setField('idIssuedPlace', 'Cục CS QLHC về TTXH');
  setField('permanentAddress', '1 Lê Lợi, Hải Châu');
  setField('businessLine', 'Bán bánh mì');
  setField('capitalAmount', '20000000');
  setField('laborCount', '1');
  setField('plannedStartDate', '2026-12-01');
  setField('foodSafetyCommitment', true);
}

beforeAll(() => {
  // The wizard revokes preview URLs on reset.
  URL.revokeObjectURL ??= () => {};
  URL.createObjectURL ??= () => 'blob:x';
});

beforeEach(() => {
  useNewRegistrationStore.getState().reset();
  const vendor = useMockDb.getState().users.find((u) => u.id === 'USR-VEN-1')!;
  useAuthStore.setState({ user: vendor });
});

afterEach(cleanup);

describe('step 2 — business details', () => {
  it('needs a name, a ward and, for a fixed storefront, an address', async () => {
    setField('vendorType', 'FIXED_STOREFRONT');
    const user = userEvent.setup();
    mount('/vendor/registrations/new/details', <NewRegistrationDetailsScreen />);

    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    expect(screen.getByText('Vui lòng nhập tên hộ kinh doanh.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chọn phường/xã.')).toBeInTheDocument();
    expect(screen.getByText('Cửa hàng cố định cần nhập địa chỉ kinh doanh.')).toBeInTheDocument();
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('an itinerant vendor may leave the address blank and moves on to the owner step', async () => {
    setField('vendorType', 'ITINERANT');
    const user = userEvent.setup();
    mount('/vendor/registrations/new/details', <NewRegistrationDetailsScreen />);

    expect(screen.getByText(/Bán hàng lưu động có thể bỏ trống/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Vĩ độ (không bắt buộc)')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Tên hộ kinh doanh'), 'Xe bánh mì Cô Ba');
    await user.selectOptions(screen.getByLabelText('Phường/xã quản lý'), '10');
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/registrations/new/owner');
    expect(useNewRegistrationStore.getState()).toMatchObject({ displayName: 'Xe bánh mì Cô Ba', wardUnitId: 10, declaredAddress: '' });
  });

  it('keeps only well-formed coordinates for a storefront', async () => {
    setField('vendorType', 'FIXED_STOREFRONT');
    const user = userEvent.setup();
    mount('/vendor/registrations/new/details', <NewRegistrationDetailsScreen />);

    await user.type(screen.getByLabelText('Vĩ độ (không bắt buộc)'), '16.0678');
    await user.type(screen.getByLabelText('Kinh độ (không bắt buộc)'), 'abc');

    // Typed key by key: "16." must not collapse to "16" and swallow the decimal point.
    expect(useNewRegistrationStore.getState().addressLatitude).toBe(16.0678);
    expect(screen.getByLabelText('Vĩ độ (không bắt buộc)')).toHaveValue('16.0678');
    expect(useNewRegistrationStore.getState().addressLongitude).toBeNull();
    expect(screen.getByLabelText('Kinh độ (không bắt buộc)')).toHaveValue('');

    await user.clear(screen.getByLabelText('Vĩ độ (không bắt buộc)'));
    expect(useNewRegistrationStore.getState().addressLatitude).toBeNull();
  });

  it('says it is updating an existing file when editing', () => {
    useNewRegistrationStore.getState().loadForEdit({ registrationId: 5, displayName: 'Quán A' });
    mount('/vendor/registrations/new/details', <NewRegistrationDetailsScreen />);

    expect(screen.getByRole('heading', { name: 'Cập nhật hồ sơ' })).toBeInTheDocument();
  });
});

describe('step 3 — owner, business line and ATTP commitment', () => {
  it('lists every missing Mẫu 01 field and stays on the step', async () => {
    const user = userEvent.setup();
    mount('/vendor/registrations/new/owner', <NewRegistrationOwnerScreen />);

    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    for (const message of [
      'Vui lòng nhập ngày sinh của chủ hộ kinh doanh.',
      'Vui lòng chọn giới tính.',
      'Vui lòng nhập ngày cấp.',
      'Vui lòng nhập nơi cấp.',
      'Vui lòng nhập địa chỉ thường trú theo CCCD.',
      'Vui lòng nhập ngành, nghề kinh doanh.',
      'Vui lòng nhập vốn kinh doanh.',
      'Vui lòng nhập số lao động.',
      'Vui lòng nhập ngày dự kiến bắt đầu hoạt động.',
      'Vui lòng xác nhận cam kết an toàn thực phẩm.',
    ]) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('moves on to the documents once everything is filled', async () => {
    fillOwnerStep();
    const user = userEvent.setup();
    mount('/vendor/registrations/new/owner', <NewRegistrationOwnerScreen />);

    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/registrations/new/evidence');
  });

  it('typing a field writes it to the draft', async () => {
    const user = userEvent.setup();
    mount('/vendor/registrations/new/owner', <NewRegistrationOwnerScreen />);

    await user.type(screen.getByLabelText('Ngành, nghề kinh doanh'), 'Bún chả');
    await user.type(screen.getByLabelText('Vốn kinh doanh (VNĐ)'), '15000000');

    expect(useNewRegistrationStore.getState()).toMatchObject({ businessLine: 'Bún chả', capitalAmount: '15000000' });
  });

  it('adds, fills and removes a household member', async () => {
    const user = userEvent.setup();
    mount('/vendor/registrations/new/owner', <NewRegistrationOwnerScreen />);

    await user.click(screen.getByRole('button', { name: '+ Thêm thành viên hộ gia đình' }));
    expect(useNewRegistrationStore.getState().householdMembers).toHaveLength(1);
    await user.type(screen.getByLabelText('Họ tên'), 'Nguyễn Văn B');
    expect(useNewRegistrationStore.getState().householdMembers[0]!.fullName).toBe('Nguyễn Văn B');

    await user.click(screen.getByRole('button', { name: 'Xoá thành viên' }));
    expect(useNewRegistrationStore.getState().householdMembers).toHaveLength(0);
  });
});

describe('step 4 — documents and filing', () => {
  function readyThroughStep3(vendorType: 'FIXED_STOREFRONT' | 'ITINERANT' = 'ITINERANT') {
    setField('vendorType', vendorType);
    setField('displayName', 'Xe bánh mì Cô Ba');
    setField('wardUnitId', 10);
    fillOwnerStep();
  }

  it('sends the user back when steps 1-2 are incomplete', async () => {
    const user = userEvent.setup();
    mount('/vendor/registrations/new/evidence', <NewRegistrationEvidenceScreen />);

    await user.click(screen.getByRole('button', { name: 'Nộp hồ sơ' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Thông tin bước 1 và 2 chưa đầy đủ');
  });

  it('names the required documents still missing — a storefront also needs its licence (MSG14)', async () => {
    readyThroughStep3('FIXED_STOREFRONT');
    const user = userEvent.setup();
    mount('/vendor/registrations/new/evidence', <NewRegistrationEvidenceScreen />);

    await user.click(screen.getByRole('button', { name: 'Nộp hồ sơ' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng tải cccd mặt trước và cccd mặt sau và giấy phép kinh doanh.');
  });

  it('files the registration into the demo database and returns to the list', async () => {
    readyThroughStep3();
    const store = useNewRegistrationStore.getState();
    store.addEvidence({ evidenceType: 'IDENTITY_DOCUMENT', uri: 'blob:front', label: 'CCCD mặt trước' });
    store.addEvidence({ evidenceType: 'IDENTITY_DOCUMENT_BACK', uri: 'blob:back', label: 'CCCD mặt sau' });
    const before = useMockDb.getState().registrations.length;
    const user = userEvent.setup();
    mount('/vendor/registrations/new/evidence', <NewRegistrationEvidenceScreen />);

    await user.click(screen.getByRole('button', { name: 'Nộp hồ sơ' }));

    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/registrations');
    const registrations = useMockDb.getState().registrations;
    expect(registrations).toHaveLength(before + 1);
    expect(registrations.at(-1)).toMatchObject({ business_name: 'Xe bánh mì Cô Ba', vendor_type: 'ITINERANT', fast_track: false });
    expect(registrations.at(-1)!.evidence.map((e) => e.type)).toEqual(['IDENTITY_DOCUMENT', 'IDENTITY_DOCUMENT_BACK']);
    expect(useNewRegistrationStore.getState().displayName).toBe('');
  });

  it('when editing, documents are optional and proof of address can be added', () => {
    useNewRegistrationStore.getState().loadForEdit({ registrationId: 5, displayName: 'Quán A', vendorType: 'FIXED_STOREFRONT', wardUnitId: 10 });
    mount('/vendor/registrations/new/evidence', <NewRegistrationEvidenceScreen />);

    expect(screen.getByRole('button', { name: 'Cập nhật & Gửi lại' })).toBeInTheDocument();
    expect(screen.getByText(/Giấy tờ đã nộp trước đó vẫn được giữ/)).toBeInTheDocument();
    expect(screen.getAllByText('Giấy tờ địa chỉ').length).toBeGreaterThan(0);
  });
});
