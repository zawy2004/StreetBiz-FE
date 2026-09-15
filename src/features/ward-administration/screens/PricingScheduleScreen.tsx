import { useState } from 'react';

import { Button } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { AiHint } from '@/components/status';
import { showToast } from '@/components/feedback';
import { env } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';

export function PricingScheduleScreen() {
  const slots = useMockDb((s) => s.slots);
  const updateSlot = useMockDb((s) => s.updateSlot);
  const [price, setPrice] = useState('400000');
  const [window, setWindow] = useState('05:30 - 10:30');

  const applyToStreet = () => {
    const priceNum = Number(price);
    if (!priceNum) return;
    slots
      .filter((s) => s.street === 'Nguyễn Văn Linh')
      .forEach((s) => updateSlot(s.id, { price_monthly: priceNum, time_window: window }));
    showToast('Đã áp dụng cho tuyến Nguyễn Văn Linh');
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Áp dụng cho tuyến đường" onPress={applyToStreet} />
        </StickyActions>
      }
    >
      <AppHeader title="Giá & khung giờ" back subtitle="Tuyến Nguyễn Văn Linh" />
      {env.enableAiCompliance ? (
        <AiHint title="Đề xuất giá thuê">
          Dựa trên tỷ lệ lấp đầy 3 tháng gần nhất, mức giá 400.000đ/tháng phù hợp với khu vực này.
        </AiHint>
      ) : null}
      <TextField
        label="Giá thuê mỗi tháng (đ)"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />
      <TextField label="Khung giờ được phép kinh doanh" value={window} onChangeText={setWindow} />
    </Screen>
  );
}
