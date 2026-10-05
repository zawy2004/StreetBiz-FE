import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { OtpInput } from '@/components/forms';
import { GuestOnlyGuard, RoleGuard } from '@/core/auth/RoleGuard';
import { resolveReturnTo } from '@/core/auth/role-routes';
import { useAuthStore } from '@/store/auth-store';

function SignInProbe() {
  const state = useLocation().state as { from?: string } | null;
  return <div>sign-in from {state?.from ?? 'nowhere'}</div>;
}

describe('resolveReturnTo', () => {
  it('returns the page the user was sent away from when it belongs to their role', () => {
    expect(resolveReturnTo('/vendor/registrations/4', 'VENDOR')).toBe('/vendor/registrations/4');
    expect(resolveReturnTo('/account/sessions', 'WARD_AUTHORITY')).toBe('/account/sessions');
  });

  it('falls back to the role home for another role area, a missing value or an external link', () => {
    expect(resolveReturnTo('/ward/dashboard', 'VENDOR')).toBe('/vendor/home');
    expect(resolveReturnTo(undefined, 'CUSTOMER')).toBe('/customer/explore');
    expect(resolveReturnTo('//evil.example/x', 'VENDOR')).toBe('/vendor/home');
    expect(resolveReturnTo('https://evil.example', 'VENDOR')).toBe('/vendor/home');
    expect(resolveReturnTo('/vendorx/steal', 'VENDOR')).toBe('/vendor/home');
  });
});

describe('RoleGuard return path', () => {
  beforeEach(() => useAuthStore.setState({ user: null, sessionExpired: false }));

  it('remembers where the visitor was going when it sends them to sign-in', () => {
    render(
      <MemoryRouter initialEntries={['/vendor/registrations/4?tab=evidence']}>
        <Routes>
          <Route
            path="/vendor/registrations/:id"
            element={
              <RoleGuard role="VENDOR">
                <div>registration</div>
              </RoleGuard>
            }
          />
          <Route path="/auth/sign-in" element={<SignInProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('sign-in from /vendor/registrations/4?tab=evidence')).toBeInTheDocument();
  });
});

describe('GuestOnlyGuard', () => {
  it('sends a signed-in user from the sign-in page to their own home', () => {
    useAuthStore.setState({
      user: {
        id: '1',
        fullName: 'Vendor',
        phone: '0905000101',
        password: '',
        role_code: 'VENDOR',
        account_status: 'ACTIVE',
      },
    });
    render(
      <MemoryRouter initialEntries={['/auth/sign-in']}>
        <Routes>
          <Route
            path="/auth/sign-in"
            element={
              <GuestOnlyGuard>
                <div>sign-in form</div>
              </GuestOnlyGuard>
            }
          />
          <Route path="/vendor/home" element={<div>vendor home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('vendor home')).toBeInTheDocument();
  });
});

describe('OtpInput', () => {
  function Harness({ onValue }: { onValue?: (v: string) => void }) {
    const [value, setValue] = useState('');
    return (
      <OtpInput
        value={value}
        onChangeText={(v) => {
          setValue(v);
          onValue?.(v);
        }}
      />
    );
  }

  it('fills every box when an SMS autofill drops the whole code into the first one', () => {
    let latest = '';
    render(<Harness onValue={(v) => (latest = v)} />);

    fireEvent.change(screen.getByLabelText('Số thứ 1 trên 6'), { target: { value: '123456' } });

    expect(latest).toBe('123456');
    expect(screen.getByLabelText('Số thứ 6 trên 6')).toHaveValue('6');
  });

  it('accepts a pasted code and ignores non-digits', () => {
    let latest = '';
    render(<Harness onValue={(v) => (latest = v)} />);

    fireEvent.paste(screen.getByLabelText('Số thứ 1 trên 6'), {
      clipboardData: { getData: () => '12 34-56' },
    });

    expect(latest).toBe('123456');
  });

  it('moves between boxes with the arrow keys', () => {
    render(<Harness />);
    const first = screen.getByLabelText('Số thứ 1 trên 6');
    first.focus();

    fireEvent.keyDown(first, { key: 'ArrowRight' });

    expect(screen.getByLabelText('Số thứ 2 trên 6')).toHaveFocus();
  });

  it('flags the boxes as invalid for assistive tech', () => {
    render(<OtpInput value="" onChangeText={() => {}} invalid />);

    expect(screen.getByLabelText('Số thứ 1 trên 6')).toHaveAttribute('aria-invalid', 'true');
  });
});
