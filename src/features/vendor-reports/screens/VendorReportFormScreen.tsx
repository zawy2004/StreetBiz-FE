import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { ErrorState, Skeleton, showToast } from '@/components/feedback';
import { Screen, StickyActions } from '@/components/layout';
import type { VendorReportType } from '@/core/api/ai-api';
import { appendPhrase } from '@/features/buyer-discovery/append-phrase';
import { BackButton } from '@/features/buyer-discovery/components/BackButton';
import { formatDueDay } from '@/features/price-board/price-board-format';
import { BuyerPageHeader } from '@/features/vendor-map/components/BuyerPageHeader';
import { CommunityConnection } from '@/features/vendor-map/components/CommunityConnection';
import { NoteArea } from '@/features/vendor-map/components/NoteArea';
import { PhraseChips } from '@/features/vendor-map/components/PhraseChips';
import {
  communityApi,
  CommunityApiError,
  useCommunityCustomer,
  type VendorReportRequest,
} from '@/features/vendor-map/community-api';
import { MoneyInput } from '@/features/ward-administration/components/ConfigFields';
import {
  checkOvercharge,
  MAX_CHARGED,
  purchaseTimeProblem,
  purchaseWindow,
  toVnLocalInput,
  vnLocalInputToIso,
} from '../complaint-math';
import {
  BoardMissingNote,
  DishPicker,
  OverchargeSum,
  PurchaseTimeField,
  QuantityStepper,
  ReportTypePicker,
} from '../components/ComplaintParts';
import {
  AfterSubmitSteps,
  EvidenceFrame,
  PhotoTips,
  ReportSheetHead,
} from '../components/ReportParts';
import { isReportType } from '../report-kinds';

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

const NOTE_MAX = 500;

/**
 * A report to the ward, set as one clean sheet of official paper: addressed to the ward,
 * about one stall and its slot, the kind of report, then what that kind needs. "Bị tính cao
 * hơn giá niêm yết" (BUY-07) asks for the dish from the stall's live price board, how many,
 * what was charged and when, and shows the posted price × quantity and the difference as it
 * is filled in; a charge not above the posted price cannot be sent as an overcharge. The
 * posted price that counts is the server's, from the price history at the purchase time.
 * Sending needs a buyer account, signed in on this very page (D3).
 */
export function VendorReportFormScreen() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const customer = useCommunityCustomer();
  const scannedPermitId = positiveId(params.get('permitId'));
  const scannedSlotId = positiveId(params.get('slotId'));
  const qr = params.get('qr')?.trim() || undefined;
  const initialType = params.get('type');
  const [type, setType] = useState<VendorReportType>(
    isReportType(initialType) ? initialType : 'GENERAL',
  );
  const [reason, setReason] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();
  const [photo, setPhoto] = useState<File>();
  const [menuItemId, setMenuItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number | null>(1);
  const [charged, setCharged] = useState<number | null>(null);
  const [purchasedAt, setPurchasedAt] = useState(() => toVnLocalInput(new Date()));
  const window7 = useMemo(() => purchaseWindow(), []);

  const profile = useQuery({
    queryKey: ['community', 'vendor', vendorId],
    queryFn: () => communityApi.profile(vendorId!),
    enabled: Boolean(vendorId),
  });
  // The board an overcharge is judged against, looked up again live from the scanned code (BR-39:
  // nothing is carried over from the check that led here, and nothing outlives this form). Also
  // who the stall is when it has no public profile (a permit that is no longer valid).
  const lookup = useQuery({
    queryKey: ['community', 'report-board', qr],
    queryFn: () => communityApi.verifyPermit(qr!),
    enabled: Boolean(qr),
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const scanned =
    lookup.data && String(lookup.data.vendorId) === vendorId ? lookup.data : undefined;
  const items = scanned?.isValid ? (scanned.priceBoard?.items ?? []) : [];
  const item = items.find((i) => i.menuItemId === menuItemId);
  const check = checkOvercharge(item?.unitPrice, quantity, charged);
  const timeProblem = type === 'OVERCHARGE' ? purchaseTimeProblem(purchasedAt) : null;

  const submit = useMutation({
    mutationFn: async () => {
      const evidence = photo ? await communityApi.uploadEvidence(photo) : undefined;
      const note = reason.trim();
      const base = {
        evidenceUrl: evidence?.fileUrl,
        slotId: scannedSlotId,
        scannedPermitId,
      };
      const request: VendorReportRequest =
        type === 'OVERCHARGE'
          ? {
              reportType: type,
              reason: note || undefined,
              ...base,
              menuItemId: menuItemId ?? undefined,
              quantity: quantity ?? undefined,
              chargedAmount: charged ?? undefined,
              purchasedAt: vnLocalInputToIso(purchasedAt) ?? undefined,
            }
          : { reportType: type, reason: type === 'GENERAL' ? note : note || undefined, ...base };
      return communityApi.report(vendorId!, request);
    },
    onSuccess: (receipt) => {
      const due = formatDueDay(receipt.dueAt);
      showToast(
        `Đã gửi phản ánh #${receipt.reportId} tới Phường${due ? `. Hạn xử lý: hết ngày ${due}` : ''}`,
      );
      navigate(`/customer/reports?report=${receipt.reportId}`, { replace: true });
    },
  });

  // Free the preview's memory when the photo is replaced or the screen is left (no behaviour change).
  useEffect(
    () => () => {
      if (photoUri && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(photoUri);
    },
    [photoUri],
  );

  // Came from a scan: the report is about the stall and slot on that QR, which for a business with
  // several slots is not necessarily the one its public profile shows. The profile's ward and zone
  // are only that slot's when it is the same slot.
  const sameSlot = scanned && profile.data && profile.data.slotId === scanned.slotId;
  const vendor = scanned?.displayName
    ? {
        wardName: sameSlot ? profile.data!.wardName : null,
        displayName: scanned.displayName,
        slotCode: scanned.slotCode ?? '',
        zoneName: sameSlot ? profile.data!.zoneName : '',
        slotId: scanned.slotId ?? 0,
      }
    : profile.data;

  if (profile.isPending || (qr && lookup.isPending && lookup.fetchStatus !== 'idle')) {
    return <ReportFormSkeleton />;
  }
  if (!vendor) {
    return (
      <Screen>
        <div>
          <BackButton />
        </div>
        <ErrorState message="Không tìm thấy hộ kinh doanh đang hoạt động." />
      </Screen>
    );
  }

  const changeReason = (value: string) => setReason(value.slice(0, NOTE_MAX));
  const noteOk = reason.trim().length <= NOTE_MAX;
  const ready =
    type === 'GENERAL'
      ? reason.trim().length > 0 && noteOk
      : type === 'PRICE_NOT_POSTED'
        ? noteOk
        : Boolean(item) && check.state === 'above' && !timeProblem && noteOk;
  const error = submit.error instanceof CommunityApiError ? submit.error : null;
  const notAboveFromServer = type === 'OVERCHARGE' && error?.status === 422;
  const switchToGeneral = () => {
    setType('GENERAL');
    submit.reset();
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="flex w-full flex-col gap-xs sm:flex-row sm:items-center sm:justify-end sm:gap-md">
            {!customer ? (
              <p className="text-body-sm text-muted sm:text-right">Đăng nhập ở trên để gửi.</p>
            ) : null}
            <div className="sm:w-auto sm:min-w-[200px]">
              <Button
                label="Gửi phản ánh"
                variant="danger"
                onPress={() => submit.mutate()}
                loading={submit.isPending}
                disabled={!customer || !ready}
              />
            </div>
          </div>
        </StickyActions>
      }
    >
      <BuyerPageHeader title="Phản ánh về quầy" />
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-xl">
        <div className="flex min-w-0 max-w-[760px] flex-col gap-lg">
          <section
            aria-label="Tờ phản ánh"
            className="overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border"
          >
            <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
            <div className="flex flex-col gap-lg p-md md:p-lg">
              <ReportSheetHead
                vendor={vendor}
                scannedPermitId={scannedPermitId}
                scannedSlotId={scannedSlotId}
              />
              <div className="flex flex-col gap-sm border-t border-dashed border-border pt-md">
                <p className="text-label text-text">Loại phản ánh</p>
                <ReportTypePicker
                  value={type}
                  onChange={(next) => {
                    setType(next);
                    submit.reset();
                  }}
                />
              </div>

              {type === 'GENERAL' ? (
                <>
                  <div className="flex flex-col gap-sm">
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
                    counter={`${reason.length}/${NOTE_MAX} ký tự`}
                    ring={{ ratio: reason.length / NOTE_MAX, warn: reason.length > 450 }}
                    error={error?.message}
                    lined
                  />
                </>
              ) : null}

              {type === 'OVERCHARGE' ? (
                lookup.isPending && lookup.fetchStatus !== 'idle' ? (
                  <div
                    role="status"
                    aria-label="Đang tải bảng giá"
                    className="flex flex-col gap-xs"
                  >
                    <Skeleton className="h-14 w-full !rounded-[14px]" />
                    <Skeleton className="h-14 w-full !rounded-[14px]" />
                  </div>
                ) : items.length === 0 ? (
                  <BoardMissingNote
                    invalid={Boolean(scanned)}
                    onScan={() => navigate('/customer/scan')}
                  />
                ) : (
                  <div className="flex flex-col gap-md">
                    <div className="flex flex-col gap-sm">
                      <p className="text-label text-text">Món đã mua</p>
                      <DishPicker items={items} value={menuItemId} onChange={setMenuItemId} />
                    </div>
                    <div className="grid gap-md md:grid-cols-2">
                      <div className="cq min-w-0">
                        <QuantityStepper
                          value={quantity}
                          onChange={setQuantity}
                          unit={item?.priceUnit}
                        />
                      </div>
                      <div className="cq min-w-0">
                        <MoneyInput
                          label="Số tiền bạn bị tính"
                          value={charged}
                          onChange={(value) =>
                            setCharged(value == null ? null : Math.min(value, MAX_CHARGED))
                          }
                        />
                      </div>
                    </div>
                    <PurchaseTimeField
                      value={purchasedAt}
                      onChange={setPurchasedAt}
                      min={window7.min}
                      max={window7.max}
                      error={timeProblem && purchasedAt ? timeProblem : undefined}
                    />
                    <OverchargeSum
                      check={check}
                      item={item}
                      quantity={quantity}
                      onSwitchToGeneral={switchToGeneral}
                    />
                  </div>
                )
              ) : null}

              {type !== 'GENERAL' ? (
                <NoteArea
                  label="Ghi chú (không bắt buộc)"
                  value={reason}
                  onChangeText={changeReason}
                  placeholder={
                    type === 'OVERCHARGE'
                      ? 'VD: Quầy tính 35.000đ một ổ, bảng giá ghi 25.000đ.'
                      : 'VD: Hỏi giá thì người bán nói tùy món, không có bảng giá.'
                  }
                  counter={`${reason.length}/${NOTE_MAX} ký tự`}
                  ring={{ ratio: reason.length / NOTE_MAX, warn: reason.length > 450 }}
                  rows={3}
                  lined
                />
              ) : null}

              {error && type !== 'GENERAL' ? (
                <div
                  role="alert"
                  className="flex flex-col gap-sm rounded-[16px] bg-tint-error px-md py-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-body-md font-semibold text-error">{error.message}</p>
                  {notAboveFromServer ? (
                    <Button
                      label="Chuyển sang Phản ánh khác"
                      variant="outline"
                      fullWidth={false}
                      onPress={switchToGeneral}
                    />
                  ) : null}
                </div>
              ) : null}
              {error?.status === 409 ? (
                <Button
                  label="Xem phản ánh của tôi"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => navigate('/customer/reports')}
                />
              ) : null}

              <EvidenceFrame
                uri={photoUri}
                uploading={submit.isPending && Boolean(photo)}
                hint={
                  type === 'OVERCHARGE'
                    ? 'Ảnh hóa đơn hoặc màn hình chuyển khoản, nếu có; ảnh JPG hoặc PNG.'
                    : undefined
                }
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
