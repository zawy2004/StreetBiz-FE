import { vi } from 'vitest';

import { searchAddress } from '@/services/map/forward-geocode';

const candidate = (address: string, score: number, x = 108.2136, y = 16.0602) => ({
  address,
  score,
  location: { x, y },
});

function respondWith(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('searchAddress', () => {
  it('asks Esri for Vietnam, limited to Da Nang, and encodes the text', async () => {
    const fetchMock = respondWith({ candidates: [] });

    await searchAddress('  14 Hẻm 169/8 Phan Thanh ');

    const url = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(url.origin + url.pathname).toBe('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
    expect(url.searchParams.get('SingleLine')).toBe('14 Hẻm 169/8 Phan Thanh');
    expect(url.searchParams.get('countryCode')).toBe('VNM');
    expect(url.searchParams.get('searchExtent')).toBe('107.85,15.9,108.35,16.2');
    expect(url.searchParams.get('f')).toBe('json');
  });

  it('does not call the service for a blank query', async () => {
    const fetchMock = respondWith({ candidates: [] });

    expect(await searchAddress('   ')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns latitude/longitude (not x/y), rounded to six decimals', async () => {
    respondWith({ candidates: [candidate('Đường Nguyễn Văn Linh, Nam Dương, Hải Châu, Đà Nẵng', 89, 108.21361234567, 16.06021234567)] });

    expect(await searchAddress('nguyen van linh')).toEqual([
      { label: 'Đường Nguyễn Văn Linh, Nam Dương, Hải Châu, Đà Nẵng', latitude: 16.060212, longitude: 108.213612 },
    ]);
  });

  it('drops weak matches, and the postcode variants that make one street look like several', async () => {
    respondWith({
      candidates: [
        candidate('Đường Phan Thanh, Thạc Gián, Thanh Khê, Đà Nẵng, 50312', 94),
        candidate('Đường Phan Thanh, Thạc Gián, Thanh Khê, Đà Nẵng, 50313', 94),
        candidate('Phan Thanh, Nơi Khác', 40),
        candidate('Hẻm 169/8 Phan Thanh, Thạc Gián, Thanh Khê, Đà Nẵng', 79),
      ],
    });

    const matches = await searchAddress('phan thanh');

    expect(matches.map((m) => m.label)).toEqual([
      'Đường Phan Thanh, Thạc Gián, Thanh Khê, Đà Nẵng',
      'Hẻm 169/8 Phan Thanh, Thạc Gián, Thanh Khê, Đà Nẵng',
    ]);
  });

  it('keeps at most five matches', async () => {
    respondWith({ candidates: Array.from({ length: 8 }, (_, i) => candidate(`Đường ${i}, Đà Nẵng`, 90, 108.2 + i / 1000)) });

    expect(await searchAddress('duong')).toHaveLength(5);
  });

  it('throws when the service fails, so "could not search" differs from "found nothing"', async () => {
    respondWith({}, false, 500);
    await expect(searchAddress('x')).rejects.toThrow('500');

    respondWith({ error: { code: 400 } });
    await expect(searchAddress('x')).rejects.toThrow();
  });
});
