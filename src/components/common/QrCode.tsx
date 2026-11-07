import { QRCodeSVG } from 'qrcode.react';

import { palette } from '@/theme';

type Props = {
  value: string;
  size?: number;
  /** What the code is, read out by a screen reader ("Mã QR giấy phép ô NVL-01"). */
  label?: string;
};

/** Always dark-on-white whatever the theme: scanners need the contrast. */
export function QrCode({ value, size = 200, label = 'Mã QR' }: Props) {
  return (
    <div data-testid="qr-code" className="mx-auto w-fit rounded-md bg-white p-md">
      <QRCodeSVG
        value={value}
        size={size}
        fgColor={palette.light.ink}
        bgColor="#FFFFFF"
        role="img"
        aria-label={label}
        title={label}
      />
    </div>
  );
}
