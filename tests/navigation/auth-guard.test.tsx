import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthGuard } from '@/core/auth/RoleGuard';
import { useAuthStore } from '@/store/auth-store';

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/account/sessions']}>
      <Routes>
        <Route
          path="/account/sessions"
          element={
            <AuthGuard>
              <div>sessions content</div>
            </AuthGuard>
          }
        />
        <Route path="/auth/sign-in" element={<div>sign-in screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthGuard', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, sessionExpired: false });
  });

  it('sends an unauthenticated visitor to sign-in instead of rendering the account screen', () => {
    renderGuarded();

    expect(screen.getByText('sign-in screen')).toBeInTheDocument();
    expect(screen.queryByText('sessions content')).not.toBeInTheDocument();
  });

  it('renders the guarded screen once the user is signed in', () => {
    useAuthStore.setState({
      user: {
        id: '1',
        fullName: 'Nguyen Van A',
        phone: '0905000001',
        password: '',
        role_code: 'VENDOR',
        account_status: 'ACTIVE',
      },
      sessionExpired: false,
    });

    renderGuarded();

    expect(screen.getByText('sessions content')).toBeInTheDocument();
  });
});
