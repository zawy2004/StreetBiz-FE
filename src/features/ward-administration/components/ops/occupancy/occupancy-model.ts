/**
 * Pure helpers for the ward's slot occupancy board (W12): one row per slot as
 * the screen already reads it, grouped by street and counted by state. No
 * request, no storage: everything is derived from the rows on screen.
 */

export type OccupancyRow = {
  key: string | number;
  code: string;
  place: string;
  status: string;
  /** Live grid only. */
  widthMeters?: number | null;
  lengthMeters?: number | null;
  hasPower?: boolean;
  hasWater?: boolean;
  hasTrashBin?: boolean;
  vendorProposed?: boolean;
  /** Mock store only: the slot's area. */
  areaM2?: number | null;
};

/** The four states an officer reads on the board, plus anything the API adds later. */
export type OccupancyBucket = 'free' | 'pending' | 'rented' | 'suspended' | 'other';

// Live slots are ACTIVE when rented; mock slots say RENTED (and PENDING while applied for).
export function bucketOf(status: string): OccupancyBucket {
  if (status === 'AVAILABLE') return 'free';
  if (status === 'PENDING_APPLICATION' || status === 'PENDING') return 'pending';
  if (status === 'ACTIVE' || status === 'RENTED') return 'rented';
  if (status === 'SUSPENDED') return 'suspended';
  return 'other';
}

export const BUCKET_ORDER: OccupancyBucket[] = ['rented', 'free', 'pending', 'suspended', 'other'];

export const BUCKET_LABEL: Record<OccupancyBucket, string> = {
  free: 'Còn trống',
  pending: 'Đang có đơn',
  rented: 'Đang hoạt động',
  suspended: 'Tạm ngưng',
  other: 'Khác',
};

export type BucketCounts = Record<OccupancyBucket, number> & { total: number };

export function countByStatus(rows: Pick<OccupancyRow, 'status'>[]): BucketCounts {
  const counts: BucketCounts = { free: 0, pending: 0, rented: 0, suspended: 0, other: 0, total: 0 };
  for (const row of rows) {
    counts[bucketOf(row.status)] += 1;
    counts.total += 1;
  }
  return counts;
}

export type PlaceGroup<T extends Pick<OccupancyRow, 'place' | 'status'>> = {
  place: string;
  rows: T[];
  counts: BucketCounts;
};

/** Streets in the order their first slot appears (server order is kept inside each). */
export function groupByPlace<T extends Pick<OccupancyRow, 'place' | 'status'>>(
  rows: T[],
): PlaceGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const place = row.place?.trim() || 'Chưa gán tuyến';
    const list = groups.get(place);
    if (list) list.push(row);
    else groups.set(place, [row]);
  }
  return [...groups].map(([place, list]) => ({ place, rows: list, counts: countByStatus(list) }));
}

/** "2 × 3 m", "3,75 m²", or null when the slot has no size on record. */
export function slotSize(row: OccupancyRow): string | null {
  const fmt = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  if (row.widthMeters != null && row.lengthMeters != null)
    return `${fmt(row.widthMeters)} × ${fmt(row.lengthMeters)} m`;
  if (row.areaM2 != null) return `${fmt(row.areaM2)} m²`;
  return null;
}

/** What a screen reader says for one plate: "Ô NVL-03, đang có đơn, 2 × 3 mét". */
export function plateLabel(row: OccupancyRow, statusText: string): string {
  const size = slotSize(row)?.replace(/ m²$/, ' mét vuông').replace(/ m$/, ' mét');
  return [`Ô ${row.code}`, statusText.toLowerCase(), size].filter(Boolean).join(', ');
}
