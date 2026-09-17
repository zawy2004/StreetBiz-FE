import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthShell } from '../components/AuthShell';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { WardSelect } from '../components/WardSelect';
import { usePendingAuthStore } from '../pending-auth-store';
import { Button } from '@/components/common';
import { PasswordField, PhoneField, SelectField, TextField } from '@/components/forms';
import { ApiError, authApi, errorMessage, OTP_PURPOSE } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { isPasswordValid, passwordError } from '@/core/auth/password-policy';
import { phoneError, toLocalPhone } from '@/core/utils/phone';

type SelfRegisterRole = 'CUSTOMER' | 'VENDOR';

/**
 * AUTH-01 step 1: collect the account details, then ask the backend for a
 * REGISTRATION OTP. The account itself is only created on the verify screen,
 * because the backend consumes the OTP as part of the register call. The
 * details travel in memory (pending-auth-store), never in the URL.
 */
export function RegisterScreen() {
  const navigate = useNavigate();
  const startRegistration = usePendingAuthStore((s) => s.startRegistration);

  const [role, setRole] = useState<SelfRegisterRole>('CUSTOMER');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [wardUnitId, setWardUnitId] = useState<number>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [phoneRegistered, setPhoneRegistered] = useState(false);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitting) return;

    const next: Record<string, string | undefined> = {};
    if (!fullName.trim()) next.fullName = 'Vui lòng nhập họ tên.';
    next.phone = phoneError(phone);
    if (!isPasswordValid(password)) next.password = passwordError(password);
    else if (password !== confirm) next.confirm = 'Mật khẩu nhập lại không khớp.';

    setFieldErrors(next);
    if (Object.values(next).some(Boolean)) {
      setError(undefined);
      return;
    }

    const pending = {
      phoneNumber: toLocalPhone(phone),
      fullName: fullName.trim(),
      password,
      roleCode: role,
      wardUnitId: wardUnitId ?? null,
    };
    const goToVerify = (resendAvailableIn?: number) => {
      startRegistration(pending, resendAvailableIn);
      navigate(`/auth/verify-phone?purpose=${OTP_PURPOSE.register}`);
    };

    setError(undefined);
    setPhoneRegistered(false);
    setSubmitting(true);
    try {
      if (isLiveApi) {
        await authApi.sendOtp(pending.phoneNumber, OTP_PURPOSE.register);
      }
      goToVerify();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'otp_cooldown') {
        // A code was sent less than a minute ago (e.g. the user came back to fix a
        // field) and is still valid, so carry on to the verify step.
        goToVerify(err.retryAfterSeconds);
      } else if (err instanceof ApiError && err.code === 'conflict') {
        setFieldErrors({ phone: err.message });
        setPhoneRegistered(true);
      } else if (err instanceof ApiError && err.isValidation) {
        setFieldErrors({ phone: err.fieldError('PhoneNumber') });
        setError(err.fieldError('PhoneNumber') ? undefined : err.message);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Tạo tài khoản StreetBiz" subtitle="Chọn vai trò để bắt đầu" back>
      <form className="flex flex-col gap-md" onSubmit={submit} noValidate>
        <SelectField
          label="Bạn là"
          value={role}
          onChange={setRole}
          options={[
            {
              value: 'CUSTOMER',
              label: 'Người mua',
              description: 'Khám phá và ủng hộ hàng quán vỉa hè hợp pháp',
            },
            {
              value: 'VENDOR',
              label: 'Hộ kinh doanh',
              description: 'Đăng ký kinh doanh và thuê ô vỉa hè',
            },
          ]}
        />
        <TextField
          label="Họ và tên"
          value={fullName}
          onChangeText={setFullName}
          error={fieldErrors.fullName}
        />
        <PhoneField value={phone} onChangeText={setPhone} error={fieldErrors.phone} />
        {phoneRegistered ? (
          <Link to="/auth/sign-in" className="-mt-xs text-label text-primary">
            Đăng nhập bằng số này →
          </Link>
        ) : null}
        <WardSelect
          value={wardUnitId}
          onChange={setWardUnitId}
          label="Phường/xã (không bắt buộc)"
          helperText="Giúp hồ sơ của bạn được chuyển đúng cán bộ phụ trách."
        />
        <PasswordField
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          placeholder="Tối thiểu 8 ký tự"
          autoComplete="new-password"
        />
        <PasswordChecklist value={password} visible={password.length > 0} />
        <PasswordField
          label="Nhập lại mật khẩu"
          value={confirm}
          onChangeText={setConfirm}
          error={fieldErrors.confirm}
        />
        {error ? <span className="text-body-sm text-error">{error}</span> : null}
        <Button
          label="Tiếp tục & Nhận OTP"
          type="submit"
          loading={submitting}
          onPress={submit}
        />
      </form>
    </AuthShell>
  );
}
