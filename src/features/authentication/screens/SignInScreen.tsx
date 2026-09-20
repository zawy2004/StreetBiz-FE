import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthShell } from '../components/AuthShell';
import { Button } from '@/components/common';
import { PasswordField, PhoneField } from '@/components/forms';
import { ApiError, errorMessage } from '@/core/api';
import { isDev, isLiveApi } from '@/core/config/env';
import { ROLE_HOME_ROUTE } from '@/core/auth/role-routes';
import { phoneError, toLocalPhone } from '@/core/utils/phone';
import { ROLE_LABELS, type RoleCode } from '@/core/types/role';
import { useAuthStore } from '@/store/auth-store';

const DEMO_ROLES: RoleCode[] = ['CUSTOMER', 'VENDOR', 'WARD_AUTHORITY', 'PLATFORM_ADMIN'];

const DEMO_PHONE_BY_ROLE: Record<RoleCode, string> = {
  CUSTOMER: '0905000001',
  VENDOR: '0905000002',
  WARD_AUTHORITY: '0905000004',
  PLATFORM_ADMIN: '0905000005',
};

/** AUTH-03: sign in with phone + password. */
export function SignInScreen() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const switchRoleDemo = useAuthStore((s) => s.switchRoleDemo);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const clearSessionExpired = useAuthStore((s) => s.clearSessionExpired);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [phoneMessage, setPhoneMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  // Clear the "session expired" banner as soon as the user starts over.
  useEffect(() => clearSessionExpired, [clearSessionExpired]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitting) return;

    const invalidPhone = phoneError(phone);
    if (invalidPhone) {
      setPhoneMessage(invalidPhone);
      setError(undefined);
      return;
    }
    if (!password) {
      setPhoneMessage(undefined);
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setPhoneMessage(undefined);
    setError(undefined);
    setSubmitting(true);
    try {
      await signIn(toLocalPhone(phone), password);
      const user = useAuthStore.getState().user;
      if (user) navigate(ROLE_HOME_ROUTE[user.role_code], { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setPhoneMessage(err.fieldError('PhoneNumber'));
        setError(err.fieldError('Password') ?? err.message);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Đăng nhập StreetBiz"
      subtitle="Quản lý kinh doanh vỉa hè, minh bạch và đơn giản"
    >
      {sessionExpired ? (
        <div
          role="status"
          className="rounded-sm border border-border bg-tint-secondary p-sm text-body-sm text-text"
        >
          Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
        </div>
      ) : null}

      <form className="flex flex-col gap-md" onSubmit={submit} noValidate>
        <PhoneField value={phone} onChangeText={setPhone} error={phoneMessage} />
        <PasswordField
          value={password}
          onChangeText={setPassword}
          error={error}
          autoComplete="current-password"
        />
        <Link
          to="/auth/password/reset-request"
          className="block text-right text-label text-primary"
        >
          Quên mật khẩu?
        </Link>
        <Button label="Đăng nhập" type="submit" loading={submitting} onPress={submit} />
      </form>

      <Link to="/auth/register" className="block text-center text-body-md text-muted">
        Chưa có tài khoản? <span className="text-primary">Đăng ký ngay</span>
      </Link>

      {isDev ? (
        <div className="mt-md rounded-md border border-border bg-card p-sm">
          <span className="mb-xs block text-label text-muted">
            TÀI KHOẢN MẪU ({isLiveApi ? 'Live API - Điền sẵn' : 'Chế độ Demo'})
          </span>
          <div className="flex flex-col gap-xs">
            {DEMO_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  if (!isLiveApi) {
                    switchRoleDemo(role);
                    navigate(ROLE_HOME_ROUTE[role], { replace: true });
                  } else {
                    setPhone(DEMO_PHONE_BY_ROLE[role]);
                    setPassword('123456');
                  }
                }}
                className="flex h-10 items-center justify-center rounded-sm bg-bg hover:bg-border/40"
              >
                <span className="text-body-md text-text">
                  {ROLE_LABELS[role]} {isLiveApi ? '(Điền nhanh)' : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </AuthShell>
  );
}
