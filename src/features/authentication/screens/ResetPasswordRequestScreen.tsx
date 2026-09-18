import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AuthShell } from '../components/AuthShell';
import { usePendingAuthStore } from '../pending-auth-store';
import { Button } from '@/components/common';
import { PhoneField } from '@/components/forms';
import { ApiError, authApi, errorMessage, OTP_PURPOSE } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { phoneError, toLocalPhone } from '@/core/utils/phone';

/**
 * AUTH-05: request a password reset.
 *
 * The backend answers uniformly whether or not the phone is registered, so this
 * screen must not tell the user that an account was "not found" — doing so would
 * turn the form into an account-enumeration oracle.
 */
export function ResetPasswordRequestScreen() {
  const navigate = useNavigate();
  const startReset = usePendingAuthStore((s) => s.startReset);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitting) return;

    const invalid = phoneError(phone);
    if (invalid) {
      setError(invalid);
      return;
    }

    const normalized = toLocalPhone(phone);
    setError(undefined);
    setSubmitting(true);
    try {
      if (isLiveApi) await authApi.forgotPassword(normalized);
      startReset(normalized);
      navigate(`/auth/verify-phone?purpose=${OTP_PURPOSE.passwordReset}`);
    } catch (err) {
      setError(
        err instanceof ApiError && err.isValidation
          ? (err.fieldError('PhoneNumber') ?? err.message)
          : errorMessage(err),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Quên mật khẩu"
      subtitle="Nhập số điện thoại đã đăng ký để nhận mã OTP đặt lại mật khẩu"
      back
    >
      <form className="flex flex-col gap-md" onSubmit={submit} noValidate>
        <PhoneField value={phone} onChangeText={setPhone} error={error} />
        <p className="text-body-sm text-muted">
          Nếu số điện thoại đã đăng ký, bạn sẽ nhận được mã OTP trong ít phút.
        </p>
        <Button label="Gửi mã OTP" type="submit" loading={submitting} onPress={submit} />
      </form>
    </AuthShell>
  );
}
