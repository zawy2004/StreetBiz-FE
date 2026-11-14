import { useState } from 'react';

import { Button, Card, Icon } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { FilterChips, TextField } from '@/components/forms';
import { StatusChip } from '@/components/status';
import { errorMessage, type TaxReferralDto, type TaxReferralStatus } from '@/core/api';
import { colors } from '@/theme';
import { FormSheet } from './TaxParts';
import { REFERRAL_STATUS_LABEL, REFERRAL_STATUS_TONE, formatMoment, formatMomentDay } from '../tax-format';
import {
  useDismissTaxReferral,
  useRefreshTaxReferrals,
  useReportTaxReferral,
  useTaxReferrals,
} from '../useTax';

type Filter = TaxReferralStatus | 'ALL';

type Action = { kind: 'report' | 'dismiss'; referral: TaxReferralDto };

function ActionSheet({ action, onClose }: { action: Action; onClose: () => void }) {
  const report = useReportTaxReferral();
  const dismiss = useDismissTaxReferral();
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const reporting = action.kind === 'report';
  const pending = report.isPending || dismiss.isPending;

  const done = (message: string) => ({
    onSuccess: () => {
      showToast(message);
      onClose();
    },
    onError: (error: unknown) => showToast(errorMessage(error)),
  });

  const submit = () =>
    reporting
      ? report.mutate(
          { referralId: action.referral.referralId, reference: reference.trim() || null, note: note.trim() || null },
          done('Đã ghi nhận đã báo cơ quan thuế'),
        )
      : dismiss.mutate({ referralId: action.referral.referralId, reason: reason.trim() }, done('Đã ghi nhận không cần báo'));

  return (
    <FormSheet
      visible
      onClose={onClose}
      title={reporting ? 'Đã báo cho cơ quan thuế' : 'Không cần báo cơ quan thuế'}
      description={`${action.referral.reasonLabel}: ${action.referral.summary}`}
    >
      {reporting ? (
        <>
          <TextField
            label="Số công văn / tham chiếu (không bắt buộc)"
            value={reference}
            onChangeText={setReference}
            maxLength={100}
          />
          <TextField label="Ghi chú (không bắt buộc)" value={note} onChangeText={setNote} maxLength={500} multiline />
        </>
      ) : (
        <TextField
          label="Lý do không cần báo"
          value={reason}
          onChangeText={setReason}
          maxLength={500}
          multiline
          error={reason !== '' && reason.trim() === '' ? 'Nhập lý do.' : undefined}
        />
      )}
      <Button
        label={reporting ? 'Ghi nhận đã báo' : 'Ghi nhận không cần báo'}
        variant={reporting ? 'primary' : 'outline'}
        loading={pending}
        disabled={pending || (!reporting && reason.trim() === '')}
        onPress={submit}
      />
    </FormSheet>
  );
}

function ReferralCard({ referral, onAct }: { referral: TaxReferralDto; onAct: (action: Action) => void }) {
  const pending = referral.status === 'PENDING';
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="min-w-0">
          <h3 className="text-headline-sm text-text">{referral.reasonLabel}</h3>
          <p className="text-body-sm text-muted">
            {referral.vendorName ?? 'Chưa xác định chủ hộ'} · phát hiện {formatMomentDay(referral.detectedAt)}
          </p>
        </div>
        <StatusChip label={REFERRAL_STATUS_LABEL[referral.status]} tone={REFERRAL_STATUS_TONE[referral.status]} />
      </div>
      <p className="mt-xs text-body-md text-text">{referral.summary}</p>

      {!pending ? (
        <p className="mt-xs text-body-sm text-muted">
          {referral.handledAt ? `Xử lý ${formatMoment(referral.handledAt)}` : ''}
          {referral.handledByName ? ` bởi ${referral.handledByName}` : ' (hệ thống tự đóng)'}
          {referral.authorityReference ? ` · ${referral.authorityReference}` : ''}
          {referral.handlingNote ? ` · ${referral.handlingNote}` : ''}
        </p>
      ) : (
        <div className="mt-sm flex flex-wrap gap-xs">
          <Button label="Đã báo cơ quan thuế" size="sm" fullWidth={false} onPress={() => onAct({ kind: 'report', referral })} />
          <Button
            label="Không cần báo"
            size="sm"
            variant="outline"
            fullWidth={false}
            onPress={() => onAct({ kind: 'dismiss', referral })}
          />
        </div>
      )}
    </Card>
  );
}

/**
 * Cases the ward may pass on to the tax office: unlicensed trading, permits that were invalid, a
 * move, a household that stopped, a new household with no tax code. The system finds them in the
 * ward's own records; an officer decides and records what was done.
 */
export function WardTaxReferrals() {
  const [filter, setFilter] = useState<Filter>('PENDING');
  const referrals = useTaxReferrals(filter === 'ALL' ? undefined : filter);
  const refresh = useRefreshTaxReferrals();
  const [action, setAction] = useState<Action>();

  const rows = referrals.data ?? [];

  const lookForNew = () =>
    refresh.mutate(undefined, {
      onSuccess: (result) =>
        showToast(
          result.created > 0
            ? `Tìm thấy ${result.created} trường hợp mới`
            : result.autoClosed > 0
              ? `Không có trường hợp mới; ${result.autoClosed} trường hợp đã tự đóng vì hộ đã khai mã số thuế`
              : 'Không có trường hợp mới',
        ),
      onError: (error) => showToast(errorMessage(error)),
    });

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'PENDING', label: 'Chờ xử lý' },
            { value: 'REPORTED', label: 'Đã báo' },
            { value: 'DISMISSED', label: 'Không cần báo' },
            { value: 'ALL', label: 'Tất cả' },
          ]}
        />
        <Button
          label="Tìm trường hợp mới"
          variant="outline"
          size="sm"
          fullWidth={false}
          loading={refresh.isPending}
          icon={<Icon name="magnify" size={18} color={colors.text} />}
          onPress={lookForNew}
        />
      </div>
      <p className="text-body-sm text-muted">
        Hệ thống tự rà soát biên bản, kiểm tra thực địa, đổi địa điểm, hợp đồng kết thúc và hộ mới mỗi ngày. Phường quyết định có báo
        cơ quan thuế hay không và ghi lại tại đây.
      </p>

      {referrals.isLoading ? (
        <LoadingState />
      ) : referrals.isError ? (
        <ErrorState message={errorMessage(referrals.error)} onRetry={() => referrals.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="check-circle-outline"
          title={filter === 'PENDING' ? 'Không có trường hợp nào chờ xử lý' : 'Chưa có trường hợp nào'}
        />
      ) : (
        <div className="grid gap-sm md:grid-cols-2">
          {rows.map((referral) => (
            <ReferralCard key={referral.referralId} referral={referral} onAct={setAction} />
          ))}
        </div>
      )}

      {action ? (
        <ActionSheet key={`${action.kind}-${action.referral.referralId}`} action={action} onClose={() => setAction(undefined)} />
      ) : null}
    </div>
  );
}
