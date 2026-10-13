import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { EmptyState, ErrorState, showToast } from '@/components/feedback';
import { SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { errorMessage, vendorRegistrationApi } from '@/core/api';
import {
  FOOD_SAFETY_EVIDENCE_LABELS,
  foodSafetyApi,
  type FoodSafetyEvidenceType,
} from '@/core/api/food-safety-api';
import { sellerStoreApi } from '@/core/api/seller-store-api';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import {
  AddEvidenceSheet,
  ApplicationSummary,
  ApplySkeleton,
  DishGridSkeleton,
  DishGroupLabel,
  DishPickTile,
  EvidenceChecklist,
  EvidenceSheet,
  PhotoTips,
  WardRequestNote,
} from '../components/vendor/AttpApplyParts';

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
    existing.data?.storefrontId ??
    (Number(params.get('storefrontId')) || stores.data?.[0]?.storefrontId);
  const menu = useQuery({
    queryKey: ['commerce', 'seller-menu', storeId],
    queryFn: () => sellerStoreApi.menu(storeId!),
    enabled: Boolean(storeId),
  });
  // Type picker as cards on a phone, a row of chips with room to spare.
  const roomy = useMediaQuery('(min-width: 768px)');

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
      existing.data.evidence.map((e) => ({
        evidenceType: e.evidenceType,
        fileUrl: e.fileUrl,
        preview: '',
      })),
    );
  }, [existing.data]);

  const upload = useMutation({
    mutationFn: ({ file }: { file: File; preview: string }) =>
      vendorRegistrationApi.uploadEvidenceFile(file),
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
        evidence: attachments.map(({ evidenceType: type, fileUrl }) => ({
          evidenceType: type,
          fileUrl,
        })),
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

  if (stores.isPending || (applicationId !== null && existing.isPending))
    return <ApplySkeleton resubmit={applicationId !== null} />;
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

  // Display only: which sheets came with the file being completed.
  const earlier = new Set(existing.data?.evidence.map((e) => e.fileUrl) ?? []);
  const missing = dishes.filter((d) => d.foodSafetyStatus === 'MISSING');
  const others = dishes.filter((d) => d.foodSafetyStatus !== 'MISSING');
  const split = missing.length > 0 && others.length > 0;
  const store = stores.data.find((s) => s.storefrontId === storeId);
  const pickedNames = dishes.filter((d) => selected.has(d.menuItemId)).map((d) => d.name);

  const tile = (dish: (typeof dishes)[number]) => {
    const claimed =
      !ownDishes.has(dish.menuItemId) &&
      (dish.foodSafetyStatus === 'PENDING' || dish.foodSafetyStatus === 'APPROVED');
    return (
      <DishPickTile
        key={dish.menuItemId}
        dish={dish}
        checked={selected.has(dish.menuItemId)}
        claimed={claimed}
        wide={dishes.length === 1}
        onToggle={() => toggle(dish.menuItemId)}
      />
    );
  };

  return (
    <Screen width="wide">
      <AppHeader
        title={applicationId === null ? 'Nộp hồ sơ ATTP' : `Bổ sung hồ sơ #${applicationId}`}
        back
      />
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-lg">
          {existing.data?.reviewReason ? (
            <WardRequestNote reason={existing.data.reviewReason} />
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

          <fieldset className="flex min-w-0 flex-col gap-sm">
            <legend className="mb-sm">
              <h2 className="font-heading text-[21px] font-bold leading-[1.2] tracking-[-0.015em] text-text">
                1. Chọn món xin cấp giấy
              </h2>
              <span className="mt-0.5 block text-body-md text-muted">
                Món &apos;Cần giấy ATTP&apos; chưa được bán cho tới khi hồ sơ được duyệt.
              </span>
            </legend>
            {menu.isPending ? <DishGridSkeleton /> : null}
            {dishes.length === 0 && !menu.isPending ? (
              <EmptyState icon="silverware-fork-knife" title="Thực đơn chưa có món" />
            ) : null}
            {split ? <DishGroupLabel urgent>Cần giấy để được bán</DishGroupLabel> : null}
            {dishes.length ? (
              <ul className="grid gap-sm md:grid-cols-2 xl:grid-cols-3">
                {(split ? missing : dishes).map(tile)}
              </ul>
            ) : null}
            {split ? (
              <>
                <DishGroupLabel>Món khác</DishGroupLabel>
                <ul className="grid gap-sm md:grid-cols-2 xl:grid-cols-3">{others.map(tile)}</ul>
              </>
            ) : null}
          </fieldset>

          <section aria-labelledby="attp-evidence" className="flex flex-col gap-sm">
            <div>
              <h2
                id="attp-evidence"
                className="font-heading text-[21px] font-bold leading-[1.2] tracking-[-0.015em] text-text"
              >
                2. Giấy tờ đính kèm
              </h2>
              <p className="mt-0.5 text-body-md text-muted">
                Ảnh hoặc PDF: giấy cam kết/chứng nhận ATTP, giấy khám sức khỏe, xác nhận tập huấn,
                ảnh khu chế biến.
              </p>
            </div>
            <div className="relative flex flex-col gap-md rounded-[24px] bg-[#FFF3E8] p-md pt-lg ring-1 ring-brand/15 dark:bg-brand/10 md:p-lg">
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-0 h-2 w-28 -translate-x-1/2 rounded-b-full bg-brand"
              />
              <EvidenceChecklist types={attachments.map((a) => a.evidenceType)} />
              <div className="[&_.field-label]:!pt-0 [&_.field-label]:!self-start [&_.field]:!flex [&_.field]:!flex-col">
                <SelectField
                  label="Loại giấy tờ"
                  value={evidenceType}
                  onChange={(v) => setEvidenceType(v)}
                  options={(
                    Object.keys(FOOD_SAFETY_EVIDENCE_LABELS) as FoodSafetyEvidenceType[]
                  ).map((value) => ({ value, label: FOOD_SAFETY_EVIDENCE_LABELS[value] }))}
                  layout={roomy ? 'inline' : 'cards'}
                />
              </div>
              <ul
                aria-label="Giấy tờ đã đính kèm"
                className="no-scrollbar -mx-1 flex min-h-[152px] gap-sm overflow-x-auto px-1 pt-2 sm:flex-wrap sm:overflow-visible"
              >
                {attachments.map((attachment, index) => {
                  const label = FOOD_SAFETY_EVIDENCE_LABELS[attachment.evidenceType];
                  const remove = () => setAttachments((prev) => prev.filter((_, i) => i !== index));
                  const fromEarlier = !attachment.preview && earlier.has(attachment.fileUrl);
                  return (
                    <EvidenceSheet
                      key={`${attachment.fileUrl}-${index}`}
                      type={attachment.evidenceType}
                      preview={attachment.preview}
                      kind={attachment.preview ? 'photo' : fromEarlier ? 'earlier' : 'file'}
                      fresh={!fromEarlier}
                      removeLabel={attachment.preview ? `Xoá ảnh ${label}` : 'Bỏ giấy tờ'}
                      onRemove={remove}
                    />
                  );
                })}
                {attachments.length < MAX_EVIDENCE ? (
                  <AddEvidenceSheet
                    label={upload.isPending ? 'Đang tải…' : 'Thêm giấy tờ'}
                    uploading={upload.isPending}
                    error={Boolean(fileError)}
                    validate={(file) =>
                      file.size > MAX_FILE_BYTES ? 'File tối đa 5 MB.' : undefined
                    }
                    onInvalid={setFileError}
                    onPick={(preview, file) => {
                      setFileError(null);
                      upload.mutate({
                        file,
                        preview: file.type.startsWith('image/') ? preview : '',
                      });
                    }}
                  />
                ) : null}
              </ul>
              {attachments.length >= MAX_EVIDENCE ? (
                <p className="text-body-md font-medium text-text">Đã đủ 10 giấy tờ</p>
              ) : null}
              {fileError ? (
                <p className="flex items-start gap-xs rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-lg text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]">
                  <Icon
                    name="alert-circle-outline"
                    size={20}
                    color="currentColor"
                    className="mt-[3px] shrink-0"
                  />
                  {fileError}
                </p>
              ) : null}
              <PhotoTips />
            </div>
          </section>

          <section aria-labelledby="attp-note" className="flex flex-col gap-sm">
            <h2
              id="attp-note"
              className="font-heading text-[21px] font-bold leading-[1.2] tracking-[-0.015em] text-text"
            >
              3. Ghi chú cho phường
            </h2>
            <TextField
              label="Ghi chú (không bắt buộc)"
              value={note}
              onChangeText={(v) => setNote(v.slice(0, 500))}
              multiline
              placeholder="VD: nguồn nguyên liệu, nơi chế biến…"
              helperText={`${note.length}/500`}
            />
          </section>
        </div>

        <aside className="flex flex-col gap-sm xl:sticky xl:top-lg xl:self-start">
          <ApplicationSummary
            storeName={store?.name}
            dishNames={pickedNames}
            fileCount={attachments.length}
            maxFiles={MAX_EVIDENCE}
            uploading={upload.isPending}
          />
          {submit.isError ? (
            <p
              role="alert"
              className="flex items-start gap-xs rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-lg text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]"
            >
              <Icon
                name="alert-circle-outline"
                size={20}
                color="currentColor"
                className="mt-[3px] shrink-0"
              />
              {errorMessage(submit.error)}
            </p>
          ) : null}
          <Button
            label={applicationId === null ? 'Gửi hồ sơ cho phường' : 'Gửi lại hồ sơ'}
            icon={<Icon name="send-outline" size={18} color="currentColor" />}
            disabled={!valid || submit.isPending}
            loading={submit.isPending}
            onPress={() => submit.mutate()}
          />
        </aside>
      </div>
    </Screen>
  );
}
