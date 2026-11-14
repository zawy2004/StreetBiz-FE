import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { Button } from '@/components/common';
import { ConfirmDialog, Skeleton, showToast } from '@/components/feedback';
import { SelectField } from '@/components/forms';
import { saveFile } from '@/core/utils/save-file';
import { formatDateTime } from './admin-format';
import {
  platformApi,
  PlatformApiError,
  type PlatformExport,
  type PlatformFile,
  type ReportFormat,
  type ReportType,
} from '../platform-api';

const TYPES: { value: ReportType; label: string; description: string }[] = [
  {
    value: 'OPERATIONS_SUMMARY',
    label: 'Tổng hợp vận hành',
    description: 'Số liệu như màn tổng quan, so với kỳ trước',
  },
  { value: 'ORDERS', label: 'Đơn hàng', description: 'Từng đơn trong kỳ, không kèm thông tin khách' },
  {
    value: 'MODERATION',
    label: 'Kiểm duyệt',
    description: 'Báo cáo nội dung và khiếu nại đơn hàng',
  },
  { value: 'ACCOUNTS', label: 'Tài khoản', description: 'Tài khoản mới, số điện thoại che giữa' },
];

const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label])) as Record<
  ReportType,
  string
>;

const MAX_DAYS = 366;

const saveExport = ({ blob, fileName }: PlatformFile) => saveFile(blob, fileName);

/**
 * ADM-07. Pick what to export, for which days, as which file; the file downloads when it is ready
 * and the request is kept in the history below, from where it can be fetched again.
 */
export function ExportPanel({
  defaultFrom,
  defaultTo,
  onClose,
}: {
  defaultFrom: string;
  defaultTo: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<ReportType>('OPERATIONS_SUMMARY');
  const [format, setFormat] = useState<ReportFormat>('xlsx');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const rangeError =
    !from || !to
      ? 'Chọn ngày bắt đầu và kết thúc.'
      : from > to
        ? 'Ngày bắt đầu không được sau ngày kết thúc.'
        : dayjs(to).diff(from, 'day') + 1 > MAX_DAYS
          ? `Khoảng thời gian tối đa ${MAX_DAYS} ngày.`
          : undefined;

  const exportMutation = useMutation({
    mutationFn: () => platformApi.exportReport({ reportType: type, from, to, format }),
    onSuccess: (file) => {
      saveExport(file);
      showToast(`Đã xuất ${file.fileName}`);
    },
    // Failed attempts are in the history too, so refresh it either way.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['platform', 'exports'] }),
  });

  const error = exportMutation.error
    ? exportMutation.error instanceof PlatformApiError
      ? exportMutation.error.message
      : 'Không thể xuất báo cáo.'
    : undefined;

  return (
    <ConfirmDialog
      visible
      title="Xuất báo cáo vận hành"
      description="Báo cáo được lập theo giờ Việt Nam, tối đa 366 ngày mỗi lần."
      confirmLabel="Xuất báo cáo"
      confirmVariant="primary"
      confirmDisabled={Boolean(rangeError)}
      busy={exportMutation.isPending}
      error={error ?? rangeError}
      onConfirm={() => exportMutation.mutate()}
      onCancel={onClose}
    >
      <div className="flex max-h-[60vh] flex-col gap-md overflow-y-auto pr-1">
        <SelectField label="Loại báo cáo" value={type} onChange={setType} options={TYPES} />
        <div className="flex flex-wrap items-end gap-sm text-body-sm text-text">
          <label className="flex flex-col gap-1">
            Từ ngày
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="h-11 rounded-[10px] border border-border bg-card px-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            Đến ngày
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="h-11 rounded-[10px] border border-border bg-card px-sm"
            />
          </label>
        </div>
        <SelectField
          label="Định dạng"
          layout="inline"
          value={format}
          onChange={setFormat}
          options={[
            { value: 'xlsx', label: 'Excel (.xlsx)' },
            { value: 'csv', label: 'CSV (.csv)' },
          ]}
        />
        <ExportHistory />
      </div>
    </ConfirmDialog>
  );
}

function ExportHistory() {
  const history = useQuery({
    queryKey: ['platform', 'exports'],
    queryFn: () => platformApi.exports(),
  });
  const download = useMutation({
    mutationFn: (exportId: number) => platformApi.downloadExport(exportId),
    onSuccess: saveExport,
  });

  return (
    <section aria-label="Lịch sử xuất" className="flex flex-col gap-xs">
      <h3 className="text-label font-semibold text-text">Lịch sử xuất gần đây</h3>
      {history.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : history.isError ? (
        <p role="alert" className="text-body-sm text-error">
          Không tải được lịch sử xuất.
        </p>
      ) : history.data.items.length === 0 ? (
        <p className="text-body-sm text-muted">Chưa xuất báo cáo nào.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {history.data.items.map((item) => (
            <HistoryRow
              key={item.exportId}
              item={item}
              busy={download.isPending && download.variables === item.exportId}
              onDownload={() => download.mutate(item.exportId)}
            />
          ))}
        </ul>
      )}
      {download.isError ? (
        <p role="alert" className="text-body-sm text-error">
          {download.error instanceof PlatformApiError
            ? download.error.message
            : 'Không tải được tệp.'}
        </p>
      ) : null}
    </section>
  );
}

function HistoryRow({
  item,
  busy,
  onDownload,
}: {
  item: PlatformExport;
  busy: boolean;
  onDownload: () => void;
}) {
  const range = item.from && item.to ? `${dayjs(item.from).format('DD/MM')}–${dayjs(item.to).format('DD/MM/YYYY')}` : '';
  return (
    <li className="flex items-center gap-sm py-xs">
      <span className="min-w-0 flex-1 text-body-sm">
        <span className="block truncate font-semibold text-text">
          {TYPE_LABEL[item.reportType] ?? item.reportType} · {item.format.toUpperCase()}
        </span>
        <span className="block truncate text-muted">
          {range} · {formatDateTime(item.requestedAt)}
        </span>
        {item.status === 'FAILED' ? (
          <span className="block text-error">Lỗi: {item.failureReason ?? 'không tạo được tệp'}</span>
        ) : item.status === 'PENDING' ? (
          <span className="block text-muted">Đang tạo…</span>
        ) : null}
      </span>
      {item.status === 'READY' ? (
        <Button
          label="Tải lại"
          variant="outline"
          size="sm"
          fullWidth={false}
          loading={busy}
          onPress={onDownload}
        />
      ) : null}
    </li>
  );
}
