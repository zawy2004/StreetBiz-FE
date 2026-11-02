import { useState } from 'react';

import { Button } from '@/components/common';
import { showToast } from '@/components/feedback';
import { BankTransferPanel } from '@/components/payment';
import { errorMessage, financeApi } from '@/core/api';
import { env, isDev } from '@/core/config/env';
import type { useFinanceBankTransfer } from '../useFinancePaymentReturn';

/** Only Development has the sandbox confirm endpoint; elsewhere SePay's webhook settles the transfer. */
const sandboxPayments = isDev && env.enablePaymentSandbox;

/**
 * The VietQR panel on a fee or penalty page, with a way back to the wallet
 * choice and, in Development, a stand-in for the money arriving.
 */
export function BankTransferSection({
  bank,
  onChangeMethod,
}: {
  bank: ReturnType<typeof useFinanceBankTransfer>;
  onChangeMethod: () => void;
}) {
  const [simulating, setSimulating] = useState(false);
  if (!bank.transfer) return null;
  const { transactionId, details } = bank.transfer;

  const simulate = async () => {
    setSimulating(true);
    try {
      await financeApi.sandboxConfirmPayment(transactionId);
      await bank.check();
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setSimulating(false);
    }
  };

  return (
    <BankTransferPanel transfer={details} checking={bank.checking} onCheck={() => void bank.check()}>
      {sandboxPayments ? (
        <Button
          label="Giả lập tiền đã về (môi trường dev)"
          variant="outline"
          loading={simulating}
          disabled={simulating}
          onPress={() => void simulate()}
        />
      ) : null}
      <Button label="Chọn phương thức khác" variant="ghost" onPress={onChangeMethod} />
    </BankTransferPanel>
  );
}
