import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PermitVerification } from '@/features/vendor-map/community-api';

const community = vi.hoisted(() => ({ verifyPermit: vi.fn() }));

vi.mock('@/features/vendor-map/community-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/vendor-map/community-api')>();
  return { ...actual, communityApi: { ...actual.communityApi, ...community } };
});

// The printed QR's text is what matters here, not its modules.
vi.mock('@/components/common/QrCode', () => ({
  QrCode: ({ value }: { value: string }) => <div data-testid="qr-code" data-value={value} />,
}));

const { PublicPermitScreen } = await import('@/features/price-board/screens/PublicPermitScreen');
const { PrintPriceBoardScreen } =
  await import('@/features/price-board/screens/PrintPriceBoardScreen');
const { permitTokenOf, printedVersionOf, scanLinkFor, currentScanBase } =
  await import('@/features/price-board/permit-link');
const { cityPhoneLabel } = await import('@/features/price-board/price-board-format');
const { PublicScanScreen } = await import('@/features/vendor-map/screens/PublicScanScreen');

const TOKEN = 'SBP1.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.BBBBBBBBBBBBBBBBBBBBBB';

function valid(extra: Partial<PermitVerification> = {}): PermitVerification {
  return {
    isValid: true,
    status: 'VALID',
    permitId: 12,
    vendorId: 8,
    displayName: 'Bánh mì Cô Lan',
    slotId: 5,
    slotCode: 'NVL-022',
    latitude: null,
    longitude: null,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    priceBoard: {
      version: 4,
      updatedAt: '2026-10-22T01:15:00Z',
      printedVersionIsCurrent: null,
      items: [
        {
          menuItemId: 31,
          name: 'Bánh mì thịt',
          nameEn: 'Pork banh mi',
          priceUnit: 'ổ',
          unitPrice: 25000,
        },
        { menuItemId: 32, name: 'Cà phê sữa', nameEn: null, priceUnit: 'ly', unitPrice: 18000 },
      ],
    },
    ...extra,
  };
}

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

function renderAt(path: string, client = new QueryClient()) {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/q/:token" element={<PublicPermitScreen />} />
          <Route path="/q/:token/print" element={<PrintPriceBoardScreen />} />
          <Route path="/customer/scan" element={<PublicScanScreen />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  community.verifyPermit.mockReset();
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => cleanup());

describe('public permit page /q/:token (BUY-06)', () => {
  it('looks the permit up live and shows the price board, units and the three complaints when VALID', async () => {
    community.verifyPermit.mockResolvedValue(valid());
    renderAt(`/q/${TOKEN}`);

    expect(await screen.findByRole('heading', { name: /Hợp lệ/ })).toBeInTheDocument();
    expect(community.verifyPermit).toHaveBeenCalledWith(TOKEN, undefined, undefined);
    const board = screen.getByRole('list', { name: 'Các món và giá' });
    expect(within(board).getByText('Bánh mì thịt')).toBeInTheDocument();
    expect(within(board).getByText('Pork banh mi')).toBeInTheDocument();
    expect(within(board).getByText('25.000 đ / ổ')).toBeInTheDocument();
    expect(within(board).getByText('18.000 đ / ly')).toBeInTheDocument();
    expect(screen.getByText(/Bản số 4/)).toBeInTheDocument();
    expect(screen.getByText(/Cập nhật lúc 08:15 22\/10\/2026/)).toBeInTheDocument();
    for (const label of [
      'Bị tính cao hơn giá niêm yết',
      'Quầy không treo bảng giá',
      'Phản ánh khác',
    ]) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }
    // Bilingual static labels, and the city's own channel for people without an account.
    expect(screen.getByText('Posted prices')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '(0236) 1022' })[0]).toHaveAttribute(
      'href',
      'tel:02361022',
    );
  });

  it('hides the price board when the permit is not valid and offers only a general report', async () => {
    community.verifyPermit.mockResolvedValue(
      valid({ isValid: false, status: 'SUSPENDED', priceBoard: null }),
    );
    renderAt(`/q/${TOKEN}`);

    expect(await screen.findByRole('heading', { name: /Tạm ngưng/ })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Các món và giá' })).not.toBeInTheDocument();
    expect(screen.queryByText('25.000 đ / ổ')).not.toBeInTheDocument();
    expect(screen.getByText(/Đừng dựa vào mã này khi mua hàng/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Bị tính cao hơn giá niêm yết/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Phản ánh khác/ })).toBeInTheDocument();
  });

  it('says the paper board is an older version when the printed ?v= is not current', async () => {
    community.verifyPermit.mockResolvedValue(
      valid({ priceBoard: { ...valid().priceBoard!, printedVersionIsCurrent: false } }),
    );
    renderAt(`/q/${TOKEN}?v=2`);

    expect(
      await screen.findByText('Bảng giá tại quầy là bản 2, giá hiện tại là bản 4.'),
    ).toBeInTheDocument();
    expect(community.verifyPermit).toHaveBeenCalledWith(TOKEN, undefined, 2);
  });

  it('does not call the board outdated when the printed version is the current one', async () => {
    community.verifyPermit.mockResolvedValue(
      valid({ priceBoard: { ...valid().priceBoard!, printedVersionIsCurrent: true } }),
    );
    renderAt(`/q/${TOKEN}?v=4`);

    await screen.findByRole('list', { name: 'Các món và giá' });
    expect(screen.queryByText(/Bảng giá tại quầy là bản/)).not.toBeInTheDocument();
  });

  it('shows an unknown code as invalid with no complaint button, only the 1022 line', async () => {
    community.verifyPermit.mockResolvedValue({
      ...valid(),
      isValid: false,
      status: 'NOT_FOUND',
      permitId: null,
      vendorId: null,
      displayName: null,
      priceBoard: null,
    });
    renderAt('/q/SBP1.tampered.sig');

    expect(await screen.findByRole('heading', { name: /Mã QR không hợp lệ/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Phản ánh khác/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole('complementary', { name: 'Kênh góp ý 1022 của thành phố' }),
    ).toBeInTheDocument();
  });

  it('opens the complaint form for the stall with the type, permit, slot and scanned token', async () => {
    community.verifyPermit.mockResolvedValue(valid());
    const user = userEvent.setup();
    renderAt(`/q/${TOKEN}`);

    await user.click(await screen.findByRole('button', { name: /Bị tính cao hơn giá niêm yết/ }));

    const where = screen.getByTestId('where').textContent!;
    expect(where.startsWith('/customer/explore/vendors/8/reports/new?')).toBe(true);
    const query = new URLSearchParams(where.split('?')[1]);
    expect(Object.fromEntries(query)).toEqual({
      type: 'OVERCHARGE',
      permitId: '12',
      slotId: '5',
      qr: TOKEN,
    });
  });

  it('asks the server again on every visit and keeps nothing (BR-39)', async () => {
    community.verifyPermit.mockResolvedValue(valid());
    const client = new QueryClient();
    const first = renderAt(`/q/${TOKEN}`, client);
    await screen.findByRole('list', { name: 'Các món và giá' });
    first.unmount();
    renderAt(`/q/${TOKEN}`, client);
    await screen.findByRole('list', { name: 'Các món và giá' });

    await waitFor(() => expect(community.verifyPermit).toHaveBeenCalledTimes(2));
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});

describe('printable price board /q/:token/print', () => {
  it('lays out the stall, slot, prices with units, the version stamp and a QR of /q/<token>?v=N', async () => {
    community.verifyPermit.mockResolvedValue(valid());
    renderAt(`/q/${TOKEN}/print`);

    const sheet = await screen.findByRole('article', { name: 'Bảng giá in khổ A5' });
    expect(within(sheet).getByRole('heading', { name: 'Bánh mì Cô Lan' })).toBeInTheDocument();
    expect(within(sheet).getByText('NVL-022')).toBeInTheDocument();
    expect(within(sheet).getByText('25.000 đ / ổ')).toBeInTheDocument();
    expect(within(sheet).getByText('Bản số 4 — cập nhật 08:15 22/10/2026')).toBeInTheDocument();
    expect(within(sheet).getByText('Treo bảng này tại quầy.')).toBeInTheDocument();
    expect(within(sheet).getByTestId('qr-code')).toHaveAttribute(
      'data-value',
      `${window.location.origin}/q/${TOKEN}?v=4`,
    );
    expect(screen.getByRole('button', { name: 'In bảng giá (khổ A5)' })).toBeInTheDocument();
  });

  it('prints nothing for a permit that is no longer valid', async () => {
    community.verifyPermit.mockResolvedValue(
      valid({ isValid: false, status: 'EXPIRED', priceBoard: null }),
    );
    renderAt(`/q/${TOKEN}/print`);

    expect(await screen.findByText('Chưa in được bảng giá')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'In bảng giá (khổ A5)' })).not.toBeInTheDocument();
  });
});

describe('buyer scan screen /customer/scan', () => {
  it('accepts a pasted /q/ link, shows the board after a valid check and files against it', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    community.verifyPermit.mockResolvedValue(
      valid({ priceBoard: { ...valid().priceBoard!, printedVersionIsCurrent: false } }),
    );
    const link = `http://192.168.1.5:5173/q/${TOKEN}?v=2`;
    const user = userEvent.setup();
    renderAt('/customer/scan');

    fireEvent.change(screen.getByLabelText('Nội dung QR giấy phép'), { target: { value: link } });
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    expect(await screen.findByRole('list', { name: 'Các món và giá' })).toBeInTheDocument();
    expect(community.verifyPermit).toHaveBeenCalledWith(link, undefined);
    expect(
      screen.getByText('Bảng giá tại quầy là bản 2, giá hiện tại là bản 4.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Bị tính cao hơn giá niêm yết/ }));
    const where = screen.getByTestId('where').textContent!;
    expect(new URLSearchParams(where.split('?')[1]).get('qr')).toBe(TOKEN);
    expect(new URLSearchParams(where.split('?')[1]).get('type')).toBe('OVERCHARGE');
  });

  it('shows no board for a permit that is not valid', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    community.verifyPermit.mockResolvedValue(
      valid({ isValid: false, status: 'EXPIRED', priceBoard: null }),
    );
    const user = userEvent.setup();
    renderAt('/customer/scan');

    fireEvent.change(screen.getByLabelText('Nội dung QR giấy phép'), { target: { value: TOKEN } });
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    expect(await screen.findByRole('heading', { name: 'Hết hạn' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Các món và giá' })).not.toBeInTheDocument();
  });
});

describe('permit QR text', () => {
  it('reads the token from a bare code or a /q/ link on any host, and the printed version', () => {
    expect(permitTokenOf(`  ${TOKEN}  `)).toBe(TOKEN);
    expect(permitTokenOf(`http://192.168.1.5:5173/q/${TOKEN}?v=3`)).toBe(TOKEN);
    expect(permitTokenOf(`https://streetbiz.vn/app/q/${encodeURIComponent(TOKEN)}/print`)).toBe(
      TOKEN,
    );
    expect(printedVersionOf(`http://192.168.1.5:5173/q/${TOKEN}?v=3`)).toBe(3);
    expect(printedVersionOf(`http://x.test/q/${TOKEN}?v=0`)).toBeUndefined();
    expect(printedVersionOf(TOKEN)).toBeUndefined();
  });

  it('links a printed board back to the base it was printed from', () => {
    const base = currentScanBase({
      origin: 'http://192.168.1.5:5173',
      pathname: `/app/q/${TOKEN}/print`,
    });
    expect(base).toBe('http://192.168.1.5:5173/app');
    expect(scanLinkFor(TOKEN, 7, base)).toBe(`http://192.168.1.5:5173/app/q/${TOKEN}?v=7`);
  });

  it('formats the city line as (0236) 1022', () => {
    expect(cityPhoneLabel('02361022')).toBe('(0236) 1022');
  });
});
