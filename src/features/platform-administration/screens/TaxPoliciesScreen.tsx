import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Icon, IconButton } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import type { TaxIndustryRateDto, TaxPolicyDto } from '@/core/api';
import { Toggle } from '@/features/tax/components/TaxParts';
import { formatCompactVnd, formatMoment, formatPercent, groupDigits, parseDigits } from '@/features/tax/tax-format';
import { PlatformConnection } from '../components/PlatformConnection';
import { platformApi, PlatformApiError } from '../platform-api';

const KEY = ['platform', 'tax-policies'] as const;

type RateForm = { code: string; name: string; vat: string; pit: string; note: string };

type Form = {
  taxYear: string;
  legalBasis: string;
  revenueThreshold: string;
  eInvoiceThreshold: string;
  group2Ceiling: string;
  group3Ceiling: string;
  pitDeductsThreshold: boolean;
  pitG2: string;
  pitG3: string;
  pitG4: string;
  noticeMonth: string;
  noticeDay: string;
  warnPercent: string;
  note: string;
  rates: RateForm[];
};

/** Percent text ("1,5") ↔ ratio (0.015). */
const toPercentText = (ratio: number) => String(Number((ratio * 100).toFixed(2))).replace('.', ',');
const toRatio = (text: string) => Number((Number(text.replace(',', '.')) / 100).toFixed(4));
const validPercent = (text: string) => {
  const value = Number(text.replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 100;
};

function formFrom(policy: TaxPolicyDto): Form {
  return {
    taxYear: String(policy.taxYear),
    legalBasis: policy.legalBasis,
    revenueThreshold: String(policy.revenueThreshold),
    eInvoiceThreshold: String(policy.eInvoiceThreshold),
    group2Ceiling: String(policy.group2Ceiling),
    group3Ceiling: String(policy.group3Ceiling),
    pitDeductsThreshold: policy.pitDeductsThreshold,
    pitG2: toPercentText(policy.pitProfitRateG2),
    pitG3: toPercentText(policy.pitProfitRateG3),
    pitG4: toPercentText(policy.pitProfitRateG4),
    noticeMonth: String(policy.annualNoticeMonth),
    noticeDay: String(policy.annualNoticeDay),
    warnPercent: toPercentText(policy.warnRatio),
    note: policy.note ?? '',
    rates: policy.rates.map((rate) => ({
      code: rate.code,
      name: rate.name,
      vat: toPercentText(rate.vatRate),
      pit: toPercentText(rate.pitRate),
      note: rate.note ?? '',
    })),
  };
}

/** The messages a form can be published with; empty when it is ready. */
function problems(form: Form): string[] {
  const list: string[] = [];
  const year = Number(form.taxYear);
  if (!Number.isInteger(year) || year < 2026 || year > 2100) list.push('Năm áp dụng từ 2026 đến 2100.');
  if (form.legalBasis.trim() === '') list.push('Nhập căn cứ pháp lý.');
  const [t, e, g2, g3] = [form.revenueThreshold, form.eInvoiceThreshold, form.group2Ceiling, form.group3Ceiling].map(parseDigits);
  if (!t || !e || !g2 || !g3) list.push('Các mốc tiền phải lớn hơn 0.');
  else if (!(g2! > t! && g3! > g2!)) list.push('Các mốc phải tăng dần: ngưỡng < trần nhóm 2 < trần nhóm 3.');
  if (![form.pitG2, form.pitG3, form.pitG4, form.warnPercent].every(validPercent)) list.push('Các tỷ lệ phải từ 0 đến 100%.');
  else if (toRatio(form.warnPercent) <= 0 || toRatio(form.warnPercent) >= 1) list.push('Tỷ lệ cảnh báo phải lớn hơn 0% và nhỏ hơn 100%.');
  const [month, day] = [Number(form.noticeMonth), Number(form.noticeDay)];
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 31)
    list.push('Ngày hạn thông báo không hợp lệ.');
  const codes = form.rates.map((rate) => rate.code.trim());
  if (!codes.includes('FOOD_SERVICE') || !codes.includes('OTHER')) list.push('Cần có ngành FOOD_SERVICE và OTHER.');
  if (new Set(codes).size !== codes.length) list.push('Mã ngành không được trùng.');
  if (form.rates.some((rate) => !/^[A-Z0-9_]{2,30}$/.test(rate.code.trim()) || rate.name.trim() === '' || !validPercent(rate.vat) || !validPercent(rate.pit)))
    list.push('Mỗi ngành cần mã (chữ in hoa, số, gạch dưới), tên và tỷ lệ hợp lệ.');
  return list;
}

function toRequest(form: Form) {
  return {
    taxYear: Number(form.taxYear),
    legalBasis: form.legalBasis.trim(),
    revenueThreshold: parseDigits(form.revenueThreshold),
    eInvoiceThreshold: parseDigits(form.eInvoiceThreshold),
    group2Ceiling: parseDigits(form.group2Ceiling),
    group3Ceiling: parseDigits(form.group3Ceiling),
    pitDeductsThreshold: form.pitDeductsThreshold,
    pitProfitRateG2: toRatio(form.pitG2),
    pitProfitRateG3: toRatio(form.pitG3),
    pitProfitRateG4: toRatio(form.pitG4),
    annualNoticeMonth: Number(form.noticeMonth),
    annualNoticeDay: Number(form.noticeDay),
    warnRatio: toRatio(form.warnPercent),
    note: form.note.trim() || null,
    rates: form.rates.map<TaxIndustryRateDto>((rate) => ({
      code: rate.code.trim(),
      name: rate.name.trim(),
      vatRate: toRatio(rate.vat),
      pitRate: toRatio(rate.pit),
      note: rate.note.trim() || null,
    })),
  };
}

function PolicyCard({ policy, inForce }: { policy: TaxPolicyDto; inForce: boolean }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="min-w-0">
          <h3 className="text-headline-sm text-text">
            Năm {policy.taxYear} · phiên bản {policy.versionNo}
          </h3>
          <p className="text-body-sm text-muted">Ban hành {formatMoment(policy.createdAt)}</p>
        </div>
        <StatusChip label={inForce ? 'Đang áp dụng' : 'Đã thay thế'} tone={inForce ? 'ok' : 'neutral'} />
      </div>
      <p className="mt-xs text-body-md text-text">{policy.legalBasis}</p>
      <dl className="mt-sm grid grid-cols-2 gap-x-md gap-y-xs text-body-sm">
        <dt className="text-muted">Ngưỡng không chịu thuế</dt>
        <dd className="text-right font-tabular text-text">{formatCompactVnd(policy.revenueThreshold)}</dd>
        <dt className="text-muted">Hoá đơn điện tử từ</dt>
        <dd className="text-right font-tabular text-text">{formatCompactVnd(policy.eInvoiceThreshold)}</dd>
        <dt className="text-muted">Trần nhóm 2 / nhóm 3</dt>
        <dd className="text-right font-tabular text-text">
          {formatCompactVnd(policy.group2Ceiling)} / {formatCompactVnd(policy.group3Ceiling)}
        </dd>
        <dt className="text-muted">TNCN trừ ngưỡng</dt>
        <dd className="text-right text-text">{policy.pitDeductsThreshold ? 'Có' : 'Không'}</dd>
        <dt className="text-muted">Hạn thông báo năm</dt>
        <dd className="text-right text-text">
          {String(policy.annualNoticeDay).padStart(2, '0')}/{String(policy.annualNoticeMonth).padStart(2, '0')} năm sau
        </dd>
        <dt className="text-muted">Cảnh báo từ</dt>
        <dd className="text-right text-text">{formatPercent(policy.warnRatio, 0)} ngưỡng</dd>
      </dl>
      <details className="mt-sm">
        <summary className="cursor-pointer text-label font-semibold text-primary">Tỷ lệ theo ngành ({policy.rates.length})</summary>
        <ul className="mt-xs divide-y divide-border text-body-sm">
          {policy.rates.map((rate) => (
            <li key={rate.code} className="flex justify-between gap-sm py-1">
              <span className="text-text">{rate.name}</span>
              <span className="shrink-0 font-tabular text-muted">
                GTGT {formatPercent(rate.vatRate)} · TNCN {formatPercent(rate.pitRate)}
              </span>
            </li>
          ))}
        </ul>
      </details>
      {policy.note ? <p className="mt-sm text-body-sm text-muted">{policy.note}</p> : null}
    </Card>
  );
}

function RateRow({
  rate,
  fixed,
  onChange,
  onRemove,
}: {
  rate: RateForm;
  fixed: boolean;
  onChange: (rate: RateForm) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-sm rounded-[14px] bg-sunken p-sm md:grid-cols-[1fr_2fr_1fr_1fr_auto] md:items-start">
      <TextField
        label="Mã"
        value={rate.code}
        onChangeText={(code) => onChange({ ...rate, code: code.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
        disabled={fixed}
        maxLength={30}
      />
      <TextField label="Tên ngành" value={rate.name} onChangeText={(name) => onChange({ ...rate, name })} maxLength={200} />
      <TextField label="GTGT (%)" keyboardType="numeric" value={rate.vat} onChangeText={(vat) => onChange({ ...rate, vat })} maxLength={6} />
      <TextField label="TNCN (%)" keyboardType="numeric" value={rate.pit} onChangeText={(pit) => onChange({ ...rate, pit })} maxLength={6} />
      <div className="flex items-end md:pt-6">
        {fixed ? null : <IconButton icon="trash-can-outline" accessibilityLabel={`Xoá ngành ${rate.name || rate.code}`} onPress={onRemove} />}
      </div>
    </div>
  );
}

function PolicyForm({ base, onDone }: { base: TaxPolicyDto; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(() => formFrom(base));
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));
  const issues = useMemo(() => problems(form), [form]);

  const publish = useMutation({
    mutationFn: () => platformApi.createTaxPolicy(toRequest(form)),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: KEY });
      showToast(`Đã ban hành năm ${created.policy.taxYear} · phiên bản ${created.policy.versionNo}`);
      onDone();
    },
    onError: (error) => showToast(error instanceof PlatformApiError ? error.message : 'Không thể ban hành.'),
  });

  return (
    <Card>
      <div className="flex flex-col gap-md">
        <p className="text-body-md text-muted">
          Phiên bản đã ban hành không sửa được. Ban hành phiên bản mới của cùng năm để thay thế: cao nhất sẽ được áp dụng, các phiên bản cũ
          vẫn lưu để đối chiếu. Mọi số bên dưới phải đối chiếu với văn bản pháp luật hiện hành trước khi ban hành.
        </p>
        <div className="grid gap-md md:grid-cols-3">
          <TextField label="Năm áp dụng" keyboardType="numeric" value={form.taxYear} onChangeText={(v) => set('taxYear', v)} maxLength={4} />
          <div className="md:col-span-2">
            <TextField label="Căn cứ pháp lý" value={form.legalBasis} onChangeText={(v) => set('legalBasis', v)} maxLength={500} />
          </div>
        </div>
        <div className="grid gap-md md:grid-cols-2">
          <TextField label="Ngưỡng doanh thu không chịu thuế (đồng/năm)" keyboardType="numeric" value={groupDigits(form.revenueThreshold)} onChangeText={(v) => set('revenueThreshold', String(parseDigits(v) || ''))} />
          <TextField label="Hoá đơn điện tử bắt buộc từ (đồng/năm)" keyboardType="numeric" value={groupDigits(form.eInvoiceThreshold)} onChangeText={(v) => set('eInvoiceThreshold', String(parseDigits(v) || ''))} />
          <TextField label="Trần nhóm 2 (đồng/năm)" keyboardType="numeric" value={groupDigits(form.group2Ceiling)} onChangeText={(v) => set('group2Ceiling', String(parseDigits(v) || ''))} />
          <TextField label="Trần nhóm 3 (đồng/năm)" keyboardType="numeric" value={groupDigits(form.group3Ceiling)} onChangeText={(v) => set('group3Ceiling', String(parseDigits(v) || ''))} />
        </div>
        <Toggle
          label="Thuế TNCN theo doanh thu chỉ tính trên phần vượt ngưỡng"
          description="Bật nếu quy định cho trừ ngưỡng doanh thu trước khi nhân tỷ lệ TNCN."
          checked={form.pitDeductsThreshold}
          onChange={(v) => set('pitDeductsThreshold', v)}
        />
        <div className="grid gap-md md:grid-cols-4">
          <TextField label="TNCN theo lợi nhuận, nhóm 2 (%)" keyboardType="numeric" value={form.pitG2} onChangeText={(v) => set('pitG2', v)} maxLength={6} />
          <TextField label="Nhóm 3 (%)" keyboardType="numeric" value={form.pitG3} onChangeText={(v) => set('pitG3', v)} maxLength={6} />
          <TextField label="Nhóm 4 (%)" keyboardType="numeric" value={form.pitG4} onChangeText={(v) => set('pitG4', v)} maxLength={6} />
          <TextField label="Cảnh báo gần ngưỡng từ (%)" keyboardType="numeric" value={form.warnPercent} onChangeText={(v) => set('warnPercent', v)} maxLength={6} />
        </div>
        <div className="grid gap-md md:grid-cols-4">
          <TextField label="Hạn thông báo năm: ngày" keyboardType="numeric" value={form.noticeDay} onChangeText={(v) => set('noticeDay', v)} maxLength={2} />
          <TextField label="tháng (của năm sau)" keyboardType="numeric" value={form.noticeMonth} onChangeText={(v) => set('noticeMonth', v)} maxLength={2} />
          <div className="md:col-span-2">
            <TextField label="Ghi chú (không bắt buộc)" value={form.note} onChangeText={(v) => set('note', v)} maxLength={1000} />
          </div>
        </div>

        <div className="flex flex-col gap-sm">
          <h3 className="text-headline-sm text-text">Tỷ lệ theo ngành nghề</h3>
          {form.rates.map((rate, index) => (
            <RateRow
              key={index}
              rate={rate}
              fixed={rate.code === 'FOOD_SERVICE' || rate.code === 'OTHER'}
              onChange={(next) => set('rates', form.rates.map((item, i) => (i === index ? next : item)))}
              onRemove={() => set('rates', form.rates.filter((_, i) => i !== index))}
            />
          ))}
          <div>
            <Button
              label="Thêm ngành"
              variant="outline"
              size="sm"
              fullWidth={false}
              icon={<Icon name="plus" size={16} />}
              onPress={() => set('rates', [...form.rates, { code: '', name: '', vat: '', pit: '', note: '' }])}
            />
          </div>
        </div>

        {issues.length > 0 ? (
          <ul className="list-disc rounded-[14px] bg-secondary-bg px-lg py-sm text-body-sm text-on-secondary">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap gap-sm">
          <Button label="Ban hành phiên bản mới" fullWidth={false} loading={publish.isPending} disabled={issues.length > 0 || publish.isPending} onPress={() => publish.mutate()} />
          <Button label="Đóng" variant="outline" fullWidth={false} onPress={onDone} />
        </div>
      </div>
    </Card>
  );
}

function TaxPoliciesContent() {
  const policies = useQuery({ queryKey: KEY, queryFn: platformApi.taxPolicies });
  const [editing, setEditing] = useState(false);
  const rows = policies.data ?? [];
  const base = rows.find((row) => row.inForce)?.policy ?? rows[0]?.policy;

  return (
    <Screen>
      <AppHeader
        title="Chính sách thuế hộ kinh doanh"
        subtitle="Ngưỡng, tỷ lệ và hạn thông báo mà module thuế đang chạy. Chỉ để tham khảo cho hộ kinh doanh."
        right={
          base && !editing ? (
            <Button label="Ban hành phiên bản mới" size="sm" fullWidth={false} onPress={() => setEditing(true)} />
          ) : undefined
        }
      />
      {policies.isLoading ? (
        <LoadingState />
      ) : policies.isError ? (
        <ErrorState
          message={policies.error instanceof PlatformApiError ? policies.error.message : undefined}
          onRetry={() => policies.refetch()}
        />
      ) : rows.length === 0 || !base ? (
        <EmptyState icon="file-document-outline" title="Chưa có chính sách thuế nào" description="Cần cài dữ liệu mẫu hoặc ban hành chính sách đầu tiên qua cơ sở dữ liệu." />
      ) : (
        <>
          {editing ? (
            <Section title="Ban hành phiên bản mới">
              <PolicyForm base={base} onDone={() => setEditing(false)} />
            </Section>
          ) : null}
          <Section title="Các phiên bản đã ban hành" description="Mới nhất ở trên. Phiên bản cao nhất của mỗi năm là phiên bản đang áp dụng.">
            <div className="grid gap-sm md:grid-cols-2">
              {rows.map((row) => (
                <PolicyCard key={row.policy.policyId} policy={row.policy} inForce={row.inForce} />
              ))}
            </div>
          </Section>
        </>
      )}
    </Screen>
  );
}

/** Platform administrators publish the parameters the household tax module runs on. */
export function TaxPoliciesScreen() {
  return (
    <PlatformConnection>
      <TaxPoliciesContent />
    </PlatformConnection>
  );
}
