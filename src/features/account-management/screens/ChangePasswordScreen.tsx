import { FormEvent, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { PasswordField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { showToast } from '@/components/feedback';
import { ApiError, authApi, errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { isPasswordValid, passwordError, PASSWORD_RULES } from '@/core/auth/password-policy';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { passedCount } from '../components/account-format';
import { AfterChangeNote, LockIllustration, PasswordRuleSlots } from '../components/PasswordParts';
import '../account.css';

/** Nudges its field once each time a new error message lands on it. */
function ShakeOnError({ error, children }: { error?: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = box.current;
    if (!error || !node) return;
    node.classList.remove('sb-acct-shake');
    void node.offsetWidth;
    node.classList.add('sb-acct-shake');
  }, [error]);
  return <div ref={box}>{children}</div>;
}

/** AUTH-07: change the password of the signed-in account. */
export function ChangePasswordScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const updatePassword = useMockDb((s) => s.updateUserPassword);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currentMessage, setCurrentMessage] = useState<string>();
  const [nextMessage, setNextMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitting) return;

    if (!current) {
      setCurrentMessage('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!isPasswordValid(next)) {
      setCurrentMessage(undefined);
      setNextMessage(passwordError(next));
      setError(undefined);
      return;
    }
    if (next === current) {
      // Both fields are already in hand, so this is worth checking client-side
      // rather than making the user wait for the same answer from the server.
      setCurrentMessage(undefined);
      setNextMessage('Mật khẩu mới phải khác mật khẩu hiện tại.');
      setError(undefined);
      return;
    }
    if (next !== confirm) {
      setCurrentMessage(undefined);
      setNextMessage(undefined);
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setCurrentMessage(undefined);
    setNextMessage(undefined);
    setError(undefined);
    setSubmitting(true);
    try {
      if (isLiveApi) {
        await authApi.changePassword(current, next);
      } else {
        if (current !== user.password) throw new Error('Mật khẩu hiện tại không đúng.');
        updatePassword(user.id, next);
        setUser({ ...user, password: next });
      }
      showToast('Đổi mật khẩu thành công. Các thiết bị khác đã được đăng xuất.');
      navigate(-1);
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setNextMessage(err.fieldError('NewPassword'));
        setCurrentMessage(err.fieldError('CurrentPassword'));
        if (!err.fieldError('NewPassword') && !err.fieldError('CurrentPassword')) {
          setError(err.message);
        }
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const allPassed = passedCount(next) === PASSWORD_RULES.length;

  return (
    <Screen>
      <AppHeader title="Đổi mật khẩu" back />
      <div className="grid grid-cols-1 items-start gap-xl lg:grid-cols-[440px_minmax(0,1fr)] xl:grid-cols-[480px_minmax(0,1fr)] xl:gap-2xl">
        {/* Its own narrow form container, so each label sits above its field. */}
        <div className="cq w-full max-w-[560px]">
          <form className="flex flex-col gap-md" onSubmit={submit} noValidate>
            <ShakeOnError error={currentMessage}>
              <PasswordField
                label="Mật khẩu hiện tại"
                value={current}
                onChangeText={setCurrent}
                error={currentMessage}
                autoComplete="current-password"
              />
            </ShakeOnError>
            <ShakeOnError error={nextMessage}>
              <PasswordField
                label="Mật khẩu mới"
                value={next}
                onChangeText={setNext}
                error={nextMessage}
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
              />
            </ShakeOnError>
            {/* Phones and tablets: the slots sit right under the new password, once typing starts. */}
            {next.length > 0 ? (
              <div className="rounded-[16px] bg-card p-sm ring-1 ring-border lg:hidden">
                <PasswordRuleSlots value={next} size="sm" />
              </div>
            ) : null}
            <ShakeOnError error={error}>
              <PasswordField
                label="Nhập lại mật khẩu mới"
                value={confirm}
                onChangeText={setConfirm}
                error={error}
              />
            </ShakeOnError>
            <Button label="Lưu thay đổi" type="submit" loading={submitting} onPress={submit} />
          </form>
        </div>

        <aside
          aria-label="Độ an toàn của mật khẩu mới"
          className="flex flex-col gap-md lg:rounded-[28px] lg:bg-card lg:p-lg lg:shadow-card lg:ring-1 lg:ring-border"
        >
          <div className="hidden flex-col gap-lg lg:flex">
            <div className="flex justify-center rounded-[20px] bg-sunken/50 px-md pt-md">
              <div className="w-[200px] xl:w-[260px]">
                <LockIllustration locked={allPassed} />
              </div>
            </div>
            <PasswordRuleSlots value={next} size="lg" />
          </div>
          <AfterChangeNote />
        </aside>
      </div>
    </Screen>
  );
}
