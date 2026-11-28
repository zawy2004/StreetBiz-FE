import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  DocMiniArt,
  LegalBasisNote,
  PrepareChecklist,
  VendorTypeChoice,
} from '@/features/business-registrations/components/wizard/TypeParts';

/** Step 1 of the registration wizard: the two type cards, the legal note and the checklist. */
function Picker({ start }: { start: 'ITINERANT' | 'FIXED_STOREFRONT' }) {
  const [value, setValue] = useState(start);
  return (
    <MemoryRouter>
      <h2 id="type-label">Loại hình</h2>
      <VendorTypeChoice
        value={value as never}
        onChange={setValue as never}
        labelledBy="type-label"
      />
      <LegalBasisNote vendorType={value as never} />
      <PrepareChecklist vendorType={value as never} />
    </MemoryRouter>
  );
}

describe('vendor type choice', () => {
  it('is one radio group, chosen by click or with the arrow keys both ways', () => {
    render(<Picker start="ITINERANT" />);
    const group = screen.getByRole('radiogroup', { name: 'Loại hình' });
    expect(group).toBeInTheDocument();
    const itinerant = screen.getByRole('radio', { name: /Bán hàng lưu động/ });
    const fixed = screen.getByRole('radio', { name: /Cửa hàng cố định/ });
    expect(itinerant).toHaveAttribute('aria-checked', 'true');
    expect(itinerant).toHaveAttribute('tabindex', '0');
    expect(fixed).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(itinerant, { key: 'ArrowRight' });
    expect(fixed).toHaveAttribute('aria-checked', 'true');
    expect(fixed).toHaveFocus();
    fireEvent.keyDown(fixed, { key: 'ArrowDown' });
    expect(itinerant).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(itinerant, { key: 'ArrowUp' });
    expect(fixed).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(fixed, { key: 'ArrowLeft' });
    expect(itinerant).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(itinerant, { key: 'Enter' });
    expect(itinerant).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(fixed);
    expect(fixed).toHaveAttribute('aria-checked', 'true');
  });

  it('asks for a business licence only for a fixed storefront', () => {
    const { container, rerender } = render(<Picker start="ITINERANT" />);
    const licence = () => container.querySelector('li[aria-hidden]');
    expect(licence()).toHaveAttribute('aria-hidden', 'true');
    rerender(<Picker key="fixed" start="FIXED_STOREFRONT" />);
    expect(licence()).toHaveAttribute('aria-hidden', 'false');
  });

  it('folds the checklist on phones', () => {
    render(<Picker start="ITINERANT" />);
    const toggle = screen.getByRole('button', { name: 'Bạn sẽ cần chuẩn bị' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it.each(['id-front', 'id-back', 'license', 'portrait', 'address'] as const)(
    'draws the %s paper',
    (kind) => {
      const { container } = render(<DocMiniArt kind={kind} className="h-6 w-6" />);
      const svg = container.querySelector('svg')!;
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg.childElementCount).toBeGreaterThan(0);
    },
  );
});
