import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { WardGate } from '../components/WardGate';
import {
  caseLabels,
  statusLabel,
  wardApi,
  wardReviewRoot,
  type CaseKind,
} from '../ward-api';

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
  return (
    <Screen>
      <AppHeader
        title="Duyệt hồ sơ vị trí"
        subtitle="Dữ liệu Backend theo phường được phân công"
        back
      />
      <div className="flex flex-wrap gap-sm">
        {(Object.keys(caseLabels) as CaseKind[]).map((value) => (
          <Button
            key={value}
            fullWidth={false}
            label={caseLabels[value]}
            variant={kind === value ? 'civic' : 'outline'}
            onPress={() => setParams({ kind: value, page: '1' })}
          />
        ))}
      </div>
      <Button
        label="Tải lại danh sách"
        variant="outline"
        loading={records.isFetching}
        onPress={() => {
          void records.refetch();
        }}
      />
      {records.isPending && <p role="status">Đang tải hồ sơ…</p>}
      {records.error && (
        <p role="alert" className="text-error">
          {records.error.message}
        </p>
      )}
      {records.data?.items.length === 0 && (
        <Card>Chưa có hồ sơ cho nhóm này trong phường của bạn.</Card>
      )}
      {records.data?.items.map((record) => (
        <Link key={record.id} to={`${wardReviewRoot}/${kind}/${record.id}`}>
          <Card>
            <div className="flex justify-between gap-sm">
              <h2 className="text-headline-sm">{record.slotCode || record.title}</h2>
              <span className="text-body-sm">{statusLabel(kind, record.status)}</span>
            </div>
            <p>
              {record.applicant}
              {record.fastTrack && ' · Ưu tiên'}
            </p>
            <p className="text-body-sm text-muted">{record.summary}</p>
            {record.queuePosition != null && <p>Hàng chờ #{record.queuePosition}</p>}
          </Card>
        </Link>
      ))}
      <div className="flex items-center gap-sm">
        <Button
          label="Trang trước"
          variant="outline"
          disabled={page <= 1 || records.isFetching}
          onPress={() => setParams({ kind, page: String(page - 1) })}
        />
        <span>{page}</span>
        <Button
          label="Trang sau"
          variant="outline"
          disabled={!records.data?.hasMore || records.isFetching}
          onPress={() => setParams({ kind, page: String(page + 1) })}
        />
      </div>
    </Screen>
  );
}
