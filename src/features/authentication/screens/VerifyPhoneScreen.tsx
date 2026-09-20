import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { AuthShell } from '../components/AuthShell';
import { usePendingAuthStore } from '../pending-auth-store';
import { Button } from '@/components/common';
import { OtpInput } from '@/components/forms';
import { showToast } from '@/components/feedback';
import { ApiError, authApi, errorMessage, OTP_PURPOSE } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { formatPhone } from '@/core/utils/phone';
import { useCountdown } from '@/hooks/useCountdown';
import { useAuthStore } from '@/store/auth-store';

const RESEND_SECONDS = 60; // matches the backend cooldown (BR-61)
const OTP_LENGTH = 6;
const MOCK_OTP = '123456';

/**
 * AUTH-01 step 2 / AUTH-06 step 2: verify the phone OTP.
 *
 * For REGISTRATION the code is spent by `POST /auth/register`, which creates the
 * account and signs it in. For PASSWORD_RESET the code is spent by
 * `POST /auth/reset-password`, so it is handed to the next screen instead.
 */
export function VerifyPhoneScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const register = useAuthStore((s) => s.register);
  const registration = usePendingAuthStore((s) => s.registration);
  const reset = usePendingAuthStore((s) => s.reset);
  const resendAvailableIn = usePendingAuthStore((s) => s.resendAvailableIn);
  const setResetOtp = usePendingAuthStore((s) => s.setResetOtp);
  const clearPending = usePendingAuthStore((s) => s.clear);

  const isRegistration = searchParams.get('purpose') !== OTP_PURPOSE.passwordReset;
  const phone = (isRegistration ? registration?.phoneNumber : reset?.phoneNumber) ?? '';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const { seconds, start, isRunning } = useCountdown(resendAvailableIn ?? RESEND_SECONDS);

  // Set once the OTP has been accepted, so finishing the flow is not mistaken
  // for arriving without pending data. Completing clears the pending store on
  // purpose, which would otherwise trip the guard below and bounce the user
  // back to the start of sign-up instead of on to the next screen.
  const completed = useRef(false);

  // The pending data lives in memory only; after a reload there is nothing to
  // verify, so restart the flow rather than showing a dead form.
  useEffect(() => {
    if (!phone && !completed.current) {
      navigate(isRegistration ? '/auth/register' : '/auth/password/reset-request', {
        replace: true,
      });
    }
  }, [phone, isRegistration, navigate]);

  const verify = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitting) return;
    if (code.length !== OTP_LENGTH) {
      setError(`Vui lòng nhập đủ ${OTP_LENGTH} số.`);
      return;
    }
    if (!isLiveApi && code !== MOCK_OTP) {
      setError(`Mã không đúng. (Giả lập: ${MOCK_OTP})`);
      return;
    }

    setError(undefined);

    if (!isRegistration) {
      // The backend validates this code when the new password is submitted.
      setResetOtp(code);
      navigate('/auth/password/reset', { replace: true });
      return;
    }

    if (!registration) return;
    setSubmitting(true);
    try {
      await register({ ...registration, fullName: registration.fullName || null, otp: code });
      const registeredPhone = registration.phoneNumber;
      completed.current = true;
      // The pending store holds the plaintext password, so clear it before
      // leaving rather than carrying it to the next screen.
      clearPending();
      showToast('Tạo tài khoản thành công');
      // Registration does not sign the user in: they confirm the password they
      // just chose on the sign-in screen, with the number filled in for them.
      navigate('/auth/sign-in', { replace: true, state: { registered: true, phone: registeredPhone } });
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setError(
          err.fieldError('Otp') ??
            err.fieldError('Password') ??
            err.fieldError('WardUnitId') ??
            err.message,
        );
      } else {
        setError(errorMessage(err));
      }
      setCode('');
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (isRunning || resending) return;
    setResending(true);
    setError(undefined);
    try {
      if (isLiveApi) {
        // Reset goes through forgot-password so unregistered numbers are never texted.
        if (isRegistration) await authApi.sendOtp(phone, OTP_PURPOSE.register);
        else await authApi.forgotPassword(phone);
      }
      start(RESEND_SECONDS);
      setCode('');
      showToast('Đã gửi lại mã OTP');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'otp_cooldown' && err.retryAfterSeconds) {
        start(err.retryAfterSeconds);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Xác thực số điện thoại"
      subtitle={`Nhập mã ${OTP_LENGTH} số vừa gửi tới ${formatPhone(phone)}`}
      back
    >
      <form className="flex flex-col gap-md" onSubmit={verify} noValidate>
        <OtpInput value={code} onChangeText={setCode} length={OTP_LENGTH} />
        {error ? (
          <p role="alert" className="text-center text-body-sm text-error">
            {error}
          </p>
        ) : !isLiveApi ? (
          <p className="text-center text-body-sm text-muted">Giả lập: dùng mã {MOCK_OTP}</p>
        ) : (
          <p className="text-center text-body-sm text-muted">Mã có hiệu lực trong 5 phút.</p>
        )}
        <Button
          label={isRegistration ? 'Xác nhận & Tạo tài khoản' : 'Xác nhận'}
          type="submit"
          loading={submitting}
          disabled={code.length !== OTP_LENGTH}
          onPress={verify}
        />
      </form>

      <button
        type="button"
        disabled={isRunning || resending}
        onClick={resend}
        className="disabled:cursor-not-allowed"
      >
        <span className={`block text-center text-label ${isRunning ? 'text-muted' : 'text-primary'}`}>
          {isRunning ? `Gửi lại mã sau ${seconds}s` : 'Gửi lại mã'}
        </span>
      </button>
    </AuthShell>
  );
}
