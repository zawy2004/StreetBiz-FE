import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Icon, Pagination } from '@/components/common';
import { VERDICT_TONES } from '@/components/illustrations';
import { AppHeader, Screen } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { WardGate } from '../components/WardGate';
import {
  CaseKindPlates,
  CaseListEmpty,
  CaseListSkeleton,
  CaseSlipBody,
} from '../components/review/CaseParts';
import { CASE_KIND_NOTES, caseTone } from '../components/review/helpers';
import { formatWaitVi } from '../components/review/format';
import { caseLabels, statusLabel, wardApi, wardReviewRoot, type CaseKind } from '../ward-api';

export function WardCasesScreen() {
  return (
    <WardGate>
      <CasesContent />
    </WardGate>
  );
}
function CasesContent() {
  const [params, setParams] = useSearchParams();
  const rawKind = params.get('kind') ?? 'proposals';
  const kind: CaseKind = rawKind in caseLabels ? (rawKind as CaseKind) : 'proposals';
  const requestedPage = Number(params.get('page') ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage <= 10000
      ? requestedPage
      : 1;
  // Scope the cache to the signed-in officer so one account never sees another's
  // ward cases after a sign-out/sign-in on the same tab.
  const userId = useAuthStore((state) => state.user?.id);
  const records = useQuery({
    queryKey: ['ward', userId, kind, page],
    queryFn: () => wardApi.list(kind, page),
  });
  const items = records.data?.items ?? [];
  return (
    <Screen>
      <AppHeader
        title="Duyệt hồ sơ vị trí"
        subtitle="Dữ liệu Backend theo phường được phân công"
        back
      />
      <div className="flex flex-col gap-sm">
        <CaseKindPlates
          kinds={Object.keys(caseLabels) as CaseKind[]}
          labels={caseLabels}
          active={kind}
          onSelect={(value) => setParams({ kind: value, page: '1' })}
        />
        <div className="sm:ml-auto sm:w-[240px]">
          <Button
            label="Tải lại danh sách"
            variant="outline"
            fullWidth
            disabled={records.isFetching}
            icon={
              <Icon
                name="history"
                size={18}
                color="currentColor"
                className={records.isFetching ? 'animate-spin [animation-direction:reverse]' : ''}
              />
            }
            onPress={() => {
              void records.refetch();
            }}
          />
        </div>
      </div>

      {records.isPending && (
        <>
          <p role="status" className="text-body-sm text-muted">
            Đang tải hồ sơ…
          </p>
          <CaseListSkeleton />
        </>
      )}
      {records.error && (
        <p
          role="alert"
          className={`flex items-start gap-xs rounded-[16px] p-md text-[16px] font-medium leading-6 ${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink}`}
        >
          <Icon
            name="alert-circle-outline"
            size={20}
            color="currentColor"
            className="mt-0.5 shrink-0"
          />
          {records.error.message}
        </p>
      )}
      {records.data?.items.length === 0 && <CaseListEmpty kind={kind} />}
      {items.length > 0 ? (
        <ul
          className={`flex flex-col gap-sm transition-opacity duration-150 ${records.isFetching ? 'opacity-60' : ''}`}
        >
          {items.map((record) => {
            const statusText = statusLabel(kind, record.status);
            const code = record.slotCode || record.title;
            return (
              <li key={record.id}>
                <Link
                  to={`${wardReviewRoot}/${kind}/${record.id}`}
                  aria-label={`${code}, ${record.applicant}, ${statusText}`}
                  className="block rounded-[20px]"
                >
                  <CaseSlipBody
                    data={{
                      code,
                      isCode: Boolean(record.slotCode),
                      applicant: record.applicant,
                      fastTrack: record.fastTrack,
                      summary: record.summary,
                      statusText,
                      tone: caseTone(record.status),
                      wait: formatWaitVi(record.createdAt, 'Gửi'),
                      queuePosition: record.queuePosition,
                      awaiting: (record.actions?.length ?? 0) > 0,
                      blockerCount: record.blockers?.length ?? 0,
                      location:
                        kind === 'proposals' ? (record.location ? 'set' : 'missing') : undefined,
                    }}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
      {items.length > 0 && items.length <= 2 && !records.data?.hasMore && page === 1 ? (
        <p className="flex items-start gap-xs rounded-[16px] bg-[#FFF3E8] px-md py-sm text-body-md text-[#8A3200] dark:bg-[#2A2420] dark:text-[#FFB98A]">
          <Icon
            name="information-outline"
            size={18}
            color="currentColor"
            className="mt-0.5 shrink-0"
          />
          {CASE_KIND_NOTES[kind]}.
        </p>
      ) : null}
      {page > 1 || records.data?.hasMore ? (
        <Pagination
          page={page}
          hasNext={Boolean(records.data?.hasMore)}
          busy={records.isFetching}
          onChange={(next) => setParams({ kind, page: String(next) })}
        />
      ) : null}
    </Screen>
  );
}
