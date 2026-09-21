import { QRCodeSVG } from 'qrcode.react';

import { palette } from '@/theme';

type Props = {
  value: string;
  size?: number;
};

/** Always dark-on-white whatever the theme: scanners need the contrast. */
export function QrCode({ value, size = 200 }: Props) {
  return (
    <div className="mx-auto w-fit rounded-md bg-white p-md">
      <QRCodeSVG value={value} size={size} fgColor={palette.light.indigo} bgColor="#FFFFFF" />
    </div>
  );
}
