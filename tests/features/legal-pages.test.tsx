import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { LandingFooter } from '@/features/landing/components/LandingFooter';
import { LegalBasisScreen, PrivacyScreen, SlotRulesScreen, TermsScreen } from '@/features/legal/screens';
import { SLOT_COMMITMENTS } from '@/features/legal/legal-content';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/legal/terms" element={<TermsScreen />} />
        <Route path="/legal/privacy" element={<PrivacyScreen />} />
        <Route path="/legal/slot-rules" element={<SlotRulesScreen />} />
        <Route path="/legal/basis" element={<LegalBasisScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('legal pages', () => {
  it.each([
    ['/legal/terms', 'Điều khoản sử dụng'],
    ['/legal/privacy', 'Chính sách bảo mật'],
    ['/legal/slot-rules', 'Quy định thuê ô vỉa hè'],
    ['/legal/basis', 'Căn cứ pháp lý'],
  ])('%s renders its title and a contents list without signing in', (path, title) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Mục lục' })).toBeInTheDocument();
  });

  it('keeps both rental commitments on the slot rules page', () => {
    renderAt('/legal/slot-rules');
    for (const text of SLOT_COMMITMENTS) expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('links the legal pages from the landing footer', () => {
    render(
      <MemoryRouter>
        <LandingFooter />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Điều khoản' })).toHaveAttribute('href', '/legal/terms');
    expect(screen.getByRole('link', { name: 'Bảo mật' })).toHaveAttribute('href', '/legal/privacy');
    expect(screen.getByRole('link', { name: 'Quy định thuê ô' })).toHaveAttribute('href', '/legal/slot-rules');
    expect(screen.getByRole('link', { name: 'Căn cứ pháp lý' })).toHaveAttribute('href', '/legal/basis');
  });
});
