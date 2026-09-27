import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { LandingScreen } from '@/features/landing/screens';

function RegisterProbe() {
  const state = useLocation().state as { role?: string } | null;
  return <div>register as {state?.role ?? 'default'}</div>;
}

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LandingScreen />} />
        <Route path="/auth/register" element={<RegisterProbe />} />
        <Route path="*" element={<div>elsewhere</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LandingScreen', () => {
  it('shows the headline and the three roles', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Vỉa hè có trật tự');
    for (const role of ['Người mua', 'Hộ kinh doanh', 'Cán bộ phường']) {
      expect(screen.getByRole('heading', { name: role })).toBeInTheDocument();
    }
  });

  it('links guests to explore and to sign in', () => {
    renderLanding();
    expect(screen.getByRole('link', { name: /tìm quán quanh đây/i })).toHaveAttribute(
      'href',
      '/customer/explore',
    );
    expect(screen.getAllByRole('link', { name: /^đăng nhập$/i })[0]).toHaveAttribute(
      'href',
      '/auth/sign-in',
    );
  });

  it('opens registration as a vendor from "Đăng ký bán hàng"', async () => {
    const user = userEvent.setup();
    renderLanding();
    await user.click(screen.getByRole('link', { name: /đăng ký bán hàng/i }));
    expect(screen.getByText('register as VENDOR')).toBeInTheDocument();
  });
});
