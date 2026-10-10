import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { WardSelect } from '@/features/authentication/components/WardSelect';
import { VENDOR_TYPE } from '@/core/api';
import { useWards } from '@/core/auth/useWards';
import {
  AddressPurposeBox,
  CharCounter,
  SignboardPreview,
  WardDestinationCard,
} from '../components/wizard/DetailsParts';
import {
  DraftNotice,
  EditingBanner,
  WizardProgress,
  WizardQuestion,
} from '../components/wizard/WizardFrame';
import { focusFirstError } from '../components/ui-motion';
import { parseOptionalCoordinate, useNewRegistrationStore } from '../new-registration-store';

/**
 * REG-01 step 2: business details.
 *
 * BR-07: a fixed storefront must declare an address; an itinerant vendor may
 * leave it blank. The ward is always required because the backend routes the
 * application to that ward's reviewer.
 */
export function NewRegistrationDetailsScreen() {
  const navigate = useNavigate();
  const draft = useNewRegistrationStore();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  // Same ['wards'] query the picker below runs; used only to name the ward on the preview.
  const { wards } = useWards();
  const formRef = useRef<HTMLDivElement>(null);

  const needsAddress = draft.vendorType === VENDOR_TYPE.fixedStorefront;

  const submit = () => {
    const next: Record<string, string | undefined> = {};
    if (!draft.displayName.trim()) next.displayName = 'Vui lòng nhập tên hộ kinh doanh.';
    if (!draft.wardUnitId) next.ward = 'Vui lòng chọn phường/xã.';
    if (needsAddress && !draft.declaredAddress.trim()) {
      next.address = 'Cửa hàng cố định cần nhập địa chỉ kinh doanh.';
    }

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    navigate('/vendor/registrations/new/owner');
  };

  // After a submit that flagged something, bring the first flagged field into view.
  // Presentation only: when and what is validated is unchanged.
  useEffect(() => {
    if (Object.values(errors).some(Boolean)) focusFirstError(formRef.current);
  }, [errors]);

  const wardName = wards.find((w) => w.unitId === draft.wardUnitId)?.unitName ?? null;

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Tiếp tục" onPress={submit} />
        </StickyActions>
      }
    >
      <AppHeader title={draft.registrationId ? 'Cập nhật hồ sơ' : 'Đăng ký kinh doanh'} back />
      <WizardProgress step={2} />
      {draft.registrationId ? <EditingBanner displayName={draft.displayName} /> : null}

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-xl">
        {/* Preview: a strip above the form on phones and tablets, a sticky column on wide screens. */}
        <aside className="grid min-w-0 gap-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center xl:sticky xl:top-0 xl:col-start-2 xl:row-start-1 xl:grid-cols-1 xl:items-stretch">
          <SignboardPreview
            vendorType={draft.vendorType}
            displayName={draft.displayName}
            declaredAddress={draft.declaredAddress}
            wardName={wardName}
          />
          <div className="hidden md:block">
            <WardDestinationCard wardUnitId={draft.wardUnitId} />
          </div>
          <div className="hidden xl:block">
            <DraftNotice />
          </div>
        </aside>

        <div
          ref={formRef}
          className="cq flex min-w-0 max-w-[620px] flex-col gap-md xl:col-start-1 xl:row-start-1"
        >
          <WizardQuestion>Quán của bạn tên gì?</WizardQuestion>

          <div className="flex flex-col gap-xs">
            <TextField
              label="Tên hộ kinh doanh"
              value={draft.displayName}
              onChangeText={(v) => draft.setField('displayName', v)}
              placeholder="VD: Xôi gà Bà Năm"
              error={errors.displayName}
              maxLength={180}
            />
            <CharCounter length={draft.displayName.length} max={180} />
          </div>

          <WardSelect
            value={draft.wardUnitId ?? undefined}
            onChange={(v) => draft.setField('wardUnitId', v ?? null)}
            label="Phường/xã quản lý"
            error={errors.ward}
            helperText="Hồ sơ sẽ được chuyển tới cán bộ của phường này."
          />
          <div className="md:hidden">
            <WardDestinationCard wardUnitId={draft.wardUnitId} />
          </div>

          <TextField
            label={needsAddress ? 'Địa chỉ kinh doanh' : 'Địa chỉ kinh doanh (không bắt buộc)'}
            value={draft.declaredAddress}
            onChangeText={(v) => draft.setField('declaredAddress', v)}
            placeholder="Số nhà, đường, phường"
            error={errors.address}
            helperText={
              needsAddress
                ? undefined
                : 'Bán hàng lưu động có thể bỏ trống và chọn ô vỉa hè sau khi được duyệt.'
            }
          />

          {needsAddress ? (
            <AddressPurposeBox>
              <div className="min-w-0">
                <TextField
                  label="Vĩ độ (không bắt buộc)"
                  value={draft.addressLatitude?.toString() ?? ''}
                  onChangeText={(v) => {
                    const parsed = parseOptionalCoordinate(v);
                    if (parsed !== undefined) draft.setField('addressLatitude', parsed);
                  }}
                  keyboardType="numeric"
                  placeholder="16.0678"
                />
              </div>
              <div className="min-w-0">
                <TextField
                  label="Kinh độ (không bắt buộc)"
                  value={draft.addressLongitude?.toString() ?? ''}
                  onChangeText={(v) => {
                    const parsed = parseOptionalCoordinate(v);
                    if (parsed !== undefined) draft.setField('addressLongitude', parsed);
                  }}
                  keyboardType="numeric"
                  placeholder="108.2208"
                />
              </div>
            </AddressPurposeBox>
          ) : null}

          <div className="xl:hidden">
            <DraftNotice />
          </div>
        </div>
      </div>
    </Screen>
  );
}
