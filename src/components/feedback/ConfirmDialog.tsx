import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/common';
import { colors, radius, sheetShadow, spacing, typography } from '@/theme';
import type { ButtonVariant } from '@/components/common/Button';

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel = 'Xác nhận',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={[typography.headlineMd, { color: colors.text }]}>{title}</Text>
          {description ? (
            <Text style={[typography.bodyMd, { color: colors.muted, marginTop: spacing['2xs'] }]}>
              {description}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button label="Huỷ" variant="outline" onPress={onCancel} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={confirmLabel} variant={confirmVariant} onPress={onConfirm} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,34,56,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    ...sheetShadow,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
