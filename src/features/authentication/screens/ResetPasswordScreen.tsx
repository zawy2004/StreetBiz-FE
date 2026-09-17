import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AuthShell } from '../components/AuthShell';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { usePendingAuthStore } from '../pending-auth-store';
import { Button } from '@/components/common';
import { PasswordField } from '@/components/forms';
import { showToast } from '@/components/feedback';
import { ApiError, authApi, errorMessage, OTP_PURPOSE } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { isPasswordValid, passwordError } from '@/core/auth/password-policy';
import { formatPhone } from '@/core/utils/phone';
import { useMockDb } from '@/mocks/db';

/** AUTH-06: set a new password using the OTP typed on the previous screen. */
export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const reset = usePendingAuthStore((s) => s.reset);
  const clearPending = usePendingAuthStore((s) => s.clear);
  const phone = reset?.phoneNumber ?? '';
  const otp = reset?.otp ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string>();
  const [error, setError] = useState<string>();
  /** The code itself was rejected, so the only way forward is to re-enter it. */
  const [otpRejected, setOtpRejected] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reaching this screen without a phone and code means the flow was skipped or reloaded.
  useEffect(() => {
    if (!phone || !otp) navigate('/auth/password/reset-request', { replace: true });
  }, [phone, otp, navigate]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitting) return;

    if (!isPasswordValid(password)) {
      setPasswordMessage(passwordError(password));
      setError(undefined);
      return;
    }
    if (password !== confirm) {
      setPasswordMessage(undefined);
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setPasswordMessage(undefined);
    setError(undefined);
    setOtpRejected(false);
    setSubmitting(true);
    try {
      if (isLiveApi) {
        await authApi.resetPassword(phone, otp, password);
      } else {
        const db = useMockDb.getState();
        const user = db.users.find((u) => u.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
        if (!user) throw new Error('Không tìm thấy tài khoản.');
        db.updateUserPassword(user.id, password);
      }
      clearPending();
      showToast('Đặt lại mật khẩu thành công. Vui lòng đăng nhập.');
      navigate('/auth/sign-in', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.isValidation && err.fieldError('NewPassword')) {
        setPasswordMessage(err.fieldError('NewPassword'));
      } else if (err instanceof ApiError && (err.code === 'unauthorized' || err.fieldError('Otp'))) {
        // Wrong, expired or locked code (OtpService answers 401 on this anonymous call).
        setError(err.fieldError('Otp') ?? err.message);
        setOtpRejected(true);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Đặt mật khẩu mới" subtitle={`Cho tài khoản ${formatPhone(phone)}`} back>
      <form className="flex flex-col gap-md" onSubmit={submit} noValidate>
        <PasswordField
          label="Mật khẩu mới"
          value={password}
          onChangeText={setPassword}
          error={passwordMessage}
          placeholder="Tối thiểu 8 ký tự"
          autoComplete="new-password"
        />
        <PasswordChecklist value={password} visible={password.length > 0} />
        <PasswordField
          label="Nhập lại mật khẩu"
          value={confirm}
          onChangeText={setConfirm}
          error={error}
        />
        <Button label="Xác nhận" type="submit" loading={submitting} onPress={submit} />
        {otpRejected ? (
          <Button
            label="Nhập lại mã OTP"
            variant="outline"
            onPress={() =>
              navigate(`/auth/verify-phone?purpose=${OTP_PURPOSE.passwordReset}`, { replace: true })
            }
          />
        ) : null}
      </form>
    </AuthShell>
  );
}
