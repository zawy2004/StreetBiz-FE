import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { AuthShell } from '../components/AuthShell';
import { Button } from '@/components/common';
import { OtpInput } from '@/components/forms';
import { showToast } from '@/components/feedback';
import { ROLE_HOME_ROUTE } from '@/core/auth/role-routes';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

const RESEND_SECONDS = 60;
const DEMO_OTP = '123456';

export function VerifyPhoneScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const purpose = searchParams.get('purpose');
  const phone = searchParams.get('phone') ?? '';
  const fullName = searchParams.get('fullName') ?? '';
  const password = searchParams.get('password') ?? '';
  const role = searchParams.get('role');
  const registerUser = useMockDb((s) => s.registerUser);
  const signIn = useAuthStore((s) => s.signIn);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const verify = () => {
    if (code.length !== 6) return setError('Nhập đủ 6 số.');
    if (code !== DEMO_OTP) return setError(`Mã không đúng. (Demo: ${DEMO_OTP})`);
    setError(undefined);

    if (purpose === 'SIGNUP') {
      registerUser({
        fullName,
        phone,
        password,
        role_code: role === 'VENDOR' ? 'VENDOR' : 'CUSTOMER',
        account_status: 'ACTIVE',
      });
      const result = signIn(phone, password);
      if (result.ok) {
        const user = useAuthStore.getState().user!;
        showToast('Tạo tài khoản thành công');
        navigate(ROLE_HOME_ROUTE[user.role_code], { replace: true });
      }
      return;
    }

    navigate(`/auth/password/reset?phone=${encodeURIComponent(phone)}`, { replace: true });
  };

  return (
    <AuthShell
      title="Xác thực số điện thoại"
      subtitle={`Nhập mã 6 số vừa gửi tới ${phone}`}
      back
    >
      <OtpInput value={code} onChangeText={setCode} />
      {error ? (
        <p className="text-center text-body-sm text-error">{error}</p>
      ) : (
        <p className="text-center text-body-sm text-muted">Demo: dùng mã {DEMO_OTP}</p>
      )}
      <Button label="Xác nhận" onPress={verify} />
      <button
        type="button"
        disabled={seconds > 0}
        onClick={() => {
          setSeconds(RESEND_SECONDS);
          showToast('Đã gửi lại mã OTP');
        }}
        className="disabled:cursor-not-allowed"
      >
        <span
          className={`block text-center text-label ${seconds > 0 ? 'text-muted' : 'text-primary'}`}
        >
          {seconds > 0 ? `Gửi lại mã sau ${seconds}s` : 'Gửi lại mã'}
        </span>
      </button>
    </AuthShell>
  );
}
