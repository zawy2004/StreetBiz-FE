import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Avatar, Button, Card, Icon, Money } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { commerceApi, errorMessage } from '@/core/api';
import { colors } from '@/theme';
import { OpenBadge } from '../components/StorefrontCard';
import { directionsUrl, formatDistance, ratingText, vietnamWeekday, weeklySchedule } from '../discovery-format';
import { useDiscoveryStore } from '../discovery-store';

/** One storefront in full: where it is, when it opens and what it sells (DISC-06). */
export function StorefrontDetailScreen() {
  const { storefrontId } = useParams<{ storefrontId: string }>();
  const navigate = useNavigate();
  const position = useDiscoveryStore((s) => s.position);
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
      <Card>
        <div className="flex flex-col gap-sm">
          <div className="flex gap-sm">
            <Avatar uri={storefront.imageUrl ?? undefined} name={storefront.storefrontName} size={64} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <OpenBadge isOpen={storefront.isOpenNow} />
              <span className="flex items-center gap-1 text-body-md text-text">
                <Icon name="star" size={16} color={colors.secondary} />
                {ratingText(storefront.communityRating, storefront.communityCount)}
              </span>
            </div>
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
          </div>
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-headline-sm text-text">{item.itemName}</p>
                    {item.description ? (
                      <p className="truncate text-body-sm text-muted">{item.description}</p>
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
