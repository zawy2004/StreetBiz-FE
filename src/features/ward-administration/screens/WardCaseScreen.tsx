import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@/components/common';
import { ConfirmDialog } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { LocationReview } from '../components/LocationReview';
import { WardGate } from '../components/WardGate';
import {
  actionLabels,
  caseLabels,
  statusLabel,
  wardApi,
  wardReviewRoot,
  type CaseKind,
  type WardCase,
} from '../ward-api';
import { CaseDocuments } from '../components/CaseDocuments';

export function WardCaseScreen({ kind: givenKind }: { kind?: CaseKind }) {
  const { kind: routeKind, id = '' } = useParams();
  const kind = givenKind ?? routeKind;
  if (!kind || !(kind in caseLabels) || !/^\d+$/.test(id))
    return (
      <Screen>
        <p role="alert">Mã hồ sơ không hợp lệ. Mở hồ sơ từ danh sách dữ liệu thật.</p>
        <Link to={wardReviewRoot}>Về danh sách</Link>
      </Screen>
    );
  return (
    <WardGate>
      <CaseContent key={`${kind}-${id}`} kind={kind as CaseKind} id={id} />
    </WardGate>
  );
}

function CaseContent({ kind, id }: { kind: CaseKind; id: string }) {
  // Scope the cache to the signed-in officer so one account never sees another's
  // ward cases after a sign-out/sign-in on the same tab.
  const userId = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const [reason, setReason] = useState('');
  const [pendingDecision, setPendingDecision] = useState('');
  const queryKey = ['ward', userId, kind, id];
  const record = useQuery({ queryKey, queryFn: () => wardApi.get(kind, id) });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['ward', userId] });
  };
  const decide = useMutation({
    mutationFn: ({ data, action }: { data: WardCase; action: string }) =>
      wardApi.decide(data, action, reason.trim()),
    onSuccess: (data) => {
      client.setQueryData(queryKey, data);
      setReason('');
      refresh();
    },
    onError: refresh,
  });
  if (record.isPending)
    return (
      <Screen>
        <p role="status">Đang tải hồ sơ…</p>
      </Screen>
    );
  if (record.error || !record.data)
    return (
      <Screen>
        <AppHeader title={caseLabels[kind]} back />
        <p role="alert" className="text-error">
          {record.error?.message ?? 'Không tìm thấy hồ sơ.'}
        </p>
        <Button
          label="Thử lại"
          onPress={() => {
            void record.refetch();
          }}
        />
        <Link to={wardReviewRoot}>Về danh sách</Link>
      </Screen>
    );
  const data = record.data;
  const evidence =
    data.evidenceUrl && /^https?:\/\//i.test(data.evidenceUrl) ? data.evidenceUrl : null;
  return (
    <Screen>
      <AppHeader title={caseLabels[kind]} back subtitle={data.slotCode} />
      <Link className="text-indigo underline" to={`${wardReviewRoot}?kind=${kind}`}>
        Danh sách hồ sơ
      </Link>
      <Card>
        <p className="text-headline-sm">{data.applicant}</p>
        <p className="mt-xs">{data.summary}</p>
        <p className="mt-sm">
          Trạng thái: {statusLabel(kind, data.status)}
          {data.fastTrack && ' · Ưu tiên xử lý nhanh'}
        </p>
        <p>
          Ngày gửi:{' '}
          {new Date(
            data.createdAt.endsWith('Z') ? data.createdAt : data.createdAt + 'Z',
          ).toLocaleString('vi-VN')}
        </p>
        {data.contractTerm && <p>Thời hạn giữ nguyên: {data.contractTerm}</p>}
        {data.outstanding != null && (
          <p>Phí và phạt chưa thanh toán: {data.outstanding.toLocaleString('vi-VN')} ₫</p>
        )}
        {data.queuePosition != null && <p>Vị trí hàng chờ: {data.queuePosition}</p>}
        {data.reason && <p className="mt-sm">Lý do đã ghi nhận: {data.reason}</p>}
        {evidence && (
          <a
            href={evidence}
            target="_blank"
            rel="noreferrer"
            className="mt-sm block text-indigo underline"
          >
            Mở ảnh minh chứng
          </a>
        )}
      </Card>
      {data.blockers.length > 0 && (
        <Card>
          <h2 className="text-headline-sm">Điều kiện cần xử lý</h2>
          <ul className="ml-md list-disc">
            {data.blockers.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Card>
      )}
      {data.documents && data.documents.length > 0 && (
        <CaseDocuments documents={data.documents} />
      )}
      {kind === 'proposals' && <LocationReview record={data} onSaved={refresh} />}
      {kind === 'conflicts' && (
        <Card>
          <p>Xếp hàng chỉ ghi nhận thứ tự chờ. Hợp đồng người đang thuê và ô cũ được giữ nguyên.</p>
        </Card>
      )}
      {data.actions.length > 0 && (
        <Card>
          <label className="block">
            Lý do quyết định (bắt buộc)
            <textarea
              className="mt-sm w-full rounded-sm border border-border p-sm"
              rows={3}
              maxLength={500}
              value={reason}
              disabled={decide.isPending}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <p className="text-body-sm text-muted">{reason.length}/500 ký tự</p>
          <div className="mt-md flex flex-wrap gap-sm">
            {data.actions.map((action) => (
              <Button
                key={action}
                label={actionLabels[action] ?? action}
                variant={action === 'REJECT' ? 'danger' : 'approve'}
                disabled={!reason.trim() || decide.isPending || record.isFetching}
                onPress={() => setPendingDecision(action)}
              />
            ))}
          </div>
        </Card>
      )}
      {decide.error && (
        <p role="alert" className="text-error">
          {decide.error.message}
        </p>
      )}
      {decide.isSuccess && <p role="status">Quyết định đã được lưu vào Backend.</p>}
      <ConfirmDialog
        visible={!!pendingDecision}
        title={actionLabels[pendingDecision] ?? ''}
        description={reason.trim()}
        onCancel={() => setPendingDecision('')}
        onConfirm={() => {
          const action = pendingDecision;
          setPendingDecision('');
          decide.mutate({ data, action });
        }}
      />
    </Screen>
  );
}
