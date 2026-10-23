import { lazy, Suspense, useEffect, useState } from 'react';

import { Button, Icon } from '@/components/common';
import type { PickedPosition } from '@/features/sidewalk-slots/components/LocationPicker';

const LocationPicker = lazy(() =>
  import('@/features/sidewalk-slots/components/LocationPicker').then((m) => ({
    default: m.LocationPicker,
  })),
);

type Props = {
  /** Where the assistant found the spot; null when it found nothing (tap to place the pin). */
  position: PickedPosition | null;
  label: string | null;
  busy: boolean;
  onConfirm: (position: PickedPosition) => void;
  onSkip: () => void;
};

/**
 * "Đúng chỗ này chưa?" -- the spot the vendor named, as a pin. A tap on the map moves it; nothing
 * here is spoken, so a misheard street never decides the location on its own.
 */
export function LocationConfirm({ position, label, busy, onConfirm, onSkip }: Props) {
  const [pin, setPin] = useState<PickedPosition | null>(position);
  const [viewKey, setViewKey] = useState(0);

  useEffect(() => {
    setPin(position);
    setViewKey((k) => k + 1);
  }, [position?.latitude, position?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  const moved =
    !!pin && !!position && (pin.latitude !== position.latitude || pin.longitude !== position.longitude);

  return (
    <div className="flex flex-col gap-sm">
      <Suspense
        fallback={<div className="h-[300px] animate-pulse rounded-[16px] bg-sunken md:h-[380px]" />}
      >
        <LocationPicker position={pin} viewKey={viewKey} onPick={setPin} />
      </Suspense>
      <p className="flex items-start gap-xs text-body-md text-muted">
        <Icon name="map-marker-outline" size={18} color="currentColor" className="mt-0.5 shrink-0" />
        <span>
          {moved
            ? 'Bạn đã dời ghim. Bấm "Đúng chỗ này" để dùng vị trí mới.'
            : label
              ? <>Trợ lý tìm thấy: <strong className="text-text">{label}</strong>. Chạm vào bản đồ để dời ghim nếu lệch.</>
              : 'Chạm vào bản đồ để đặt ghim ở chỗ bạn hay đứng bán.'}
        </span>
      </p>
      <div className="grid gap-sm sm:grid-cols-[minmax(0,1fr)_auto]">
        <Button
          label="Đúng chỗ này"
          size="lg"
          disabled={!pin}
          loading={busy}
          icon={<Icon name="check" size={20} color="currentColor" />}
          onPress={() => pin && onConfirm(pin)}
        />
        <Button label="Bỏ qua" size="lg" variant="outline" disabled={busy} onPress={onSkip} />
      </div>
    </div>
  );
}
