import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { orderApi } from '../api/orderApi';
import { OfflineNotice } from '../components/OrderShapes';
import { QrScanner } from '../components/QrScanner';
import { cameraUnavailableMessage, isCameraScanSupported } from '../components/qr-scan-support';
import {
  HandoverReceipt,
  NoCodeSign,
  ScanRefusal,
  ScanViewfinder,
  SessionTally,
} from '../components/pickup/PickupParts';
import { NewOrdersHint } from '../components/vendor/NewOrdersHint';
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
  // Display only: how many orders went out while this screen was open.
  const [tally, setTally] = useState(0);
  const receiptHeading = useRef<HTMLHeadingElement>(null);

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

  useEffect(() => {
    if (!handedOver) return;
    setTally((count) => count + 1);
    receiptHeading.current?.focus();
  }, [handedOver]);

  // While a scan is in flight or its result is on screen, the camera must stop
  // firing or the same code would be submitted again and again.
  const paused = handOver.isPending || Boolean(handedOver);

  // A refusal is shown under the route that produced it. At the bottom of the
  // page it sat off-screen, and a seller watching the camera saw nothing happen.
  const failedRoute = handOver.isError ? (handOver.variables?.token ? 'scan' : 'typed') : null;
  const failure = handOver.isError ? (
    <p
      role="alert"
      className="text-error break-words text-[16px] font-semibold leading-6 !text-[#8F1717] dark:!text-[#FF9A90]"
    >
      {errorMessage(handOver.error)}
    </p>
  ) : null;

  const reset = () => {
    setHandedOver(null);
    handOver.reset();
  };

  const scanning = handOver.isPending && Boolean(handOver.variables?.token);
  const phase = failedRoute === 'scan' ? 'refused' : scanning ? 'checking' : 'waiting';

  return (
    <Screen>
      <AppHeader
        title="Quét mã nhận hàng"
        back
        subtitle="Quét mã của khách để giao đơn"
        right={<SessionTally count={tally} />}
      />
      <OfflineNotice message="Mất kết nối. Mã cần được kiểm với máy chủ, chưa giao được." />

      {handedOver ? (
        <HandoverReceipt
          ref={receiptHeading}
          order={handedOver}
          actions={
            <div className="flex flex-col gap-sm">
              <div className="[&>button]:h-14 [&>button]:text-[17px]">
                <Button label="Quét đơn tiếp theo" onPress={reset} />
              </div>
              <Button
                label="Xem chi tiết đơn"
                variant="outline"
                onPress={() => navigate(`/vendor/orders/${handedOver.orderId}`)}
              />
            </div>
          }
        />
      ) : (
        <div className="grid items-start gap-lg xl:grid-cols-2 xl:gap-xl">
          {cameraSupported ? (
            <Section title="Cách 1 · Quét mã QR của khách">
              <ScanViewfinder
                phase={phase}
                below={
                  failedRoute === 'scan' ? (
                    <ScanRefusal
                      action={
                        <Button
                          label="Thử lại"
                          variant="outline"
                          onPress={() => {
                            handOver.reset();
                            setScanAttempt((attempt) => attempt + 1);
                          }}
                        />
                      }
                    >
                      {failure}
                    </ScanRefusal>
                  ) : null
                }
              >
                <QrScanner
                  key={scanAttempt}
                  paused={paused}
                  onDetected={(token) => handOver.mutate({ token })}
                />
              </ScanViewfinder>
            </Section>
          ) : (
            <div className="mx-auto flex w-full max-w-[360px] flex-col items-center gap-sm rounded-[28px] bg-sunken px-lg py-xl text-center ring-1 ring-border lg:max-w-[440px]">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-muted shadow-card">
                <Icon name="camera-plus-outline" size={28} color="currentColor" />
              </span>
              <p className="text-[16px] font-medium leading-6 text-text">
                {cameraUnavailableMessage()} Hãy nhập mã bên dưới.
              </p>
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-lg">
            <Section
              title={cameraSupported ? 'Cách 2 · Camera hỏng thì nhập mã' : 'Nhập mã của khách'}
            >
              <div className="flex flex-col gap-sm rounded-[24px] bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg [&_input]:h-16 [&_input]:font-sign [&_input]:text-[26px] [&_input]:font-bold [&_input]:tracking-[0.18em] [&_input]:tabular-nums md:[&_input]:text-[28px]">
                <TextField
                  label="Mã nhận hàng"
                  helperText="8 ký tự in dưới mã QR trên máy khách."
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder="VD: 7K2M9QXP"
                  maxLength={12}
                  disabled={handOver.isPending}
                />
                <div className="[&>button]:h-14 [&>button]:text-[17px]">
                  <Button
                    label="Xác nhận giao đơn"
                    loading={handOver.isPending}
                    disabled={!manualCode.trim()}
                    onPress={() => handOver.mutate({ code: manualCode.trim() })}
                  />
                </div>
                {failedRoute === 'typed' ? (
                  <div className="sb-pop flex items-start gap-xs rounded-[14px] bg-[#FDEBEA] px-sm py-sm text-[#8F1717] ring-1 ring-[#B42318]/25 dark:bg-[#3A1414] dark:text-[#FF9A90]">
                    <Icon
                      name="alert-octagon-outline"
                      size={20}
                      color="currentColor"
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">{failure}</div>
                  </div>
                ) : null}
              </div>
            </Section>

            {/* ORD-06: the way out when neither route can read a code. It is a
                hint rather than a button because that handover needs the order
                picked first, and a written reason the buyer will see. */}
            <NoCodeSign
              action={
                <Button
                  label="Mở danh sách đơn hàng"
                  variant="ghost"
                  onPress={() => navigate('/vendor/orders')}
                />
              }
            >
              <p>
                Khách không có mã (hết pin, mất máy)? Mở đơn trong danh sách đơn hàng rồi chọn
                “Khách không có mã”. Bạn phải ghi lý do, và lý do đó được lưu vào lịch sử đơn.
              </p>
            </NoCodeSign>
            <NewOrdersHint />
          </div>
        </div>
      )}
    </Screen>
  );
}
