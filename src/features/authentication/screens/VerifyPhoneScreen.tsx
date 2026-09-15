import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthShell } from '../components/AuthShell';
import { Button } from '@/components/common';
import { OtpInput } from '@/components/forms';
import { showToast } from '@/components/feedback';
import { ROLE_HOME_ROUTE } from '@/core/auth/role-routes';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { colors, typography } from '@/theme';

const RESEND_SECONDS = 60;
const DEMO_OTP = '123456';

type Params = {
  purpose: 'SIGNUP' | 'RESET';
  phone: string;
  fullName?: string;
  password?: string;
  role?: 'CUSTOMER' | 'VENDOR';
};

export function VerifyPhoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
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

    if (params.purpose === 'SIGNUP') {
      registerUser({
        fullName: params.fullName ?? '',
        phone: params.phone,
        password: params.password ?? '',
        role_code: params.role === 'VENDOR' ? 'VENDOR' : 'CUSTOMER',
        account_status: 'ACTIVE',
      });
      const result = signIn(params.phone, params.password ?? '');
      if (result.ok) {
        const user = useAuthStore.getState().user!;
        showToast('Tạo tài khoản thành công');
        router.replace(ROLE_HOME_ROUTE[user.role_code] as never);
      }
      return;
    }

    router.replace({ pathname: '/auth/password/reset', params: { phone: params.phone } });
  };

  return (
    <AuthShell
      title="Xác thực số điện thoại"
      subtitle={`Nhập mã 6 số vừa gửi tới ${params.phone}`}
      back
    >
      <OtpInput value={code} onChangeText={setCode} />
      {error ? (
        <Text style={[typography.bodySm, { color: colors.error, textAlign: 'center' }]}>
          {error}
        </Text>
      ) : (
        <Text style={[typography.bodySm, { color: colors.muted, textAlign: 'center' }]}>
          Demo: dùng mã {DEMO_OTP}
        </Text>
      )}
      <Button label="Xác nhận" onPress={verify} />
      <Pressable
        disabled={seconds > 0}
        onPress={() => {
          setSeconds(RESEND_SECONDS);
          showToast('Đã gửi lại mã OTP');
        }}
      >
        <Text
          style={[
            typography.label,
            { color: seconds > 0 ? colors.muted : colors.primary, textAlign: 'center' },
          ]}
        >
          {seconds > 0 ? `Gửi lại mã sau ${seconds}s` : 'Gửi lại mã'}
        </Text>
      </Pressable>
    </AuthShell>
  );
}
