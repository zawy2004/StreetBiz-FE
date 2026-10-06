import { useState } from 'react';

import { Button, Card, Icon } from '@/components/common';
import { showToast } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { directionsUrl } from '@/features/buyer-discovery/discovery-format';
import { colors } from '@/theme';
import { formatOrderTime } from '../components/order-format';
import { useAnnounceArrival } from '../hooks/useOrderTracking';
import { distanceLabel, haversineMeters, walkingMinutes } from '../pickup/pickup-range';
import { useGeolocationPermission, useLivePosition } from '../pickup/useLivePosition';
import type { OrderStorefront, PickupPoint } from '../types/order.types';

/** Styled as the app's small outline button, but a real link: it opens the maps app. */
export function DirectionsLink({ point, label = 'Chỉ đường' }: { point: PickupPoint; label?: string }) {
  return (
    <a
      href={directionsUrl(point.latitude, point.longitude)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-9 min-h-9 shrink-0 items-center justify-center gap-xs rounded-sm border border-border bg-card px-sm text-label font-semibold text-text transition-[background-color,border-color] duration-150 hover:border-muted/50 hover:bg-sunken"
    >
      <Icon name="directions" size={18} />
      {label}
    </a>
  );
}

/** The same 2 minutes the server waits before it pings the stall again. */
const RESEND_AFTER_MS = 2 * 60_000;

/**
 * "Tôi đang đến": the customer tells the stall they are on the way, with a walking ETA when the
 * distance is known, so the food is finished as they arrive. Pickup orders have no courier to
 * report progress; the customer is the courier.
 */
function ArrivalNotice({
  orderId,
  notifiedAt,
  etaMinutes,
}: {
  orderId: number;
  notifiedAt: string | null | undefined;
  etaMinutes: number | undefined;
}) {
  const announce = useAnnounceArrival(orderId);
  const sentAt = announce.data?.notifiedAt ?? notifiedAt ?? null;
  const canResend = !sentAt || Date.now() - new Date(sentAt).getTime() >= RESEND_AFTER_MS;

  const send = () =>
    announce.mutate(etaMinutes, {
      onSuccess: (notice) =>
        showToast(notice.alreadySent ? 'Quán đã nhận được thông báo của bạn.' : 'Đã báo quán bạn đang đến.'),
      onError: (error) => showToast(errorMessage(error)),
    });

  if (sentAt) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <span className="flex items-center gap-2xs text-body-sm text-text">
          <Icon name="check-circle-outline" size={16} color={colors.tertiary} />
          Đã báo quán bạn đang đến lúc {formatOrderTime(sentAt)}
        </span>
        {canResend ? (
          <Button label="Báo lại" size="sm" variant="ghost" fullWidth={false} loading={announce.isPending} onPress={send} />
        ) : null}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-sm">
      <span className="text-body-sm text-muted">
        Sắp tới quầy? Báo quán để món vừa xong khi bạn đến.
      </span>
      <Button
        label="Tôi đang đến"
        size="sm"
        fullWidth={false}
        loading={announce.isPending}
        disabled={announce.isPending}
        onPress={send}
      />
    </div>
  );
}

/**
 * Where to collect the order. While the order is still to be collected it also shows how far the
 * customer is, opens directions, and lets them tell the stall they are on the way. It only follows
 * their position if they have allowed location before, otherwise it offers to, rather than
 * prompting on its own.
 */
export function PickupPointCard({
  storefront,
  point,
  active,
  orderId,
  arrivalNotifiedAt,
}: {
  storefront: OrderStorefront;
  point: PickupPoint | undefined;
  active: boolean;
  orderId?: number;
  arrivalNotifiedAt?: string | null;
}) {
  const permission = useGeolocationPermission();
  const [asked, setAsked] = useState(false);
  const follow = active && Boolean(point) && (permission === 'granted' || asked);
  const live = useLivePosition(follow);
  const meters = point && live.fix ? haversineMeters(point, live.fix) : null;

  return (
    <Card>
      <div className="flex items-center gap-sm">
        {storefront.imageUrl ? (
          <img src={storefront.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-sm object-cover" />
        ) : null}
        <div className="min-w-0">
          <p className="text-headline-sm text-text">{storefront.storefrontName}</p>
          {storefront.address ? <p className="text-body-sm text-muted">{storefront.address}</p> : null}
          <p className="text-body-sm text-muted">Nhận trực tiếp tại điểm bán</p>
        </div>
      </div>
      {active && point ? (
        <>
          <div className="mt-sm flex flex-wrap items-center justify-between gap-sm border-t border-border pt-sm">
            {follow ? (
              live.status === 'DENIED' || live.status === 'UNAVAILABLE' ? (
                <span className="text-body-sm text-muted">Bật định vị để xem khoảng cách</span>
              ) : meters == null ? (
                <span className="text-body-sm text-muted">Đang xác định khoảng cách…</span>
              ) : (
                <span className="flex items-center gap-2xs text-body-sm text-text">
                  <Icon name="walk" size={16} />
                  Cách bạn {distanceLabel(meters)} · khoảng {walkingMinutes(meters)} phút đi bộ
                </span>
              )
            ) : permission === 'denied' ? (
              <span className="text-body-sm text-muted">Bật định vị để xem khoảng cách</span>
            ) : (
              <button
                type="button"
                onClick={() => setAsked(true)}
                className="flex items-center gap-2xs rounded-sm text-label font-semibold text-primary hover:underline"
              >
                <Icon name="crosshairs-gps" size={16} />
                Xem khoảng cách đến quán
              </button>
            )}
            <DirectionsLink point={point} />
          </div>
          {orderId ? (
            <div className="mt-sm border-t border-border pt-sm">
              <ArrivalNotice
                orderId={orderId}
                notifiedAt={arrivalNotifiedAt}
                etaMinutes={meters == null ? undefined : walkingMinutes(meters)}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
