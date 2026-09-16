import { QRCodeSVG } from 'qrcode.react';

import { colors } from '@/theme';

type Props = {
  value: string;
  size?: number;
};

export function QrCode({ value, size = 200 }: Props) {
  return (
    <div className="mx-auto w-fit rounded-md bg-white p-md">
      <QRCodeSVG value={value} size={size} fgColor={colors.indigo} bgColor={colors.white} />
    </div>
  );
}
