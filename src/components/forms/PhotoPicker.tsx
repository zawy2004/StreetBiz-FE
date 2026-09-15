import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  label: string;
  uri?: string;
  onChange: (uri: string) => void;
  onRemove?: () => void;
};

export function PhotoPicker({ label, uri, onChange, onRemove }: Props) {
  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) {
      onChange(asset.uri);
    }
  };

  if (uri) {
    return (
      <Pressable onPress={pick} style={styles.previewWrap}>
        <Image source={{ uri }} style={styles.preview} />
        <View style={styles.previewLabel}>
          <Text style={[typography.bodySm, { color: colors.white }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
        {onRemove ? (
          <Pressable onPress={onRemove} style={styles.removeBtn} accessibilityLabel="Xoá ảnh">
            <MaterialCommunityIcons name="close" size={14} color={colors.white} />
          </Pressable>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable onPress={pick} style={styles.picker}>
      <MaterialCommunityIcons name="camera-plus-outline" size={24} color={colors.muted} />
      <Text style={[typography.bodySm, { color: colors.muted, marginTop: 4 }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const SIZE = 96;

const styles = StyleSheet.create({
  picker: {
    width: SIZE,
    height: SIZE,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xs'],
  },
  previewWrap: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  previewLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26,34,56,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(26,34,56,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
