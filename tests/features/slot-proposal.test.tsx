import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

const api = vi.hoisted(() => ({
  searchSlots: vi.fn(),
  proposeSlot: vi.fn(),
  uploadEvidenceFile: vi.fn(),
  registrations: vi.fn(),
  reverseGeocode: vi.fn(),
  searchAddress: vi.fn(),
}));

vi.mock('@/core/api/side-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api/side-api')>();
  return { ...actual, sideApi: { ...actual.sideApi, searchSlots: api.searchSlots, proposeSlot: api.proposeSlot } };
});
vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return {
    ...actual,
    vendorRegistrationApi: { ...actual.vendorRegistrationApi, uploadEvidenceFile: api.uploadEvidenceFile },
  };
});
vi.mock('@/features/business-registrations/useRegistrations', () => ({
  useRegistrations: () => api.registrations(),
}));
vi.mock('@/services/map/reverse-geocode', () => ({ reverseGeocode: api.reverseGeocode }));
vi.mock('@/services/map/forward-geocode', () => ({ searchAddress: api.searchAddress }));

// Leaflet needs real layout; the picker's contract is what matters here: it shows the pin and reports a tap.
vi.mock('@/features/sidewalk-slots/components/LocationPicker', () => ({
  LocationPicker: ({
    position,
    viewKey,
    onPick,
  }: {
    position: { latitude: number; longitude: number } | null;
    viewKey: number;
    onPick: (p: { latitude: number; longitude: number }) => void;
  }) => (
    <div>
      <span data-testid="pin">{position ? `${position.latitude},${position.longitude}` : 'no pin'}</span>
      <span data-testid="view">{viewKey}</span>
      <button type="button" onClick={() => onPick({ latitude: 16.0611, longitude: 108.2161 })}>
        tap map
      </button>
    </div>
  ),
}));
vi.mock('@/components/forms/PhotoPicker', () => ({
  PhotoPicker: ({ onChange }: { onChange: (uri: string, file: File) => void }) => (
    <button type="button" onClick={() => onChange('blob:photo', new File(['x'], 'p.jpg', { type: 'image/jpeg' }))}>
      pick photo
    </button>
  ),
}));

const { SlotProposalScreen } = await import('@/features/sidewalk-slots/screens/SlotProposalScreen');

const GPS = { latitude: 16.0064, longitude: 108.1735 };

function stubGeolocation(kind: 'ok' | 'denied') {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: (p: { coords: typeof GPS }) => void, fail: () => void) =>
        kind === 'ok' ? ok({ coords: GPS }) : fail(),
    },
  });
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/vendor/slots/slot-proposals/new']}>
        <Routes>
          <Route path="/vendor/slots/slot-proposals/new" element={<SlotProposalScreen />} />
          <Route path="/vendor/registrations/new/type" element={<div>registration page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  stubGeolocation('ok');
  api.registrations.mockReturnValue({ registrations: [{ registrationId: 7 }], isLoading: false });
  api.searchSlots.mockResolvedValue([{ zoneId: 1, zoneName: 'Đường Nguyễn Văn Linh' }]);
  api.reverseGeocode.mockResolvedValue('Đường Nguyễn Văn Linh, Hải Châu');
  api.uploadEvidenceFile.mockResolvedValue({ fileUrl: '/files/p.jpg' });
  api.proposeSlot.mockResolvedValue({ message: 'Đã gửi đề xuất.' });
});

describe('Đề xuất ô mới: choosing the position', () => {
  it('starts without a pin and refuses to submit until a position is chosen', async () => {
    const user = userEvent.setup();
    renderScreen();

    expect(await screen.findByText('Chưa chọn vị trí')).toBeInTheDocument();
    expect(screen.getByTestId('pin')).toHaveTextContent('no pin');
    await user.click(screen.getByRole('button', { name: 'Gửi đề xuất' }));

    expect(await screen.findByText('Vui lòng chọn vị trí trên bản đồ hoặc lấy vị trí hiện tại.')).toBeInTheDocument();
    expect(api.proposeSlot).not.toHaveBeenCalled();
  });

  it('lets the vendor place the pin by tapping the map, with no GPS at all', async () => {
    const user = userEvent.setup();
    stubGeolocation('denied');
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'tap map' }));

    expect(screen.getByTestId('pin')).toHaveTextContent('16.0611,108.2161');
    expect(await screen.findByText('Đường Nguyễn Văn Linh, Hải Châu')).toBeInTheDocument();
    expect(screen.getByText(/16\.061100°, 108\.216100°/)).toBeInTheDocument();
  });

  it('re-centres the map on a GPS fix but not when the pin is moved by a tap', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Chưa chọn vị trí');
    expect(screen.getByTestId('view')).toHaveTextContent('0');

    await user.click(screen.getByRole('button', { name: 'Lấy vị trí hiện tại' }));
    await waitFor(() => expect(screen.getByTestId('pin')).toHaveTextContent('16.0064,108.1735'));
    expect(screen.getByTestId('view')).toHaveTextContent('1');

    await user.click(screen.getByRole('button', { name: 'tap map' }));
    expect(screen.getByTestId('pin')).toHaveTextContent('16.0611,108.2161');
    expect(screen.getByTestId('view')).toHaveTextContent('1');
  });

  it('lets the vendor correct a wrong GPS fix and submits the corrected coordinates', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Lấy vị trí hiện tại' }));
    await waitFor(() => expect(screen.getByTestId('pin')).toHaveTextContent('16.0064,108.1735'));

    await user.click(screen.getByRole('button', { name: 'tap map' }));
    await user.click(screen.getByRole('button', { name: 'pick photo' }));
    await user.click(screen.getByRole('button', { name: 'Gửi đề xuất' }));

    await waitFor(() => expect(api.proposeSlot).toHaveBeenCalledTimes(1));
    expect(api.proposeSlot).toHaveBeenCalledWith(
      expect.objectContaining({ registrationId: 7, zoneId: 1, latitude: 16.0611, longitude: 108.2161, proposalPhotoUrl: '/files/p.jpg' }),
    );
  });

  it('explains a refused GPS permission and points at the map', async () => {
    const user = userEvent.setup();
    stubGeolocation('denied');
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Lấy vị trí hiện tại' }));

    expect(await screen.findByText(/chạm vào bản đồ để chọn/)).toBeInTheDocument();
    expect(screen.getByTestId('pin')).toHaveTextContent('no pin');
  });
});

describe('Đề xuất ô mới: typing an address', () => {
  const MATCH = { label: '14 Hẻm 169/8 Phan Thanh, Thạc Gián, Thanh Khê, Đà Nẵng', latitude: 16.06182, longitude: 108.21 };

  it('keeps Tìm disabled until something is typed', async () => {
    renderScreen();

    expect(await screen.findByRole('button', { name: 'Tìm' })).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText(/Nhập địa chỉ/), 'phan thanh');
    expect(screen.getByRole('button', { name: 'Tìm' })).toBeEnabled();
  });

  it('moves the pin to the address the vendor picks and re-centres the map on it', async () => {
    const user = userEvent.setup();
    api.searchAddress.mockResolvedValue([MATCH]);
    renderScreen();

    await user.type(await screen.findByPlaceholderText(/Nhập địa chỉ/), 'phan thanh{Enter}');
    expect(api.searchAddress).toHaveBeenCalledWith('phan thanh');
    await user.click(await screen.findByRole('button', { name: MATCH.label }));

    expect(screen.getByTestId('pin')).toHaveTextContent('16.06182,108.21');
    expect(screen.getByTestId('view')).toHaveTextContent('1');
    expect(screen.queryByRole('button', { name: MATCH.label })).not.toBeInTheDocument();
  });

  it('submits the coordinates of the picked address', async () => {
    const user = userEvent.setup();
    api.searchAddress.mockResolvedValue([MATCH]);
    renderScreen();

    await user.type(await screen.findByPlaceholderText(/Nhập địa chỉ/), 'phan thanh');
    await user.click(screen.getByRole('button', { name: 'Tìm' }));
    await user.click(await screen.findByRole('button', { name: MATCH.label }));
    await user.click(screen.getByRole('button', { name: 'pick photo' }));
    await user.click(screen.getByRole('button', { name: 'Gửi đề xuất' }));

    await waitFor(() => expect(api.proposeSlot).toHaveBeenCalledWith(expect.objectContaining({ latitude: 16.06182, longitude: 108.21 })));
  });

  it('says so when nothing is found, and when the search itself fails', async () => {
    const user = userEvent.setup();
    api.searchAddress.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('network'));
    renderScreen();

    await user.type(await screen.findByPlaceholderText(/Nhập địa chỉ/), 'zzzz');
    await user.click(screen.getByRole('button', { name: 'Tìm' }));
    expect(await screen.findByText(/Không thấy địa chỉ này ở Đà Nẵng/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tìm' }));
    expect(await screen.findByText(/Không tìm được địa chỉ lúc này/)).toBeInTheDocument();
  });
});

describe('Đề xuất ô mới: without a registration', () => {
  it('asks for a registration first and offers to start one', async () => {
    const user = userEvent.setup();
    api.registrations.mockReturnValue({ registrations: [], isLoading: false });
    renderScreen();

    expect(await screen.findByText('Cần có hồ sơ đăng ký kinh doanh')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nộp hồ sơ đăng ký' }));
    expect(await screen.findByText('registration page')).toBeInTheDocument();
  });
});
