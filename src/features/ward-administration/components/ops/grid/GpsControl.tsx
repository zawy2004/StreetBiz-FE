import { useState } from 'react';

import { Button, Icon } from '@/components/common';
import { GPS_ACCURACY_WARN_METERS, type GpsFix } from './placement';

/**
 * The officer's GPS fix (drops a pin, like a tap), as a large button on the
 * map's bottom-left edge, in reach of the thumb. The readout and any error sit
 * just above it.
 */
export function GpsControl({
  disabled,
  myLocation,
  onGps,
}: {
  disabled: boolean;
  myLocation: GpsFix | null;
  onGps: (fix: GpsFix) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string>();

  const locate = () => {
    if (!navigator.geolocation) {
      setLocateError('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    setLocating(true);
    setLocateError(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onGps({
          latitude: Math.round(pos.coords.latitude * 1e6) / 1e6,
          longitude: Math.round(pos.coords.longitude * 1e6) / 1e6,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Bạn chưa cho phép truy cập vị trí. Hãy bật quyền định vị cho trang này rồi thử lại.'
            : 'Không lấy được vị trí. Hãy ra chỗ thoáng (ít nhà cao tầng che) rồi thử lại, hoặc chạm vào bản đồ.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const wide = myLocation ? myLocation.accuracy > GPS_ACCURACY_WARN_METERS : false;

  return (
    <div className="pointer-events-none absolute bottom-sm left-sm z-10 flex max-w-[calc(100%-72px)] md:max-w-[360px] flex-col items-start gap-xs">
      {locateError && (
        <p
          role="alert"
          className="pointer-events-auto rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-md font-medium text-[#8F1717] shadow-card ring-1 ring-[#8F1717]/20 dark:bg-[#3A1414] dark:text-[#FF9A90]"
        >
          {locateError}
        </p>
      )}
      {myLocation && (
        <p
          className={`pointer-events-auto rounded-[12px] px-sm py-xs font-tabular text-[16px] leading-snug shadow-card ring-1 backdrop-blur-md ${
            wide
              ? 'bg-[#FDEBEA]/95 font-semibold text-[#8F1717] ring-[#8F1717]/25 dark:bg-[#3A1414]/95 dark:text-[#FF9A90]'
              : 'bg-card/95 text-text ring-border'
          }`}
          aria-live="polite"
        >
          GPS: {myLocation.latitude.toFixed(6)}, {myLocation.longitude.toFixed(6)} · sai số khoảng{' '}
          {Math.round(myLocation.accuracy)} m
          {wide && ' — sai số lớn, hãy chờ vài giây ở chỗ thoáng rồi bấm lại trước khi lưu ô.'}
        </p>
      )}
      <div className="pointer-events-auto rounded-[12px] shadow-sheet">
        <Button
          label="Vị trí của tôi (GPS)"
          variant="outline"
          fullWidth={false}
          disabled={disabled}
          loading={locating}
          icon={<Icon name="crosshairs-gps" size={20} color="rgb(var(--c-primary))" />}
          onPress={locate}
        />
      </div>
    </div>
  );
}
