import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { ErrorState, Skeleton } from '@/components/feedback';
import { Screen, StickyActions } from '@/components/layout';
import { BackButton } from '@/features/buyer-discovery/components/BackButton';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import {
  CommunityScore,
  ProfileActions,
  ReviewList,
  VendorLocation,
  VendorSignboard,
} from '../components/profile/ProfileParts';
import { communityApi, CommunityApiError } from '../community-api';

/**
 * A vendor's public profile, as the signboard of a pavement slot (who, which
 * slot, is the permit good and for how long), then the community's score, the
 * two ways to have a say, where they trade, and the guest book of reviews.
 */
export function VendorProfileScreen() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const profile = useQuery({
    queryKey: ['community', 'vendor', vendorId],
    queryFn: () => communityApi.profile(vendorId!),
    enabled: Boolean(vendorId),
  });

  if (profile.isPending) return <VendorProfileSkeleton />;
  if (profile.isError || !profile.data) {
    return (
      <Screen>
        <div>
          <BackButton />
        </div>
        <ErrorState
          message={
            profile.error instanceof CommunityApiError
              ? profile.error.message
              : 'Không tìm thấy hộ kinh doanh.'
          }
          onRetry={() => profile.refetch()}
        />
      </Screen>
    );
  }

  const vendor = profile.data;
  const actions = (layout: 'stack' | 'row') => (
    <ProfileActions
      layout={layout}
      onReview={() => navigate(`/customer/explore/vendors/${vendor.vendorId}/comments/new`)}
      onReport={() => navigate(`/customer/explore/vendors/${vendor.vendorId}/reports/new`)}
    />
  );

  return (
    <Screen footer={isDesktop ? undefined : <StickyActions>{actions('row')}</StickyActions>}>
      <div>
        <BackButton />
      </div>
      <VendorSignboard vendor={vendor} />
      <div className="grid gap-md lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-lg">
        <CommunityScore vendor={vendor} />
        <div className="flex flex-col gap-md">
          {isDesktop ? actions('stack') : null}
          <VendorLocation vendor={vendor} />
        </div>
      </div>
      <ReviewList comments={vendor.comments} />
    </Screen>
  );
}

/** The signboard, the score and two reviews in outline while the profile loads. */
function VendorProfileSkeleton() {
  return (
    <Screen>
      <div role="status" aria-label="Đang tải hồ sơ hộ kinh doanh" className="flex flex-col gap-md">
        <div>
          <BackButton />
        </div>
        <div className="overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border">
          <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
          <div className="flex min-h-[200px] flex-col gap-md p-md md:p-lg lg:flex-row lg:items-center lg:p-xl">
            <Skeleton className="h-24 w-24 shrink-0 !rounded-[20px] lg:h-40 lg:w-40" />
            <div className="flex flex-1 flex-col gap-sm">
              <Skeleton className="h-10 w-[60%]" />
              <Skeleton className="h-10 w-[120px] !rounded-[8px]" />
              <Skeleton className="h-5 w-1/3" />
            </div>
            <Skeleton className="h-[96px] w-[220px] !rounded-[20px]" />
          </div>
        </div>
        <div className="grid gap-md lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-[200px] w-full !rounded-[24px]" />
          <Skeleton className="h-[200px] w-full !rounded-[24px]" />
        </div>
        <div className="grid gap-md md:grid-cols-2">
          <Skeleton className="h-[140px] w-full !rounded-[24px]" />
          <Skeleton className="h-[140px] w-full !rounded-[24px]" />
        </div>
      </div>
    </Screen>
  );
}
