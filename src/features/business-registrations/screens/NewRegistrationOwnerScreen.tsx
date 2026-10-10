import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, formatVnd, Icon } from '@/components/common';
import { SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { OWNER_GENDER, OWNER_ID_TYPE } from '@/core/api';
import { IdCardScanner, type AiFilledKey } from '../components/IdCardScanner';
import { focusFirstError, prefersReducedMotion } from '../components/ui-motion';
import { ownerRequirements, type OwnerSection } from '../components/wizard/owner-progress';
import {
  AiField,
  ConsentRow,
  FormSheet,
  MoneyEcho,
  SectionRail,
  type RailItem,
} from '../components/wizard/OwnerParts';
import { DraftNotice, EditingBanner, WizardProgress } from '../components/wizard/WizardFrame';
import { parseVndAmount, useNewRegistrationStore } from '../new-registration-store';

const SECTIONS: { id: string; section: OwnerSection; label: string }[] = [
  { id: 'reg-owner-scan', section: 'scan', label: 'Quét CCCD [AI]' },
  { id: 'reg-owner-person', section: 'owner', label: 'Chủ hộ' },
  { id: 'reg-owner-business', section: 'business', label: 'Ngành nghề' },
  { id: 'reg-owner-members', section: 'members', label: 'Thành viên hộ' },
  { id: 'reg-owner-commitment', section: 'commitment', label: 'Cam kết ATTP' },
];

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
  // Which fields OCR filled; a field loses its [AI] tag once the person edits it (BR-42).
  const [aiFilled, setAiFilled] = useState<Set<AiFilledKey>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(SECTIONS[0]?.id ?? null);
  const formRef = useRef<HTMLDivElement>(null);

  const submit = () => {
    const next: Record<string, string | undefined> = {};
    if (!draft.ownerDateOfBirth)
      next.ownerDateOfBirth = 'Vui lòng nhập ngày sinh của chủ hộ kinh doanh.';
    if (!draft.ownerGender) next.ownerGender = 'Vui lòng chọn giới tính.';
    if (!draft.ownerNationality.trim()) next.ownerNationality = 'Vui lòng nhập quốc tịch.';
    if (!draft.idType) next.idType = 'Vui lòng chọn loại giấy tờ pháp lý.';
    if (!draft.idIssuedDate) next.idIssuedDate = 'Vui lòng nhập ngày cấp.';
    if (!draft.idIssuedPlace.trim()) next.idIssuedPlace = 'Vui lòng nhập nơi cấp.';
    if (!draft.permanentAddress.trim())
      next.permanentAddress = 'Vui lòng nhập địa chỉ thường trú theo CCCD.';
    if (!draft.businessLine.trim()) next.businessLine = 'Vui lòng nhập ngành, nghề kinh doanh.';
    if (!draft.capitalAmount.trim()) next.capitalAmount = 'Vui lòng nhập vốn kinh doanh.';
    if (!draft.laborCount.trim()) next.laborCount = 'Vui lòng nhập số lao động.';
    if (!draft.plannedStartDate)
      next.plannedStartDate = 'Vui lòng nhập ngày dự kiến bắt đầu hoạt động.';
    if (!draft.foodSafetyCommitment)
      next.foodSafetyCommitment = 'Vui lòng xác nhận cam kết an toàn thực phẩm.';

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    navigate('/vendor/registrations/new/evidence');
  };

  // After a submit that flagged something, bring the first flagged field into view
  // (presentation only: what and when `submit` validates is unchanged).
  useEffect(() => {
    if (Object.values(errors).some(Boolean)) focusFirstError(formRef.current);
  }, [errors]);

  // Highlight the section on screen in the rail.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActiveId(top.target.id);
      },
      { rootMargin: '-15% 0px -60% 0px' },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const jump = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    setActiveId(id);
  };

  const clearAi = (key: AiFilledKey) =>
    setAiFilled((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  const aiOrder = (key: AiFilledKey) => [...aiFilled].indexOf(key);

  const requirements = ownerRequirements(draft);
  const filledCount = requirements.filter((r) => r.filled).length;
  const railItems: RailItem[] = SECTIONS.map((s) => {
    const reqs = requirements.filter((r) => r.section === s.section);
    const hasError = reqs.some((r) => errors[r.key]);
    let state: RailItem['state'];
    if (s.section === 'scan') {
      const has = (t: string) => draft.evidence.some((e) => e.evidenceType === t);
      state = has('IDENTITY_DOCUMENT') && has('IDENTITY_DOCUMENT_BACK') ? 'done' : 'optional';
    } else if (s.section === 'members') {
      state = draft.householdMembers.length > 0 ? 'done' : 'optional';
    } else {
      state = hasError ? 'error' : reqs.every((r) => r.filled) ? 'done' : 'todo';
    }
    return { ...s, state };
  });

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Tiếp tục" onPress={submit} />
        </StickyActions>
      }
    >
      <AppHeader title="Đăng ký kinh doanh" back />
      <WizardProgress step={3} />
      {draft.registrationId ? <EditingBanner displayName={draft.displayName} /> : null}
      <SectionRail
        variant="chips"
        items={railItems}
        activeId={activeId}
        filled={filledCount}
        total={requirements.length}
        onJump={jump}
      />

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-xl">
        <div ref={formRef} className="flex min-w-0 max-w-[680px] flex-col gap-lg">
          <IdCardScanner
            id="reg-owner-scan"
            onExtracted={(keys) => setAiFilled((current) => new Set([...current, ...keys]))}
          />

          <FormSheet
            id="reg-owner-person"
            number={1}
            title="Thông tin chủ hộ kinh doanh (theo CCCD)"
          >
            <div className="form-grid grid grid-cols-1 gap-x-md gap-y-md md:grid-cols-2">
              <AiField
                filled={aiFilled.has('ownerDateOfBirth')}
                order={aiOrder('ownerDateOfBirth')}
              >
                <TextField
                  label="Ngày sinh"
                  value={draft.ownerDateOfBirth}
                  onChangeText={(v) => {
                    draft.setField('ownerDateOfBirth', v);
                    clearAi('ownerDateOfBirth');
                  }}
                  placeholder="YYYY-MM-DD"
                  error={errors.ownerDateOfBirth}
                />
              </AiField>
              <AiField filled={aiFilled.has('ownerGender')} order={aiOrder('ownerGender')}>
                <div
                  data-field-error={errors.ownerGender ? 'true' : undefined}
                  className="flex flex-col gap-1.5"
                >
                  <SelectField
                    label="Giới tính"
                    layout="inline"
                    value={draft.ownerGender || undefined}
                    onChange={(v) => {
                      draft.setField('ownerGender', v);
                      clearAi('ownerGender');
                    }}
                    options={[
                      { value: OWNER_GENDER.male, label: 'Nam' },
                      { value: OWNER_GENDER.female, label: 'Nữ' },
                      { value: OWNER_GENDER.other, label: 'Khác' },
                    ]}
                  />
                  {errors.ownerGender ? <FieldError>{errors.ownerGender}</FieldError> : null}
                </div>
              </AiField>
              <AiField filled={aiFilled.has('ownerEthnicity')} order={aiOrder('ownerEthnicity')}>
                <TextField
                  label="Dân tộc"
                  value={draft.ownerEthnicity}
                  onChangeText={(v) => {
                    draft.setField('ownerEthnicity', v);
                    clearAi('ownerEthnicity');
                  }}
                  placeholder="VD: Kinh"
                />
              </AiField>
              <AiField
                filled={aiFilled.has('ownerNationality')}
                order={aiOrder('ownerNationality')}
              >
                <TextField
                  label="Quốc tịch"
                  value={draft.ownerNationality}
                  onChangeText={(v) => {
                    draft.setField('ownerNationality', v);
                    clearAi('ownerNationality');
                  }}
                  error={errors.ownerNationality}
                />
              </AiField>
              <div
                data-field-error={errors.idType ? 'true' : undefined}
                className="flex min-w-0 flex-col gap-1.5 md:col-span-2"
              >
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
                {errors.idType ? <FieldError>{errors.idType}</FieldError> : null}
              </div>
              <AiField filled={aiFilled.has('idIssuedDate')} order={aiOrder('idIssuedDate')}>
                <TextField
                  label="Ngày cấp"
                  value={draft.idIssuedDate}
                  onChangeText={(v) => {
                    draft.setField('idIssuedDate', v);
                    clearAi('idIssuedDate');
                  }}
                  placeholder="YYYY-MM-DD"
                  error={errors.idIssuedDate}
                />
              </AiField>
              <AiField filled={aiFilled.has('idIssuedPlace')} order={aiOrder('idIssuedPlace')}>
                <TextField
                  label="Nơi cấp"
                  value={draft.idIssuedPlace}
                  onChangeText={(v) => {
                    draft.setField('idIssuedPlace', v);
                    clearAi('idIssuedPlace');
                  }}
                  placeholder="VD: Cục Cảnh sát QLHC về TTXH"
                  error={errors.idIssuedPlace}
                />
              </AiField>
              <div className="min-w-0 md:col-span-2">
                <AiField
                  filled={aiFilled.has('permanentAddress')}
                  order={aiOrder('permanentAddress')}
                >
                  <TextField
                    label="Địa chỉ thường trú (theo CCCD)"
                    value={draft.permanentAddress}
                    onChangeText={(v) => {
                      draft.setField('permanentAddress', v);
                      clearAi('permanentAddress');
                    }}
                    error={errors.permanentAddress}
                  />
                </AiField>
              </div>
              <div className="min-w-0 md:col-span-2">
                <TextField
                  label="Địa chỉ liên lạc (nếu khác thường trú)"
                  value={draft.contactAddress}
                  onChangeText={(v) => draft.setField('contactAddress', v)}
                />
              </div>
            </div>
          </FormSheet>

          <FormSheet id="reg-owner-business" number={2} title="Ngành nghề, quy mô hộ kinh doanh">
            <div className="form-grid grid grid-cols-1 gap-x-md gap-y-md md:grid-cols-2">
              <div className="min-w-0 md:col-span-2">
                <TextField
                  label="Ngành, nghề kinh doanh"
                  value={draft.businessLine}
                  onChangeText={(v) => draft.setField('businessLine', v)}
                  placeholder="VD: Bán đồ ăn, thức uống lưu động"
                  error={errors.businessLine}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-xs">
                <TextField
                  label="Vốn kinh doanh (VNĐ)"
                  value={draft.capitalAmount}
                  onChangeText={(v) => draft.setField('capitalAmount', v)}
                  keyboardType="numeric"
                  placeholder="VD: 20000000"
                  error={errors.capitalAmount}
                />
                <MoneyEcho text={draft.capitalAmount} />
              </div>
              <div className="min-w-0">
                <TextField
                  label="Số lao động"
                  value={draft.laborCount}
                  onChangeText={(v) => draft.setField('laborCount', v)}
                  keyboardType="number-pad"
                  placeholder="VD: 1"
                  error={errors.laborCount}
                />
              </div>
              <div className="min-w-0">
                <TextField
                  label="Ngày dự kiến bắt đầu hoạt động"
                  value={draft.plannedStartDate}
                  onChangeText={(v) => draft.setField('plannedStartDate', v)}
                  placeholder="YYYY-MM-DD"
                  error={errors.plannedStartDate}
                />
              </div>
            </div>
          </FormSheet>

          <FormSheet
            id="reg-owner-members"
            number={3}
            title="Thành viên hộ gia đình cùng góp vốn (nếu có)"
          >
            <HouseholdMembers />
          </FormSheet>

          <FormSheet id="reg-owner-commitment" number={4} title="Cam kết an toàn thực phẩm">
            <ConsentRow
              checked={draft.foodSafetyCommitment}
              onChange={(checked) => draft.setField('foodSafetyCommitment', checked)}
              invalid={!!errors.foodSafetyCommitment}
            >
              Tôi cam kết bảo đảm điều kiện an toàn thực phẩm trong quá trình kinh doanh (hộ kinh
              doanh nhỏ lẻ được miễn Giấy chứng nhận cơ sở đủ điều kiện ATTP nhưng vẫn phải tự chịu
              trách nhiệm đáp ứng các điều kiện an toàn thực phẩm theo quy định).
            </ConsentRow>
            {errors.foodSafetyCommitment ? (
              <div className="mt-xs">
                <FieldError>{errors.foodSafetyCommitment}</FieldError>
              </div>
            ) : null}
          </FormSheet>

          <div className="xl:hidden">
            <DraftNotice />
          </div>
        </div>

        <aside className="hidden min-w-0 flex-col gap-md xl:sticky xl:top-0 xl:flex">
          <SectionRail
            variant="column"
            items={railItems}
            activeId={activeId}
            filled={filledCount}
            total={requirements.length}
            onJump={jump}
          />
          <DraftNotice />
        </aside>
      </div>
    </Screen>
  );
}

/** A validation line set apart for reading in sunlight; the words are the baseline's. */
function FieldError({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-1.5 text-body-sm font-medium text-error">
      <Icon
        name="alert-circle-outline"
        size={16}
        color="currentColor"
        className="mt-0.5 shrink-0"
      />
      {children}
    </p>
  );
}

/**
 * "Sổ hộ": one row per household member who puts capital in. With four or more
 * rows each folds to a one-line summary and opens to edit. Adding one focuses its
 * name; removing one is immediate, as before.
 */
function HouseholdMembers() {
  const members = useNewRegistrationStore((s) => s.householdMembers);
  const capitalAmount = useNewRegistrationStore((s) => s.capitalAmount);
  const addHouseholdMember = useNewRegistrationStore((s) => s.addHouseholdMember);
  const updateHouseholdMember = useNewRegistrationStore((s) => s.updateHouseholdMember);
  const removeHouseholdMember = useNewRegistrationStore((s) => s.removeHouseholdMember);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const nameRefs = useRef<(HTMLInputElement | HTMLTextAreaElement | null)[]>([]);
  const previousCount = useRef(members.length);

  useEffect(() => {
    if (members.length > previousCount.current) {
      const last = members.length - 1;
      setOpenIdx(last);
      window.setTimeout(() => nameRefs.current[last]?.focus(), 0);
    }
    previousCount.current = members.length;
  }, [members.length]);

  const compact = members.length >= 4;
  const contributions = members.reduce(
    (sum, m) => sum + (parseVndAmount(m.capitalContribution) ?? 0),
    0,
  );
  const capital = parseVndAmount(capitalAmount);

  return (
    <div className="flex flex-col gap-sm">
      {members.length === 0 ? (
        <p className="text-body-md text-muted">
          Chưa có thành viên nào. Bỏ qua mục này nếu chỉ một mình chủ hộ góp vốn.
        </p>
      ) : null}

      {members.map((m, idx) => {
        const initial = m.fullName.trim().charAt(0).toUpperCase() || String(idx + 1);
        const isOpen = !compact || openIdx === idx;
        return (
          <div
            key={idx}
            className="sb-rise flex flex-col gap-sm rounded-[18px] bg-sunken/50 p-sm ring-1 ring-border md:p-md"
          >
            <div className="flex items-center gap-sm">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF3E8] font-sign text-[17px] font-extrabold text-primary ring-1 ring-brand/30 dark:bg-[#2A2420]"
              >
                {initial}
              </span>
              <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-text">
                {m.fullName.trim() || `Thành viên ${idx + 1}`}
                {!isOpen ? (
                  <span className="block truncate text-body-sm font-normal text-muted">
                    {[
                      m.relationshipToOwner,
                      m.capitalContribution &&
                        formatVnd(parseVndAmount(m.capitalContribution) ?? 0),
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Chưa điền đủ'}
                  </span>
                ) : null}
              </p>
              {compact ? (
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="flex h-11 shrink-0 items-center gap-1 rounded-[10px] px-sm text-label font-semibold text-primary hover:bg-tint-primary"
                >
                  {isOpen ? 'Thu gọn' : 'Sửa'}
                  <span className="sr-only"> thành viên {idx + 1}</span>
                </button>
              ) : null}
            </div>
            {isOpen ? (
              <>
                <div className="form-grid grid grid-cols-1 gap-x-md gap-y-sm md:grid-cols-2">
                  <div className="min-w-0 md:col-span-2">
                    <TextField
                      ref={(el) => {
                        nameRefs.current[idx] = el;
                      }}
                      label="Họ tên"
                      value={m.fullName}
                      onChangeText={(v) => updateHouseholdMember(idx, { fullName: v })}
                    />
                  </div>
                  <div className="min-w-0">
                    <TextField
                      label="Ngày sinh"
                      value={m.dateOfBirth}
                      onChangeText={(v) => updateHouseholdMember(idx, { dateOfBirth: v })}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  <div className="min-w-0">
                    <TextField
                      label="Quan hệ với chủ hộ"
                      value={m.relationshipToOwner}
                      onChangeText={(v) => updateHouseholdMember(idx, { relationshipToOwner: v })}
                      placeholder="VD: Vợ, chồng, con"
                    />
                  </div>
                  <div className="min-w-0">
                    <TextField
                      label="Số CCCD"
                      value={m.idNumber}
                      onChangeText={(v) => updateHouseholdMember(idx, { idNumber: v })}
                      keyboardType="numeric"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-xs">
                    <TextField
                      label="Vốn góp (VNĐ)"
                      value={m.capitalContribution}
                      onChangeText={(v) => updateHouseholdMember(idx, { capitalContribution: v })}
                      keyboardType="numeric"
                    />
                    <MoneyEcho text={m.capitalContribution} />
                  </div>
                </div>
                <div className="sm:max-w-[220px]">
                  <Button
                    label="Xoá thành viên"
                    variant="outline"
                    icon={<Icon name="trash-can-outline" size={18} color="currentColor" />}
                    onPress={() => removeHouseholdMember(idx)}
                  />
                </div>
              </>
            ) : null}
          </div>
        );
      })}

      {members.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-sm gap-y-1 rounded-[14px] bg-[#FFF3E8] px-sm py-xs text-body-md text-text dark:bg-[#2A2420]">
          <span>
            Tổng vốn góp của thành viên:{' '}
            <strong className="font-sign font-bold font-tabular">{formatVnd(contributions)}</strong>
          </span>
          {capital != null ? (
            <span className="text-muted">
              trên vốn kinh doanh{' '}
              <span className="font-sign font-bold text-text font-tabular">
                {formatVnd(capital)}
              </span>
            </span>
          ) : null}
        </p>
      ) : null}

      <Button
        label="+ Thêm thành viên hộ gia đình"
        variant="outline"
        onPress={addHouseholdMember}
      />
    </div>
  );
}
