import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  vendorPayoutApi,
  wardPayoutApi,
  type PayoutAccountDto,
} from '@/core/api';
import { isLiveApi } from '@/core/config/env';

export type PayoutOwner = 'vendor' | 'ward';

export const PAYOUT_KEYS = {
  vendor: ['payout-account', 'vendor'] as const,
  ward: ['payout-account', 'ward'] as const,
};

/** Every "which methods can I pay with" read: it changes the moment a payee connects or leaves. */
export const PAYMENT_OPTIONS_KEY = ['payment-options'] as const;

/** A household's (orders) or a ward's (rental fees) receiving account, and the actions on it. */
export function usePayoutAccount(owner: PayoutOwner) {
  const api = owner === 'vendor' ? vendorPayoutApi : wardPayoutApi;
  const queryClient = useQueryClient();
  const key = PAYOUT_KEYS[owner];
  const remember = async (account: PayoutAccountDto) => {
    queryClient.setQueryData(key, account);
    await queryClient.invalidateQueries({ queryKey: PAYMENT_OPTIONS_KEY });
  };

  const query = useQuery({ queryKey: key, queryFn: api.get, enabled: isLiveApi });
  const connect = useMutation({ mutationFn: api.connect, onSuccess: remember });
  const check = useMutation({ mutationFn: api.check, onSuccess: remember });
  const disconnect = useMutation({ mutationFn: api.disconnect, onSuccess: remember });
  return { query, connect, check, disconnect };
}
