import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BrandLogo, IconButton } from '@/components/common';
import { colors, spacing, typography } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, back, children }: Props) {
  const router = useRouter();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {back ? (
          <View style={{ marginBottom: spacing.sm }}>
            <IconButton
              icon="arrow-left"
              accessibilityLabel="Quay lại"
              onPress={() => router.back()}
            />
          </View>
        ) : null}
        <View style={styles.header}>
          <BrandLogo size={48} />
          <Text style={[typography.headlineLg, { color: colors.text, marginTop: spacing.sm }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                typography.bodyMd,
                { color: colors.muted, marginTop: 4, textAlign: 'center' },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={{ gap: spacing.md }}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
});
