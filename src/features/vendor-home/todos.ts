import type { ApiRegistration, FeeItemDto, PenaltyListDto } from '@/core/api';

/** Fees due within this many days count as "do it now"; later ones fold into one row. */
export const DUE_SOON_DAYS = 14;

// Same payable rules as FinanceHomeScreen. Mock penalties are PENDING, live ones UNPAID.
const PAYABLE_FEE = new Set(['PENDING', 'OVERDUE']);
const PAYABLE_PENALTY = new Set(['UNPAID', 'PENDING']);

export type TodoTone = 'danger' | 'pending';

export type TodoKind = 'fee' | 'penalty' | 'registration';

export type Todo = {
  key: string;
  kind: TodoKind;
  tone: TodoTone;
  title: string;
  /** Slot the item belongs to, shown as a Kerb Tag. */
  slotCode?: string | null;
  /** Short line under the title: the deadline, or why the ward asked for more. */
  note?: string;
  /** Colours the note when it carries the deadline; reasons and dates stay muted. */
  noteTone?: TodoTone;
  amount?: number;
  to: string;
};

export type LaterFees = { count: number; total: number; nextDueDate: string };

type Registration = Pick<
  ApiRegistration,
  'registrationId' | 'displayName' | 'registrationStatus' | 'reviewDecisionReason'
>;

/** Whole days from `today` to an ISO date, both read as local calendar dates. */
export function daysUntil(isoDate: string, today: Date): number {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  const due = new Date(y!, m! - 1, d!);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due.getTime() - start.getTime()) / 86_400_000);
}

export function shortDate(isoDate: string): string {
  const [, m, d] = isoDate.slice(0, 10).split('-');
  return `${d}/${m}`;
}

export function fullDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** "Kỳ 3/3 · Tháng 01/2027" -> "Phí tháng 01/2027": the month is what a vendor recognises, not the period index. */
function feeTitle(periodLabel: string): string {
  const month = /Tháng\s+(\d{1,2}\/\d{4})/i.exec(periodLabel)?.[1];
  return month ? `Phí tháng ${month}` : `Phí ${periodLabel}`;
}

function feeNote(days: number, isoDate: string, overdue: boolean): string {
  if (overdue) return days < 0 ? `Quá hạn ${-days} ngày` : 'Quá hạn';
  if (days === 0) return 'Hạn hôm nay';
  return `Còn ${days} ngày · hạn ${shortDate(isoDate)}`;
}

/**
 * Turns the vendor's registrations, fees and penalties into the home screen's
 * to-do list: what needs action now, most urgent first, plus a summary of fees
 * that are not due yet. Overdue fees lead, most overdue first (they put the
 * contract at risk and carry a real deadline); unpaid penalties follow, then
 * requests for more registration evidence, then fees due soon.
 */
export function buildTodos(
  registrations: Registration[],
  feeItems: FeeItemDto[],
  penalties: PenaltyListDto[],
  today: Date = new Date(),
): { todos: Todo[]; later: LaterFees | null } {
  const ranked: { todo: Todo; rank: number; date: string }[] = [];
  const laterFees: FeeItemDto[] = [];

  for (const f of feeItems) {
    if (!PAYABLE_FEE.has(f.itemStatus)) continue;
    const days = daysUntil(f.dueDate, today);
    const overdue = f.itemStatus === 'OVERDUE' || days < 0;
    if (!overdue && days > DUE_SOON_DAYS) {
      laterFees.push(f);
      continue;
    }
    ranked.push({
      rank: overdue ? 0 : 3,
      date: f.dueDate,
      todo: {
        key: `fee-${f.feeItemId}`,
        kind: 'fee',
        tone: overdue ? 'danger' : 'pending',
        title: feeTitle(f.periodLabel),
        slotCode: f.slotCode || null,
        note: feeNote(days, f.dueDate, overdue),
        noteTone: overdue ? 'danger' : 'pending',
        amount: f.amount,
        to: `/vendor/finance/fees/${f.feeItemId}/payment`,
      },
    });
  }

  for (const p of penalties) {
    if (!PAYABLE_PENALTY.has(p.penaltyStatus)) continue;
    ranked.push({
      rank: 1,
      date: p.issuedAt,
      todo: {
        key: `penalty-${p.penaltyId}`,
        kind: 'penalty',
        tone: 'danger',
        title: 'Biên bản phạt',
        slotCode: p.slotCode,
        // The reason is what the vendor needs to recognise it; the date is the fallback.
        note: p.violationLabel || `Lập ngày ${shortDate(p.issuedAt)}`,
        amount: p.amount,
        to: `/vendor/finance/penalties/${p.penaltyId}/payment`,
      },
    });
  }

  for (const r of registrations) {
    if (r.registrationStatus !== 'MORE_INFORMATION_REQUIRED') continue;
    ranked.push({
      rank: 2,
      date: '',
      todo: {
        key: `registration-${r.registrationId}`,
        kind: 'registration',
        tone: 'pending',
        title: `Bổ sung hồ sơ: ${r.displayName}`,
        note: r.reviewDecisionReason ?? undefined,
        to: `/vendor/registrations/${r.registrationId}`,
      },
    });
  }

  ranked.sort((a, b) => a.rank - b.rank || a.date.localeCompare(b.date));

  laterFees.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const later = laterFees.length
    ? {
        count: laterFees.length,
        total: laterFees.reduce((sum, f) => sum + f.amount, 0),
        nextDueDate: laterFees[0]!.dueDate,
      }
    : null;

  return { todos: ranked.map((r) => r.todo), later };
}
