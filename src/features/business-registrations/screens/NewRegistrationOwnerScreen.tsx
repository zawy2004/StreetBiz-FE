import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { OWNER_GENDER, OWNER_ID_TYPE } from '@/core/api';
import { IdCardScanner } from '../components/IdCardScanner';
import { Stepper } from '../components/Stepper';
import { useNewRegistrationStore } from '../new-registration-store';

/**
 * REG-01 step 3: chủ hộ kinh doanh + ngành nghề + cam kết ATTP.
 *
 * Field set mirrors Mẫu số 01 Phụ lục II, Thông tư 68/2025/TT-BTC (Giấy đề nghị đăng ký hộ
 * kinh doanh, hiệu lực 01/07/2025) -- StreetBiz's registration record stands in for that real
 * government form, so it collects the same fields rather than only what the ward sidewalk-use
 * check needs. Individual/household street-food vendors are exempt from the formal Giấy chứng
 * nhận cơ sở đủ điều kiện ATTP, but must still commit to food-safety conditions -- that
 * commitment (not a certificate upload) is the checkbox at the bottom of this screen.
 */
export function NewRegistrationOwnerScreen() {
  const navigate = useNavigate();
  const draft = useNewRegistrationStore();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const submit = () => {
    const next: Record<string, string | undefined> = {};
    if (!draft.ownerDateOfBirth) next.ownerDateOfBirth = 'Vui lòng nhập ngày sinh của chủ hộ kinh doanh.';
    if (!draft.ownerGender) next.ownerGender = 'Vui lòng chọn giới tính.';
    if (!draft.ownerNationality.trim()) next.ownerNationality = 'Vui lòng nhập quốc tịch.';
    if (!draft.idType) next.idType = 'Vui lòng chọn loại giấy tờ pháp lý.';
    if (!draft.idIssuedDate) next.idIssuedDate = 'Vui lòng nhập ngày cấp.';
    if (!draft.idIssuedPlace.trim()) next.idIssuedPlace = 'Vui lòng nhập nơi cấp.';
    if (!draft.permanentAddress.trim()) next.permanentAddress = 'Vui lòng nhập địa chỉ thường trú theo CCCD.';
    if (!draft.businessLine.trim()) next.businessLine = 'Vui lòng nhập ngành, nghề kinh doanh.';
    if (!draft.capitalAmount.trim()) next.capitalAmount = 'Vui lòng nhập vốn kinh doanh.';
    if (!draft.laborCount.trim()) next.laborCount = 'Vui lòng nhập số lao động.';
    if (!draft.plannedStartDate) next.plannedStartDate = 'Vui lòng nhập ngày dự kiến bắt đầu hoạt động.';
    if (!draft.foodSafetyCommitment) next.foodSafetyCommitment = 'Vui lòng xác nhận cam kết an toàn thực phẩm.';

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    navigate('/vendor/registrations/new/evidence');
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Tiếp tục" onPress={submit} />
        </StickyActions>
      }
    >
      <AppHeader title="Đăng ký kinh doanh" back />
      <Stepper step={3} total={4} label="Chủ hộ kinh doanh & ngành nghề" />

      <IdCardScanner />

      <Section title="Thông tin chủ hộ kinh doanh (theo CCCD)">
        <div className="flex gap-sm">
          <div className="flex-1">
            <TextField
              label="Ngày sinh"
              value={draft.ownerDateOfBirth}
              onChangeText={(v) => draft.setField('ownerDateOfBirth', v)}
              placeholder="YYYY-MM-DD"
              error={errors.ownerDateOfBirth}
            />
          </div>
        </div>
        <SelectField
          label="Giới tính"
          layout="inline"
          value={draft.ownerGender || undefined}
          onChange={(v) => draft.setField('ownerGender', v)}
          options={[
            { value: OWNER_GENDER.male, label: 'Nam' },
            { value: OWNER_GENDER.female, label: 'Nữ' },
            { value: OWNER_GENDER.other, label: 'Khác' },
          ]}
        />
        {errors.ownerGender ? <p className="text-body-sm text-error">{errors.ownerGender}</p> : null}
        <TextField
          label="Dân tộc"
          value={draft.ownerEthnicity}
          onChangeText={(v) => draft.setField('ownerEthnicity', v)}
          placeholder="VD: Kinh"
        />
        <TextField
          label="Quốc tịch"
          value={draft.ownerNationality}
          onChangeText={(v) => draft.setField('ownerNationality', v)}
          error={errors.ownerNationality}
        />
        <SelectField
          label="Loại giấy tờ pháp lý"
          layout="inline"
          value={draft.idType || undefined}
          onChange={(v) => draft.setField('idType', v)}
          options={[
            { value: OWNER_ID_TYPE.citizenId, label: 'CCCD gắn chip' },
            { value: OWNER_ID_TYPE.passport, label: 'Hộ chiếu' },
          ]}
        />
        {errors.idType ? <p className="text-body-sm text-error">{errors.idType}</p> : null}
        <div className="flex gap-sm">
          <div className="flex-1">
            <TextField
              label="Ngày cấp"
              value={draft.idIssuedDate}
              onChangeText={(v) => draft.setField('idIssuedDate', v)}
              placeholder="YYYY-MM-DD"
              error={errors.idIssuedDate}
            />
          </div>
          <div className="flex-1">
            <TextField
              label="Nơi cấp"
              value={draft.idIssuedPlace}
              onChangeText={(v) => draft.setField('idIssuedPlace', v)}
              placeholder="VD: Cục Cảnh sát QLHC về TTXH"
              error={errors.idIssuedPlace}
            />
          </div>
        </div>
        <TextField
          label="Địa chỉ thường trú (theo CCCD)"
          value={draft.permanentAddress}
          onChangeText={(v) => draft.setField('permanentAddress', v)}
          error={errors.permanentAddress}
        />
        <TextField
          label="Địa chỉ liên lạc (nếu khác thường trú)"
          value={draft.contactAddress}
          onChangeText={(v) => draft.setField('contactAddress', v)}
        />
      </Section>

      <Section title="Ngành nghề, quy mô hộ kinh doanh">
        <TextField
          label="Ngành, nghề kinh doanh"
          value={draft.businessLine}
          onChangeText={(v) => draft.setField('businessLine', v)}
          placeholder="VD: Bán đồ ăn, thức uống lưu động"
          error={errors.businessLine}
        />
        <div className="flex gap-sm">
          <div className="flex-1">
            <TextField
              label="Vốn kinh doanh (VNĐ)"
              value={draft.capitalAmount}
              onChangeText={(v) => draft.setField('capitalAmount', v)}
              keyboardType="numeric"
              placeholder="VD: 20000000"
              error={errors.capitalAmount}
            />
          </div>
          <div className="flex-1">
            <TextField
              label="Số lao động"
              value={draft.laborCount}
              onChangeText={(v) => draft.setField('laborCount', v)}
              keyboardType="number-pad"
              placeholder="VD: 1"
              error={errors.laborCount}
            />
          </div>
        </div>
        <TextField
          label="Ngày dự kiến bắt đầu hoạt động"
          value={draft.plannedStartDate}
          onChangeText={(v) => draft.setField('plannedStartDate', v)}
          placeholder="YYYY-MM-DD"
          error={errors.plannedStartDate}
        />
      </Section>

      <Section title="Thành viên hộ gia đình cùng góp vốn (nếu có)">
        {draft.householdMembers.map((m, idx) => (
          <Card key={idx}>
            <div className="flex flex-col gap-xs">
              <TextField
                label="Họ tên"
                value={m.fullName}
                onChangeText={(v) => draft.updateHouseholdMember(idx, { fullName: v })}
              />
              <div className="flex gap-sm">
                <div className="flex-1">
                  <TextField
                    label="Ngày sinh"
                    value={m.dateOfBirth}
                    onChangeText={(v) => draft.updateHouseholdMember(idx, { dateOfBirth: v })}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div className="flex-1">
                  <TextField
                    label="Quan hệ với chủ hộ"
                    value={m.relationshipToOwner}
                    onChangeText={(v) => draft.updateHouseholdMember(idx, { relationshipToOwner: v })}
                    placeholder="VD: Vợ, chồng, con"
                  />
                </div>
              </div>
              <div className="flex gap-sm">
                <div className="flex-1">
                  <TextField
                    label="Số CCCD"
                    value={m.idNumber}
                    onChangeText={(v) => draft.updateHouseholdMember(idx, { idNumber: v })}
                    keyboardType="numeric"
                  />
                </div>
                <div className="flex-1">
                  <TextField
                    label="Vốn góp (VNĐ)"
                    value={m.capitalContribution}
                    onChangeText={(v) => draft.updateHouseholdMember(idx, { capitalContribution: v })}
                    keyboardType="numeric"
                  />
                </div>
              </div>
              <Button
                label="Xoá thành viên"
                variant="outline"
                onPress={() => draft.removeHouseholdMember(idx)}
              />
            </div>
          </Card>
        ))}
        <Button label="+ Thêm thành viên hộ gia đình" variant="outline" onPress={draft.addHouseholdMember} />
      </Section>

      <Section title="Cam kết an toàn thực phẩm">
        <Card>
          <label className="flex cursor-pointer items-start gap-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={draft.foodSafetyCommitment}
              onChange={(e) => draft.setField('foodSafetyCommitment', e.target.checked)}
            />
            <span className="text-body-sm text-text">
              Tôi cam kết bảo đảm điều kiện an toàn thực phẩm trong quá trình kinh doanh (hộ kinh
              doanh nhỏ lẻ được miễn Giấy chứng nhận cơ sở đủ điều kiện ATTP nhưng vẫn phải tự
              chịu trách nhiệm đáp ứng các điều kiện an toàn thực phẩm theo quy định).
            </span>
          </label>
          {errors.foodSafetyCommitment ? (
            <p className="mt-1 text-body-sm text-error">{errors.foodSafetyCommitment}</p>
          ) : null}
        </Card>
      </Section>
    </Screen>
  );
}
