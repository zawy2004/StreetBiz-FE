import { useId } from 'react';

import { Button, Icon } from '@/components/common';
import { ConsentRow } from '../components/wizard/OwnerParts';
import {
  missingRows,
  speakableGroup,
  type CardGroup,
  type CardRow,
  type EditTarget,
} from './confirm-card-model';
import { SOURCE_LABELS, type FieldSource } from './interview-state';
import type { useReadAloud } from './useReadAloud';

type Props = {
  groups: CardGroup[];
  foodSafety: boolean;
  onFoodSafety: (value: boolean) => void;
  onEdit: (target: EditTarget) => void;
  onSubmit: () => void;
  submitting: boolean;
  error?: string;
  reader: ReturnType<typeof useReadAloud>;
};

const FOOD_SAFETY_TEXT =
  'Tôi cam kết bảo đảm điều kiện an toàn thực phẩm trong quá trình kinh doanh (hộ kinh doanh nhỏ lẻ được miễn Giấy chứng nhận cơ sở đủ điều kiện ATTP nhưng vẫn phải tự chịu trách nhiệm đáp ứng các điều kiện an toàn thực phẩm theo quy định).';

/**
 * The one card the vendor checks before filing: each value with where it came from, the shaky
 * ones tinted, a speaker per group and a "Sửa" that opens the matching wizard step. "Đúng, nộp"
 * is the only thing that files, and only when nothing required is missing (BR-41).
 */
export function ConfirmCard({
  groups,
  foodSafety,
  onFoodSafety,
  onEdit,
  onSubmit,
  submitting,
  error,
  reader,
}: Props) {
  const blockedId = useId();
  const missing = missingRows(groups);
  const blocked = missing.length > 0 || !foodSafety;

  return (
    <div className="flex flex-col gap-md">
      <p className="flex items-start gap-sm rounded-[16px] bg-secondary-bg px-md py-sm text-body-md text-on-secondary">
        <Icon name="creation" size={18} color="currentColor" weight="fill" className="mt-0.5 shrink-0" />
        <span>
          <strong>[AI]</strong> Nội dung do trợ lý AI soạn từ lời bạn kể và ảnh CCCD. Bạn kiểm tra
          từng dòng — chỉ khi bạn bấm <strong>Đúng, nộp</strong> hồ sơ mới được gửi tới phường.
        </span>
      </p>

      {groups.map((group) => (
        <GroupCard key={group.key} group={group} onEdit={onEdit} reader={reader} />
      ))}

      <section className="flex flex-col gap-sm rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
        <div className="flex items-center justify-between gap-sm">
          <h3 className="font-sign text-[20px] font-extrabold text-text">Cam kết</h3>
          {reader.supported ? (
            <SpeakButton onPress={() => reader.speak(FOOD_SAFETY_TEXT)} label="Đọc cam kết cho tôi nghe" />
          ) : null}
        </div>
        <ConsentRow checked={foodSafety} onChange={onFoodSafety} invalid={!foodSafety && missing.length === 0}>
          {FOOD_SAFETY_TEXT}
        </ConsentRow>
      </section>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-sm rounded-[14px] bg-[#FDEBEA] p-sm text-[15px] font-medium leading-[22px] text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]"
        >
          <Icon name="alert-circle-outline" size={18} color="currentColor" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-xs">
        <Button
          label="Đúng, nộp"
          size="lg"
          disabled={blocked}
          loading={submitting}
          describedBy={blocked ? blockedId : undefined}
          icon={<Icon name="send-outline" size={20} color="currentColor" />}
          onPress={onSubmit}
        />
        {blocked ? (
          <p id={blockedId} className="text-body-md font-medium text-[#8A5300] dark:text-[#FFD27A]">
            {missing.length > 0
              ? `Còn thiếu: ${missing.map((r) => r.label.charAt(0).toLocaleLowerCase('vi-VN') + r.label.slice(1)).join(', ')}. Bấm "Sửa" ở nhóm đó để bổ sung.`
              : 'Bật cam kết an toàn thực phẩm để nộp.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function GroupCard({
  group,
  onEdit,
  reader,
}: {
  group: CardGroup;
  onEdit: (target: EditTarget) => void;
  reader: Props['reader'];
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-sm rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
    >
      <div className="flex items-center justify-between gap-sm">
        <h3 id={headingId} className="font-sign text-[20px] font-extrabold text-text">
          {group.title}
        </h3>
        <div className="flex items-center gap-xs">
          {reader.supported ? (
            <SpeakButton onPress={() => reader.speak(speakableGroup(group))} label={`Đọc nhóm ${group.title} cho tôi nghe`} />
          ) : null}
          <Button
            label="Sửa"
            variant="outline"
            size="sm"
            fullWidth={false}
            icon={<Icon name="pencil-outline" size={16} color="currentColor" />}
            onPress={() => onEdit(group.edit)}
          />
        </div>
      </div>
      <dl className="flex flex-col divide-y divide-border/70">
        {group.rows.map((row) => (
          <Row key={row.key} row={row} />
        ))}
      </dl>
    </section>
  );
}

function Row({ row }: { row: CardRow }) {
  const missing = row.value === null;
  const tint = missing ? (row.required ? 'missing' : row.warn ? 'warn' : 'none') : row.warn ? 'warn' : 'none';
  return (
    <div
      className={`flex flex-col gap-1 py-sm sm:flex-row sm:items-start sm:gap-md ${
        tint === 'none'
          ? 'first:pt-0 last:pb-0'
          : `-mx-sm my-0.5 rounded-[12px] border-0 px-sm ${
              tint === 'warn' ? 'bg-[#FFF3D1] dark:bg-[#3A2A08]' : 'bg-[#FDEBEA] dark:bg-[#3A1414]'
            }`
      }`}
    >
      <dt className="text-body-md text-muted sm:w-[160px] sm:shrink-0 sm:pt-0.5">{row.label}</dt>
      <dd className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={`break-words text-[17px] font-semibold leading-6 ${
            missing ? (row.required ? 'text-error' : 'text-muted') : 'text-text'
          }`}
        >
          {row.value ?? (row.required ? 'Còn thiếu' : '—')}
        </span>
        {row.source || row.note ? (
          <span className="flex flex-wrap items-center gap-xs">
            {row.source ? <SourceChip source={row.source} /> : null}
            {row.warn && !missing ? (
              <span className="text-body-sm font-semibold text-[#8A5300] dark:text-[#FFD27A]">
                Kiểm tra kỹ dòng này
              </span>
            ) : null}
            {row.note ? <span className="text-body-sm text-muted">{row.note}</span> : null}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

const CHIP_TONE: Record<FieldSource, string> = {
  VOICE: 'bg-secondary-bg text-on-secondary',
  CCCD: 'bg-[#E8F0FE] text-[#1F3F8F] dark:bg-[#1A2440] dark:text-[#A9C1FF]',
  TYPED: 'bg-sunken text-text',
  CHOSEN: 'bg-sunken text-text',
  DEFAULT: 'bg-sunken text-muted',
  EDITED: 'bg-tint-tertiary text-tertiary',
};

export function SourceChip({ source }: { source: FieldSource }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2 text-[12px] font-bold ${CHIP_TONE[source]}`}>
      {SOURCE_LABELS[source]}
    </span>
  );
}

function SpeakButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-bg text-on-secondary transition hover:brightness-95"
    >
      <Icon name="volume-high" size={18} color="currentColor" weight="fill" />
    </button>
  );
}
