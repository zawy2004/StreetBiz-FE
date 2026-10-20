import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { showToast } from '@/components/feedback';
import { playChime, unlockChimeOnFirstGesture } from '@/core/attention/chime';
import { clearUnseenOnReturn, markUnseen, systemNotify } from '@/core/attention/notify';
import { orderApi } from '../api/orderApi';
import { orderKeys, VENDOR_ORDERS_REFRESH_MS } from '../hooks/useOrders';
import { useVendorOrderFeed } from '../realtime/useVendorOrderFeed';
import type { Order, OrderListFilters } from '../types/order.types';
import { detectNewOrder, newOrderMessage } from './new-order-detection';
import { useOrderAlertStore } from './order-alert-store';

/** The newest new order. Same key as the board's "Đơn mới" count, so one request serves both. */
const NEWEST_PLACED: OrderListFilters = { status: 'PLACED', page: 1, pageSize: 1 };

/**
 * ORD-04: keeps a seller told about new orders on every vendor screen, not only
 * the order board - they may be on the menu or the finance page when a buyer pays.
 *
 * Three layers, each covering for the one above it:
 * 1. the socket says "something changed" the moment an order is paid;
 * 2. the newest new order is polled anyway, even in a background tab;
 * 3. when it changes, the seller hears a chime, sees a toast, and - if the tab is
 *    hidden and they allowed it - gets a system notification.
 *
 * Returns how many new orders are waiting, for the navigation badge.
 */
export function useVendorOrderAlerts(enabled: boolean): number {
  const navigate = useNavigate();
  useVendorOrderFeed(enabled);

  const newest = useQuery({
    queryKey: orderKeys.vendorList(NEWEST_PLACED),
    queryFn: () => orderApi.vendorOrders(NEWEST_PLACED),
    enabled,
    refetchInterval: VENDOR_ORDERS_REFRESH_MS,
    // A seller cooking with the tab in the background is exactly who needs this.
    refetchIntervalInBackground: true,
  });

  useEffect(() => (enabled ? unlockChimeOnFirstGesture() : undefined), [enabled]);

  const seenUpTo = useRef<number | null>(null);
  useEffect(() => {
    if (!newest.data) return;
    const result = detectNewOrder(seenUpTo.current, newest.data.items[0]);
    seenUpTo.current = result.seenUpTo;
    if (result.arrived) announce(result.arrived, () => navigate('/vendor/orders'));
  }, [navigate, newest.data]);

  useEffect(() => clearUnseenOnReturn(), []);

  return enabled ? (newest.data?.totalItems ?? 0) : 0;
}

function announce(order: Order, open: () => void) {
  const { alerts } = useOrderAlertStore.getState();
  const message = newOrderMessage(order);
  if (alerts) playChime();
  showToast(`${message.title}. ${message.body}`);
  markUnseen();
  if (alerts) {
    // One notification per order, even if two refreshes race.
    systemNotify({ ...message, tag: `order-${order.orderId}`, onClick: open });
  }
}
