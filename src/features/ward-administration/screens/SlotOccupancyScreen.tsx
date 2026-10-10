import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { EmptyState, ErrorState } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import {
  BucketChips,
  CodeSearch,
  OccupancyList,
  OccupancySkeleton,
  OccupancySummary,
  ZoneKerbStrip,
  type BucketFilter,
} from '../components/ops/occupancy/OccupancyParts';
import {
  bucketOf,
  countByStatus,
  groupByPlace,
  type OccupancyRow,
} from '../components/ops/occupancy/occupancy-model';
import { wardConfigApi } from '../ward-config-api';

type View = 'plan' | 'list';

/** From this many streets on, the fourth and later start folded. */
const FOLD_FROM_ZONES = 9;

/**
 * W12: the ward's sidewalk plan on the wall, digitised. One big number for how
 * much is let, then each street as a strip of painted slot plates. Read-only;
 * "Cấu hình" is the way into the editor (W13).
 */
export function SlotOccupancyScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);

  // Same key as SlotGridEditorScreen's unfiltered grid, so "Cấu hình" opens warm.
  const grid = useQuery({
    queryKey: ['ward', userId, 'slot-grid', null],
    queryFn: () => wardConfigApi.slotGrid(),
    enabled: isLiveApi,
  });
  const mockSlots = useMockDb((s) => s.slots);

  const rows: OccupancyRow[] = useMemo(
    () =>
      isLiveApi
        ? (grid.data?.slots ?? []).map((slot) => ({
            key: slot.slotId,
            code: slot.slotCode,
            place: slot.zoneName,
            status: slot.status,
            widthMeters: slot.widthMeters,
            lengthMeters: slot.lengthMeters,
            hasPower: slot.hasPower,
            hasWater: slot.hasWater,
            hasTrashBin: slot.hasTrashBin,
            vendorProposed: slot.source === 'VENDOR_PROPOSED',
          }))
        : mockSlots
            .filter((s) => s.proposal_review_status !== 'PENDING')
            .map((slot) => ({
              key: slot.id,
              code: slot.slot_code,
              place: slot.street,
              status: slot.slot_status,
              areaM2: slot.size_m2,
            })),
    [grid.data, mockSlots],
  );

  // Client-side view state only: nothing is requested or remembered.
  const [bucket, setBucket] = useState<BucketFilter>('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('plan');
  const [toggled, setToggled] = useState<Set<string>>(new Set());

  const counts = useMemo(() => countByStatus(rows), [rows]);
  const groups = useMemo(() => groupByPlace(rows), [rows]);
  const needle = query.trim().toLowerCase();
  const matches = (row: OccupancyRow) =>
    (bucket === 'all' || bucketOf(row.status) === bucket) &&
    (!needle || row.code.toLowerCase().includes(needle));
  const filtered = rows.filter(matches);
  const filtering = bucket !== 'all' || needle !== '';
  const clearFilters = () => {
    setBucket('all');
    setQuery('');
  };

  const configure = (
    <Button
      label="Cấu hình"
      variant="outline"
      fullWidth={false}
      icon={<Icon name="cog-outline" size={18} color="currentColor" />}
      onPress={() => navigate('/ward/slots/editor')}
    />
  );

  let body;
  if (isLiveApi && grid.isLoading) {
    body = <OccupancySkeleton />;
  } else if (isLiveApi && grid.isError) {
    body = (
      <div className="rounded-[24px] bg-card shadow-card ring-1 ring-border">
        <ErrorState message={errorMessage(grid.error)} onRetry={() => void grid.refetch()} />
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <div className="rounded-[24px] bg-card shadow-card ring-1 ring-border">
        <EmptyState
          icon="map-marker-radius-outline"
          title="Chưa có ô vỉa hè nào"
          description="Vẽ ô đầu tiên trên bản đồ ở mục Cấu hình."
        />
      </div>
    );
  } else {
    const features = isLiveApi ? (grid.data?.features.length ?? 0) : 0;
    const boundaryMissing = isLiveApi && grid.data ? !grid.data.boundaryConfigured : false;
    body = (
      <>
        <OccupancySummary counts={counts} />

        <div className="flex flex-col gap-sm lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <BucketChips counts={counts} value={bucket} onChange={setBucket} />
          <div className="flex items-center gap-sm">
            <CodeSearch value={query} onChange={setQuery} />
            <div className="shrink-0 [&_[role=tab]]:h-10">
              <SegmentedControl<View>
                value={view}
                onChange={setView}
                options={[
                  { value: 'plan', label: 'Sơ đồ' },
                  { value: 'list', label: 'Danh sách' },
                ]}
              />
            </div>
          </div>
        </div>

        <div aria-live="polite" className="flex flex-col gap-xl">
          {filtering && filtered.length === 0 ? (
            <div className="flex flex-col items-start gap-xs rounded-[20px] border-2 border-dashed border-border px-md py-lg">
              <p className="text-body-lg font-semibold text-text">Không có ô nào khớp bộ lọc.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="-ml-sm flex h-12 items-center rounded-[10px] px-sm text-body-md font-semibold text-primary hover:bg-tint-primary"
              >
                Xoá lọc
              </button>
            </div>
          ) : view === 'list' ? (
            <OccupancyList rows={filtered} />
          ) : (
            groups.map((group, i) => {
              const shown = group.rows.filter(matches);
              if (filtering && shown.length === 0) return null;
              const foldedByDefault = groups.length >= FOLD_FROM_ZONES && i >= 3;
              const collapsed = foldedByDefault !== toggled.has(group.place);
              return (
                <ZoneKerbStrip
                  key={group.place}
                  group={group}
                  rows={shown}
                  collapsed={collapsed}
                  rise={i === 0}
                  onToggle={() =>
                    setToggled((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.place)) next.delete(group.place);
                      else next.add(group.place);
                      return next;
                    })
                  }
                />
              );
            })
          )}
        </div>

        {rows.length <= 2 ? <FewSlotsGuide /> : null}

        {features > 0 || boundaryMissing ? (
          <p className="flex items-start gap-xs text-body-md text-muted">
            <Icon
              name="information-outline"
              size={18}
              color="currentColor"
              className="mt-0.5 shrink-0"
            />
            <span>
              {[
                features > 0 ? `${features} chướng ngại vật đã ghi` : null,
                boundaryMissing ? 'Chưa cấu hình ranh giới phường chính thức' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </p>
        ) : null}
      </>
    );
  }

  return (
    <Screen width="wide">
      <AppHeader
        title="Lưới ô vỉa hè"
        subtitle="Theo dõi trạng thái từng ô trên địa bàn phường."
        right={configure}
      />
      {body}
    </Screen>
  );
}

/** With only a slot or two, the board would look bare: say where more come from. */
function FewSlotsGuide() {
  const steps = [
    'Mở Cấu hình ở góc trên.',
    'Đứng tại vị trí ô, bấm Vị trí của tôi hoặc chạm lên bản đồ.',
    'Điền kích thước, kiểm tra vị trí rồi thêm ô.',
  ];
  return (
    <div className="flex flex-col gap-md rounded-[24px] bg-[#FFF3E8] p-md ring-1 ring-brand/20 md:flex-row md:items-center md:p-lg dark:bg-[#2A2420]">
      <div className="flex min-w-0 flex-col gap-1 md:w-[260px] md:shrink-0">
        <p className="font-sign text-[20px] font-bold leading-tight text-text [font-stretch:92%]">
          Vẽ thêm ô trên bản đồ ở mục Cấu hình
        </p>
        <p className="text-body-md text-muted">Ô mới hiện ngay trên lưới này.</p>
      </div>
      <ol className="flex flex-1 flex-col gap-sm md:flex-row md:gap-md">
        {steps.map((step, i) => (
          <li key={step} className="flex flex-1 items-start gap-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-sign text-[15px] font-bold text-on-primary">
              {i + 1}
            </span>
            <span className="pt-1 text-body-md leading-snug text-text">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
