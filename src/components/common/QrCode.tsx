import { View } from 'react-native';
import RNQRCode from 'react-native-qrcode-svg';

import { colors, radius } from '@/theme';

type Props = {
  value: string;
  size?: number;
};

export function QrCode({ value, size = 200 }: Props) {
  return (
    <View
      style={{
        alignSelf: 'center',
        padding: 16,
        backgroundColor: colors.white,
        borderRadius: radius.md,
      }}
    >
      <RNQRCode value={value} size={size} color={colors.indigo} backgroundColor={colors.white} />
    </View>
  );
}
