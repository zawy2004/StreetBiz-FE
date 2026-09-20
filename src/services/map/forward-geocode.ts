export type AddressMatch = { label: string; latitude: number; longitude: number };

// Da Nang city as xmin,ymin,xmax,ymax (lon/lat). Without it a street name such as "Phan Thanh"
// also matches places in other provinces; the pilot only covers Da Nang.
const DA_NANG_EXTENT = '107.85,15.9,108.35,16.2';
const DA_NANG_CENTER = '108.206,16.047';
const MIN_SCORE = 60;
const MAX_RESULTS = 5;

type Candidate = { address: string; score: number; location: { x: number; y: number } };

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** "…, Đà Nẵng, 50312" -> "…, Đà Nẵng": the postcode only makes one street look like several. */
const withoutPostcode = (address: string) => address.replace(/,\s*\d{5}(?=,|$)/, '');

/**
 * Finds addresses in Da Nang by text. Uses Esri's World Geocoding Service, the same key-free
 * provider as reverse-geocode.ts (nominatim.openstreetmap.org is unreachable on this network).
 * Unlike the reverse lookup this one throws on a failed request, so the caller can tell
 * "nothing found" from "could not search".
 */
export async function searchAddress(query: string, signal?: AbortSignal): Promise<AddressMatch[]> {
  const text = query.trim();
  if (!text) return [];

  const params = new URLSearchParams({
    SingleLine: text,
    f: 'json',
    maxLocations: String(MAX_RESULTS + 3),
    countryCode: 'VNM',
    searchExtent: DA_NANG_EXTENT,
    location: DA_NANG_CENTER,
  });
  const response = await fetch(
    `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${params}`,
    { signal },
  );
  if (!response.ok) throw new Error(`Address search failed (${response.status})`);
  const data = (await response.json()) as { candidates?: Candidate[]; error?: unknown };
  if (data.error) throw new Error('Address search failed');

  const seen = new Set<string>();
  const matches: AddressMatch[] = [];
  for (const candidate of data.candidates ?? []) {
    const label = withoutPostcode(candidate.address);
    if (candidate.score < MIN_SCORE || seen.has(label)) continue;
    seen.add(label);
    matches.push({ label, latitude: round(candidate.location.y), longitude: round(candidate.location.x) });
    if (matches.length === MAX_RESULTS) break;
  }
  return matches;
}
