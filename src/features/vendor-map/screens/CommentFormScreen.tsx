import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { colors, spacing } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function CommentFormScreen() {
  const { vendorId } = useLocalSearchParams<{ vendorId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const vendor = useMockDb((s) => s.vendors.find((v) => v.id === vendorId));
  const addComment = useMockDb((s) => s.addComment);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');

  if (!vendor || !user) return <ErrorState message="Không tìm thấy hộ kinh doanh." />;

  const submit = () => {
    addComment({ vendorId: vendor.id, authorId: user.id, authorName: user.fullName, rating, text });
    showToast('Đã gửi đánh giá');
    router.back();
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Gửi đánh giá" onPress={submit} disabled={!text.trim()} />
        </StickyActions>
      }
    >
      <AppHeader title="Viết đánh giá" back subtitle={vendor.business_name} />
      <View style={{ flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
            <MaterialCommunityIcons
              name={n <= rating ? 'star' : 'star-outline'}
              size={32}
              color={colors.secondary}
            />
          </Pressable>
        ))}
      </View>
      <TextField
        label="Nhận xét"
        value={text}
        onChangeText={setText}
        multiline
        placeholder="Chia sẻ trải nghiệm của bạn..."
      />
    </Screen>
  );
}
