import { forwardRef, type Ref } from 'react';

import { Button, Icon } from '@/components/common';
import { SelectField, TextField } from '@/components/forms';
import { storefrontPhotos } from '@/features/buyer-discovery/food-photos';
import { displayDate, STATUS_CONSEQUENCE } from '../../store-view';
import { StorefrontFacade } from './StoreParts';

type Choice = { contractId: number; slotCode: string; endDate: string };

type Props = {
  mode: 'new' | 'edit';
  choices: Choice[];
  contractId: string;
  onContractChange: (value: string) => void;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  /** Slot of the stall being edited, for the preview. */
  slotCode?: string;
  contractEnd?: string;
  /** Stable id for the preview photo (the stall's own when editing). */
  photoKey: number;
  saving: boolean;
  canSave: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
  nameRef: Ref<HTMLInputElement | HTMLTextAreaElement>;
};

/**
 * Opening or editing a stall, with a small live preview of its front so the
 * vendor sees what buyers will read while typing. The fields and the buttons
 * are the same as before; only the frame is new.
 */
export const StoreEditorPanel = forwardRef<HTMLElement, Props>(function StoreEditorPanel(
  {
    mode,
    choices,
    contractId,
    onContractChange,
    name,
    onNameChange,
    description,
    onDescriptionChange,
    status,
    onStatusChange,
    slotCode,
    contractEnd,
    photoKey,
    saving,
    canSave,
    error,
    onSave,
    onClose,
    nameRef,
  },
  ref,
) {
  const choice = choices.find((c) => String(c.contractId) === contractId);
  const previewSlot = mode === 'new' ? choice?.slotCode : slotCode;
  const previewEnd = mode === 'new' ? choice?.endDate : contractEnd;
  return (
    <section
      ref={ref}
      aria-labelledby="store-editor-title"
      className="cq flex flex-col gap-md rounded-[28px] bg-card p-md shadow-sheet ring-1 ring-border md:p-lg"
    >
      <h2 id="store-editor-title" className="font-heading text-[21px] font-bold text-text">
        {mode === 'new' ? 'Tạo gian hàng' : 'Sửa gian hàng'}
      </h2>
      <div role="group" aria-label="Xem trước gian hàng" className="flex flex-col gap-xs">
        <span
          className="text-body-xs font-semibold uppercase tracking-[0.06em] text-muted"
          aria-hidden="true"
        >
          Khách sẽ thấy
        </span>
        <StorefrontFacade
          variant="preview"
          data={{
            name: name.trim(),
            description: description.trim() || null,
            status,
            photos: storefrontPhotos({
              storefrontId: photoKey,
              storefrontName: name || 'quán',
              description,
            }),
            slotCode: previewSlot,
            contractEnd: previewEnd,
          }}
        />
      </div>
      {mode === 'new' ? (
        <SelectField
          label="Ô kinh doanh"
          value={contractId}
          onChange={onContractChange}
          options={choices.map((c) => ({
            value: String(c.contractId),
            label: c.slotCode,
            description: `Hợp đồng đến ${displayDate(c.endDate)}`,
          }))}
        />
      ) : null}
      <TextField
        ref={nameRef}
        label="Tên gian hàng"
        value={name}
        onChangeText={onNameChange}
        maxLength={180}
      />
      <TextField
        label="Mô tả"
        value={description}
        onChangeText={onDescriptionChange}
        multiline
        maxLength={1000}
      />
      <div className="flex flex-col gap-xs">
        <SelectField
          label="Trạng thái"
          value={status}
          onChange={onStatusChange}
          layout="inline"
          options={[
            { value: 'OPEN', label: 'Đang mở' },
            { value: 'PAUSED', label: 'Tạm dừng' },
            { value: 'CLOSED', label: 'Đóng cửa' },
          ]}
        />
        {STATUS_CONSEQUENCE[status] ? (
          <p className="text-body-sm text-muted">{STATUS_CONSEQUENCE[status]}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-sm sm:flex-row">
        <div className="sm:flex-1">
          <Button label="Lưu gian hàng" loading={saving} disabled={!canSave} onPress={onSave} />
        </div>
        <div className="sm:w-auto">
          <Button label="Đóng" variant="ghost" disabled={saving} onPress={onClose} />
        </div>
      </div>
      {error ? (
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
          {error}
        </p>
      ) : null}
    </section>
  );
});
