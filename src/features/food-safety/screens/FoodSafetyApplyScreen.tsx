import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Button, Card, Icon } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { PhotoPicker, SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { errorMessage, vendorRegistrationApi } from '@/core/api';
import {
  FOOD_SAFETY_EVIDENCE_LABELS,
  foodSafetyApi,
  type FoodSafetyEvidenceType,
} from '@/core/api/food-safety-api';
import { sellerStoreApi } from '@/core/api/seller-store-api';
import { colors } from '@/theme';
import { DishFoodSafetyChip } from '../components/FoodSafetyBits';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_EVIDENCE = 10;

type Attachment = { evidenceType: FoodSafetyEvidenceType; fileUrl: string; preview: string };

/**
 * Submit an ATTP file for some dishes of one stall (new), or complete one the ward sent
 * back (`/:id/edit`, MORE_INFORMATION_REQUIRED). Dishes already covered by another open
 * file or a valid certificate cannot be picked again.
 */
export function FoodSafetyApplyScreen() {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const applicationId = id ? Number(id) : null;
  const [params] = useSearchParams();
  const existing = useQuery({
    queryKey: ['food-safety', 'mine', applicationId],
    queryFn: () => foodSafetyApi.get(applicationId!),
    enabled: applicationId !== null,
  });
  const stores = useQuery({ queryKey: ['commerce', 'stores'], queryFn: sellerStoreApi.stores });
  const storeId =
    existing.data?.storefrontId ?? (Number(params.get('storefrontId')) || stores.data?.[0]?.storefrontId);
  const menu = useQuery({
    queryKey: ['commerce', 'seller-menu', storeId],
    queryFn: () => sellerStoreApi.menu(storeId!),
    enabled: Boolean(storeId),
  });

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [note, setNote] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [evidenceType, setEvidenceType] = useState<FoodSafetyEvidenceType>('CERTIFICATE');
  const [fileError, setFileError] = useState<string | null>(null);

  // Resubmitting starts from what the file already holds.
  useEffect(() => {
    if (!existing.data) return;
    setSelected(new Set(existing.data.dishes.map((d) => d.menuItemId)));
    setNote(existing.data.vendorNote ?? '');
    setAttachments(
      existing.data.evidence.map((e) => ({ evidenceType: e.evidenceType, fileUrl: e.fileUrl, preview: '' })),
    );
  }, [existing.data]);

  const upload = useMutation({
    mutationFn: ({ file }: { file: File; preview: string }) => vendorRegistrationApi.uploadEvidenceFile(file),
    onSuccess: (result, { preview }) =>
      setAttachments((prev) => [...prev, { evidenceType, fileUrl: result.fileUrl, preview }]),
    onError: (error) => setFileError(errorMessage(error)),
  });
  const submit = useMutation({
    mutationFn: () => {
      const input = {
        storefrontId: storeId!,
        menuItemIds: [...selected],
        note: note.trim() || null,
        evidence: attachments.map(({ evidenceType: type, fileUrl }) => ({ evidenceType: type, fileUrl })),
      };
      return applicationId === null
        ? foodSafetyApi.submit(input)
        : foodSafetyApi.resubmit(applicationId, input);
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['food-safety'] });
      await cache.invalidateQueries({ queryKey: ['commerce'] });
      showToast('Đã gửi hồ sơ ATTP cho phường');
      navigate(`/vendor/store/food-safety?storefrontId=${storeId}`, { replace: true });
    },
  });

  if (stores.isPending || (applicationId !== null && existing.isPending)) return <LoadingState />;
  if (stores.isError || existing.isError || menu.isError) {
    return (
      <ErrorState
        message={errorMessage(stores.error ?? existing.error ?? menu.error)}
        onRetry={() => {
          void stores.refetch();
          void existing.refetch();
          void menu.refetch();
        }}
      />
    );
  }
  if (!storeId) {
    return (
      <Screen>
        <AppHeader title="Nộp hồ sơ ATTP" back />
        <EmptyState icon="storefront-outline" title="Cần tạo gian hàng trước" />
      </Screen>
    );
  }

  const ownDishes = new Set(existing.data?.dishes.map((d) => d.menuItemId) ?? []);
  // Dishes that still need a certificate first, then the optional ones.
  const dishes = [...(menu.data?.items ?? [])].sort(
    (a, b) => Number(b.foodSafetyStatus === 'MISSING') - Number(a.foodSafetyStatus === 'MISSING'),
  );
  const toggle = (menuItemId: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(menuItemId)) next.delete(menuItemId);
      else next.add(menuItemId);
      return next;
    });
  const valid = selected.size > 0 && attachments.length > 0 && !upload.isPending;

  return (
    <Screen>
      <AppHeader
        title={applicationId === null ? 'Nộp hồ sơ ATTP' : `Bổ sung hồ sơ #${applicationId}`}
        back
      />
      {existing.data?.reviewReason ? (
        <Card>
          <p className="text-headline-sm text-text">Phường yêu cầu bổ sung</p>
          <p className="text-body-md text-muted">{existing.data.reviewReason}</p>
        </Card>
      ) : null}
      {applicationId === null && stores.data.length > 1 ? (
        <SelectField
          label="Gian hàng"
          value={String(storeId)}
          onChange={(v) => {
            navigate(`/vendor/store/food-safety/new?storefrontId=${v}`, { replace: true });
            setSelected(new Set());
          }}
          options={stores.data.map((s) => ({ value: String(s.storefrontId), label: s.name }))}
        />
      ) : null}

      <Section title="1. Chọn món xin cấp giấy" description="Món 'Cần giấy ATTP' chưa được bán cho tới khi hồ sơ được duyệt.">
        {menu.isPending ? <LoadingState /> : null}
        {dishes.length === 0 && !menu.isPending ? (
          <EmptyState icon="silverware-fork-knife" title="Thực đơn chưa có món" />
        ) : null}
        <Card>
          <ul className="flex flex-col divide-y divide-border">
            {dishes.map((dish) => {
              const claimed =
                !ownDishes.has(dish.menuItemId) &&
                (dish.foodSafetyStatus === 'PENDING' || dish.foodSafetyStatus === 'APPROVED');
              return (
                <li key={dish.menuItemId}>
                  <label
                    className={`flex items-center gap-sm py-xs ${claimed ? 'opacity-60' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      className="size-5 accent-[rgb(var(--c-primary))]"
                      checked={selected.has(dish.menuItemId)}
                      disabled={claimed}
                      onChange={() => toggle(dish.menuItemId)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-md text-text">{dish.name}</span>
                      <span className="block text-body-sm text-muted">{dish.categoryName}</span>
                    </span>
                    <DishFoodSafetyChip status={dish.foodSafetyStatus} expiresOn={dish.foodSafetyExpiresOn} />
                  </label>
                </li>
              );
            })}
          </ul>
        </Card>
      </Section>

      <Section
        title="2. Giấy tờ đính kèm"
        description="Ảnh hoặc PDF: giấy cam kết/chứng nhận ATTP, giấy khám sức khỏe, xác nhận tập huấn, ảnh khu chế biến."
      >
        <Card>
          <SelectField
            label="Loại giấy tờ"
            value={evidenceType}
            onChange={(v) => setEvidenceType(v)}
            options={(Object.keys(FOOD_SAFETY_EVIDENCE_LABELS) as FoodSafetyEvidenceType[]).map((value) => ({
              value,
              label: FOOD_SAFETY_EVIDENCE_LABELS[value],
            }))}
            layout="inline"
          />
          <div className="mt-sm flex flex-wrap gap-sm">
            {attachments.map((attachment, index) => (
              <div key={`${attachment.fileUrl}-${index}`} className="flex w-24 flex-col gap-1">
                {attachment.preview ? (
                  <PhotoPicker
                    label={FOOD_SAFETY_EVIDENCE_LABELS[attachment.evidenceType]}
                    uri={attachment.preview}
                    onChange={() => undefined}
                    onRemove={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                  />
                ) : (
                  <div className="relative flex size-24 flex-col items-center justify-center gap-1 rounded-sm border border-border bg-bg p-1 text-center">
                    <Icon name="file-document-outline" size={24} color={colors.muted} />
                    <span className="line-clamp-2 text-body-xs text-muted">
                      {FOOD_SAFETY_EVIDENCE_LABELS[attachment.evidenceType]}
                    </span>
                    <button
                      type="button"
                      aria-label="Bỏ giấy tờ"
                      className="absolute right-1 top-1"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Icon name="close" size={14} color={colors.muted} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {attachments.length < MAX_EVIDENCE ? (
              <PhotoPicker
                label={upload.isPending ? 'Đang tải…' : 'Thêm giấy tờ'}
                accept="image/*,application/pdf"
                error={Boolean(fileError)}
                validate={(file) => (file.size > MAX_FILE_BYTES ? 'File tối đa 5 MB.' : undefined)}
                onInvalid={setFileError}
                onChange={(preview, file) => {
                  setFileError(null);
                  upload.mutate({ file, preview: file.type.startsWith('image/') ? preview : '' });
                }}
              />
            ) : null}
          </div>
          {fileError ? <p className="mt-xs text-body-sm text-error">{fileError}</p> : null}
        </Card>
      </Section>

      <Section title="3. Ghi chú cho phường">
        <TextField
          label="Ghi chú (không bắt buộc)"
          value={note}
          onChangeText={(v) => setNote(v.slice(0, 500))}
          multiline
          placeholder="VD: nguồn nguyên liệu, nơi chế biến…"
        />
      </Section>

      {submit.isError ? (
        <p role="alert" className="text-error">
          {errorMessage(submit.error)}
        </p>
      ) : null}
      <Button
        label={applicationId === null ? 'Gửi hồ sơ cho phường' : 'Gửi lại hồ sơ'}
        disabled={!valid || submit.isPending}
        loading={submit.isPending}
        onPress={() => submit.mutate()}
      />
    </Screen>
  );
}
