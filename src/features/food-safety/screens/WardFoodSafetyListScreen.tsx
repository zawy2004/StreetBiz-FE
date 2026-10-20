import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Icon } from '@/components/common';
import { ErrorState } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { foodSafetyApi } from '@/core/api/food-safety-api';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import {
  AttpFileRow,
  AttpProcessPanel,
  AttpQueueEmpty,
  AttpQueueSkeleton,
  AttpRouteFilter,
  type QueueFilter,
} from '../components/ward/AttpQueueParts';
import { countByStation, matchesQuickFilter } from '../view';

type Filter = QueueFilter;

/** The ward's ATTP queue: files to review first, then those waiting on the department. */
export function WardFoodSafetyListScreen() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const list = useQuery({
    queryKey: ['food-safety', 'ward', filter],
    queryFn: () => foodSafetyApi.wardList(filter === 'ALL' ? undefined : filter),
  });
  // Station counts read the "all" list already in the cache; this observer never fetches.
  const all = useQuery({
    queryKey: ['food-safety', 'ward', 'ALL'],
    queryFn: () => foodSafetyApi.wardList(undefined),
    enabled: false,
  });
  const wide = useMediaQuery('(min-width: 768px)');
  const roomy = useMediaQuery('(min-width: 1280px)');
  const now = useMemo(() => Date.now(), []);

  const counts = all.data ? countByStation(all.data) : undefined;
  const shown = useMemo(
    () => (list.data ?? []).filter((application) => matchesQuickFilter(application, search)),
    [list.data, search],
  );

  const queue = (
    <div className="flex min-w-0 flex-col gap-sm">
      {list.isPending ? <AttpQueueSkeleton rows={filter === 'ALL' ? 3 : 2} /> : null}
      {list.isError ? (
        <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : null}
      {list.isSuccess && list.data.length === 0 ? (
        <AttpQueueEmpty filtered={filter !== 'ALL'} onShowAll={() => setFilter('ALL')} />
      ) : null}
      {list.isSuccess && list.data.length > 0 && shown.length === 0 ? (
        <div className="flex flex-col items-center gap-xs rounded-[24px] bg-card px-lg py-xl text-center ring-1 ring-border">
          <Icon name="magnify" size={28} color="currentColor" className="text-muted" />
          <p className="text-body-lg font-semibold text-text">
            Không có hồ sơ khớp &quot;{search.trim()}&quot;
          </p>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="inline-flex h-12 items-center rounded-[12px] px-md text-[15px] font-semibold text-primary hover:bg-tint-primary"
          >
            Xoá tìm kiếm
          </button>
        </div>
      ) : null}
      {shown.length > 0 ? (
        <ul className="flex flex-col gap-sm">
          {shown.map((application) => (
            <AttpFileRow
              key={application.applicationId}
              application={application}
              now={now}
              onOpen={() => navigate(`/ward/inbox/food-safety/${application.applicationId}`)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );

  const few = (list.data?.length ?? 0) <= 2;

  return (
    <Screen width="wide">
      <AppHeader
        title="Hồ sơ ATTP"
        back
        subtitle="Xét hồ sơ, chuyển Chi cục ATTP và cập nhật kết quả"
      />
      <div className="flex flex-col gap-xs sm:flex-row sm:items-center sm:justify-between sm:gap-md">
        <div className="relative w-full sm:max-w-[360px]">
          <Icon
            name="magnify"
            size={20}
            color="currentColor"
            className="pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Tìm theo quán, người bán, món"
            placeholder="Tìm theo quán, người bán, món"
            className="input-shell h-12 w-full rounded-[12px] border border-border bg-card pl-[44px] pr-[48px] text-body-lg text-text placeholder:text-muted/80 [&::-webkit-search-cancel-button]:hidden"
          />
          {search ? (
            <button
              type="button"
              aria-label="Xoá tìm kiếm"
              onClick={() => setSearch('')}
              className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-sunken hover:text-text"
            >
              <Icon name="close" size={16} color="currentColor" />
            </button>
          ) : null}
        </div>
        <p aria-live="polite" className="text-body-sm text-muted">
          {list.isSuccess ? `Đang hiện ${shown.length} hồ sơ` : ''}
        </p>
      </div>
      <AttpRouteFilter value={filter} onChange={setFilter} counts={counts} wide={wide} />
      {roomy ? (
        <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-lg">
          {queue}
          <aside
            aria-labelledby="attp-process"
            className="sticky top-lg rounded-[24px] bg-card p-lg shadow-card ring-1 ring-border"
          >
            <h2 id="attp-process" className="mb-md font-heading text-[19px] font-bold text-text">
              Quy trình xét ATTP
            </h2>
            <AttpProcessPanel />
          </aside>
        </div>
      ) : (
        <>
          {queue}
          <details
            open={few}
            className="group rounded-[20px] bg-card p-md shadow-card ring-1 ring-border"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-sm font-heading text-[17px] font-bold text-text [&::-webkit-details-marker]:hidden">
              Quy trình xét ATTP
              <Icon
                name="chevron-down"
                size={18}
                color="currentColor"
                className="transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="pt-sm">
              <AttpProcessPanel />
            </div>
          </details>
        </>
      )}
    </Screen>
  );
}
