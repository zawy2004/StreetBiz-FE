import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { ErrorState, Skeleton, showToast } from '@/components/feedback';
import { Screen, StickyActions } from '@/components/layout';
import { appendPhrase } from '@/features/buyer-discovery/append-phrase';
import { BackButton } from '@/features/buyer-discovery/components/BackButton';
import { BuyerPageHeader } from '@/features/vendor-map/components/BuyerPageHeader';
import { CommunityConnection } from '@/features/vendor-map/components/CommunityConnection';
import { NoteArea } from '@/features/vendor-map/components/NoteArea';
import { PhraseChips } from '@/features/vendor-map/components/PhraseChips';
import {
  communityApi,
  CommunityApiError,
  useCommunitySession,
} from '@/features/vendor-map/community-api';
import {
  AfterSubmitSteps,
  EvidenceFrame,
  PhotoTips,
  ReportSheetHead,
} from '../components/ReportParts';

function positiveId(value: string | null): number | undefined {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

const VIOLATIONS = [
  'Bán sai vị trí',
  'Lấn chiếm lối đi',
  'Không treo giấy phép',
  'Giấy phép không khớp quầy',
  'Mất vệ sinh',
];

/**
 * A report to the ward, set as one clean sheet of official paper: addressed to
 * the ward, about one stall and its slot, the kind of problem and a ruled
 * description, a photo clipped on, then the buyer account it is sent with and
 * what happens next.
 */
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

  // Free the preview's memory when the photo is replaced or the screen is left (no behaviour change).
  useEffect(
    () => () => {
      if (photoUri && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(photoUri);
    },
    [photoUri],
  );

  if (profile.isPending) return <ReportFormSkeleton />;
  if (profile.isError || !profile.data) {
    return (
      <Screen>
        <div>
          <BackButton />
        </div>
        <ErrorState message="Không tìm thấy hộ kinh doanh đang hoạt động." />
      </Screen>
    );
  }

  const changeReason = (value: string) => setReason(value.slice(0, 500));

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="flex w-full flex-col gap-xs sm:flex-row sm:items-center sm:justify-end sm:gap-md">
            {!token ? (
              <p className="text-body-sm text-muted sm:text-right">Đăng nhập ở trên để gửi.</p>
            ) : null}
            <div className="sm:w-auto sm:min-w-[200px]">
              <Button
                label="Gửi phản ánh"
                variant="danger"
                onPress={() => submit.mutate()}
                loading={submit.isPending}
                disabled={!token || !reason.trim() || reason.trim().length > 500}
              />
            </div>
          </div>
        </StickyActions>
      }
    >
      <BuyerPageHeader title="Báo cáo vi phạm" />
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-xl">
        <div className="flex min-w-0 max-w-[720px] flex-col gap-lg">
          <section
            aria-label="Tờ phản ánh"
            className="overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border"
          >
            <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
            <div className="flex flex-col gap-lg p-md md:p-lg">
              <ReportSheetHead
                vendor={profile.data}
                scannedPermitId={positiveId(params.get('permitId'))}
                scannedSlotId={positiveId(params.get('slotId'))}
              />
              <div className="flex flex-col gap-sm border-t border-dashed border-border pt-md">
                <p className="text-label text-text">Loại vi phạm</p>
                <PhraseChips
                  label="Loại vi phạm"
                  phrases={VIOLATIONS}
                  text={reason}
                  onPick={(phrase) => changeReason(appendPhrase(reason, phrase))}
                />
              </div>
              <NoteArea
                label="Mô tả vi phạm"
                value={reason}
                onChangeText={changeReason}
                placeholder="VD: Bán sai vị trí, sử dụng giấy phép bất thường..."
                counter={`${reason.length}/500 ký tự`}
                ring={{ ratio: reason.length / 500, warn: reason.length > 450 }}
                error={submit.error instanceof CommunityApiError ? submit.error.message : undefined}
                lined
              />
              <EvidenceFrame
                uri={photoUri}
                uploading={submit.isPending && Boolean(photo)}
                onChange={(uri, file) => {
                  setPhotoUri(uri);
                  setPhoto(file);
                }}
                onRemove={() => {
                  setPhotoUri(undefined);
                  setPhoto(undefined);
                }}
              />
            </div>
          </section>
          <CommunityConnection />
          <div className="xl:hidden">
            <AfterSubmitSteps across />
          </div>
        </div>
        <aside className="hidden flex-col gap-lg xl:sticky xl:top-0 xl:flex">
          <div className="rounded-[24px] bg-card p-lg shadow-card ring-1 ring-border">
            <AfterSubmitSteps />
          </div>
          <PhotoTips />
        </aside>
      </div>
    </Screen>
  );
}

/** The sheet in outline while the vendor's profile loads. */
function ReportFormSkeleton() {
  return (
    <Screen>
      <div role="status" aria-label="Đang tải" className="flex max-w-[720px] flex-col gap-lg">
        <div className="flex items-center gap-sm">
          <BackButton />
          <Skeleton className="h-9 w-56" />
        </div>
        <div className="overflow-hidden rounded-[28px] bg-card ring-1 ring-border">
          <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
          <div className="flex flex-col gap-md p-lg">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-[120px] w-full !rounded-[12px]" />
            <Skeleton className="aspect-[4/3] w-full max-w-[360px] !rounded-[14px]" />
          </div>
        </div>
      </div>
    </Screen>
  );
}
