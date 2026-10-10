import { useEffect, useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, formatVnd, Icon } from '@/components/common';
import { ConfirmDialog, showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { useAuthStore } from '@/store/auth-store';
import { DateInput, MoneyInput } from '../components/ConfigFields';
import { WardGate } from '../components/WardGate';
import {
  BlankSheetArt,
  BracketRuler,
  CoverageRing,
  EffectiveTimeline,
  PenaltyFilterBar,
  PenaltySkeleton,
  PolicySkeleton,
  RulerAxis,
  type PenaltyFilter,
} from '../components/ops/schedule/PenaltyParts';
import { makeLogScale, type LogScale } from '../components/ops/schedule/schedule-format';
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

/**
 * One number box inside the policy sentence. Digits only; empty means null
 * (feature off). The baseline field label is kept as its accessible name.
 */
function NumberField({
  label,
  value,
  onChange,
  invalid,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  invalid?: boolean;
}) {
  return (
    <input
      aria-label={label}
      aria-invalid={invalid || undefined}
      inputMode="numeric"
      type="text"
      placeholder="—"
      value={value == null ? '' : String(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '');
        onChange(digits ? Number(digits) : null);
      }}
      className={[
        'input-shell mx-1 inline-block h-12 w-[88px] rounded-sm border bg-card px-sm text-center align-middle font-sign text-[20px] font-bold text-text font-tabular placeholder:text-muted/70',
        invalid ? 'border-error' : 'border-border hover:border-muted/50',
      ].join(' ')}
    />
  );
}

const updatedFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

function CompliancePolicySection() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryKey = ['ward', userId, 'compliance-policy'];
  const client = useQueryClient();
  const policy = useQuery({ queryKey, queryFn: wardConfigApi.getCompliancePolicy });
  const [threshold, setThreshold] = useState<number | null>(null);
  const [window, setWindowDays] = useState<number | null>(null);
  const [grace, setGrace] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!policy.data || loaded) return;
    setThreshold(policy.data.violationThresholdCount);
    setWindowDays(policy.data.violationWindowDays);
    setGrace(policy.data.unpaidPenaltyGraceDays);
    setLoaded(true);
  }, [policy.data, loaded]);

  const save = useMutation({
    mutationFn: () =>
      wardConfigApi.upsertCompliancePolicy({
        violationThresholdCount: threshold,
        violationWindowDays: window,
        unpaidPenaltyGraceDays: grace,
      }),
    onSuccess: () => {
      showToast('Đã lưu chính sách tuân thủ');
      void client.invalidateQueries({ queryKey });
    },
    onError: (error) => showToast(errorMessage(error)),
  });

  // Baseline: the section is not rendered while the policy loads; the skeleton only holds its place.
  if (policy.isPending) return <PolicySkeleton />;

  const missingWindow = threshold != null && window == null;
  const updatedAt = policy.data?.updatedAt;
  const updatedBy = policy.data?.updatedByName;

  return (
    <Section
      title="Chính sách thu hồi giấy phép do vi phạm nhiều lần"
      description="Chỉ mang tính gợi ý cho cán bộ -- không tự động thu hồi (BR-41). Để trống = tắt tính năng."
    >
      <div className="flex flex-col gap-md rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
        <p className="max-w-[62ch] text-[18px] leading-[2.6] text-text md:text-[19px]">
          Gợi ý thu hồi khi có
          <NumberField
            label="Ngưỡng số lần vi phạm đã có quyết định xử phạt"
            value={threshold}
            onChange={setThreshold}
          />
          lần vi phạm đã có quyết định trong vòng
          <NumberField
            label="Trong vòng (số ngày)"
            value={window}
            onChange={setWindowDays}
            invalid={missingWindow}
          />
          ngày; nhắc nộp phạt sau
          <NumberField
            label="Số ngày ân hạn trước khi nhắc nộp phạt quá hạn"
            value={grace}
            onChange={setGrace}
          />
          ngày ân hạn.
        </p>
        {missingWindow && (
          <p className="flex items-start gap-xs text-body-md font-medium text-error">
            <Icon
              name="alert-circle-outline"
              size={18}
              color="currentColor"
              className="mt-0.5 shrink-0"
            />
            Đã nhập ngưỡng số lần vi phạm thì phải nhập cả cửa sổ thời gian.
          </p>
        )}
        <div className="flex flex-col-reverse gap-sm border-t border-border pt-md sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-sm text-muted">
            {updatedAt && updatedBy
              ? `Cập nhật lần cuối ${updatedFormat.format(new Date(updatedAt))} bởi ${updatedBy}`
              : 'Ô để trống nghĩa là tắt phần gợi ý tương ứng.'}
          </p>
          <div className="sm:w-[220px]">
            <Button
              label="Lưu chính sách"
              variant="approve"
              loading={save.isPending}
              disabled={missingWindow}
              onPress={() => save.mutate()}
            />
          </div>
        </div>
      </div>
    </Section>
  );
}

/** WARD-03: the ward's penalty schedule, one bracket per violation type, effective-dated. */
export function PenaltyScheduleScreen() {
  return (
    <WardGate>
      <PenaltyScheduleContent />
    </WardGate>
  );
}

function matchesFilter(type: WardPenaltyType, filter: PenaltyFilter): boolean {
  if (filter === 'missing') return !type.hasLegalBasis;
  if (filter === 'scheduled') return !!type.scheduled;
  if (filter === 'none') return !type.current;
  return true;
}

/**
 * The ward's posted fine schedule: legal-basis coverage first, filter chips,
 * then one row per violation type with its bracket on a shared log ruler and the
 * applied amount (the bracket midpoint) on the right.
 */
function PenaltyScheduleContent() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryKey = ['ward', userId, 'penalty-overview'];
  const overview = useQuery({ queryKey, queryFn: wardConfigApi.penaltyOverview });
  const [filter, setFilter] = useState<PenaltyFilter>('all');

  // One log scale for the whole page, so every row reads against the same ruler.
  const scale = useMemo(
    () =>
      makeLogScale(
        (overview.data ?? []).flatMap((t) =>
          [t.current, t.scheduled].flatMap((r) =>
            r ? [r.amount, r.bracketMin ?? 0, r.bracketMax ?? 0] : [],
          ),
        ),
      ),
    [overview.data],
  );

  if (overview.isPending)
    return (
      <Screen width="wide">
        <p role="status" className="text-body-md text-muted">
          Đang tải biểu mức phạt…
        </p>
        <PenaltySkeleton />
      </Screen>
    );
  if (overview.error)
    return (
      <Screen width="wide">
        <AppHeader title="Biểu mức phạt" back />
        <div className="flex flex-col items-start gap-md rounded-[20px] bg-[#FDEBEA] p-md md:p-lg dark:bg-[#3A1414]">
          <p
            role="alert"
            className="flex items-start gap-xs text-body-lg font-semibold text-[#8F1717] dark:text-[#FF9A90]"
          >
            <Icon
              name="alert-circle-outline"
              size={22}
              color="currentColor"
              className="mt-0.5 shrink-0"
            />
            {errorMessage(overview.error)}
          </p>
          <Button label="Thử lại" fullWidth={false} onPress={() => void overview.refetch()} />
        </div>
      </Screen>
    );

  const active = overview.data.filter((t) => t.isActive);
  const retired = overview.data.filter((t) => !t.isActive);
  const missing = active.filter((t) => !t.hasLegalBasis).length;
  const covered = active.length - missing;
  const counts: Record<PenaltyFilter, number> = {
    all: active.length,
    missing,
    scheduled: active.filter((t) => !!t.scheduled).length,
    none: active.filter((t) => !t.current).length,
  };
  const shown = active.filter((t) => matchesFilter(t, filter));

  return (
    <Screen width="wide">
      <AppHeader title="Biểu mức phạt" back subtitle="WARD-03 · Áp dụng cho toàn phường" />

      <div className="overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border">
        <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
        <div className="flex flex-col gap-md p-md md:flex-row md:items-center md:gap-lg md:p-lg">
          <div
            role="group"
            aria-label={`${covered} trên ${active.length} hành vi có căn cứ pháp lý`}
            className="flex items-center gap-sm md:w-[220px] md:shrink-0"
          >
            <CoverageRing covered={covered} total={active.length} />
            <p className="text-body-md font-semibold leading-snug text-text">
              hành vi có
              <br />
              căn cứ pháp lý
            </p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-sm">
            {missing > 0 ? (
              <p className="rounded-[12px] bg-[#FDEBEA] px-sm py-sm text-body-lg font-semibold leading-snug text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]">
                ⚠️ {missing} hành vi chưa có căn cứ pháp lý: chưa thể ra quyết định xử phạt tiền cho
                các hành vi này.
              </p>
            ) : active.length > 0 ? (
              <p className="flex items-center gap-xs rounded-[12px] bg-[#E6F6EC] px-sm py-sm text-body-lg font-semibold text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]">
                <Icon name="shield-check-outline" size={20} color="currentColor" />
                Mọi hành vi đang áp dụng đều có căn cứ pháp lý.
              </p>
            ) : null}
            <p className="text-body-md text-text/85">
              Mức phạt áp dụng là <strong>mức trung bình của khung</strong> (Luật Xử lý vi phạm hành
              chính, Điều 23 khoản 4), hệ thống tự tính từ khung bạn nhập, không nhập tay số tiền.
              Việc giảm hoặc tăng mức phạt theo tình tiết giảm nhẹ, tăng nặng chưa được hỗ trợ.
            </p>
          </div>
          {covered === 0 && active.length > 0 && <BlankSheetArt />}
        </div>
      </div>

      <div className="z-10 -mx-1 px-1 lg:sticky lg:top-0 lg:-my-xs lg:bg-bg/85 lg:py-xs lg:backdrop-blur">
        <PenaltyFilterBar value={filter} counts={counts} onChange={setFilter} />
      </div>

      <Section title={`Hành vi đang áp dụng (${active.length})`}>
        <div
          aria-hidden="true"
          className="hidden px-md xl:grid xl:grid-cols-[minmax(0,1fr)_320px_200px] xl:gap-lg"
        >
          <span className="text-body-xs font-semibold text-muted">Hành vi và căn cứ</span>
          <RulerAxis scale={scale} />
          <span className="text-right text-body-xs font-semibold text-muted">Mức áp dụng</span>
        </div>
        {shown.length === 0 ? (
          <p className="rounded-[20px] border-2 border-dashed border-border px-md py-lg text-center text-body-md text-muted">
            Không có hành vi nào khớp bộ lọc.
          </p>
        ) : (
          <div className="flex flex-col gap-sm">
            {shown.map((type, i) => (
              <PenaltyTypeCard
                key={type.violationType}
                type={type}
                overviewKey={queryKey}
                scale={scale}
                order={i}
              />
            ))}
          </div>
        )}
        {active.length > 0 && active.length <= 2 && (
          <div className="flex items-start gap-sm rounded-[16px] bg-[#FFF3E8] p-md dark:bg-[#2A2420]">
            <Icon
              name="information-outline"
              size={20}
              color="currentColor"
              className="mt-0.5 shrink-0 text-primary"
            />
            <p className="text-body-md text-text">
              Mỗi hành vi có một khung phạt theo văn bản pháp luật. Chấm cam trên thước là mức áp
              dụng: điểm giữa của khung, do hệ thống tự tính khi bạn đặt mức mới.
            </p>
          </div>
        )}
      </Section>

      <CompliancePolicySection />

      {retired.length > 0 && (
        <details className="group rounded-[20px] bg-card shadow-card ring-1 ring-border">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-sm px-md py-sm [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              <span className="block font-heading text-[19px] font-bold text-text">
                Đã ngừng sử dụng{' '}
                <span className="font-sign text-muted font-tabular">({retired.length})</span>
              </span>
              <span className="block text-body-sm text-muted">
                Giữ lại để tra cứu các biên bản cũ; không đặt mức phạt mới.
              </span>
            </span>
            <Icon
              name="chevron-down"
              size={20}
              color="currentColor"
              className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <ul className="flex flex-col divide-y divide-border border-t border-border">
            {retired.map((type) => (
              <li key={type.violationType} className="px-md py-sm">
                <p className="text-body-md text-muted">{type.description}</p>
                <p className="font-sign text-body-sm text-muted">{type.violationType}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Screen>
  );
}

function bracketWords(rate: PenaltyRate): string {
  const amount = `áp dụng ${rate.amount.toLocaleString('vi-VN')} đồng`;
  return rate.bracketMin != null && rate.bracketMax != null
    ? `Khung ${rate.bracketMin.toLocaleString('vi-VN')} đến ${rate.bracketMax.toLocaleString('vi-VN')} đồng, ${amount}`
    : amount;
}

function rulerLabel(type: WardPenaltyType): string {
  if (!type.current && !type.scheduled) return 'Chưa có mức phạt';
  const parts = [];
  if (type.current) parts.push(bracketWords(type.current));
  if (type.scheduled) parts.push(`sắp áp dụng: ${bracketWords(type.scheduled)}`);
  return parts.join('; ');
}

const asBracket = (rate: PenaltyRate | null) =>
  rate ? { min: rate.bracketMin, max: rate.bracketMax, amount: rate.amount } : null;

function PenaltyTypeCard({
  type,
  overviewKey,
  scale,
  order,
}: {
  type: WardPenaltyType;
  overviewKey: unknown[];
  scale: LogScale;
  order: number;
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'history'>('view');
  const [cancelling, setCancelling] = useState(false);
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: overviewKey });
  const titleId = useId();

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

  const current = type.current;

  return (
    <article
      aria-labelledby={titleId}
      className={`rounded-[20px] bg-card shadow-card ring-1 transition-shadow duration-200 ${mode === 'view' ? 'ring-border' : 'ring-2 ring-primary/40'}`}
    >
      {/* Phones: stacked. 768-1279: name and amount side by side, ruler full width below.
          1280+: one table row, name | ruler | amount, matching the axis header. */}
      <div className="grid gap-sm p-md md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-lg xl:grid-cols-[minmax(0,1fr)_320px_200px] xl:items-center">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-start justify-between gap-xs xl:justify-start">
            <h3
              id={titleId}
              className="min-w-0 text-[16px] font-semibold leading-snug text-text xl:flex-1"
            >
              {type.description}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {type.hasLegalBasis ? (
              <StatusChip label="Có căn cứ" tone="ok" />
            ) : (
              <StatusChip label="⚠️ Thiếu căn cứ pháp lý" tone="danger" />
            )}
            {current?.isInUse && (
              <span className="inline-flex h-6 items-center gap-1 rounded-[6px] bg-[#EEF1F4] px-2 text-body-xs font-semibold text-[#2B3640] dark:bg-[#1D2833] dark:text-[#C5D0DA]">
                <Icon name="check-circle-outline" size={13} color="currentColor" />
                đã dùng cho quyết định xử phạt
              </span>
            )}
            <span className="font-sign text-body-xs font-semibold tracking-[0.02em] text-muted">
              {type.violationType}
            </span>
          </div>
          {current && <LegalBasis text={current.legalBasis} />}
        </div>

        <div className="order-last min-w-0 md:col-span-2 xl:order-none xl:col-span-1">
          <BracketRuler
            scale={scale}
            current={asBracket(current)}
            next={asBracket(type.scheduled)}
            label={rulerLabel(type)}
            order={order}
          />
          <RulerAxis scale={scale} className="mt-0.5 xl:hidden" />
        </div>

        <div className="flex min-w-0 flex-col gap-0.5 md:items-end md:text-right">
          {current ? (
            <>
              <p className="text-label text-muted">Đang áp dụng</p>
              <p className="font-sign text-[22px] font-extrabold leading-tight text-text font-tabular [font-stretch:90%]">
                {formatVnd(current.amount)}
              </p>
              {current.bracketMin != null && current.bracketMax != null && (
                <p className="text-body-sm text-muted font-tabular">
                  Khung {current.bracketMin.toLocaleString('vi-VN')}đ –{' '}
                  {current.bracketMax.toLocaleString('vi-VN')}đ
                </p>
              )}
              {!type.scheduled && (
                <p className="text-body-sm text-muted">
                  Hiệu lực từ {formatDateVn(current.effectiveFrom)}
                  {current.effectiveTo
                    ? ` đến hết ngày trước ${formatDateVn(current.effectiveTo)}`
                    : ''}
                </p>
              )}
            </>
          ) : (
            <p className="text-body-md text-muted">Chưa có mức phạt đang áp dụng.</p>
          )}
        </div>
      </div>

      {type.scheduled && (
        <div className="px-md pb-sm">
          <EffectiveTimeline
            now={
              current ? (
                <>
                  <p className="text-body-sm font-semibold text-text">Đang áp dụng</p>
                  <p className="text-body-sm text-muted">
                    Hiệu lực từ {formatDateVn(current.effectiveFrom)}
                    {current.effectiveTo
                      ? ` đến hết ngày trước ${formatDateVn(current.effectiveTo)}`
                      : ''}
                  </p>
                </>
              ) : (
                <p className="text-body-sm text-muted">Chưa có mức phạt đang áp dụng.</p>
              )
            }
            next={
              <div className="flex flex-col gap-1">
                <StatusChip
                  label={`Sắp áp dụng từ ${formatDateVn(type.scheduled.effectiveFrom)}`}
                  tone="pending"
                />
                <p className="font-sign text-[18px] font-extrabold leading-tight text-text font-tabular">
                  {formatVnd(type.scheduled.amount)}
                </p>
                {type.scheduled.bracketMin != null && type.scheduled.bracketMax != null && (
                  <p className="text-body-sm text-muted font-tabular">
                    Khung {type.scheduled.bracketMin.toLocaleString('vi-VN')}đ –{' '}
                    {type.scheduled.bracketMax.toLocaleString('vi-VN')}đ
                  </p>
                )}
                <LegalBasis text={type.scheduled.legalBasis} />
              </div>
            }
            action={
              <Button
                label="Hủy mức hẹn"
                variant="outline"
                fullWidth={false}
                loading={cancel.isPending}
                onPress={() => setCancelling(true)}
              />
            }
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-sm border-t border-border px-md py-sm">
        <Button
          label={mode === 'edit' ? 'Đóng' : 'Đặt mức mới'}
          fullWidth={false}
          variant={mode === 'edit' ? 'ghost' : 'civic'}
          disabled={!!type.scheduled}
          onPress={() => setMode(mode === 'edit' ? 'view' : 'edit')}
        />
        <Button
          label={mode === 'history' ? 'Ẩn lịch sử' : 'Lịch sử'}
          fullWidth={false}
          variant="ghost"
          icon={<Icon name="clock-outline" size={18} color="currentColor" />}
          onPress={() => setMode(mode === 'history' ? 'view' : 'history')}
        />
        {type.scheduled && mode !== 'edit' && (
          <p className="text-body-sm text-muted">Hủy mức đang hẹn trước khi đặt mức khác.</p>
        )}
      </div>

      {mode === 'edit' && (
        <RateForm
          type={type}
          scale={scale}
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
    </article>
  );
}

/** The cited legal basis; long citations fold to two lines with a toggle. */
function LegalBasis({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);
  if (!text) return <p className="text-body-sm text-muted">Chưa có căn cứ pháp lý</p>;
  const long = text.length > 90;
  return (
    <div className="flex min-w-0 flex-col items-start">
      <p
        className={`text-body-sm text-muted ${long && !open ? 'line-clamp-2' : ''}`}
        title={long && !open ? text : undefined}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="min-h-9 text-body-sm font-semibold text-primary hover:underline"
        >
          {open ? 'Thu gọn' : 'Xem đủ'}
        </button>
      )}
    </div>
  );
}

function RateForm({
  type,
  scale,
  onDone,
  onConflict,
}: {
  type: WardPenaltyType;
  scale: LogScale;
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

  const draftBracket =
    midpoint != null && min != null && max != null ? { min, max, amount: midpoint } : null;
  const currentBracket = asBracket(type.current);

  return (
    <div className="sb-pop cq flex flex-col gap-md border-t border-border bg-sunken/45 p-md md:p-lg">
      <p className="flex items-center gap-xs font-sign text-[15px] font-bold text-text">
        <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-card text-primary">
          <Icon name="file-document-outline" size={17} color="currentColor" />
        </span>
        Căn cứ pháp lý
      </p>
      <TextField
        label="Văn bản (số hiệu)"
        value={documentRef}
        onChangeText={setDocumentRef}
        placeholder="Nghị định 168/2024/NĐ-CP"
        maxLength={150}
      />
      <div className="form-grid grid grid-cols-3 gap-sm">
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
      <div className="form-grid grid grid-cols-1 gap-sm sm:grid-cols-2">
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

      <div className="flex flex-col gap-sm rounded-[16px] bg-card p-md ring-1 ring-border">
        <div className="flex flex-col gap-1">
          <BracketRuler
            scale={scale}
            current={draftBracket ?? currentBracket}
            next={draftBracket && currentBracket ? currentBracket : null}
            label={
              draftBracket
                ? `Khung mới ${draftBracket.min.toLocaleString('vi-VN')} đến ${draftBracket.max.toLocaleString('vi-VN')} đồng`
                : 'Chưa nhập đủ khung mới'
            }
            emptyText="Nhập khung để xem trước"
            quick
          />
          <RulerAxis scale={scale} />
          {draftBracket && currentBracket && (
            <p className="text-body-xs text-muted">
              Chấm đặc: khung mới · chấm rỗng nét đứt: khung đang áp dụng
            </p>
          )}
        </div>
        <p className="text-body-md text-text" aria-live="polite">
          Mức áp dụng (trung bình khung):{' '}
          {midpoint != null ? <strong>{midpoint.toLocaleString('vi-VN')}đ</strong> : '—'}
        </p>
      </div>

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
      <p role="status" className="border-t border-border px-md py-sm text-body-md text-muted">
        Đang tải lịch sử…
      </p>
    );
  if (history.error)
    return (
      <p role="alert" className="border-t border-border px-md py-sm text-body-md text-error">
        {errorMessage(history.error)}
      </p>
    );
  if (history.data.length === 0)
    return (
      <p className="border-t border-border px-md py-sm text-body-md text-muted">Chưa có lịch sử.</p>
    );
  return (
    <div className="sb-pop border-t border-border px-md py-md">
      <ol className="ml-xs flex flex-col gap-md border-l-2 border-border pl-md">
        {history.data.map((rate) => (
          <li key={rate.scheduleId} className="relative text-body-md">
            <span
              aria-hidden="true"
              className={`absolute -left-[23px] top-1.5 h-3 w-3 rounded-full ring-[3px] ${rate.effectiveTo ? 'bg-card ring-border' : 'bg-[#0B7F43] ring-[#E6F6EC] dark:bg-[#4ED18A] dark:ring-[#10301F]'}`}
            />
            <p className="text-text">
              <strong className="font-sign font-tabular">
                {rate.amount.toLocaleString('vi-VN')}đ
              </strong>
              <span className="text-muted font-tabular">
                {' · '}
                {formatDateVn(rate.effectiveFrom)}
                {rate.effectiveTo ? ` → ${formatDateVn(rate.effectiveTo)}` : ' → nay'}
                {rate.isInUse ? ' · đã dùng cho quyết định xử phạt' : ''}
                {' · '}
                {rate.actorName}
              </span>
            </p>
            <p className="text-body-sm text-muted">{rate.legalBasis ?? 'Chưa có căn cứ pháp lý'}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
