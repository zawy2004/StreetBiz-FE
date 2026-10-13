import { Skeleton } from '@/components/feedback';
import { ChoiceList, type Choice } from './ChoiceList';

type Props = {
  value: string;
  onChange: (value: string) => void;
  choices: Choice[];
  /** Live list still on its way (or not delivered): row skeletons and the baseline words. */
  loading: boolean;
  labelledBy: string;
};

/** The vendors as rows (not a 3-column grid), scrolling inside the sheet past five. */
export function VendorPicker({ value, onChange, choices, loading, labelledBy }: Props) {
  if (loading) {
    return (
      <div role="status" className="flex flex-col gap-xs">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            aria-hidden="true"
            className="flex min-h-14 items-center gap-sm rounded-[14px] border-[1.5px] border-border px-sm"
          >
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
        <p className="text-body-md text-muted">Đang tải danh sách hộ kinh doanh…</p>
      </div>
    );
  }
  if (choices.length === 0) {
    return (
      <p className="rounded-[14px] bg-sunken/70 p-md text-body-md text-muted">
        Chưa có hộ kinh doanh nào để chọn.
      </p>
    );
  }
  return (
    <ChoiceList
      value={value}
      onChange={onChange}
      groups={[{ choices }]}
      labelledBy={labelledBy}
      scroll={choices.length > 5}
    />
  );
}
