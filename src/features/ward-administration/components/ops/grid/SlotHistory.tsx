import { useQuery } from '@tanstack/react-query';

import { Skeleton } from '@/components/feedback';
import { useAuthStore } from '@/store/auth-store';
import {
  businessCategoryLabels,
  distanceMeters,
  errorMessage,
  slotStatusLabels,
  wardConfigApi,
  type ConfigHistoryEntry,
  type WardSlot,
  type WardZone,
} from '../../../ward-config-api';

const slotHistoryLabels: Record<string, string> = {
  SLOT_CREATED: 'Tạo ô',
  SLOT_UPDATED: 'Cập nhật ô',
  SLOT_STATUS_CHANGED: 'Đổi trạng thái',
  SLOT_DELETED: 'Xóa ô',
};

type SlotAuditSnapshot = {
  slotCode?: string;
  zoneId?: number;
  latitude?: number;
  longitude?: number;
  widthMeters?: number | null;
  lengthMeters?: number | null;
  status?: WardSlot['status'];
  hasPower?: boolean;
  hasWater?: boolean;
  hasTrashBin?: boolean;
  businessCategory?: string | null;
};
type SlotAuditDetails = {
  before?: SlotAuditSnapshot | null;
  after?: SlotAuditSnapshot | null;
  reason?: string | null;
};

function parseSlotDetails(raw: string | null): SlotAuditDetails | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SlotAuditDetails;
  } catch {
    return null;
  }
}

const yesNo = (v: boolean | undefined) => (v ? 'có' : 'không');

/** Human-readable list of what an update changed, from the before/after snapshots the backend audits. */
function describeSlotChanges(details: SlotAuditDetails, zones: WardZone[]): string[] {
  const b = details.before;
  const a = details.after;
  if (!b || !a) return [];
  const zoneName = (id: number | undefined) =>
    zones.find((z) => z.zoneId === id)?.zoneName ?? `#${id}`;
  const changes: string[] = [];
  if (b.status !== undefined && a.status !== undefined && b.status !== a.status)
    changes.push(`${slotStatusLabels[b.status]} → ${slotStatusLabels[a.status]}`);
  if (b.slotCode !== undefined && b.slotCode !== a.slotCode)
    changes.push(`Mã ${b.slotCode} → ${a.slotCode}`);
  if (b.zoneId !== undefined && b.zoneId !== a.zoneId)
    changes.push(`Khu vực ${zoneName(b.zoneId)} → ${zoneName(a.zoneId)}`);
  if (
    b.latitude !== undefined &&
    a.latitude !== undefined &&
    b.longitude !== undefined &&
    a.longitude !== undefined &&
    (b.latitude !== a.latitude || b.longitude !== a.longitude)
  ) {
    const moved = distanceMeters(
      { latitude: b.latitude, longitude: b.longitude },
      { latitude: a.latitude, longitude: a.longitude },
    );
    changes.push(`Dời vị trí ~${moved < 1 ? moved.toFixed(1) : Math.round(moved)} m`);
  }
  if (b.widthMeters !== a.widthMeters || b.lengthMeters !== a.lengthMeters)
    changes.push(
      `Kích thước ${b.widthMeters ?? '?'}×${b.lengthMeters ?? '?'} → ${a.widthMeters ?? '?'}×${a.lengthMeters ?? '?'} m`,
    );
  if (b.hasPower !== a.hasPower) changes.push(`Điện: ${yesNo(b.hasPower)} → ${yesNo(a.hasPower)}`);
  if (b.hasWater !== a.hasWater) changes.push(`Nước: ${yesNo(b.hasWater)} → ${yesNo(a.hasWater)}`);
  if (b.hasTrashBin !== a.hasTrashBin)
    changes.push(`Thùng rác: ${yesNo(b.hasTrashBin)} → ${yesNo(a.hasTrashBin)}`);
  if (b.businessCategory !== a.businessCategory) {
    const label = (c: string | null | undefined) =>
      c ? (businessCategoryLabels[c] ?? c) : 'không';
    changes.push(`Ngành hàng: ${label(b.businessCategory)} → ${label(a.businessCategory)}`);
  }
  return changes;
}

const ACTION_DOT: Record<string, string> = {
  SLOT_CREATED: 'bg-tertiary',
  SLOT_UPDATED: 'bg-primary',
  SLOT_STATUS_CHANGED: 'bg-accent',
  SLOT_DELETED: 'bg-error',
};

/** The slot's audit trail as a timeline: what happened, who, when (Vietnam time), what changed and why. */
export function SlotHistory({ slotId, zones }: { slotId: number; zones: WardZone[] }) {
  const userId = useAuthStore((state) => state.user?.id);
  const history = useQuery({
    queryKey: ['ward', userId, 'slot-history', slotId],
    queryFn: () => wardConfigApi.slotHistory(slotId),
  });
  if (history.isPending)
    return (
      <div className="flex flex-col gap-xs">
        <p role="status" className="text-body-sm text-muted">
          Đang tải lịch sử…
        </p>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-4/5" />
      </div>
    );
  if (history.error)
    return (
      <p role="alert" className="text-body-md text-error">
        {errorMessage(history.error)}
      </p>
    );
  if (history.data.length === 0)
    return (
      <p className="rounded-[12px] bg-sunken px-sm py-xs text-body-sm text-muted">
        Chưa có thay đổi nào được ghi nhận riêng cho ô này. Ô tạo bằng "Rải hàng loạt" được ghi
        trong lịch sử của khu vực (mục Giá & khung giờ).
      </p>
    );
  return (
    <ol className="relative flex flex-col gap-md pl-md before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-0.5 before:rounded-full before:bg-border">
      {history.data.map((entry: ConfigHistoryEntry) => {
        const details = parseSlotDetails(entry.details);
        const changes = details ? describeSlotChanges(details, zones) : [];
        return (
          <li key={entry.auditId} className="relative text-body-sm text-text">
            <span
              aria-hidden="true"
              className={`absolute -left-md top-1 h-3 w-3 rounded-full ring-2 ring-card ${ACTION_DOT[entry.action] ?? 'bg-muted'}`}
            />
            <strong className="text-body-md">
              {slotHistoryLabels[entry.action] ?? entry.action}
            </strong>{' '}
            · {entry.actorName} ·{' '}
            <span className="font-tabular text-muted">
              {new Date(entry.createdAt).toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
              })}
            </span>
            {changes.length > 0 && (
              <ul className="mt-1 flex flex-col gap-0.5 text-text/80">
                {changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
            {details?.reason && <p className="mt-1 text-muted">Lý do: {details.reason}</p>}
          </li>
        );
      })}
    </ol>
  );
}
