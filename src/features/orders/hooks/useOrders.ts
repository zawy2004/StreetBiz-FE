import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { ApiError } from '@/core/api/problem';
import { orderApi } from '../api/orderApi';
import {
  TERMINAL_ORDER_STATUSES,
  type Order,
  type OrderListFilters,
} from '../types/order.types';
import { useOrderRealtime } from '../realtime/useOrderRealtime';

export const orderKeys = {
  customerLists: ['orders', 'customer', 'list'] as const,
  customerList: (filters: OrderListFilters) => [...orderKeys.customerLists, filters] as const,
  customerDetail: (id: string | number) => ['orders', 'customer', 'detail', String(id)] as const,
  vendorLists: ['orders', 'vendor', 'list'] as const,
  vendorList: (filters: OrderListFilters) => [...orderKeys.vendorLists, filters] as const,
  vendorDetail: (id: string | number) => ['orders', 'vendor', 'detail', String(id)] as const,
  sales: (from: string, to: string, groupBy: string) =>
    ['orders', 'vendor', 'sales', from, to, groupBy] as const,
};

export function orderPollingInterval(order?: Order): number | false {
  return !order || TERMINAL_ORDER_STATUSES.has(order.orderStatus) ? false : 7_000;
}

export function useCustomerOrders(filters: OrderListFilters, enabled = true) {
  return useQuery({
    queryKey: orderKeys.customerList(filters),
    queryFn: () => orderApi.customerOrders(filters),
    enabled,
  });
}

export function useCustomerOrder(orderId: string | number | undefined) {
  const realtimeConnected = useRef(false);
  const query = useQuery({
    queryKey: orderKeys.customerDetail(orderId ?? ''),
    queryFn: () => orderApi.customerOrder(orderId!),
    enabled: Boolean(orderId),
    refetchInterval: (state) =>
      realtimeConnected.current ? false : orderPollingInterval(state.state.data),
    refetchIntervalInBackground: false,
  });
  realtimeConnected.current = useOrderRealtime(
    orderId,
    'customer',
    Boolean(query.data && !TERMINAL_ORDER_STATUSES.has(query.data.orderStatus)),
  );
  return query;
}

export function useVendorOrders(filters: OrderListFilters) {
  return useQuery({
    queryKey: orderKeys.vendorList(filters),
    queryFn: () => orderApi.vendorOrders(filters),
  });
}

export function useVendorOrder(orderId: string | number | undefined) {
  const realtimeConnected = useRef(false);
  const query = useQuery({
    queryKey: orderKeys.vendorDetail(orderId ?? ''),
    queryFn: () => orderApi.vendorOrder(orderId!),
    enabled: Boolean(orderId),
    refetchInterval: (state) =>
      realtimeConnected.current ? false : orderPollingInterval(state.state.data),
    refetchIntervalInBackground: false,
  });
  realtimeConnected.current = useOrderRealtime(
    orderId,
    'vendor',
    Boolean(query.data && !TERMINAL_ORDER_STATUSES.has(query.data.orderStatus)),
  );
  return query;
}

export function useRefreshAfterOrderMutation(scope: 'customer' | 'vendor', orderId: number) {
  const cache = useQueryClient();
  const listKey = scope === 'customer' ? orderKeys.customerLists : orderKeys.vendorLists;
  const detailKey =
    scope === 'customer'
      ? orderKeys.customerDetail(orderId)
      : orderKeys.vendorDetail(orderId);
  return {
    update: async (order: Order) => {
      cache.setQueryData(detailKey, order);
      await cache.invalidateQueries({ queryKey: listKey });
    },
    handleError: async (error: unknown) => {
      if (error instanceof ApiError && error.status === 409) {
        await Promise.all([
          cache.invalidateQueries({ queryKey: listKey }),
          cache.invalidateQueries({ queryKey: detailKey }),
        ]);
      }
    },
  };
}

export function useCheckoutOrder() {
  return useMutation({
    mutationFn: ({
      cartId,
      provider,
      idempotencyKey,
    }: {
      cartId: number;
      provider: 'MOMO' | 'ZALOPAY';
      idempotencyKey: string;
    }) => orderApi.checkout({ cartId, provider }, idempotencyKey),
  });
}
