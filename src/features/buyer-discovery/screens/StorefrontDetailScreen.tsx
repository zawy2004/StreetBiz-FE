import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Icon, Money } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { commerceApi, errorMessage } from '@/core/api';
import { useCanStartChat, useStartChat } from '@/features/chat/hooks/useChat';
import { colors } from '@/theme';
import { categoryIcon } from '../category-icons';
import { FoodImage } from '../components/FoodImage';
import { OpenBadge } from '../components/StorefrontCard';
import { directionsUrl, formatDistance, ratingText, vietnamWeekday, weeklySchedule } from '../discovery-format';
import { useDiscoveryStore } from '../discovery-store';
import { menuItemPhotos, storefrontPhotos } from '../food-photos';

/** One storefront in full: where it is, when it opens and what it sells (DISC-06). */
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

  if (detail.isPending) return <LoadingState />;
  if (detail.isError || !detail.data) {
    return <ErrorState message={errorMessage(detail.error)} onRetry={() => detail.refetch()} />;
  }

  const { storefront, weeklyHours, menu } = detail.data;
  const schedule = weeklySchedule(weeklyHours);
  const today = vietnamWeekday();
  const distance = formatDistance(storefront.distanceMeters);

  return (
    <Screen>
      <AppHeader title={storefront.storefrontName} back />
      <FoodImage
        photos={storefrontPhotos(storefront)}
        icon={categoryIcon(storefront.categories[0])}
        iconSize={56}
        iconColor={colors.primary}
        placeholderClassName="bg-tint-primary"
        className="aspect-[16/9] w-full rounded-md md:aspect-[21/8]"
        imgClassName={storefront.isOpenNow ? '' : 'grayscale-[60%]'}
        showIllustrativeTag
      />
      <Card>
        <div className="flex flex-col gap-sm">
          <div className="flex flex-wrap items-center gap-sm">
            <OpenBadge isOpen={storefront.isOpenNow} />
            <span className="flex items-center gap-1 text-body-md text-text">
              <Icon name="star" size={16} color={colors.secondary} />
              {ratingText(storefront.communityRating, storefront.communityCount)}
            </span>
          </div>
          {storefront.description ? <p className="text-body-md text-text">{storefront.description}</p> : null}
          <div className="flex items-start gap-xs text-body-md text-muted">
            <Icon name="map-marker-outline" size={18} color={colors.muted} />
            <span>
              {storefront.address ? `${storefront.address} · ` : ''}
              {storefront.zoneName} · Ô {storefront.slotCode} · {storefront.wardName}
              {distance ? ` · ${distance}` : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-sm">
            <a
              href={directionsUrl(storefront.latitude, storefront.longitude)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-sm border border-border px-lg text-headline-sm text-indigo"
            >
              Chỉ đường
            </a>
            <Button
              label="Hộ kinh doanh"
              variant="outline"
              fullWidth={false}
              onPress={() => navigate(`/customer/explore/vendors/${storefront.vendorId}`)}
            />
            {canChat ? (
              <Button
                label="Nhắn tin cho người bán"
                variant="outline"
                fullWidth={false}
                loading={startChat.isPending}
                onPress={() =>
                  startChat.mutate(storefront.storefrontId, {
                    onSuccess: (conversation) =>
                      navigate(`/customer/chat/${conversation.conversationId}`),
                  })
                }
              />
            ) : null}
          </div>
          {startChat.isError ? (
            <p className="text-body-md text-error">{errorMessage(startChat.error)}</p>
          ) : null}
        </div>
      </Card>

      <Section title="Giờ mở cửa">
        <Card>
          {schedule ? (
            <ul className="flex flex-col gap-1">
              {schedule.map((day) => (
                <li
                  key={day.day}
                  className={`flex justify-between text-body-md ${day.day === today ? 'font-semibold text-text' : 'text-muted'}`}
                >
                  <span>{day.label}</span>
                  <span>{day.ranges.length > 0 ? day.ranges.join(', ') : 'Nghỉ'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-md text-muted">Quán chưa đăng giờ mở cửa.</p>
          )}
        </Card>
      </Section>

      <Section title="Thực đơn">
        {menu.length === 0 ? <EmptyState icon="silverware-fork-knife" title="Chưa có món nào" /> : null}
        {menu.map((category) => (
          <div key={category.categoryId} className="flex flex-col gap-xs">
            <h3 className="text-label text-muted">{category.categoryName}</h3>
            {category.items.map((item) => (
              <Card key={item.menuItemId} onPress={() => navigate(`/customer/explore/items/${item.menuItemId}`)}>
                <div className="flex items-center justify-between gap-sm">
                  <FoodImage
                    photos={menuItemPhotos(item)}
                    icon={categoryIcon(item.categoryName)}
                    iconSize={28}
                    iconColor={colors.muted}
                    className="size-20 shrink-0 rounded-sm"
                    imgClassName={item.availabilityStatus === 'SOLD_OUT' ? 'grayscale' : ''}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-headline-sm text-text">{item.itemName}</p>
                    {item.description ? (
                      <p className="line-clamp-2 text-body-sm text-muted">{item.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Money amountVnd={item.unitPrice} />
                    {item.availabilityStatus === 'SOLD_OUT' ? <StatusChip code="SOLD_OUT" /> : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}
      </Section>
    </Screen>
  );
}
