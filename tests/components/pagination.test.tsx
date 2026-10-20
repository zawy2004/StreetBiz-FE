import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { Pagination, pageSlots, rangeCaption } from '@/components/common';

describe('pageSlots', () => {
  it('lists every page when they fit', () => {
    expect(pageSlots(2, 4)).toEqual([1, 2, 3, 4]);
    expect(pageSlots(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it.each([
    [1, [1, 2, 3, 4, 5, 'gap', 12]],
    [4, [1, 2, 3, 4, 5, 'gap', 12]],
    [6, [1, 'gap', 5, 6, 7, 'gap', 12]],
    [9, [1, 'gap', 8, 9, 10, 11, 12]],
    [12, [1, 'gap', 8, 9, 10, 11, 12]],
  ])('page %i of 12 keeps first, last and neighbours in seven slots', (page, slots) => {
    expect(pageSlots(page, 12)).toEqual(slots);
  });

  it('never spends a "…" on a single hidden page', () => {
    for (let total = 8; total <= 30; total += 1) {
      for (let page = 1; page <= total; page += 1) {
        const slots = pageSlots(page, total);
        expect(slots.length).toBeLessThanOrEqual(7);
        expect(slots).toContain(page);
        slots.forEach((slot, index) => {
          if (slot !== 'gap') return;
          const before = slots[index - 1] as number;
          const after = slots[index + 1] as number;
          expect(after - before).toBeGreaterThan(2);
        });
      }
    }
  });
});

describe('rangeCaption', () => {
  it('says where the page sits, including a short last page', () => {
    expect(rangeCaption('Đơn', 1, 10, 34, 10)).toBe('Đơn 1–10 trên 34');
    expect(rangeCaption('Đơn', 4, 10, 34, 4)).toBe('Đơn 31–34 trên 34');
  });
});

describe('Pagination', () => {
  it('cannot go back from the first page or forward from the last', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeEnabled();

    rerender(<Pagination page={3} totalPages={3} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled();
  });

  it('jumps straight to a numbered page and marks the current one', async () => {
    const onChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Trang 2' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Trang 4' }));
    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }));

    expect(onChange.mock.calls).toEqual([[4], [3]]);
  });

  it('ignores presses while the next page is loading', async () => {
    const onChange = vi.fn();
    render(<Pagination page={2} totalPages={5} busy onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await userEvent.click(screen.getByRole('button', { name: 'Trang 4' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('works without a page count, from "is there a next page"', async () => {
    const onChange = vi.fn();
    render(<Pagination page={3} hasNext={false} onChange={onChange} />);

    expect(screen.getByText(/Trang/)).toHaveTextContent('Trang 3');
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Trang trước' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
