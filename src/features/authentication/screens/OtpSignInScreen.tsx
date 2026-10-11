import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthShell } from '../components/AuthShell';
import { PaintedOtpInput } from '../components/PaintedOtpInput';
import { ResendButton } from '../components/ResendButton';
import { Button, Icon } from '@/components/common';
import { PhoneField } from '@/components/forms';
import { showToast } from '@/components/feedback';
import { ApiError, authApi, errorMessage, OTP_PURPOSE } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { ROLE_HOME_ROUTE } from '@/core/auth/role-routes';
import { formatPhone, phoneError, toLocalPhone } from '@/core/utils/phone';
import { useCountdown } from '@/hooks/useCountdown';
import { useAuthStore } from '@/store/auth-store';

const RESEND_SECONDS = 60; // matches the backend OTP cooldown (BR-61)
const OTP_LENGTH = 6;
const MOCK_OTP = '123456';

/**
 * AUTH-03 passwordless: sign in with the OTP sent to a registered phone
 * (`POST /auth/login-otp`). Two steps in one screen — enter the phone, then the
 * code — so the shared pending-auth store (sign-up / reset only) is untouched.
 *
 * Send-OTP for LOGIN is uniform on the backend: an unregistered number is not
 * texted and cannot be told apart from a registered one (SEC-05), so this screen
 * never reveals whether the account exists.
 */
export function OtpSignInScreen() {
  const navigate = useNavigate();
  const signInWithOtp = useAuthStore((s) => s.signInWithOtp);

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneMessage, setPhoneMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const { seconds, start, isRunning } = useCountdown(RESEND_SECONDS);

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault();
    if (sending) return;

    const invalidPhone = phoneError(phone);
    if (invalidPhone) {
      setPhoneMessage(invalidPhone);
      return;
    }

    setPhoneMessage(undefined);
    setError(undefined);
    setSending(true);
    try {
      if (isLiveApi) await authApi.sendOtp(toLocalPhone(phone), OTP_PURPOSE.login);
      setStep('code');
      setCode('');
      start(RESEND_SECONDS);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'otp_cooldown' && err.retryAfterSeconds) {
        setStep('code');
        start(err.retryAfterSeconds);
      } else if (err instanceof ApiError && err.isValidation) {
        setPhoneMessage(err.fieldError('PhoneNumber') ?? err.message);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSending(false);
    }
  };

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
    setSubmitting(true);
    try {
      await signInWithOtp(toLocalPhone(phone), code);
      const user = useAuthStore.getState().user;
      if (user) navigate(ROLE_HOME_ROUTE[user.role_code], { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setError(err.fieldError('Otp') ?? err.message);
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
      if (isLiveApi) await authApi.sendOtp(toLocalPhone(phone), OTP_PURPOSE.login);
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

  if (step === 'phone') {
    return (
      <AuthShell
        title="Đăng nhập bằng mã OTP"
        subtitle="Không cần mật khẩu — chúng tôi gửi mã xác thực tới số điện thoại của bạn"
        back
        scene="sign-in"
      >
        <form className="flex flex-col gap-md" onSubmit={sendCode} noValidate>
          <PhoneField value={phone} onChangeText={setPhone} error={phoneMessage} />
          {error ? (
            <p role="alert" className="flex items-start gap-1.5 text-body-md font-medium text-error">
              <span className="mt-[3px] shrink-0">
                <Icon name="alert-circle-outline" size={16} color="currentColor" />
              </span>
              {error}
            </p>
          ) : null}
          <Button label="Gửi mã OTP" type="submit" loading={sending} onPress={sendCode} />
        </form>

        <Link
          to="/auth/sign-in"
          className="group flex min-h-11 items-center justify-center rounded-[12px] text-[15px] text-muted"
        >
          <span className="font-semibold text-primary group-hover:underline">
            Đăng nhập bằng mật khẩu
          </span>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Nhập mã xác thực"
      subtitle={
        <>
          {`Nhập mã ${OTP_LENGTH} số vừa gửi tới `}
          <span className="inline-block whitespace-nowrap rounded-[6px] bg-sunken px-1.5 font-sign font-semibold tracking-[0.02em] text-[#2B3640] font-tabular dark:text-[#C5D0DA]">
            {formatPhone(phone)}
          </span>
        </>
      }
      back
      scene="verify"
    >
      <form className="flex flex-col gap-md" onSubmit={verify} noValidate>
        <PaintedOtpInput
          value={code}
          onChangeText={setCode}
          length={OTP_LENGTH}
          invalid={Boolean(error)}
        />
        <div className="flex min-h-[28px] items-start">
          {error ? (
            <p role="alert" className="flex items-start gap-1.5 text-body-md font-medium text-error">
              <span className="mt-[3px] shrink-0">
                <Icon name="alert-circle-outline" size={16} color="currentColor" />
              </span>
              {error}
            </p>
          ) : !isLiveApi ? (
            <p className="inline-flex items-center gap-1.5 rounded-[8px] bg-secondary-bg px-xs py-1 text-body-sm font-medium text-on-secondary">
              <Icon name="information-outline" size={16} color="currentColor" />
              Giả lập: dùng mã {MOCK_OTP}
            </p>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-body-sm text-muted">
              <Icon name="clock-outline" size={16} color="currentColor" />
              Mã có hiệu lực trong 5 phút.
            </p>
          )}
        </div>
        <Button
          label="Đăng nhập"
          type="submit"
          loading={submitting}
          disabled={code.length !== OTP_LENGTH}
          onPress={verify}
        />
      </form>

      <ResendButton seconds={seconds} isRunning={isRunning} resending={resending} onPress={resend} />

      <button
        type="button"
        onClick={() => {
          setStep('phone');
          setError(undefined);
          setCode('');
        }}
        className="flex min-h-11 items-center justify-center rounded-[12px] text-[15px] font-semibold text-primary hover:underline"
      >
        Đổi số điện thoại
      </button>
    </AuthShell>
  );
}
