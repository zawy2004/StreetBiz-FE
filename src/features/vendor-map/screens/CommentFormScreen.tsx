import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { ErrorState, Skeleton, showToast } from '@/components/feedback';
import { Screen, StickyActions } from '@/components/layout';
import { appendPhrase } from '@/features/buyer-discovery/append-phrase';
import { BackButton } from '@/features/buyer-discovery/components/BackButton';
import { BuyerPageHeader } from '../components/BuyerPageHeader';
import { CommunityConnection } from '../components/CommunityConnection';
import { NoteArea } from '../components/NoteArea';
import { PhraseChips } from '../components/PhraseChips';
import { RecentReviews, ReviewedVendorCard, StarPicker } from '../components/review/ReviewParts';
import { communityApi, CommunityApiError, useCommunitySession } from '../community-api';

const PROMPTS = ['Món ngon', 'Bán đúng ô', 'Sạch sẽ', 'Giá hợp lý', 'Phục vụ nhanh'];

/**
 * A review slip left on the counter: which stall, a row of large stars, a few
 * words (quick phrases to start from), then the buyer account it goes with,
 * right above the send button.
 */
export function CommentFormScreen() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = useCommunitySession((state) => state.token);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const profile = useQuery({
    queryKey: ['community', 'vendor', vendorId],
    queryFn: () => communityApi.profile(vendorId!),
    enabled: Boolean(vendorId),
  });
  const save = useMutation({
    mutationFn: () => communityApi.comment(vendorId!, rating, text.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['community', 'vendor', vendorId] });
      showToast('Đã lưu đánh giá');
      navigate(-1);
    },
  });

  if (profile.isPending) return <CommentFormSkeleton />;
  if (profile.isError || !profile.data) {
    return (
      <Screen>
        <div>
          <BackButton />
        </div>
        <ErrorState message="Không tìm thấy hộ kinh doanh đang hoạt động." />
      </Screen>
    );
  }

  const changeText = (value: string) => setText(value.slice(0, 1_000));

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="flex w-full flex-col gap-xs sm:flex-row sm:items-center sm:justify-end sm:gap-md">
            {!token ? (
              <p className="text-body-sm text-muted sm:text-right">Đăng nhập ở trên để gửi.</p>
            ) : null}
            <div className="sm:w-auto sm:min-w-[200px]">
              <Button
                label="Gửi đánh giá"
                onPress={() => save.mutate()}
                loading={save.isPending}
                disabled={!token || !text.trim() || text.trim().length > 1_000}
              />
            </div>
          </div>
        </StickyActions>
      }
    >
      <BuyerPageHeader title="Viết đánh giá" subtitle={profile.data.displayName} />
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-xl">
        <div className="flex min-w-0 max-w-[720px] flex-col gap-lg">
          <div className="xl:hidden">
            <ReviewedVendorCard vendor={profile.data} />
          </div>
          <section
            aria-labelledby="rating-title"
            className="flex flex-col items-center gap-md rounded-[24px] bg-card px-md py-lg shadow-card ring-1 ring-border md:py-xl"
          >
            <h2
              id="rating-title"
              className="text-center font-editorial text-[28px] font-semibold leading-tight text-text lg:text-[32px]"
            >
              Bạn thấy quán thế nào?
            </h2>
            <StarPicker value={rating} onChange={setRating} />
          </section>
          <section className="flex flex-col gap-sm">
            <PhraseChips
              label="Gợi ý viết nhanh"
              phrases={PROMPTS}
              text={text}
              onPick={(phrase) => changeText(appendPhrase(text, phrase))}
              invite={text.length === 0}
            />
            <NoteArea
              label="Nhận xét"
              value={text}
              onChangeText={changeText}
              placeholder="Chia sẻ trải nghiệm của bạn..."
              counter={`${text.length}/1000 ký tự`}
              ring={{ ratio: text.length / 1000, warn: text.length > 900 }}
              error={save.error instanceof CommunityApiError ? save.error.message : undefined}
            />
          </section>
          <CommunityConnection />
        </div>
        <aside className="hidden flex-col gap-md xl:sticky xl:top-0 xl:flex">
          <ReviewedVendorCard vendor={profile.data} />
          <RecentReviews vendor={profile.data} />
        </aside>
      </div>
    </Screen>
  );
}

/** The slip in outline while the vendor's profile loads (it is usually cached from the profile page). */
function CommentFormSkeleton() {
  return (
    <Screen>
      <div role="status" aria-label="Đang tải" className="flex max-w-[720px] flex-col gap-lg">
        <div className="flex items-center gap-sm">
          <BackButton />
          <Skeleton className="h-9 w-48" />
        </div>
        <Skeleton className="h-[88px] w-full !rounded-[20px]" />
        <div className="flex flex-col items-center gap-md rounded-[24px] bg-card p-lg ring-1 ring-border">
          <Skeleton className="h-7 w-56" />
          <div className="flex gap-sm">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-12 !rounded-full" />
            ))}
          </div>
        </div>
        <Skeleton className="h-[136px] w-full !rounded-[12px]" />
      </div>
    </Screen>
  );
}
