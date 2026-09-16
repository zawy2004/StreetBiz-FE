import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function CommentFormScreen() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const vendor = useMockDb((s) => s.vendors.find((v) => v.id === vendorId));
  const addComment = useMockDb((s) => s.addComment);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');

  if (!vendor || !user) return <ErrorState message="Không tìm thấy hộ kinh doanh." />;

  const submit = () => {
    addComment({ vendorId: vendor.id, authorId: user.id, authorName: user.fullName, rating, text });
    showToast('Đã gửi đánh giá');
    navigate(-1);
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
      <div className="flex justify-center gap-xs">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)}>
            <Icon name={n <= rating ? 'star' : 'star-outline'} size={32} color={colors.secondary} />
          </button>
        ))}
      </div>
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
