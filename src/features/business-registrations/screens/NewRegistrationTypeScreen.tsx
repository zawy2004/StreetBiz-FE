import { useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { useCachedRegistrations } from '../components/cached-data';
import { PrepareChecklist, VendorTypeChoice } from '../components/wizard/TypeParts';
import {
  DraftNotice,
  EditingBanner,
  WizardProgress,
  WizardQuestion,
} from '../components/wizard/WizardFrame';
import { useNewRegistrationStore } from '../new-registration-store';

/** REG-01 step 1: choose the vendor type (BR-07 drives what step 2 asks for). */
export function NewRegistrationTypeScreen() {
  const navigate = useNavigate();
  const questionId = useId();
  const vendorType = useNewRegistrationStore((s) => s.vendorType);
  const registrationId = useNewRegistrationStore((s) => s.registrationId);
  const displayName = useNewRegistrationStore((s) => s.displayName);
  const setField = useNewRegistrationStore((s) => s.setField);

  // Read from what VendorTopBar has already cached; this step sends no request.
  const cached = useCachedRegistrations();
  const pending = registrationId
    ? undefined
    : cached.find(
        (r) => r.registrationStatus === 'SUBMITTED' || r.registrationStatus === 'UNDER_REVIEW',
      );

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Tiếp tục" onPress={() => navigate('/vendor/registrations/new/details')} />
        </StickyActions>
      }
    >
      <AppHeader title={registrationId ? 'Cập nhật hồ sơ' : 'Đăng ký kinh doanh'} back />
      <WizardProgress step={1} />
      {registrationId ? <EditingBanner displayName={displayName} /> : null}

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-md">
          <WizardQuestion
            id={questionId}
            hint="Lựa chọn này quyết định các bước sau sẽ hỏi những gì."
          >
            Bạn bán theo cách nào?
          </WizardQuestion>
          <VendorTypeChoice
            value={vendorType}
            onChange={(v) => setField('vendorType', v)}
            labelledBy={questionId}
          />

          {pending ? (
            <div className="flex flex-col gap-xs rounded-[16px] bg-[#FFF3D1] p-md text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
              <p className="flex items-start gap-sm text-[15px] font-medium leading-[22px]">
                <Icon
                  name="alert-circle-outline"
                  size={20}
                  color="currentColor"
                  className="mt-0.5 shrink-0"
                />
                <span>
                  Bạn đang có hồ sơ {pending.displayName} chờ Phường xét. Muốn sửa hồ sơ đó, mở hồ
                  sơ rồi chọn “Chỉnh sửa”.
                </span>
              </p>
              <Link
                to={`/vendor/registrations/${pending.registrationId}`}
                className="ml-[32px] inline-flex min-h-11 w-fit items-center gap-1 rounded-[10px] text-[15px] font-bold underline underline-offset-4"
              >
                Mở hồ sơ {pending.displayName}
                <Icon name="chevron-right" size={16} color="currentColor" />
              </Link>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-md xl:sticky xl:top-0">
          <PrepareChecklist vendorType={vendorType} />
          <DraftNotice />
        </div>
      </div>
    </Screen>
  );
}
