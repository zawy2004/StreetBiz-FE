import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Money } from '@/components/common';
import { EmptyState } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { orderApi } from '../api/orderApi';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { QrScanner } from '../components/QrScanner';
import { cameraUnavailableMessage, isCameraScanSupported } from '../components/qr-scan-support';
import { orderKeys } from '../hooks/useOrders';
import type { Order } from '../types/order.types';

/**
 * ORD-06: the seller scans the buyer's code to hand an order over.
 *
 * Scanning completes the order in one step rather than showing a confirm dialog:
 * the code names the order, so there is nothing for the seller to choose. What
 * they get back is the completed order, so they can see exactly what was handed
 * over - and a second scan of the same code fails, which is the point.
 */
export function VendorPickupScanScreen() {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [manualCode, setManualCode] = useState('');
  const [handedOver, setHandedOver] = useState<Order | null>(null);
  // Bumped by "Thử lại" to remount the scanner, which forgets the code it
  // last reported and so reads the one still held up in front of it.
  const [scanAttempt, setScanAttempt] = useState(0);
  const cameraSupported = isCameraScanSupported();

  // Two ways to prove the same thing: the camera reads the QR, or the seller
  // types what the buyer reads out when the camera is broken. Both land on the
  // same completion, so they share one result panel and one error slot.
  const handOver = useMutation({
    mutationFn: ({ token, code }: { token?: string; code?: string }) =>
      token ? orderApi.scanPickup(token) : orderApi.confirmPickupByCode(code!),
    onSuccess: async (order) => {
      setHandedOver(order);
      setManualCode('');
      await Promise.all([
        cache.invalidateQueries({ queryKey: orderKeys.vendorLists }),
        cache.invalidateQueries({ queryKey: orderKeys.vendorDetail(order.orderId) }),
      ]);
    },
  });

  // While a scan is in flight or its result is on screen, the camera must stop
  // firing or the same code would be submitted again and again.
  const paused = handOver.isPending || Boolean(handedOver);

  // A refusal is shown under the route that produced it. At the bottom of the
  // page it sat off-screen, and a seller watching the camera saw nothing happen.
  const failedRoute = handOver.isError ? (handOver.variables?.token ? 'scan' : 'typed') : null;
  const failure = handOver.isError ? (
    <p role="alert" className="text-body-md text-error">
      {errorMessage(handOver.error)}
    </p>
  ) : null;

  const reset = () => {
    setHandedOver(null);
    handOver.reset();
  };

  return (
    <Screen>
      <AppHeader title="Quét mã nhận hàng" back subtitle="Quét mã của khách để giao đơn" />

      {handedOver ? (
        <>
          <Card>
            <div className="flex flex-col gap-sm">
              <EmptyState
                icon="check-circle-outline"
                title="Đã giao đơn cho khách"
                description={`Đơn ${handedOver.orderCode}`}
                compact
              />
              <div className="flex items-center justify-between">
                <span className="text-body-md text-muted">Khách hàng</span>
                <span className="text-body-md text-text">{handedOver.customerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-md text-muted">Tổng tiền</span>
                <Money amountVnd={handedOver.totalAmount} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-md text-muted">Trạng thái</span>
                <OrderStatusBadge status={handedOver.orderStatus} />
              </div>
            </div>
          </Card>
          <Button label="Quét đơn tiếp theo" onPress={reset} />
          <Button
            label="Xem chi tiết đơn"
            variant="outline"
            onPress={() => navigate(`/vendor/orders/${handedOver.orderId}`)}
          />
        </>
      ) : (
        <>
          {cameraSupported ? (
            <Section title="Cách 1 · Quét mã QR của khách">
              <QrScanner
                key={scanAttempt}
                paused={paused}
                onDetected={(token) => handOver.mutate({ token })}
              />
              {failedRoute === 'scan' ? (
                <Card>
                  {failure}
                  <Button
                    label="Thử lại"
                    variant="ghost"
                    onPress={() => {
                      handOver.reset();
                      setScanAttempt((attempt) => attempt + 1);
                    }}
                  />
                </Card>
              ) : null}
            </Section>
          ) : (
            <Card>
              <p className="text-body-md text-muted">
                {cameraUnavailableMessage()} Hãy nhập mã bên dưới.
              </p>
            </Card>
          )}

          <Section
            title={cameraSupported ? 'Cách 2 · Camera hỏng thì nhập mã' : 'Nhập mã của khách'}
          >
            <Card>
              <div className="flex flex-col gap-sm">
                <TextField
                  label="Mã nhận hàng"
                  helperText="8 ký tự in dưới mã QR trên máy khách."
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder="VD: 7K2M9QXP"
                  maxLength={12}
                  disabled={handOver.isPending}
                />
                <Button
                  label="Xác nhận giao đơn"
                  loading={handOver.isPending}
                  disabled={!manualCode.trim()}
                  onPress={() => handOver.mutate({ code: manualCode.trim() })}
                />
                {failedRoute === 'typed' ? failure : null}
              </div>
            </Card>
          </Section>

          {/* ORD-06: the way out when neither route can read a code. It is a
              hint rather than a button because that handover needs the order
              picked first, and a written reason the buyer will see. */}
          <Card>
            <p className="text-body-sm text-muted">
              Khách không có mã (hết pin, mất máy)? Mở đơn trong danh sách đơn hàng rồi chọn
              “Khách không có mã”. Bạn phải ghi lý do, và lý do đó được lưu vào lịch sử đơn.
            </p>
            <Button
              label="Mở danh sách đơn hàng"
              variant="ghost"
              onPress={() => navigate('/vendor/orders')}
            />
          </Card>

        </>
      )}
    </Screen>
  );
}
