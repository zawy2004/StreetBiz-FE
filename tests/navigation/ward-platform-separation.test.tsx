import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { RoleGuard } from '@/core/auth/RoleGuard';
import type { RoleCode } from '@/core/types/role';
import { useAuthStore } from '@/store/auth-store';

/**
 * Ward Authority owns sidewalk compliance; the Platform Administrator runs the platform and
 * has no compliance authority. Neither may open the other's screens, whatever they type in
 * the address bar: each is sent back to their own home instead.
 */
function signInAs(role: RoleCode) {
  useAuthStore.setState({
    user: {
      id: '1',
      fullName: 'Cán bộ',
      phone: '0905000001',
      password: '',
      role_code: role,
      account_status: 'ACTIVE',
    },
    sessionExpired: false,
  });
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/ward/*"
          element={
            <RoleGuard role="WARD_AUTHORITY">
              <div>ward screen</div>
            </RoleGuard>
          }
        />
        <Route
          path="/platform/*"
          element={
            <RoleGuard role="PLATFORM_ADMIN">
              <div>platform screen</div>
            </RoleGuard>
          }
        />
        <Route path="/ward/dashboard" element={<div>ward home</div>} />
        <Route path="/platform/dashboard" element={<div>platform home</div>} />
        <Route path="/auth/sign-in" element={<div>sign-in screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ward and platform scopes', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, sessionExpired: false });
  });

  it.each(['/platform/accounts', '/platform/categories'])(
    'keeps a ward officer out of %s',
    (path) => {
      signInAs('WARD_AUTHORITY');
      renderAt(path);
      expect(screen.queryByText('platform screen')).not.toBeInTheDocument();
      expect(screen.getByText('ward home')).toBeInTheDocument();
    },
  );

  it.each(['/ward/inbox', '/ward/patrol', '/ward/finance'])(
    'keeps a platform administrator out of %s',
    (path) => {
      signInAs('PLATFORM_ADMIN');
      renderAt(path);
      expect(screen.queryByText('ward screen')).not.toBeInTheDocument();
      expect(screen.getByText('platform home')).toBeInTheDocument();
    },
  );

  it('sends a signed-out visitor to sign-in rather than any ward screen', () => {
    renderAt('/ward/inbox');
    expect(screen.queryByText('ward screen')).not.toBeInTheDocument();
    expect(screen.getByText('sign-in screen')).toBeInTheDocument();
  });

  it('lets each role into its own scope', () => {
    signInAs('WARD_AUTHORITY');
    const { unmount } = renderAt('/ward/inbox');
    expect(screen.getByText('ward screen')).toBeInTheDocument();
    unmount();

    signInAs('PLATFORM_ADMIN');
    renderAt('/platform/accounts');
    expect(screen.getByText('platform screen')).toBeInTheDocument();
  });
});
