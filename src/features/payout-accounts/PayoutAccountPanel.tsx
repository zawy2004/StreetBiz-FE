import { useState } from 'react';

import { Button, Icon } from '@/components/common';
import { ConfirmDialog, ErrorState, Skeleton, showToast } from '@/components/feedback';
import { PasswordField, TextField } from '@/components/forms';
import { StatusChip } from '@/components/status';
import { errorMessage, type PayoutAccountDto } from '@/core/api';
import {
  GUIDE_STEPS,
  keyErrors,
  OWNER_COPY,
  summarizeAccount,
  webhookNote,
} from './payout-account-view';
import { usePayoutAccount, type PayoutOwner } from './usePayoutAccount';

const dateTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

/**
 * The receiving account a household or a ward connects: what is connected now, the actions on it,
 * and the form for the three payOS keys. The keys are sent once; the server never returns them,
 * so the form is always blank and the account is shown masked.
 */
export function PayoutAccountPanel({ owner }: { owner: PayoutOwner }) {
  const { query, connect, check, disconnect } = usePayoutAccount(owner);
  const copy = OWNER_COPY[owner];

  if (query.isPending) {
    return (
      <div aria-label="Đang tải tài khoản nhận tiền" className="flex max-w-[720px] flex-col gap-md">
        <Skeleton className="h-28 w-full !rounded-[20px]" />
        <Skeleton className="h-64 w-full !rounded-[20px]" />
      </div>
    );
  }
  if (query.isError) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />;
  }

  const account = query.data;
  return (
    <div className="flex min-w-0 max-w-[720px] flex-col gap-md">
      <p className="text-body-lg text-text">{copy.intro}</p>
      <AccountCard
        account={account}
        owner={owner}
        checking={check.isPending}
        disconnecting={disconnect.isPending}
        error={
          check.isError
            ? errorMessage(check.error)
            : disconnect.isError
              ? errorMessage(disconnect.error)
              : undefined
        }
        onCheck={() =>
          check.mutate(undefined, {
            onSuccess: (next) =>
              showToast(
                next.status === 'ACTIVE' ? 'Kết nối vẫn hoạt động' : 'payOS không chấp nhận khoá này',
              ),
          })
        }
        onDisconnect={() =>
          disconnect.mutate(undefined, { onSuccess: () => showToast('Đã ngắt kết nối') })
        }
      />
      <KeyForm
        replacing={account.connected}
        pending={connect.isPending}
        error={connect.isError ? errorMessage(connect.error) : undefined}
        onSubmit={(values, done) =>
          connect.mutate(values, {
            onSuccess: () => {
              showToast('Đã kết nối tài khoản nhận tiền');
              done();
            },
          })
        }
      />
      <GuideCard />
    </div>
  );
}

function AccountCard({
  account,
  owner,
  checking,
  disconnecting,
  error,
  onCheck,
  onDisconnect,
}: {
  account: PayoutAccountDto;
  owner: PayoutOwner;
  checking: boolean;
  disconnecting: boolean;
  error?: string;
  onCheck: () => void;
  onDisconnect: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const summary = summarizeAccount(account, owner);
  return (
    <section
      aria-label="Tình trạng kết nối"
      className="flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-xs">
        <h2 className="flex items-center gap-xs font-sign text-[18px] font-bold leading-6 text-text">
          <span className="text-primary">
            <Icon name="bank" size={22} color="currentColor" />
          </span>
          Kênh payOS
        </h2>
        <StatusChip label={summary.label} tone={summary.tone} />
      </div>
      <p className="text-body-md text-text/80">{summary.note}</p>

      {account.connected ? (
        <dl className="flex flex-col divide-y divide-border rounded-[16px] bg-sunken/60 px-sm">
          <Row label="Ngân hàng" value={account.bankName} />
          <Row label="Số tài khoản" value={account.accountNumberMasked} />
          <Row label="Chủ tài khoản" value={account.accountName} />
          <Row label="Client ID" value={account.clientIdMasked} />
          {account.lastCheckedAt ? (
            <Row label="Kiểm tra gần nhất" value={dateTime(account.lastCheckedAt)} />
          ) : null}
        </dl>
      ) : null}

      {account.connected && account.status !== 'DISABLED' ? (
        <p className="flex items-start gap-xs text-body-sm text-muted">
          <Icon name="information-outline" size={18} color="currentColor" className="mt-0.5 shrink-0" />
          <span>{webhookNote(account)}</span>
        </p>
      ) : null}

      {account.status === 'ERROR' && account.lastError ? (
        <p
          role="alert"
          className="flex items-start gap-xs rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-md text-[#B42318] dark:bg-[#3A1414] dark:text-[#FF9A90]"
        >
          <Icon name="alert-circle-outline" size={20} color="currentColor" className="mt-0.5 shrink-0" />
          <span>{account.lastError}</span>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-body-md text-error">
          {error}
        </p>
      ) : null}

      {account.connected && account.status !== 'DISABLED' ? (
        <div className="flex flex-wrap gap-xs">
          <Button
            label="Kiểm tra kết nối"
            variant="outline"
            size="sm"
            fullWidth={false}
            loading={checking}
            disabled={checking || disconnecting}
            onPress={onCheck}
          />
          <Button
            label="Ngắt kết nối"
            variant="ghost"
            size="sm"
            fullWidth={false}
            disabled={checking || disconnecting}
            onPress={() => setConfirming(true)}
          />
        </div>
      ) : null}

      <ConfirmDialog
        visible={confirming}
        title="Ngắt kết nối tài khoản nhận tiền?"
        description={`${
          owner === 'vendor'
            ? 'Khách sẽ không đặt và trả trước được cho quán'
            : 'Hộ sẽ không trả phí thuê ô online được'
        } cho đến khi bạn kết nối lại. Các khoản đã tạo trước đó vẫn được ghi nhận khi tiền về.`}
        confirmLabel="Ngắt kết nối"
        confirmVariant="danger"
        onConfirm={() => {
          setConfirming(false);
          onDisconnect();
        }}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-sm py-xs">
      <dt className="text-body-sm text-muted">{label}</dt>
      <dd className="break-all text-right font-sign text-[16px] font-semibold tabular-nums text-text">
        {value ?? '—'}
      </dd>
    </div>
  );
}

function KeyForm({
  replacing,
  pending,
  error,
  onSubmit,
}: {
  replacing: boolean;
  pending: boolean;
  error?: string;
  onSubmit: (
    values: { clientId: string; apiKey: string; checksumKey: string },
    done: () => void,
  ) => void;
}) {
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [checksumKey, setChecksumKey] = useState('');
  const [touched, setTouched] = useState(false);
  const errors = keyErrors({ clientId, apiKey, checksumKey });
  const invalid = Boolean(errors.clientId || errors.apiKey || errors.checksumKey);
  const shown: Partial<typeof errors> = touched ? errors : {};

  const submit = () => {
    setTouched(true);
    if (invalid || pending) return;
    onSubmit({ clientId: clientId.trim(), apiKey: apiKey.trim(), checksumKey: checksumKey.trim() }, () => {
      setClientId('');
      setApiKey('');
      setChecksumKey('');
      setTouched(false);
    });
  };

  return (
    <form
      aria-label={replacing ? 'Đổi khoá payOS' : 'Kết nối payOS'}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-md rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg"
    >
      <h2 className="flex items-center gap-xs font-sign text-[18px] font-bold leading-6 text-text">
        <span className="text-primary">
          <Icon name="key-outline" size={22} color="currentColor" />
        </span>
        {replacing ? 'Đổi khoá payOS' : 'Kết nối payOS'}
      </h2>
      <TextField
        label="Client ID"
        value={clientId}
        onChangeText={setClientId}
        error={shown.clientId}
        disabled={pending}
      />
      <PasswordField label="API Key" value={apiKey} onChangeText={setApiKey} error={shown.apiKey} />
      <PasswordField
        label="Checksum Key"
        value={checksumKey}
        onChangeText={setChecksumKey}
        error={shown.checksumKey}
      />
      <p className="flex items-start gap-xs text-body-sm text-muted">
        <Icon name="lock-outline" size={18} color="currentColor" className="mt-0.5 shrink-0" />
        <span>
          Khoá được mã hoá khi lưu và không bao giờ hiển thị lại. Chỉ nhập khoá của kênh payOS bạn
          sở hữu, không chia sẻ cho ai.
        </span>
      </p>
      {error ? (
        <p
          role="alert"
          className="flex items-start gap-xs rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-md text-[#B42318] dark:bg-[#3A1414] dark:text-[#FF9A90]"
        >
          <Icon name="alert-circle-outline" size={20} color="currentColor" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
      <Button
        label={pending ? 'Đang kiểm tra với payOS…' : replacing ? 'Lưu khoá mới' : 'Kết nối'}
        loading={pending}
        disabled={pending}
        onPress={submit}
      />
    </form>
  );
}

function GuideCard() {
  return (
    <section
      aria-label="Cách lấy khoá payOS"
      className="rounded-[20px] bg-card p-md ring-1 ring-border/80"
    >
      <h2 className="mb-sm flex items-center gap-xs text-[16px] font-bold leading-6 text-text">
        <span className="text-tertiary">
          <Icon name="information-outline" size={20} color="currentColor" />
        </span>
        Cách lấy khoá payOS
      </h2>
      <ol className="flex flex-col gap-sm">
        {GUIDE_STEPS.map((step, index) => (
          <li key={step} className="flex items-start gap-sm">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint-primary font-sign text-[15px] font-bold text-primary"
            >
              {index + 1}
            </span>
            <span className="pt-1 text-body-md text-text">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
