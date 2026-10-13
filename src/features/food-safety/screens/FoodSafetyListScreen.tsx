import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Icon } from '@/components/common';
import { ConfirmDialog, ErrorState, showToast } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { foodSafetyApi, type FoodSafetyApplication } from '@/core/api/food-safety-api';
import {
  ApplicationCard,
  AttpEmpty,
  AttpListSkeleton,
  FoodSafetyGuideBand,
} from '../components/vendor/AttpVendorParts';
import { groupApplications } from '../view';

/** Files past this many in the "finished" group wait behind "Xem thêm". */
const CLOSED_SHOWN = 3;

function Group({
  id,
  title,
  tone = 'plain',
  children,
}: {
  id: string;
  title: string;
  tone?: 'plain' | 'todo';
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-sm">
      <h2
        id={id}
        className={
          tone === 'todo'
            ? 'flex w-fit items-center gap-xs rounded-[10px] bg-[#FFF3D1] px-sm py-1 font-heading text-[19px] font-bold text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]'
            : 'font-heading text-[19px] font-bold text-text'
        }
      >
        {tone === 'todo' ? (
          <Icon name="alert-circle-outline" size={20} color="currentColor" />
        ) : null}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The vendor's ATTP files: where each one is in the ward → department → result flow. */
export function FoodSafetyListScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const storefrontId = params.get('storefrontId');
  const cache = useQueryClient();
  const list = useQuery({ queryKey: ['food-safety', 'mine'], queryFn: foodSafetyApi.mine });
  const [withdrawing, setWithdrawing] = useState<FoodSafetyApplication | null>(null);
  const [showAllClosed, setShowAllClosed] = useState(false);
  const now = useMemo(() => Date.now(), []);
  const withdraw = useMutation({
    mutationFn: (id: number) => foodSafetyApi.withdraw(id),
    onSuccess: async () => {
      setWithdrawing(null);
      await cache.invalidateQueries({ queryKey: ['food-safety'] });
      await cache.invalidateQueries({ queryKey: ['commerce'] });
      showToast('Đã rút hồ sơ');
    },
  });

  if (list.isPending) return <AttpListSkeleton />;
  if (list.isError)
    return <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />;

  const newUrl = `/vendor/store/food-safety/new${storefrontId ? `?storefrontId=${storefrontId}` : ''}`;
  const groups = groupApplications(list.data);
  // The first certificate on the page is the one whose stamp comes down.
  const featuredId =
    groups.valid[0]?.applicationId ??
    groups.closed.find((a) => a.status === 'APPROVED')?.applicationId;

  const card = (application: FoodSafetyApplication, wide = true) => (
    <ApplicationCard
      key={application.applicationId}
      application={application}
      highlighted={Boolean(storefrontId) && Number(storefrontId) === application.storefrontId}
      featured={application.applicationId === featuredId}
      wide={wide}
      now={now}
      onResubmit={() => navigate(`/vendor/store/food-safety/${application.applicationId}/edit`)}
      onWithdraw={() => setWithdrawing(application)}
    />
  );

  const closed = showAllClosed ? groups.closed : groups.closed.slice(0, CLOSED_SHOWN);
  const hiddenClosed = groups.closed.length - closed.length;
  const tally = [
    {
      value: groups.valid.length,
      label: 'giấy còn hiệu lực',
      tone: 'text-[#0B5D33] dark:text-[#8BE3B0]',
    },
    {
      value: groups.reviewing.length,
      label: 'đang xét',
      tone: 'text-[#6B4100] dark:text-[#FFD27A]',
    },
    { value: groups.todo.length, label: 'cần bổ sung', tone: 'text-[#8F1717] dark:text-[#FF9A90]' },
  ];

  return (
    <Screen>
      <AppHeader title="Giấy ATTP" back subtitle="An toàn thực phẩm cho món bán tại gian hàng" />
      <FoodSafetyGuideBand onApply={() => navigate(newUrl)} />

      {list.data.length === 0 ? (
        <AttpEmpty />
      ) : (
        <>
          <ul aria-label="Tình trạng hồ sơ" className="flex flex-wrap gap-xs">
            {tally.map((item) => (
              <li
                key={item.label}
                className="flex items-baseline gap-1.5 rounded-full bg-card px-sm py-1.5 shadow-card ring-1 ring-border"
              >
                <span
                  className={`font-sign text-[20px] font-bold leading-none tabular-nums ${item.value ? item.tone : 'text-muted'}`}
                >
                  {item.value}
                </span>
                <span className="text-body-md text-text">{item.label}</span>
              </li>
            ))}
          </ul>

          {groups.todo.length ? (
            <Group id="attp-todo" title="Cần bạn bổ sung" tone="todo">
              {groups.todo.map((a) => card(a))}
            </Group>
          ) : null}
          {groups.reviewing.length ? (
            <Group id="attp-reviewing" title="Đang xét">
              {groups.reviewing.map((a) => card(a))}
            </Group>
          ) : null}
          {groups.valid.length ? (
            <Group id="attp-valid" title="Giấy còn hiệu lực">
              <div className={`grid gap-md ${groups.valid.length > 1 ? 'xl:grid-cols-2' : ''}`}>
                {groups.valid.map((a) => card(a, groups.valid.length === 1))}
              </div>
            </Group>
          ) : null}
          {groups.closed.length ? (
            <Group id="attp-closed" title="Đã kết thúc">
              {closed.map((a) => card(a))}
              {hiddenClosed > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllClosed(true)}
                  className="inline-flex h-12 w-fit items-center gap-xs rounded-[12px] px-md text-[15px] font-semibold text-primary hover:bg-tint-primary"
                >
                  Xem thêm {hiddenClosed} hồ sơ
                  <Icon name="chevron-down" size={16} color="currentColor" />
                </button>
              ) : null}
            </Group>
          ) : null}
        </>
      )}
      {withdraw.isError ? (
        <p
          role="alert"
          className="flex items-start gap-xs rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-lg text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]"
        >
          <Icon
            name="alert-circle-outline"
            size={20}
            color="currentColor"
            className="mt-[3px] shrink-0"
          />
          {errorMessage(withdraw.error)}
        </p>
      ) : null}
      <ConfirmDialog
        visible={Boolean(withdrawing)}
        title="Rút hồ sơ ATTP?"
        description="Phường sẽ không xét hồ sơ này nữa. Bạn có thể nộp hồ sơ mới sau."
        confirmLabel="Rút hồ sơ"
        confirmVariant="danger"
        onConfirm={() => {
          if (withdrawing && !withdraw.isPending) withdraw.mutate(withdrawing.applicationId);
        }}
        onCancel={() => setWithdrawing(null)}
      />
    </Screen>
  );
}
