import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { PhotoPicker } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { AiHint } from '@/components/status';
import { showToast } from '@/components/feedback';
import { env } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { Stepper } from '../components/Stepper';
import { useNewRegistrationStore } from '../new-registration-store';

export function NewRegistrationEvidenceScreen() {
  const navigate = useNavigate();
  const draft = useNewRegistrationStore();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const registerVendor = useMockDb((s) => s.registerVendor);
  const submitRegistration = useMockDb((s) => s.submitRegistration);
  const [idCardUri, setIdCardUri] = useState<string>();
  const [licenceUri, setLicenceUri] = useState<string>();
  const [error, setError] = useState<string>();

  const needsLicence = draft.vendorType === 'FIXED_STOREFRONT';

  const submit = () => {
    if (!idCardUri) return setError('Vui lòng tải ảnh CCCD.');
    if (needsLicence && !licenceUri) return setError('Vui lòng tải giấy phép kinh doanh.');
    if (!user) return;

    let vendorId = user.vendorId;
    if (!vendorId) {
      const vendor = registerVendor({
        userId: user.id,
        vendor_type: draft.vendorType,
        business_name: draft.businessName,
        owner_name: draft.ownerName,
        phone: user.phone,
        address: draft.address || undefined,
        ward_unit_type: 'Phường Hải Châu 1',
      });
      vendorId = vendor.id;
      setUser({ ...user, vendorId });
    }

    submitRegistration({
      vendorId,
      vendor_type: draft.vendorType,
      business_name: draft.businessName,
      owner_name: draft.ownerName,
      id_number: draft.idNumber,
      address: draft.address || 'Lưu trú tại phường',
      ward_unit_type: 'Phường Hải Châu 1',
      fast_track: needsLicence,
      evidence: [
        { type: 'ID_CARD', uri: idCardUri, label: 'CCCD gắn chip' },
        ...(licenceUri
          ? [{ type: 'BUSINESS_LICENCE', uri: licenceUri, label: 'Giấy phép kinh doanh' }]
          : []),
      ],
    });

    draft.reset();
    showToast('Đã nộp hồ sơ đăng ký');
    navigate('/vendor/registrations', { replace: true });
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Nộp hồ sơ" onPress={submit} />
        </StickyActions>
      }
    >
      <AppHeader title="Đăng ký kinh doanh" back />
      <Stepper step={3} total={3} label="Giấy tờ minh chứng" />

      {env.enableAiCompliance ? (
        <AiHint title="Tự động điền từ giấy tờ">
          Tải ảnh rõ nét, hệ thống sẽ đọc và đối chiếu thông tin với dữ liệu bạn đã nhập ở bước
          trước.
        </AiHint>
      ) : null}

      <div className="flex flex-wrap gap-sm">
        <PhotoPicker
          label="CCCD gắn chip"
          uri={idCardUri}
          onChange={setIdCardUri}
          onRemove={() => setIdCardUri(undefined)}
        />
        {needsLicence ? (
          <PhotoPicker
            label="Giấy phép kinh doanh"
            uri={licenceUri}
            onChange={setLicenceUri}
            onRemove={() => setLicenceUri(undefined)}
          />
        ) : null}
      </div>
      {error ? <span className="text-body-sm text-error">{error}</span> : null}
    </Screen>
  );
}
