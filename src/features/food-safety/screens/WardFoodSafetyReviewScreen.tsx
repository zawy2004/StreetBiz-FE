import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { Field, TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import {
  FOOD_SAFETY_EVIDENCE_LABELS,
  foodSafetyApi,
  type FoodSafetyDecision,
} from '@/core/api/food-safety-api';
import { EvidencePreview } from '@/features/business-registrations/components/EvidencePreview';
import { categoryIcon } from '@/features/buyer-discovery/category-icons';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import { menuItemPhotos } from '@/features/buyer-discovery/food-photos';
import { colors } from '@/theme';
import { FoodSafetySteps } from '../components/FoodSafetyBits';
import { formatDay } from '../format';

const DEFAULT_DEPARTMENT = 'Chi cục An toàn vệ sinh thực phẩm';

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <Field htmlFor={id} label={label}>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-sm border border-border bg-card px-sm text-body-lg text-text"
      />
    </Field>
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
  const [reason, setReason] = useState('');
  const [department, setDepartment] = useState(DEFAULT_DEPARTMENT);
  const [certificateNumber, setCertificateNumber] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [expiresOn, setExpiresOn] = useState('');

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

  if (detail.isPending) return <LoadingState />;
  if (detail.isError) return <ErrorState message={errorMessage(detail.error)} onRetry={() => detail.refetch()} />;

  const application = detail.data;
  const can = (decision: FoodSafetyDecision) => application.actions.includes(decision);
  const hasReason = reason.trim().length > 0;
  const busy = decide.isPending;

  return (
    <Screen>
      <AppHeader
        title={`Hồ sơ ATTP #${application.applicationId}`}
        back
        subtitle={`${application.storefrontName} · ${application.vendorName}`}
      />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-xs">
          <p className="text-body-md text-muted">Nộp ngày {formatDay(application.submittedAt)}</p>
          {application.isExpired ? <StatusChip code="EXPIRED" /> : <StatusChip code={application.status} />}
        </div>
        <div className="mt-sm">
          <FoodSafetySteps application={application} />
        </div>
        {application.vendorNote ? (
          <p className="mt-sm text-body-md text-text">Ghi chú người bán: {application.vendorNote}</p>
        ) : null}
        {application.forwardedAt ? (
          <p className="mt-1 text-body-sm text-muted">
            Đã chuyển {application.departmentName} ngày {formatDay(application.forwardedAt)}.
          </p>
        ) : null}
        {application.status === 'APPROVED' ? (
          <p className="mt-1 text-body-sm text-tertiary">
            Giấy số {application.certificateNumber} · hiệu lực {formatDay(application.issuedOn)} –{' '}
            {formatDay(application.expiresOn)}
          </p>
        ) : null}
        {application.resultReason ? (
          <p className="mt-1 text-body-sm text-muted">Kết luận của cục: {application.resultReason}</p>
        ) : application.reviewReason ? (
          <p className="mt-1 text-body-sm text-muted">Ghi chú của phường: {application.reviewReason}</p>
        ) : null}
      </Card>

      <Section title={`Món xin cấp (${application.dishes.length})`}>
        <Card>
          <ul className="flex flex-col gap-sm">
            {application.dishes.map((dish) => (
              <li key={dish.menuItemId} className="flex items-center gap-sm">
                <FoodImage
                  photos={menuItemPhotos({
                    itemName: dish.name,
                    categoryName: dish.categoryName,
                    imageUrl: dish.imageUrl,
                  })}
                  icon={categoryIcon(dish.categoryName)}
                  iconSize={24}
                  iconColor={colors.muted}
                  className="size-14 shrink-0 rounded-sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-md text-text">{dish.name}</span>
                  <span className="block text-body-sm text-muted">{dish.categoryName}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section title={`Giấy tờ (${application.evidence.length})`}>
        <Card>
          <div className="flex flex-wrap gap-sm">
            {application.evidence.map((evidence, index) => (
              <EvidencePreview
                key={`${evidence.fileUrl}-${index}`}
                evidence={evidence}
                label={FOOD_SAFETY_EVIDENCE_LABELS[evidence.evidenceType]}
              />
            ))}
          </div>
        </Card>
      </Section>

      {can('FORWARD') ? (
        <Section title="Xét hồ sơ" description="Hồ sơ đủ thì chuyển cơ quan kiểm tra ATTP; thiếu thì yêu cầu bổ sung.">
          <Card>
            <TextField
              label="Cơ quan kiểm tra"
              value={department}
              onChangeText={setDepartment}
              maxLength={200}
            />
            <TextField
              label="Ghi chú / lý do *"
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={500}
              placeholder="VD: Hồ sơ đầy đủ, đề nghị Chi cục kiểm tra thực tế."
            />
            <div className="mt-sm flex flex-wrap gap-sm">
              <Button
                label="Chuyển cục kiểm tra"
                fullWidth={false}
                disabled={!hasReason || !department.trim() || busy}
                loading={busy && decide.variables === 'FORWARD'}
                onPress={() => decide.mutate('FORWARD')}
              />
              <Button
                label="Yêu cầu bổ sung"
                variant="outline"
                fullWidth={false}
                disabled={!hasReason || busy}
                onPress={() => decide.mutate('REQUEST_INFO')}
              />
              <Button
                label="Từ chối"
                variant="danger"
                fullWidth={false}
                disabled={!hasReason || busy}
                onPress={() => decide.mutate('REJECT')}
              />
            </div>
          </Card>
        </Section>
      ) : null}

      {can('RECORD_APPROVED') ? (
        <Section
          title="Nhập kết quả của cục"
          description="Cập nhật theo biên bản / giấy chứng nhận cơ quan ATTP gửi về. Người bán được thông báo ngay."
        >
          <Card>
            <TextField
              label="Số giấy chứng nhận"
              value={certificateNumber}
              onChangeText={setCertificateNumber}
              maxLength={60}
              placeholder="VD: ATTP-DN-2026-0150"
            />
            <DateField label="Ngày cấp" value={issuedOn} onChange={setIssuedOn} />
            <DateField label="Ngày hết hạn" value={expiresOn} onChange={setExpiresOn} />
            <TextField
              label="Kết luận của cục *"
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={500}
              placeholder="VD: Cơ sở đạt điều kiện ATTP."
            />
            <div className="mt-sm flex flex-wrap gap-sm">
              <Button
                label="Ghi nhận: Đạt ATTP"
                variant="approve"
                fullWidth={false}
                disabled={!hasReason || !certificateNumber.trim() || !issuedOn || !expiresOn || busy}
                loading={busy && decide.variables === 'RECORD_APPROVED'}
                onPress={() => decide.mutate('RECORD_APPROVED')}
              />
              <Button
                label="Ghi nhận: Không đạt"
                variant="danger"
                fullWidth={false}
                disabled={!hasReason || busy}
                onPress={() => decide.mutate('RECORD_REJECTED')}
              />
            </div>
          </Card>
        </Section>
      ) : null}

      {decide.isError ? (
        <p role="alert" className="text-error">
          {errorMessage(decide.error)}
        </p>
      ) : null}
    </Screen>
  );
}
