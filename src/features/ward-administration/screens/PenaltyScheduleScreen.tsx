import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Money } from '@/components/common';
import { ConfirmDialog, showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { useAuthStore } from '@/store/auth-store';
import { DateInput, MoneyInput } from '../components/ConfigFields';
import { WardGate } from '../components/WardGate';
import {
  errorMessage,
  formatDateVn,
  isConflict,
  todayVn,
  wardConfigApi,
  type PenaltyRate,
  type SetPenaltyRateRequest,
  type WardPenaltyType,
} from '../ward-config-api';

/** WARD-03: the ward's penalty schedule, one bracket per violation type, effective-dated. */
export function PenaltyScheduleScreen() {
  return (
    <WardGate title="Biểu mức phạt">
      <PenaltyScheduleContent />
    </WardGate>
  );
}

function PenaltyScheduleContent() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryKey = ['ward', userId, 'penalty-overview'];
  const overview = useQuery({ queryKey, queryFn: wardConfigApi.penaltyOverview });

  if (overview.isPending)
    return (
      <Screen>
        <p role="status">Đang tải biểu mức phạt…</p>
      </Screen>
    );
  if (overview.error)
    return (
      <Screen>
        <AppHeader title="Biểu mức phạt" back />
        <p role="alert" className="text-error">
          {errorMessage(overview.error)}
        </p>
        <Button label="Thử lại" onPress={() => void overview.refetch()} />
      </Screen>
    );

  const active = overview.data.filter((t) => t.isActive);
  const retired = overview.data.filter((t) => !t.isActive);
  const missing = active.filter((t) => !t.hasLegalBasis).length;

  return (
    <Screen>
      <AppHeader title="Biểu mức phạt" back subtitle="Áp dụng cho toàn phường" />
      <Card>
        <p className="text-body-sm text-text">
          Mức phạt áp dụng là <strong>mức trung bình của khung</strong> (Luật Xử lý vi phạm hành
          chính, Điều 23 khoản 4), hệ thống tự tính từ khung bạn nhập, không nhập tay số tiền. Việc
          giảm hoặc tăng mức phạt theo tình tiết giảm nhẹ, tăng nặng chưa được hỗ trợ.
        </p>
        {missing > 0 && (
          <p className="mt-sm text-body-sm text-error">
            {missing} hành vi chưa có căn cứ pháp lý: chưa thể ra quyết định xử phạt tiền cho các
            hành vi này.
          </p>
        )}
      </Card>

      <Section title={`Hành vi đang áp dụng (${active.length})`}>
        {active.map((type) => (
          <PenaltyTypeCard key={type.violationType} type={type} overviewKey={queryKey} />
        ))}
      </Section>

      {retired.length > 0 && (
        <Section
          title="Đã ngừng sử dụng"
          description="Giữ lại để tra cứu các biên bản cũ; không đặt mức phạt mới."
        >
          {retired.map((type) => (
            <Card key={type.violationType}>
              <p className="text-body-md text-muted">{type.description}</p>
              <p className="text-body-sm text-muted">{type.violationType}</p>
            </Card>
          ))}
        </Section>
      )}
    </Screen>
  );
}

function PenaltyTypeCard({ type, overviewKey }: { type: WardPenaltyType; overviewKey: unknown[] }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'history'>('view');
  const [cancelling, setCancelling] = useState(false);
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: overviewKey });

  const cancel = useMutation({
    mutationFn: (scheduleId: number) => wardConfigApi.cancelPenaltyRate(scheduleId),
    onSuccess: () => {
      showToast('Đã hủy mức phạt hẹn áp dụng');
      void refresh();
    },
    onError: (error) => {
      showToast(errorMessage(error));
      void refresh();
    },
  });

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="text-headline-sm text-text">{type.description}</p>
          <p className="text-body-sm text-muted">{type.violationType}</p>
        </div>
        {type.hasLegalBasis ? (
          <StatusChip label="Có căn cứ" tone="ok" />
        ) : (
          <StatusChip label="Thiếu căn cứ" tone="danger" />
        )}
      </div>

      {type.current ? (
        <RateSummary title="Đang áp dụng" rate={type.current} />
      ) : (
        <p className="mt-sm text-body-sm text-muted">Chưa có mức phạt đang áp dụng.</p>
      )}

      {type.scheduled && (
        <div className="mt-sm rounded-sm border border-border p-sm">
          <StatusChip
            label={`Sắp áp dụng từ ${formatDateVn(type.scheduled.effectiveFrom)}`}
            tone="pending"
          />
          <RateSummary title="" rate={type.scheduled} />
          <Button
            label="Hủy mức hẹn"
            variant="outline"
            size="sm"
            fullWidth={false}
            loading={cancel.isPending}
            onPress={() => setCancelling(true)}
          />
        </div>
      )}

      <div className="mt-sm flex flex-wrap gap-sm">
        <Button
          label={mode === 'edit' ? 'Đóng' : 'Đặt mức mới'}
          size="sm"
          fullWidth={false}
          variant={mode === 'edit' ? 'ghost' : 'civic'}
          disabled={!!type.scheduled}
          onPress={() => setMode(mode === 'edit' ? 'view' : 'edit')}
        />
        <Button
          label={mode === 'history' ? 'Ẩn lịch sử' : 'Lịch sử'}
          size="sm"
          fullWidth={false}
          variant="ghost"
          onPress={() => setMode(mode === 'history' ? 'view' : 'history')}
        />
      </div>
      {type.scheduled && mode !== 'edit' && (
        <p className="mt-xs text-body-sm text-muted">Hủy mức đang hẹn trước khi đặt mức khác.</p>
      )}

      {mode === 'edit' && (
        <RateForm
          type={type}
          onDone={() => {
            setMode('view');
            void refresh();
          }}
          onConflict={() => void refresh()}
        />
      )}
      {mode === 'history' && <RateHistory violationType={type.violationType} />}

      <ConfirmDialog
        visible={cancelling}
        title="Hủy mức phạt hẹn áp dụng?"
        description="Mức phạt đang áp dụng sẽ tiếp tục có hiệu lực không thời hạn."
        confirmLabel="Hủy mức hẹn"
        confirmVariant="danger"
        onConfirm={() => {
          setCancelling(false);
          if (type.scheduled) cancel.mutate(type.scheduled.scheduleId);
        }}
        onCancel={() => setCancelling(false)}
      />
    </Card>
  );
}

function RateSummary({ title, rate }: { title: string; rate: PenaltyRate }) {
  return (
    <div className="mt-sm">
      {title && <p className="text-label text-muted">{title}</p>}
      <Money amountVnd={rate.amount} />
      {rate.bracketMin != null && rate.bracketMax != null && (
        <p className="text-body-sm text-muted">
          Khung {rate.bracketMin.toLocaleString('vi-VN')}đ –{' '}
          {rate.bracketMax.toLocaleString('vi-VN')}đ
        </p>
      )}
      <p className="text-body-sm text-text">{rate.legalBasis ?? 'Chưa có căn cứ pháp lý'}</p>
      <p className="text-body-sm text-muted">
        Hiệu lực từ {formatDateVn(rate.effectiveFrom)}
        {rate.effectiveTo ? ` đến hết ngày trước ${formatDateVn(rate.effectiveTo)}` : ''}
      </p>
    </div>
  );
}

function RateForm({
  type,
  onDone,
  onConflict,
}: {
  type: WardPenaltyType;
  onDone: () => void;
  onConflict: () => void;
}) {
  const today = todayVn();
  const [documentRef, setDocumentRef] = useState('');
  const [article, setArticle] = useState('');
  const [clause, setClause] = useState('');
  const [point, setPoint] = useState('');
  const [behavior, setBehavior] = useState('');
  const [min, setMin] = useState<number | null>(type.current?.bracketMin ?? null);
  const [max, setMax] = useState<number | null>(type.current?.bracketMax ?? null);
  const [effectiveFrom, setEffectiveFrom] = useState(today);

  const bracketError =
    min != null && max != null && max < min
      ? 'Mức tối đa không được nhỏ hơn mức tối thiểu.'
      : undefined;
  const midpoint = min != null && max != null && !bracketError ? Math.floor((min + max) / 2) : null;
  const openRowId = type.current && !type.current.effectiveTo ? type.current.scheduleId : null;
  const ready =
    documentRef.trim() &&
    article.trim() &&
    clause.trim() &&
    behavior.trim() &&
    midpoint != null &&
    effectiveFrom >= today;

  const save = useMutation({
    mutationFn: (request: SetPenaltyRateRequest) => wardConfigApi.setPenaltyRate(request),
    onSuccess: () => {
      showToast('Đã lưu mức phạt');
      onDone();
    },
    onError: (error) => {
      showToast(errorMessage(error));
      if (isConflict(error)) onConflict();
    },
  });

  return (
    <div className="mt-sm flex flex-col gap-sm border-t border-border pt-sm">
      <p className="text-label text-text">Căn cứ pháp lý</p>
      <TextField
        label="Văn bản (số hiệu)"
        value={documentRef}
        onChangeText={setDocumentRef}
        placeholder="Nghị định 168/2024/NĐ-CP"
        maxLength={150}
      />
      <div className="grid grid-cols-3 gap-sm">
        <TextField label="Điều" value={article} onChangeText={setArticle} maxLength={10} />
        <TextField label="Khoản" value={clause} onChangeText={setClause} maxLength={10} />
        <TextField label="Điểm" value={point} onChangeText={setPoint} maxLength={10} />
      </div>
      <TextField
        label="Hành vi theo văn bản"
        value={behavior}
        onChangeText={setBehavior}
        multiline
        maxLength={300}
        helperText="Chép đúng mô tả hành vi trong điều khoản."
      />
      <div className="grid grid-cols-2 gap-sm">
        <MoneyInput label="Khung tối thiểu (cá nhân)" value={min} onChange={setMin} />
        <MoneyInput
          label="Khung tối đa (cá nhân)"
          value={max}
          onChange={setMax}
          error={bracketError}
        />
      </div>
      <DateInput
        label="Áp dụng từ ngày"
        value={effectiveFrom}
        min={today}
        onChange={setEffectiveFrom}
        helperText="Chọn ngày sau hôm nay để hẹn áp dụng; mức hiện tại giữ nguyên đến ngày đó."
      />
      <p className="text-body-md text-text" aria-live="polite">
        Mức áp dụng (trung bình khung):{' '}
        {midpoint != null ? <strong>{midpoint.toLocaleString('vi-VN')}đ</strong> : '—'}
      </p>
      <Button
        label="Lưu mức phạt"
        variant="approve"
        disabled={!ready}
        loading={save.isPending}
        onPress={() =>
          save.mutate({
            violationType: type.violationType,
            documentRef: documentRef.trim(),
            article: article.trim(),
            clause: clause.trim(),
            point: point.trim() || null,
            behavior: behavior.trim(),
            bracketMin: min!,
            bracketMax: max!,
            effectiveFrom,
            expectedCurrentScheduleId: openRowId,
          })
        }
      />
    </div>
  );
}

function RateHistory({ violationType }: { violationType: string }) {
  const userId = useAuthStore((state) => state.user?.id);
  const history = useQuery({
    queryKey: ['ward', userId, 'penalty-history', violationType],
    queryFn: () => wardConfigApi.penaltyHistory(violationType),
  });
  if (history.isPending)
    return (
      <p role="status" className="mt-sm">
        Đang tải lịch sử…
      </p>
    );
  if (history.error)
    return (
      <p role="alert" className="mt-sm text-error">
        {errorMessage(history.error)}
      </p>
    );
  if (history.data.length === 0)
    return <p className="mt-sm text-body-sm text-muted">Chưa có lịch sử.</p>;
  return (
    <ol className="mt-sm flex flex-col gap-xs border-t border-border pt-sm">
      {history.data.map((rate) => (
        <li key={rate.scheduleId} className="text-body-sm">
          <strong>{rate.amount.toLocaleString('vi-VN')}đ</strong> ·{' '}
          {formatDateVn(rate.effectiveFrom)}
          {rate.effectiveTo ? ` → ${formatDateVn(rate.effectiveTo)}` : ' → nay'}
          {rate.isInUse ? ' · đã dùng cho quyết định xử phạt' : ''}
          <br />
          <span className="text-muted">{rate.legalBasis ?? 'Chưa có căn cứ pháp lý'}</span>
        </li>
      ))}
    </ol>
  );
}
