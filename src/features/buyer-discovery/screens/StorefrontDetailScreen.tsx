import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { ErrorState, Skeleton } from '@/components/feedback';
import { Screen } from '@/components/layout';
import { commerceApi, errorMessage } from '@/core/api';
import { useCanStartChat, useStartChat } from '@/features/chat/hooks/useChat';
import { BackButton } from '../components/BackButton';
import { ActionRow } from '../components/storefront/ActionRow';
import { HoursCard } from '../components/storefront/HoursCard';
import { SidewalkCard } from '../components/storefront/SidewalkCard';
import { StorefrontHero } from '../components/storefront/StorefrontHero';
import { StorefrontMenu } from '../components/storefront/StorefrontMenu';
import { directionsUrl, todayHoursText } from '../discovery-format';
import { useDiscoveryStore } from '../discovery-store';
import { todayStatus } from '../storefront-hours';

const BODY =
  'mx-auto grid w-full max-w-[1320px] gap-lg px-md pb-2xl md:px-lg lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:gap-x-xl lg:px-xl lg:[grid-template-areas:"menu_side""menu_hours"] xl:grid-cols-[minmax(0,1fr)_400px]';

/**
 * One storefront in full (DISC-06), as a magazine page about one stall: the
 * cover photo with its name, how today looks and the ways on, then the menu
 * (with a sticky category strip) beside the piece of pavement it stands on and
 * its week of hours.
 */
export function StorefrontDetailScreen() {
  const { storefrontId } = useParams<{ storefrontId: string }>();
  const navigate = useNavigate();
  const position = useDiscoveryStore((s) => s.position);
  const canChat = useCanStartChat();
  const startChat = useStartChat();
  const detail = useQuery({
    queryKey: ['commerce', 'storefront', storefrontId, position],
    queryFn: () => commerceApi.storefront(storefrontId!, position ?? undefined),
    enabled: Boolean(storefrontId),
  });

  if (detail.isPending) return <StorefrontDetailSkeleton />;
  if (detail.isError || !detail.data) {
    return (
      <Screen>
        <div>
          <BackButton />
        </div>
        <ErrorState message={errorMessage(detail.error)} onRetry={() => detail.refetch()} />
      </Screen>
    );
  }

  const { storefront, weeklyHours, menu } = detail.data;
  // The server's "open now" is the truth; when the published hours disagree, fall back to today's window.
  const status =
    todayStatus(weeklyHours, storefront.isOpenNow) ??
    (weeklyHours.length > 0 ? todayLine(todayHoursText(storefront)) : null);

  return (
    <Screen padded={false}>
      <StorefrontHero detail={detail.data} />

      <div className="mx-auto w-full max-w-[1320px] px-md pb-lg pt-md md:px-lg md:pt-lg lg:px-xl">
        <ActionRow
          status={status}
          isOpen={storefront.isOpenNow}
          directionsHref={directionsUrl(storefront.latitude, storefront.longitude)}
          onVendor={() => navigate(`/customer/explore/vendors/${storefront.vendorId}`)}
          chat={
            canChat
              ? {
                  loading: startChat.isPending,
                  onPress: () =>
                    startChat.mutate(storefront.storefrontId, {
                      onSuccess: (conversation) =>
                        navigate(`/customer/chat/${conversation.conversationId}`),
                    }),
                }
              : null
          }
          chatError={startChat.isError ? errorMessage(startChat.error) : null}
        />
      </div>

      <div className={BODY}>
        <div className="min-w-0 lg:self-start lg:[grid-area:side]">
          <SidewalkCard storefront={storefront} />
        </div>
        <div className="min-w-0 lg:[grid-area:menu]">
          <StorefrontMenu
            menu={menu}
            onOpenItem={(item) => navigate(`/customer/explore/items/${item.menuItemId}`)}
          />
        </div>
        <div className="min-w-0 lg:self-start lg:[grid-area:hours]">
          <HoursCard weeklyHours={weeklyHours} />
        </div>
      </div>
    </Screen>
  );
}

function todayLine(text: string | null): string | null {
  if (!text) return null;
  return text === 'Nghỉ hôm nay' ? 'Hôm nay quán nghỉ' : `Hôm nay mở ${text}`;
}

/** The page's outline while it loads: cover, name, the three actions, chips and dish rows. */
function StorefrontDetailSkeleton() {
  return (
    <Screen padded={false}>
      <div role="status" aria-label="Đang tải quán" className="flex flex-col">
        <div className="mx-auto w-full max-w-[1320px] md:px-lg md:pt-md lg:px-xl lg:pt-lg">
          <div className="relative aspect-[4/3] overflow-hidden md:aspect-[16/9] md:rounded-[28px] lg:aspect-auto lg:h-[380px] lg:rounded-[32px] xl:h-[460px] xl:rounded-[36px]">
            <Skeleton className="absolute inset-0 !rounded-none" />
            <div className="absolute left-sm top-sm md:left-md md:top-md">
              <BackButton floating />
            </div>
            <div className="absolute inset-x-sm bottom-sm flex flex-col gap-sm rounded-[22px] bg-card/80 p-md md:inset-x-auto md:bottom-md md:left-md md:w-[60%]">
              <Skeleton className="h-9 w-[60%]" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-md px-md pt-lg md:px-lg lg:px-xl">
          <Skeleton className="h-6 w-56" />
          <div className="flex gap-sm">
            <Skeleton className="h-12 w-32 !rounded-[12px]" />
            <Skeleton className="h-12 w-44 !rounded-[12px]" />
            <Skeleton className="h-12 w-36 !rounded-[12px]" />
          </div>
          <div className="mt-sm flex gap-xs">
            <Skeleton className="h-11 w-32 !rounded-full" />
            <Skeleton className="h-11 w-24 !rounded-full" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-md">
              <Skeleton className="h-[88px] w-[88px] shrink-0 !rounded-[16px] md:h-[112px] md:w-[112px]" />
              <div className="flex flex-1 flex-col gap-xs pt-1">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}
