/**
 * Turns a lat/lng into a human-readable address label. Uses Esri's World
 * Geocoding Service -- free without an API key, and already the map provider
 * used elsewhere in the SIDE screens (see SlotMapScreen), so no new external
 * dependency to reach for. nominatim.openstreetmap.org, the usual free
 * alternative, is unreachable on this network the same way its tile server is.
 *
 * Best-effort: any failure resolves to null rather than throwing, since a
 * screen showing raw coordinates is a fine fallback, not a broken screen.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${longitude},${latitude}&f=json`;
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const data = (await response.json()) as { address?: { LongLabel?: string } };
    return data.address?.LongLabel ?? null;
  } catch {
    return null;
  }
}
