import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthShell } from '../components/AuthShell';
import { Button } from '@/components/common';
import { PasswordField, PhoneField } from '@/components/forms';
import { isDev } from '@/core/config/env';
import { ROLE_HOME_ROUTE } from '@/core/auth/role-routes';
import { ROLE_LABELS, type RoleCode } from '@/core/types/role';
import { useAuthStore } from '@/store/auth-store';

const DEMO_ROLES: RoleCode[] = ['CUSTOMER', 'VENDOR', 'WARD_AUTHORITY', 'PLATFORM_ADMIN'];

export function SignInScreen() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const switchRoleDemo = useAuthStore((s) => s.switchRoleDemo);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();

  const submit = () => {
    const result = signIn(phone, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const user = useAuthStore.getState().user;
    if (user) navigate(ROLE_HOME_ROUTE[user.role_code], { replace: true });
  };

  return (
    <AuthShell
      title="Đăng nhập StreetBiz"
      subtitle="Quản lý kinh doanh vỉa hè, minh bạch và đơn giản"
    >
      <PhoneField value={phone} onChangeText={setPhone} />
      <PasswordField value={password} onChangeText={setPassword} error={error} />
      <Link to="/auth/password/reset-request" className="block text-right text-label text-primary">
        Quên mật khẩu?
      </Link>
      <Button label="Đăng nhập" onPress={submit} />
      <Link to="/auth/register" className="block text-center text-body-md text-muted">
        Chưa có tài khoản? <span className="text-primary">Đăng ký ngay</span>
      </Link>

      {isDev ? (
        <div className="mt-md rounded-md border border-border bg-card p-sm">
          <span className="mb-xs block text-label text-muted">
            TÀI KHOẢN DEMO (chỉ hiện ở môi trường dev)
          </span>
          <div className="flex flex-col gap-xs">
            {DEMO_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  switchRoleDemo(role);
                  navigate(ROLE_HOME_ROUTE[role], { replace: true });
                }}
                className="flex h-10 items-center justify-center rounded-sm bg-bg"
              >
                <span className="text-body-md text-text">{ROLE_LABELS[role]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </AuthShell>
  );
}
