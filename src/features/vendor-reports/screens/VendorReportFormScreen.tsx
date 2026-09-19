import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { PhotoPicker, TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { CommunityConnection } from '@/features/vendor-map/components/CommunityConnection';
import {
  communityApi,
  CommunityApiError,
  useCommunitySession,
} from '@/features/vendor-map/community-api';

function positiveId(value: string | null): number | undefined {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function VendorReportFormScreen() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useCommunitySession((state) => state.token);
  const [reason, setReason] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();
  const [photo, setPhoto] = useState<File>();
  const profile = useQuery({
    queryKey: ['community', 'vendor', vendorId],
    queryFn: () => communityApi.profile(vendorId!),
    enabled: Boolean(vendorId),
  });
  const submit = useMutation({
    mutationFn: async () => {
      const evidence = photo ? await communityApi.uploadEvidence(photo) : undefined;
      return communityApi.report(vendorId!, {
        reason: reason.trim(),
        evidenceUrl: evidence?.fileUrl,
        slotId: positiveId(params.get('slotId')),
        scannedPermitId: positiveId(params.get('permitId')),
      });
    },
    onSuccess: (receipt) => {
      showToast(`Đã gửi phản ánh #${receipt.reportId} tới Phường`);
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
            label="Gửi phản ánh"
            variant="danger"
            onPress={() => submit.mutate()}
            loading={submit.isPending}
            disabled={!token || !reason.trim() || reason.trim().length > 500}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Báo cáo vi phạm" back subtitle={profile.data.displayName} />
      <CommunityConnection />
      <TextField
        label="Mô tả vi phạm"
        value={reason}
        onChangeText={(value) => setReason(value.slice(0, 500))}
        multiline
        placeholder="VD: Bán sai vị trí, sử dụng giấy phép bất thường..."
        helperText={`${reason.length}/500 ký tự`}
        error={submit.error instanceof CommunityApiError ? submit.error.message : undefined}
      />
      <PhotoPicker
        label="Ảnh minh chứng"
        uri={photoUri}
        onChange={(uri, file) => {
          setPhotoUri(uri);
          setPhoto(file);
        }}
        onRemove={() => {
          setPhotoUri(undefined);
          setPhoto(undefined);
        }}
      />
    </Screen>
  );
}
