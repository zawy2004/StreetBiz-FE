import { useId, useMemo, useState } from 'react';

import { Icon } from '@/components/common';
import type { PenaltyScheduleItem } from '../../../ward-api';
import { ChoiceList, type Choice, type ChoiceGroup } from './ChoiceList';
import { foldText, groupSchedules } from './violation-utils';

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** The ward's schedules in force; empty when they could not be loaded (or in demo mode). */
  schedules: PenaltyScheduleItem[];
  /** The five fixed types the screen falls back to without schedules. */
  fallbackLabels: Record<string, string>;
  labelledBy: string;
};

const MISSING_BASIS =
  'Thiếu căn cứ pháp lý: lập được biên bản nhưng chưa thể ra quyết định xử phạt tiền';

/**
 * The violation list, split into "can be fined" and "record only" once there
 * are enough of them to need it, with a name filter for a long schedule.
 * Same value / onChange contract as the SelectField it replaces.
 */
export function ViolationTypePicker({
  value,
  onChange,
  schedules,
  fallbackLabels,
  labelledBy,
}: Props) {
  const filterId = useId();
  const [query, setQuery] = useState('');

  const fromSchedules = schedules.length > 0;
  const total = fromSchedules ? schedules.length : Object.keys(fallbackLabels).length;
  const showFilter = total > 5;

  const groups = useMemo<ChoiceGroup[]>(() => {
    const q = foldText(query);
    const matches = (text: string) => !q || foldText(text).includes(q);

    if (!fromSchedules) {
      const choices: Choice[] = Object.keys(fallbackLabels)
        .filter((key) => matches(fallbackLabels[key] || key))
        .map((key) => ({
          value: key,
          label: fallbackLabels[key] || key,
          detail: 'Căn cứ Nghị định 168/2024/NĐ-CP',
        }));
      return choices.length ? [{ choices }] : [];
    }

    const toChoice = (s: PenaltyScheduleItem): Choice =>
      s.legalBasis
        ? {
            value: s.violationType,
            label: s.violationTypeName,
            detail: `${s.penaltyAmount.toLocaleString('vi-VN')} đ · ${s.legalBasis}`,
          }
        : {
            value: s.violationType,
            label: s.violationTypeName,
            detail: MISSING_BASIS,
            tone: 'warn',
          };

    const visible = schedules.filter((s) =>
      matches(`${s.violationTypeName} ${s.legalBasis ?? ''}`),
    );
    if (schedules.length < 4) {
      return visible.length ? [{ choices: visible.map(toChoice) }] : [];
    }
    const { withBasis, withoutBasis } = groupSchedules(visible);
    return [
      { title: 'Có căn cứ pháp lý', choices: withBasis.map(toChoice) },
      {
        title: 'Thiếu căn cứ',
        note: 'chỉ lập được biên bản',
        choices: withoutBasis.map(toChoice),
      },
    ].filter((g) => g.choices.length > 0);
  }, [fromSchedules, fallbackLabels, schedules, query]);

  const selectedHidden = !groups.some((g) => g.choices.some((c) => c.value === value));

  return (
    <div className="flex flex-col gap-sm">
      {showFilter ? (
        <div className="input-shell flex h-12 items-center gap-xs rounded-sm border border-border bg-card px-sm hover:border-muted/50">
          <Icon name="magnify" size={20} color="currentColor" className="shrink-0 text-muted" />
          <label htmlFor={filterId} className="sr-only">
            Lọc hành vi theo tên
          </label>
          <input
            id={filterId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Lọc hành vi theo tên hoặc căn cứ"
            className="h-full min-w-0 flex-1 bg-transparent text-body-lg text-text outline-none placeholder:text-muted/80"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Xoá ô lọc"
              className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-sunken hover:text-text"
            >
              <Icon name="close" size={18} color="currentColor" />
            </button>
          ) : null}
        </div>
      ) : null}

      {!fromSchedules ? (
        <p className="flex items-center gap-1.5 text-body-sm text-muted">
          <Icon name="information-outline" size={16} color="currentColor" className="shrink-0" />
          Biểu phạt của phường chưa tải được. Danh sách dưới đây là các hành vi mặc định.
        </p>
      ) : null}

      {groups.length > 0 ? (
        <ChoiceList
          value={value}
          onChange={onChange}
          groups={groups}
          labelledBy={labelledBy}
          scroll={total > 8}
        />
      ) : (
        <div className="flex flex-col items-start gap-xs rounded-[14px] bg-sunken/70 p-md">
          <p className="text-body-md text-text">Không có hành vi nào khớp “{query}”.</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="min-h-12 rounded-sm px-xs text-label text-primary hover:underline"
          >
            Xoá ô lọc
          </button>
        </div>
      )}

      {query && selectedHidden && groups.length > 0 ? (
        <p className="text-body-sm text-muted">
          Hành vi đang chọn không nằm trong kết quả lọc nhưng vẫn được giữ.
        </p>
      ) : null}
    </div>
  );
}
