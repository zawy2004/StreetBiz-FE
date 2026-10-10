import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AuthShell } from '../components/AuthShell';
import { AuthNotice } from '../components/AuthNotice';
import { RoleUsage } from '../components/RolePlates';
import { ROLE_ICON, ROLE_TINT } from '../components/role-plates';
import { Button, Icon } from '@/components/common';
import { PasswordField, PhoneField } from '@/components/forms';
import { ApiError, errorMessage } from '@/core/api';
import { isDev, isLiveApi } from '@/core/config/env';
import { ROLE_HOME_ROUTE } from '@/core/auth/role-routes';
import { phoneError, toLocalPhone } from '@/core/utils/phone';
import { ROLE_LABELS, type RoleCode } from '@/core/types/role';
import { useAuthStore } from '@/store/auth-store';

const DEMO_ROLES: RoleCode[] = ['CUSTOMER', 'VENDOR', 'WARD_AUTHORITY', 'PLATFORM_ADMIN'];

/** Accounts from StreetBiz-BE `db/StreetBiz_Demo_Seed.sql` (see its docs/database.md). */
const DEMO_PHONE_BY_ROLE: Record<RoleCode, string> = {
  CUSTOMER: '0905000201',
  VENDOR: '0905000101',
  WARD_AUTHORITY: '0983000001',
  PLATFORM_ADMIN: '0900000001',
};

const DEMO_PASSWORD = 'Password123!';

/** AUTH-03: sign in with phone + password. */
export function SignInScreen() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const switchRoleDemo = useAuthStore((s) => s.switchRoleDemo);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const clearSessionExpired = useAuthStore((s) => s.clearSessionExpired);

  // Set by VerifyPhoneScreen after a successful registration, so the new user is
  // told why they are here and does not have to retype the number.
  const { registered, phone: registeredPhone } = (useLocation().state ?? {}) as {
    registered?: boolean;
    phone?: string;
  };

  const [phone, setPhone] = useState(registeredPhone ?? '');
  const [password, setPassword] = useState('');
  const [phoneMessage, setPhoneMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  // Presentation only: a Caps Lock hint, and a short flash on the two fields a
  // demo button just filled in (live mode), so it is clear nothing was sent yet.
  const [capsLock, setCapsLock] = useState(false);
  const [filled, setFilled] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(flashTimer.current), []);
  const readCapsLock = (event: KeyboardEvent) => {
    if (typeof event.getModifierState === 'function') {
      setCapsLock(event.getModifierState('CapsLock'));
    }
  };
  const flashFilled = () => {
    setFilled(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFilled(false), 600);
  };

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

  const flashRing = [
    '-m-1 rounded-[14px] p-1 transition-shadow duration-300',
    filled ? 'shadow-[0_0_0_3px_rgb(var(--c-brand)/0.6)]' : 'shadow-none',
  ].join(' ');

  return (
    <AuthShell
      title="Đăng nhập StreetBiz"
      subtitle="Quản lý kinh doanh vỉa hè, minh bạch và đơn giản"
      scene="sign-in"
    >
      {registered ? (
        <AuthNotice role="status" tone="success" popIcon>
          Tạo tài khoản thành công. Vui lòng đăng nhập bằng mật khẩu bạn vừa đặt.
        </AuthNotice>
      ) : null}

      {sessionExpired ? (
        <AuthNotice role="status" tone="waiting">
          Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
        </AuthNotice>
      ) : null}

      <form className="flex flex-col gap-md" onSubmit={submit} noValidate>
        <div className={flashRing}>
          <PhoneField value={phone} onChangeText={setPhone} error={phoneMessage} />
        </div>
        <div className={flashRing} onKeyDown={readCapsLock} onKeyUp={readCapsLock}>
          <PasswordField
            value={password}
            onChangeText={setPassword}
            error={error}
            autoComplete="current-password"
          />
          <p
            aria-live="polite"
            className={`flex items-center gap-1.5 text-body-sm font-medium text-[#6B4100] dark:text-[#FFD27A] ${capsLock ? 'mt-1.5' : ''}`}
          >
            {capsLock ? (
              <>
                <Icon name="information-outline" size={16} color="currentColor" />
                Đang bật Caps Lock
              </>
            ) : null}
          </p>
        </div>
        <Link
          to="/auth/password/reset-request"
          className="-mt-xs inline-flex min-h-11 items-center self-end rounded-[8px] px-1 text-[15px] font-semibold text-primary hover:underline"
        >
          Quên mật khẩu?
        </Link>
        <Button label="Đăng nhập" type="submit" loading={submitting} onPress={submit} />
      </form>

      <Link
        to="/auth/register"
        className="group flex min-h-11 items-center justify-center rounded-[12px] text-[15px] text-muted"
      >
        Chưa có tài khoản?&nbsp;
        <span className="font-semibold text-primary group-hover:underline">Đăng ký ngay</span>
      </Link>

      {isDev ? (
        <div className="rounded-[20px] bg-sunken p-sm ring-1 ring-inset ring-border">
          <span className="mb-xs block text-label text-muted">
            Tài khoản mẫu ({isLiveApi ? 'điền sẵn số và mật khẩu' : 'chế độ demo'})
          </span>
          <div className="grid grid-cols-2 gap-xs">
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
                    setPassword(DEMO_PASSWORD);
                    flashFilled();
                  }
                }}
                className="flex min-h-12 items-center gap-xs rounded-[12px] bg-card px-xs py-1.5 text-left shadow-card ring-1 ring-border transition-[box-shadow] duration-150 hover:ring-text/25"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${ROLE_TINT[role]}`}
                >
                  <Icon name={ROLE_ICON[role]} size={17} color="currentColor" weight="fill" />
                </span>
                <span className="min-w-0 text-body-md leading-[18px] text-text">
                  {ROLE_LABELS[role]} {isLiveApi ? '(Điền nhanh)' : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <RoleUsage />
      )}
    </AuthShell>
  );
}
