import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/common';
import { showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { errorMessage, wardConfigApi, type WardSlot } from '../../../ward-config-api';
import { InspectorCard } from './fields';

function Tally({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-[12px] px-sm py-xs ${tone}`}>
      <span className="font-sign text-[26px] font-extrabold leading-none font-tabular">
        {value}
      </span>
      <span className="text-body-xs font-semibold leading-tight">{label}</span>
    </div>
  );
}

/**
 * Suspend or reopen several slots at once, e.g. a whole kerb stretch closed for roadworks.
 * Runs the ordinary one-slot status change per slot, so each keeps its own version check,
 * audit entry and the backend's rules (no open application, no contract).
 */
export function BulkStatusPanel({
  slots,
  onDone,
  onCancel,
}: {
  slots: WardSlot[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [failures, setFailures] = useState<{ slotCode: string; message: string }[]>([]);
  const suspendable = slots.filter((s) => s.status === 'AVAILABLE');
  const reopenable = slots.filter((s) => s.status === 'SUSPENDED');
  const skipped = slots.length - suspendable.length - reopenable.length;

  const run = useMutation({
    mutationFn: async (target: 'SUSPENDED' | 'AVAILABLE') => {
      const batch = target === 'SUSPENDED' ? suspendable : reopenable;
      const failed: { slotCode: string; message: string }[] = [];
      for (const slot of batch) {
        try {
          await wardConfigApi.setSlotStatus(slot, target, reason.trim());
        } catch (error) {
          failed.push({ slotCode: slot.slotCode, message: errorMessage(error) });
        }
      }
      return { done: batch.length - failed.length, failed };
    },
    onSuccess: ({ done, failed }) => {
      setFailures(failed);
      showToast(
        failed.length
          ? `Đã đổi ${done} ô, ${failed.length} ô không đổi được (xem chi tiết).`
          : `Đã đổi trạng thái ${done} ô.`,
      );
      if (failed.length === 0) onDone();
    },
  });

  return (
    <InspectorCard
      eyebrow="Chọn nhiều"
      title={`Đã chọn ${slots.length} ô`}
      action={<Button label="Hủy" variant="ghost" fullWidth={false} onPress={onCancel} />}
    >
      <div aria-hidden="true" className="grid grid-cols-3 gap-xs">
        <Tally
          value={suspendable.length}
          label="có thể tạm ngưng"
          tone="bg-[#E6F6EC] text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]"
        />
        <Tally
          value={reopenable.length}
          label="có thể mở lại"
          tone="bg-[#EEF1F4] text-[#2B3640] dark:bg-[#1D2833] dark:text-[#C5D0DA]"
        />
        <Tally
          value={skipped}
          label="sẽ bỏ qua"
          tone="bg-[#FFF3D1] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]"
        />
      </div>
      <p className="text-body-md text-text">
        {suspendable.length} ô đang Trống có thể tạm ngưng, {reopenable.length} ô đang Tạm ngưng có
        thể mở lại.
        {skipped > 0 &&
          ` ${skipped} ô đang có đơn hoặc hợp đồng sẽ được bỏ qua: xử lý đơn ở Hộp duyệt, hoặc đình chỉ giấy phép ở Tuần tra.`}
      </p>
      <TextField
        label="Lý do (áp dụng cho tất cả ô đã chọn)"
        value={reason}
        onChangeText={setReason}
        maxLength={500}
        multiline
        placeholder="VD: Thi công vỉa hè đoạn Nút giao Hoàng Diệu đến 30/10"
      />
      <div className="grid gap-sm sm:grid-cols-2">
        <Button
          label={`Tạm ngưng ${suspendable.length} ô`}
          variant="outline"
          disabled={suspendable.length === 0 || !reason.trim() || run.isPending}
          loading={run.isPending && run.variables === 'SUSPENDED'}
          onPress={() => run.mutate('SUSPENDED')}
        />
        <Button
          label={`Mở lại ${reopenable.length} ô`}
          variant="outline"
          disabled={reopenable.length === 0 || !reason.trim() || run.isPending}
          loading={run.isPending && run.variables === 'AVAILABLE'}
          onPress={() => run.mutate('AVAILABLE')}
        />
      </div>
      {failures.length > 0 && (
        <ul
          className="flex flex-col gap-xs rounded-[12px] bg-[#FDEBEA] px-sm py-xs dark:bg-[#3A1414]"
          aria-live="polite"
        >
          {failures.map((f) => (
            <li
              key={f.slotCode}
              className="text-body-sm font-medium text-[#8F1717] dark:text-[#FF9A90]"
            >
              {f.slotCode}: {f.message}
            </li>
          ))}
        </ul>
      )}
    </InspectorCard>
  );
}
