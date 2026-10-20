import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { Icon } from '@/components/common';
import { ErrorState, showToast } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import { Field, TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import {
  FOOD_SAFETY_EVIDENCE_LABELS,
  foodSafetyApi,
  type FoodSafetyDecision,
} from '@/core/api/food-safety-api';
import { ApiError } from '@/core/api/problem';
import { statusLabel } from '@/core/constants/status-labels';
import { EvidencePreview } from '@/features/business-registrations/components/EvidencePreview';
import {
  AttpCertificate,
  AttpJourney,
  AttpReviewSkeleton,
  DecisionButton,
  EvidenceSheetFrame,
  EvidenceTypeChecklist,
  OtherFiles,
  ReviewDishTile,
  VendorNote,
  WaitBadge,
} from '../components/ward/AttpReviewParts';
import { formatDay } from '../format';

const DEFAULT_DEPARTMENT = 'Chi cục An toàn vệ sinh thực phẩm';

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <Field htmlFor={id} label={label}>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-shell h-12 w-full rounded-sm border border-border bg-card px-sm text-body-lg text-text"
      />
    </Field>
  );
}

function CardTitle({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <div>
      <h2
        id={id}
        className="font-heading text-[21px] font-bold leading-[1.2] tracking-[-0.015em] text-text"
      >
        {title}
      </h2>
      <p className="mt-0.5 text-body-md text-muted">{description}</p>
    </div>
  );
}

/**
 * One ATTP file for the ward: check the documents, then either send it back / reject it,
 * or forward it to the department; once the department has inspected, record its result.
 */
export function WardFoodSafetyReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const applicationId = Number(id);
  const cache = useQueryClient();
  const detail = useQuery({
    queryKey: ['food-safety', 'ward', 'detail', applicationId],
    queryFn: () => foodSafetyApi.wardGet(applicationId),
    enabled: Number.isFinite(applicationId),
  });
  // The ward's queue, if it is already in the cache, for "other files of this stall". Never fetches.
  const queue = useQuery({
    queryKey: ['food-safety', 'ward', 'ALL'],
    queryFn: () => foodSafetyApi.wardList(undefined),
    enabled: false,
  });
  const [reason, setReason] = useState('');
  const [department, setDepartment] = useState(DEFAULT_DEPARTMENT);
  const [certificateNumber, setCertificateNumber] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const now = useMemo(() => Date.now(), []);
  // The status the file had when the page opened: a change during this visit is celebrated once.
  const openedAs = useRef<string | null>(null);
  if (detail.data && openedAs.current === null) openedAs.current = detail.data.status;
  const decisionCard = useRef<HTMLElement>(null);
  const reasonField = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [cardOffscreen, setCardOffscreen] = useState(false);

  const decide = useMutation({
    mutationFn: (decision: FoodSafetyDecision) =>
      foodSafetyApi.decide(applicationId, {
        decision,
        reason: reason.trim(),
        expectedStatus: detail.data!.status,
        departmentName: decision === 'FORWARD' ? department.trim() : null,
        certificateNumber: decision === 'RECORD_APPROVED' ? certificateNumber.trim() : null,
        issuedOn: decision === 'RECORD_APPROVED' ? issuedOn : null,
        expiresOn: decision === 'RECORD_APPROVED' ? expiresOn : null,
      }),
    onSuccess: async (updated) => {
      cache.setQueryData(['food-safety', 'ward', 'detail', applicationId], updated);
      // Refresh the queue; the detail already holds the server's answer.
      await cache.invalidateQueries({
        queryKey: ['food-safety', 'ward'],
        predicate: (query) => query.queryKey[2] !== 'detail',
      });
      setReason('');
      showToast('Đã cập nhật hồ sơ ATTP');
    },
  });

  const actionable = Boolean(
    detail.data &&
    (detail.data.actions.includes('FORWARD') || detail.data.actions.includes('RECORD_APPROVED')),
  );

  // Below the two-column width the decision card can scroll away: offer a way back to it.
  useEffect(() => {
    const card = decisionCard.current;
    if (!card || !actionable || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) =>
      setCardOffscreen(!entry?.isIntersecting),
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [actionable]);

  if (detail.isPending) return <AttpReviewSkeleton />;
  if (detail.isError)
    return <ErrorState message={errorMessage(detail.error)} onRetry={() => detail.refetch()} />;

  const application = detail.data;
  const can = (decision: FoodSafetyDecision) => application.actions.includes(decision);
  const hasReason = reason.trim().length > 0;
  const busy = decide.isPending;
  const changed = openedAs.current !== null && openedAs.current !== application.status;
  const dishNames = application.dishes.map((d) => d.name);
  const others = (queue.data ?? [])
    .filter(
      (f) =>
        f.storefrontId === application.storefrontId &&
        f.applicationId !== application.applicationId,
    )
    .slice(0, 3);
  const conflict = decide.error instanceof ApiError && decide.error.status === 409;
  const few = application.dishes.length <= 1 && application.evidence.length <= 1;

  const closedSummary =
    application.status === 'APPROVED'
      ? {
          title: 'Hồ sơ đã có kết quả',
          text: 'Chi cục đã kết luận đạt; giấy chứng nhận đang ở đầu hồ sơ.',
          tone: VERDICT_TONES.ok,
        }
      : application.status === 'REJECTED'
        ? {
            title: 'Hồ sơ đã có kết quả',
            text: 'Hồ sơ không đạt; người bán đã thấy lý do.',
            tone: VERDICT_TONES.danger,
          }
        : application.status === 'MORE_INFORMATION_REQUIRED'
          ? {
              title: 'Đang chờ người bán bổ sung',
              text: 'Khi người bán gửi lại, hồ sơ quay về đây để phường xét.',
              tone: VERDICT_TONES.pending,
            }
          : application.status === 'WITHDRAWN'
            ? {
                title: 'Người bán đã rút hồ sơ',
                text: 'Phường không cần xét hồ sơ này nữa.',
                tone: VERDICT_TONES.neutral,
              }
            : {
                title: 'Chưa có việc cho phường',
                text: 'Hồ sơ đang ở bước khác của quy trình.',
                tone: VERDICT_TONES.neutral,
              };

  return (
    <Screen width="wide">
      <AppHeader
        title={`Hồ sơ ATTP #${application.applicationId}`}
        back
        subtitle={`${application.storefrontName} · ${application.vendorName}`}
      />
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start xl:gap-xl">
        {/* The dossier head: number, stall, where the file stands, its dated route. */}
        <section
          aria-labelledby="attp-dossier"
          className="overflow-hidden rounded-[28px] bg-card shadow-card ring-1 ring-border xl:col-start-1 xl:row-start-1"
        >
          <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
          <div className="flex flex-col gap-md p-md md:p-lg">
            <div className="flex flex-wrap items-start justify-between gap-sm">
              <div className="flex min-w-0 flex-col gap-1">
                <h2
                  id="attp-dossier"
                  className="font-sign text-[32px] font-bold leading-none tabular-nums text-text [font-stretch:92%] md:text-[40px]"
                >
                  Hồ sơ #{application.applicationId}
                </h2>
                <p className="mt-xs line-clamp-2 font-editorial text-[24px] font-semibold leading-tight text-text">
                  {application.storefrontName}
                </p>
                <p className="text-[15px] text-muted">{application.vendorName}</p>
              </div>
              {application.isExpired ? (
                <StatusChip code="EXPIRED" />
              ) : (
                <StatusChip code={application.status} />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-sm">
              <p className="text-body-md text-muted">
                Nộp ngày {formatDay(application.submittedAt)}
              </p>
              <WaitBadge application={application} now={now} />
            </div>
            <div key={application.status} className={changed ? 'sb-pop' : undefined}>
              <AttpJourney application={application} />
            </div>
            <p aria-live="polite" className="sr-only">
              {changed ? `Hồ sơ đã chuyển sang: ${statusLabel(application.status).label}` : ''}
            </p>
            {application.vendorNote ? <VendorNote note={application.vendorNote} /> : null}
            {application.forwardedAt ? (
              <p className="text-body-md text-text/80">
                Đã chuyển {application.departmentName} ngày {formatDay(application.forwardedAt)}.
              </p>
            ) : null}
            {application.resultReason ? (
              <p className="text-body-md text-text/80">
                Kết luận của cục: {application.resultReason}
              </p>
            ) : application.reviewReason ? (
              <p className="text-body-md text-text/80">
                Ghi chú của phường: {application.reviewReason}
              </p>
            ) : null}
            {application.status === 'APPROVED' ? (
              <div className="flex flex-col gap-xs">
                <AttpCertificate
                  certificateNumber={application.certificateNumber}
                  issuedOn={application.issuedOn}
                  expiresOn={application.expiresOn}
                  storefrontName={application.storefrontName}
                  dishes={dishNames}
                  expired={application.isExpired}
                  stamp={changed ? 'animate' : 'static'}
                />
                <p className={`text-body-md font-medium ${VERDICT_TONES.ok.ink}`}>
                  Giấy số {application.certificateNumber} · hiệu lực{' '}
                  {formatDay(application.issuedOn)} – {formatDay(application.expiresOn)}
                </p>
              </div>
            ) : null}
            {application.status === 'REJECTED' ? (
              <p
                className={`flex items-center gap-sm rounded-[16px] px-md py-sm font-sign text-[28px] font-extrabold [font-stretch:88%] ${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink}`}
              >
                <Icon name="close-circle-outline" size={30} color="currentColor" />
                KHÔNG ĐẠT
              </p>
            ) : null}
          </div>
        </section>

        {/* The decision card: right after the head in reading order, beside it on a wide screen. */}
        <section
          ref={decisionCard}
          aria-labelledby="attp-decision-title"
          className="cq flex flex-col gap-lg rounded-[28px] bg-card p-md shadow-sheet ring-1 ring-border md:p-lg xl:sticky xl:top-lg xl:col-start-2 xl:row-span-3 xl:row-start-1 xl:self-start"
        >
          {can('FORWARD') ? (
            <div className="flex flex-col gap-md">
              <CardTitle
                id="attp-decision-title"
                title="Xét hồ sơ"
                description="Hồ sơ đủ thì chuyển cơ quan kiểm tra ATTP; thiếu thì yêu cầu bổ sung."
              />
              <TextField
                label="Cơ quan kiểm tra"
                value={department}
                onChangeText={setDepartment}
                maxLength={200}
              />
              <TextField
                ref={reasonField}
                label="Ghi chú / lý do *"
                value={reason}
                onChangeText={setReason}
                multiline
                maxLength={500}
                placeholder="VD: Hồ sơ đầy đủ, đề nghị Chi cục kiểm tra thực tế."
                helperText={`${reason.length}/500`}
              />
              <div className="flex flex-col gap-sm">
                <DecisionButton
                  label="Chuyển cục kiểm tra"
                  variant="primary"
                  consequence={`Hồ sơ sang ${department.trim() || 'cơ quan kiểm tra'}; khi có kết quả, phường nhập ở đây.`}
                  disabled={!hasReason || !department.trim() || busy}
                  loading={busy && decide.variables === 'FORWARD'}
                  onPress={() => decide.mutate('FORWARD')}
                />
                <DecisionButton
                  label="Yêu cầu bổ sung"
                  variant="outline"
                  consequence="Người bán thấy lý do và gửi lại hồ sơ."
                  disabled={!hasReason || busy}
                  onPress={() => decide.mutate('REQUEST_INFO')}
                />
              </div>
              <div className="border-t border-dashed border-border pt-lg">
                <DecisionButton
                  label="Từ chối"
                  variant="danger"
                  consequence="Hồ sơ kết thúc; người bán thấy lý do."
                  disabled={!hasReason || busy}
                  onPress={() => decide.mutate('REJECT')}
                />
              </div>
            </div>
          ) : null}

          {can('RECORD_APPROVED') ? (
            <div className="flex flex-col gap-md">
              <CardTitle
                id={can('FORWARD') ? 'attp-result-title' : 'attp-decision-title'}
                title="Nhập kết quả của cục"
                description="Cập nhật theo biên bản / giấy chứng nhận cơ quan ATTP gửi về. Người bán được thông báo ngay."
              />
              <AttpCertificate
                draft
                certificateNumber={certificateNumber.trim() || null}
                issuedOn={issuedOn || null}
                expiresOn={expiresOn || null}
                storefrontName={application.storefrontName}
                dishes={dishNames}
              />
              <TextField
                label="Số giấy chứng nhận"
                value={certificateNumber}
                onChangeText={setCertificateNumber}
                maxLength={60}
                placeholder="VD: ATTP-DN-2026-0150"
              />
              <div className="grid gap-md min-[360px]:grid-cols-2 min-[360px]:gap-sm">
                <DateField label="Ngày cấp" value={issuedOn} onChange={setIssuedOn} />
                <DateField label="Ngày hết hạn" value={expiresOn} onChange={setExpiresOn} />
              </div>
              <TextField
                ref={can('FORWARD') ? undefined : reasonField}
                label="Kết luận của cục *"
                value={reason}
                onChangeText={setReason}
                multiline
                maxLength={500}
                placeholder="VD: Cơ sở đạt điều kiện ATTP."
                helperText={`${reason.length}/500`}
              />
              <DecisionButton
                label="Ghi nhận: Đạt ATTP"
                variant="approve"
                consequence="Món trong hồ sơ được bán; người bán được báo ngay."
                disabled={
                  !hasReason || !certificateNumber.trim() || !issuedOn || !expiresOn || busy
                }
                loading={busy && decide.variables === 'RECORD_APPROVED'}
                onPress={() => decide.mutate('RECORD_APPROVED')}
              />
              <div className="border-t border-dashed border-border pt-lg">
                <DecisionButton
                  label="Ghi nhận: Không đạt"
                  variant="danger"
                  consequence="Hồ sơ kết thúc; người bán thấy kết luận của cục."
                  disabled={!hasReason || busy}
                  onPress={() => decide.mutate('RECORD_REJECTED')}
                />
              </div>
            </div>
          ) : null}

          {!actionable ? (
            <div className="flex flex-col gap-sm">
              <h2 id="attp-decision-title" className="font-heading text-[21px] font-bold text-text">
                {closedSummary.title}
              </h2>
              <p
                className={`rounded-[14px] px-sm py-xs text-body-lg ${closedSummary.tone.wash} ${closedSummary.tone.ink}`}
              >
                {closedSummary.text}
              </p>
            </div>
          ) : null}

          {decide.isError ? (
            <div
              role="alert"
              className={`flex items-start gap-xs rounded-[14px] px-sm py-xs text-body-lg ${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink}`}
            >
              <Icon
                name="alert-circle-outline"
                size={20}
                color="currentColor"
                className="mt-[3px] shrink-0"
              />
              <span>
                {errorMessage(decide.error)}
                {conflict ? ' Hồ sơ có thể vừa được cập nhật ở nơi khác.' : ''}
              </span>
            </div>
          ) : null}
        </section>

        {/* The evidence: dishes, then documents. */}
        <div
          className={`flex min-w-0 flex-col gap-lg xl:col-start-1 ${few ? 'lg:grid lg:grid-cols-2' : ''}`}
        >
          <section aria-labelledby="attp-dishes" className="flex flex-col gap-sm">
            <h2
              id="attp-dishes"
              className="font-heading text-[21px] font-bold leading-[1.2] text-text"
            >
              Món xin cấp ({application.dishes.length})
            </h2>
            <ul className="grid grid-cols-2 gap-md sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
              {application.dishes.map((dish) => (
                <ReviewDishTile key={dish.menuItemId} dish={dish} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="attp-evidence" className="flex flex-col gap-sm">
            <h2
              id="attp-evidence"
              className="font-heading text-[21px] font-bold leading-[1.2] text-text"
            >
              Giấy tờ ({application.evidence.length})
            </h2>
            <EvidenceTypeChecklist types={application.evidence.map((e) => e.evidenceType)} />
            {application.evidence.length ? (
              <ul className="grid grid-cols-2 gap-md min-[480px]:grid-cols-[repeat(auto-fill,minmax(132px,1fr))]">
                {application.evidence.map((evidence, index) => (
                  <EvidenceSheetFrame
                    key={`${evidence.fileUrl}-${index}`}
                    uploadedAt={evidence.uploadedAt}
                  >
                    <EvidencePreview
                      evidence={evidence}
                      label={FOOD_SAFETY_EVIDENCE_LABELS[evidence.evidenceType]}
                    />
                  </EvidenceSheetFrame>
                ))}
              </ul>
            ) : (
              <p className="rounded-[14px] border-2 border-dashed border-border px-md py-lg text-center text-body-md text-muted">
                Hồ sơ không có giấy tờ đính kèm
              </p>
            )}
          </section>
        </div>

        {others.length ? (
          <div className="xl:col-start-1">
            <OtherFiles files={others} />
          </div>
        ) : null}
      </div>

      {actionable && cardOffscreen ? (
        <div className="sticky bottom-md z-10 flex justify-center xl:hidden">
          <button
            type="button"
            onClick={() => {
              decisionCard.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              reasonField.current?.focus({ preventScroll: true });
            }}
            className="inline-flex h-12 items-center gap-xs rounded-full bg-card px-lg text-[15px] font-semibold text-primary shadow-sheet ring-1 ring-border"
          >
            <Icon name="chevron-up" size={18} color="currentColor" />
            Đến phần xét hồ sơ
          </button>
        </div>
      ) : null}
    </Screen>
  );
}
