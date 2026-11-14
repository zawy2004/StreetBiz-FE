import { useState } from 'react';

import { Button, Card, Icon } from '@/components/common';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { errorMessage, type TaxIndustryRateDto, type TaxProfileDto } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { colors } from '@/theme';
import { TaxNeedsServer, Toggle } from '../components/TaxParts';
import { formatMoment, formatPercent, validTaxCode } from '../tax-format';
import { useTaxOverview, useTaxProfile, useUpdateTaxProfile } from '../useTax';

function ProfileForm({ profile, rates }: { profile: TaxProfileDto; rates: TaxIndustryRateDto[] }) {
  const save = useUpdateTaxProfile();
  const [taxCode, setTaxCode] = useState(profile.taxCode ?? '');
  const [industry, setIndustry] = useState(profile.industryCode);
  const [eInvoice, setEInvoice] = useState(profile.eInvoiceRegistered);
  const [share, setShare] = useState(profile.shareRevenueWithWard);

  const codeError = validTaxCode(taxCode)
    ? undefined
    : 'Mã số thuế gồm 10 số, 13 số (10 số-3 số) hoặc 12 số (số định danh cá nhân).';
  const dirty =
    taxCode.trim() !== (profile.taxCode ?? '') ||
    industry !== profile.industryCode ||
    eInvoice !== profile.eInvoiceRegistered ||
    share !== profile.shareRevenueWithWard;

  const options = rates.map((rate) => ({
    value: rate.code,
    label: rate.name,
    description: `GTGT ${formatPercent(rate.vatRate)} · TNCN ${formatPercent(rate.pitRate)}${rate.note ? ` · ${rate.note}` : ''}`,
  }));

  const submit = () =>
    save.mutate(
      {
        taxCode: taxCode.trim() === '' ? null : taxCode.trim(),
        industryCode: industry,
        eInvoiceRegistered: eInvoice,
        shareRevenueWithWard: share,
      },
      {
        onSuccess: () => showToast('Đã lưu thông tin thuế'),
        onError: (error) => showToast(errorMessage(error)),
      },
    );

  return (
    <>
      <Section title="Thông tin thuế của hộ">
        <Card>
          <div className="flex flex-col gap-md">
            <TextField
              label="Mã số thuế"
              helperText="Hộ kinh doanh dùng mã số thuế riêng hoặc số định danh cá nhân của chủ hộ."
              keyboardType="numeric"
              value={taxCode}
              onChangeText={setTaxCode}
              error={codeError}
              maxLength={16}
            />
            <SelectField label="Ngành nghề chính" value={industry} options={options} onChange={setIndustry} />
            <Toggle
              label="Đã đăng ký hoá đơn điện tử"
              description="Chỉ để StreetBiz nhắc đúng việc. Bạn đăng ký với cơ quan thuế, không phải ở đây."
              checked={eInvoice}
              onChange={setEInvoice}
            />
          </div>
        </Card>
      </Section>

      <Section title="Quyền riêng tư với phường">
        <Card>
          <Toggle
            label="Cho phép phường xem doanh thu và nhóm thuế của hộ"
            description="Mặc định là tắt. Khi bật, cán bộ phường thấy doanh thu năm và nhóm thuế của hộ trong danh sách hộ kinh doanh để hỗ trợ bạn. Khi tắt, phường chỉ biết bạn đã thông báo doanh thu hay chưa. Phường không thu thuế."
            checked={share}
            onChange={setShare}
          />
          <p className="mt-sm flex items-center gap-xs text-body-sm text-muted">
            <Icon name="lock-outline" size={16} color={colors.muted} />
            Mã số thuế luôn được che khi phường xem.
            {profile.consentUpdatedAt ? ` Thay đổi gần nhất: ${formatMoment(profile.consentUpdatedAt)}.` : ''}
          </p>
        </Card>
      </Section>

      <Button label="Lưu" loading={save.isPending} disabled={!dirty || !!codeError || save.isPending} onPress={submit} />
    </>
  );
}

/** The household's tax code, industry and e-invoice status, and whether its ward may see its revenue. */
export function TaxSettingsScreen() {
  const profile = useTaxProfile();
  const overview = useTaxOverview();
  const ready = profile.data && overview.data;

  return (
    <Screen width="narrow">
      <AppHeader title="Mã số thuế & quyền riêng tư" back />
      {!isLiveApi ? (
        <TaxNeedsServer />
      ) : profile.isLoading || overview.isLoading ? (
        <LoadingState />
      ) : profile.isError || overview.isError || !ready ? (
        <ErrorState
          message={errorMessage(profile.error ?? overview.error)}
          onRetry={() => {
            void profile.refetch();
            void overview.refetch();
          }}
        />
      ) : (
        <ProfileForm
          key={[profile.data.taxCode, profile.data.industryCode, profile.data.eInvoiceRegistered, profile.data.shareRevenueWithWard].join('|')}
          profile={profile.data}
          rates={overview.data.policy.rates}
        />
      )}
    </Screen>
  );
}
