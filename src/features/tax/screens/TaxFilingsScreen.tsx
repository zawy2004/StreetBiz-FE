import { useRef, useState } from 'react';

import { Button, Card, Icon, formatVnd } from '@/components/common';
import { ConfirmDialog, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import {
  errorMessage,
  vendorRegistrationApi,
  type TaxPeriodDto,
} from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { saveFile } from '@/core/utils/save-file';
import { DateInput, Disclaimer, FormSheet, MoneyInput, TaxNeedsServer, YearTabs } from '../components/TaxParts';
import {
  FIRST_TAX_YEAR,
  PERIOD_STATUS_LABEL,
  PERIOD_STATUS_TONE,
  currentTaxYear,
  formatDay,
  parseDigits,
  todayIso,
} from '../tax-format';
import { useConfirmTaxFiling, useRetractTaxFiling, useTaxDeclarations } from '../useTax';

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const RECEIPT_TYPES = 'image/jpeg,image/png,image/webp,application/pdf';

function FilingSheet({
  period,
  year,
  onClose,
}: {
  period: TaxPeriodDto | undefined;
  year: number;
  onClose: () => void;
}) {
  const confirm = useConfirmTaxFiling();
  const fileInput = useRef<HTMLInputElement>(null);
  const existing = period?.filing ?? null;
  const [declared, setDeclared] = useState(String(existing?.revenueDeclared ?? period?.systemRevenue ?? ''));
  const [filedOn, setFiledOn] = useState(existing?.filedOn ?? todayIso());
  const [reference, setReference] = useState(existing?.authorityReference ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(existing?.receiptUrl ?? null);
  const [receiptName, setReceiptName] = useState<string | null>(existing?.receiptUrl ? 'Biên nhận đã đính kèm' : null);
  const [uploading, setUploading] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_RECEIPT_BYTES) {
      showToast('Tệp tối đa 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const uploaded = await vendorRegistrationApi.uploadEvidenceFile(file);
      setReceiptUrl(uploaded.fileUrl);
      setReceiptName(file.name);
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  if (!period) return null;

  const submit = () =>
    confirm.mutate(
      {
        year,
        periodType: period.periodType,
        periodNo: period.periodNo,
        request: {
          revenueDeclared: parseDigits(declared),
          filedOn,
          authorityReference: reference.trim() || null,
          receiptUrl,
          note: note.trim() || null,
        },
      },
      {
        onSuccess: () => {
          showToast('Đã ghi nhận bạn đã nộp kỳ này');
          onClose();
        },
        onError: (error) => showToast(errorMessage(error)),
      },
    );

  return (
    <FormSheet
      visible
      onClose={onClose}
      title={existing ? `Sửa xác nhận · ${period.label}` : `Xác nhận đã nộp · ${period.label}`}
      description="Chỉ điền sau khi bạn đã nộp trên cổng của cơ quan thuế. StreetBiz không gửi gì đến cơ quan thuế."
    >
      <MoneyInput
        label="Doanh thu bạn đã khai (đồng)"
        value={declared}
        onChange={setDeclared}
        helperText={`StreetBiz ghi nhận ${formatVnd(period.systemRevenue)} trong kỳ này.`}
      />
      <DateInput label="Ngày nộp" value={filedOn} onChange={setFiledOn} min={`${FIRST_TAX_YEAR}-01-01`} max={todayIso()} />
      <TextField
        label="Mã biên nhận / số tham chiếu (không bắt buộc)"
        value={reference}
        onChangeText={setReference}
        maxLength={100}
      />

      <div className="flex flex-col gap-xs">
        <span className="text-label text-text">Ảnh hoặc PDF biên nhận (không bắt buộc)</span>
        <input
          ref={fileInput}
          type="file"
          accept={RECEIPT_TYPES}
          className="sr-only"
          id="tax-receipt"
          onChange={(event) => void pick(event.target.files?.[0])}
        />
        <div className="flex flex-wrap items-center gap-sm">
          <label
            htmlFor="tax-receipt"
            className="inline-flex h-9 cursor-pointer items-center gap-xs rounded-sm border border-border bg-card px-sm text-label font-semibold text-text hover:bg-sunken"
          >
            <Icon name="plus" size={16} />
            {uploading ? 'Đang tải lên…' : receiptUrl ? 'Đổi tệp' : 'Chọn tệp'}
          </label>
          {receiptName ? <span className="min-w-0 truncate text-body-sm text-muted">{receiptName}</span> : null}
          {receiptUrl ? (
            <button
              type="button"
              className="text-label font-semibold text-error"
              onClick={() => {
                setReceiptUrl(null);
                setReceiptName(null);
              }}
            >
              Bỏ tệp
            </button>
          ) : null}
        </div>
      </div>

      <TextField label="Ghi chú (không bắt buộc)" value={note} onChangeText={setNote} maxLength={500} multiline />
      <Button
        label={existing ? 'Lưu thay đổi' : 'Xác nhận đã nộp'}
        loading={confirm.isPending}
        disabled={confirm.isPending || uploading || filedOn === ''}
        onPress={submit}
      />
    </FormSheet>
  );
}

function PeriodCard({
  period,
  onFile,
  onRetract,
}: {
  period: TaxPeriodDto;
  onFile: (period: TaxPeriodDto) => void;
  onRetract: (period: TaxPeriodDto) => void;
}) {
  const filing = period.filing;
  const openReceipt = async () => {
    if (!filing?.receiptUrl) return;
    try {
      const blob = await vendorRegistrationApi.downloadEvidenceFile(filing.receiptUrl);
      saveFile(blob, `bien-nhan-${period.periodType.toLowerCase()}-${period.periodNo}`);
    } catch (error) {
      showToast(errorMessage(error));
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="min-w-0">
          <h3 className="text-headline-sm text-text">{period.label}</h3>
          <p className="text-body-sm text-muted">
            {formatDay(period.start)} – {formatDay(period.end)} · hạn {formatDay(period.dueDate)}
          </p>
        </div>
        <StatusChip label={PERIOD_STATUS_LABEL[period.status]} tone={PERIOD_STATUS_TONE[period.status]} />
      </div>

      <p className="mt-xs text-body-md text-text">
        StreetBiz ghi nhận <strong className="font-tabular">{formatVnd(period.systemRevenue)}</strong> trong kỳ.
      </p>

      {filing ? (
        <div className="mt-sm rounded-[14px] bg-sunken p-sm text-body-sm text-text">
          <p>
            Bạn xác nhận đã nộp ngày <strong>{formatDay(filing.filedOn)}</strong>, khai{' '}
            <strong className="font-tabular">{formatVnd(filing.revenueDeclared)}</strong>
            {filing.revenueDeclared !== filing.revenueSystem
              ? ` (StreetBiz tính ${formatVnd(filing.revenueSystem)} lúc xác nhận)`
              : ''}
            .
          </p>
          {filing.authorityReference ? <p className="text-muted">Biên nhận: {filing.authorityReference}</p> : null}
          {filing.note ? <p className="text-muted">{filing.note}</p> : null}
          {filing.receiptUrl ? (
            <button type="button" className="mt-2xs text-label font-semibold text-primary" onClick={() => void openReceipt()}>
              Tải biên nhận đã đính kèm
            </button>
          ) : null}
        </div>
      ) : null}

      {period.canFile || filing ? (
        <div className="mt-sm flex flex-wrap gap-xs">
          {filing ? (
            <>
              <Button label="Sửa" variant="outline" size="sm" fullWidth={false} onPress={() => onFile(period)} />
              <Button label="Gỡ xác nhận" variant="ghost" size="sm" fullWidth={false} onPress={() => onRetract(period)} />
            </>
          ) : (
            <Button label="Xác nhận đã nộp" size="sm" fullWidth={false} onPress={() => onFile(period)} />
          )}
        </div>
      ) : null}
    </Card>
  );
}

/**
 * The yearly revenue notice and the four quarters. A household files with the tax office itself;
 * here it only confirms that it did (and may keep the receipt), which stops the reminders and
 * tells its ward the notice is done.
 */
export function TaxFilingsScreen() {
  const [year, setYear] = useState(currentTaxYear());
  const declarations = useTaxDeclarations(year);
  const retract = useRetractTaxFiling();
  const [filing, setFiling] = useState<TaxPeriodDto>();
  const [retracting, setRetracting] = useState<TaxPeriodDto>();
  const data = declarations.data;

  const confirmRetract = () => {
    if (!retracting) return;
    retract.mutate(
      { year, periodType: retracting.periodType, periodNo: retracting.periodNo },
      {
        onSuccess: () => {
          showToast('Đã gỡ xác nhận');
          setRetracting(undefined);
        },
        onError: (error) => showToast(errorMessage(error)),
      },
    );
  };

  return (
    <Screen>
      <AppHeader
        title="Thông báo & kê khai"
        subtitle="Các kỳ cần làm với cơ quan thuế và xác nhận bạn đã nộp"
        back
      />
      {!isLiveApi ? (
        <TaxNeedsServer />
      ) : (
        <>
          <YearTabs year={year} onChange={setYear} />
          {declarations.isLoading ? (
            <LoadingState />
          ) : declarations.isError || !data ? (
            <ErrorState message={errorMessage(declarations.error)} onRetry={() => declarations.refetch()} />
          ) : (
            <>
              <div className="grid gap-sm md:grid-cols-2">
                {data.periods.map((period) => (
                  <PeriodCard
                    key={`${period.periodType}-${period.periodNo}`}
                    period={period}
                    onFile={setFiling}
                    onRetract={setRetracting}
                  />
                ))}
              </div>
              <Disclaimer text={data.disclaimer} />
            </>
          )}
        </>
      )}

      {filing ? (
        <FilingSheet key={`${filing.periodType}-${filing.periodNo}`} period={filing} year={year} onClose={() => setFiling(undefined)} />
      ) : null}

      <ConfirmDialog
        visible={retracting !== undefined}
        title="Gỡ xác nhận đã nộp?"
        description={
          retracting
            ? `${retracting.label} sẽ trở lại trạng thái chưa nộp và StreetBiz có thể nhắc lại. Việc này không ảnh hưởng gì đến hồ sơ bạn đã nộp cho cơ quan thuế.`
            : undefined
        }
        confirmLabel={retract.isPending ? 'Đang gỡ…' : 'Gỡ xác nhận'}
        confirmVariant="danger"
        onConfirm={confirmRetract}
        onCancel={() => setRetracting(undefined)}
      />
    </Screen>
  );
}
