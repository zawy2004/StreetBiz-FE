import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ChangePasswordScreen } from '@/features/account-management/screens/ChangePasswordScreen';
import { useAuthStore } from '@/store/auth-store';

function renderChangePassword() {
  return render(
    <MemoryRouter initialEntries={['/account/password']}>
      <Routes>
        <Route path="/account/password" element={<ChangePasswordScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: '1',
      fullName: 'Nguyen Van A',
      phone: '0905000001',
      password: 'Old!Passw0rd',
      role_code: 'VENDOR',
      account_status: 'ACTIVE',
    },
    sessionExpired: false,
  });
});

describe('ChangePasswordScreen', () => {
  it('rejects a new password equal to the current one without a round trip to the server', async () => {
    const user = userEvent.setup();
    renderChangePassword();

    await user.type(screen.getByLabelText('Mật khẩu hiện tại'), 'Old!Passw0rd');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'Old!Passw0rd');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'Old!Passw0rd');
    await user.click(screen.getByRole('button', { name: /lưu thay đổi/i }));

    expect(await screen.findByText('Mật khẩu mới phải khác mật khẩu hiện tại.')).toBeInTheDocument();
  });
});
