import { useMemo, useState } from 'react';

import { Card, Divider, ListRow, Money } from '@/components/common';
import { EmptyState } from '@/components/feedback';
import { FilterChips } from '@/components/forms';
import type { InvoiceDto } from '@/core/api';
import { groupInvoices, invoiceKind, type InvoiceKindFilter } from '../invoice-groups';

/**
 * FEE-03: receipts grouped by month (newest first) with each month's total, filterable by what
 * was paid and by year, and the year's total on top: what a household business looks for when it
 * does its books, rather than one long flat list.
 */
export function InvoiceList({
  invoices,
  onOpen,
}: {
  invoices: InvoiceDto[];
  onOpen: (invoiceId: number) => void;
}) {
  const years = useMemo(
    () => [...new Set(invoices.map((invoice) => new Date(invoice.issuedAt).getFullYear()))].sort((a, b) => b - a),
    [invoices],
  );
  const [kind, setKind] = useState<InvoiceKindFilter>('ALL');
  const [year, setYear] = useState<string>(() => String(years[0] ?? new Date().getFullYear()));
  const selectedYear = years.includes(Number(year)) ? Number(year) : years[0];

  const { months, total, count } = useMemo(
    () => groupInvoices(invoices, { kind, year: selectedYear }),
    [invoices, kind, selectedYear],
  );

  if (invoices.length === 0) {
    return <EmptyState icon="receipt" title="Chưa có hoá đơn nào" />;
  }

  const counts = {
    ALL: invoices.filter((i) => new Date(i.issuedAt).getFullYear() === selectedYear).length,
    FEE: invoices.filter((i) => new Date(i.issuedAt).getFullYear() === selectedYear && invoiceKind(i) === 'FEE').length,
    PENALTY: invoices.filter((i) => new Date(i.issuedAt).getFullYear() === selectedYear && invoiceKind(i) === 'PENALTY').length,
  };

  return (
    <div className="flex flex-col gap-sm">
      {years.length > 1 ? (
        <FilterChips
          value={String(selectedYear)}
          onChange={setYear}
          options={years.map((y) => ({ value: String(y), label: `Năm ${y}` }))}
        />
      ) : null}
      <FilterChips
        value={kind}
        onChange={setKind}
        options={[
          { value: 'ALL', label: 'Tất cả', count: counts.ALL },
          { value: 'FEE', label: 'Phí thuê ô', count: counts.FEE },
          { value: 'PENALTY', label: 'Tiền phạt', count: counts.PENALTY },
        ]}
      />
      <div className="flex items-baseline justify-between px-2xs">
        <span className="text-body-sm text-muted">
          {count} hoá đơn năm {selectedYear}
        </span>
        <span className="text-body-sm text-muted">
          Tổng <Money amountVnd={total} />
        </span>
      </div>
      {months.length === 0 ? (
        <EmptyState compact icon="receipt" title="Không có hoá đơn phù hợp" />
      ) : (
        months.map((month) => (
          <section key={month.key} aria-label={month.label}>
            <div className="mb-2xs flex items-baseline justify-between px-2xs">
              <h3 className="text-label text-text">{month.label}</h3>
              <Money amountVnd={month.total} className="text-muted" />
            </div>
            <Card padded={false}>
              <div className="px-md">
                {month.invoices.map((invoice, index) => (
                  <div key={invoice.invoiceId}>
                    {index ? <Divider /> : null}
                    <ListRow
                      title={invoice.invoiceNumber}
                      subtitle={[
                        invoiceKind(invoice) === 'PENALTY' ? 'Tiền phạt' : 'Phí thuê ô',
                        invoice.periodLabel,
                        new Date(invoice.issuedAt).toLocaleDateString('vi-VN'),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      trailing={<Money amountVnd={invoice.amount} />}
                      onPress={() => onOpen(invoice.invoiceId)}
                      showChevron
                    />
                  </div>
                ))}
              </div>
            </Card>
          </section>
        ))
      )}
    </div>
  );
}
