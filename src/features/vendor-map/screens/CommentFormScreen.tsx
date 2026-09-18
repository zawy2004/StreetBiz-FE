import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { colors } from '@/theme';
import { CommunityConnection } from '../components/CommunityConnection';
import { communityApi, CommunityApiError, useCommunitySession } from '../community-api';

export function CommentFormScreen() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = useCommunitySession((state) => state.token);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const profile = useQuery({
    queryKey: ['community', 'vendor', vendorId],
    queryFn: () => communityApi.profile(vendorId!),
    enabled: Boolean(vendorId),
  });
  const save = useMutation({
    mutationFn: () => communityApi.comment(vendorId!, rating, text.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['community', 'vendor', vendorId] });
      showToast('Đã lưu đánh giá');
      navigate(-1);
    },
  });

  if (profile.isPending) return <LoadingState />;
  if (profile.isError || !profile.data) {
    return <ErrorState message="Không tìm thấy hộ kinh doanh đang hoạt động." />;
  }

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Gửi đánh giá"
            onPress={() => save.mutate()}
            loading={save.isPending}
            disabled={!token || !text.trim() || text.trim().length > 1_000}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Viết đánh giá" back subtitle={profile.data.displayName} />
      <CommunityConnection />
      <div className="flex justify-center gap-xs" aria-label={`${rating} sao`}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={`${value} sao`}
          >
            <Icon
              name={value <= rating ? 'star' : 'star-outline'}
              size={32}
              color={colors.secondary}
            />
          </button>
        ))}
      </div>
      <TextField
        label="Nhận xét"
        value={text}
        onChangeText={(value) => setText(value.slice(0, 1_000))}
        multiline
        placeholder="Chia sẻ trải nghiệm của bạn..."
        helperText={`${text.length}/1000 ký tự`}
        error={save.error instanceof CommunityApiError ? save.error.message : undefined}
      />
    </Screen>
  );
}
