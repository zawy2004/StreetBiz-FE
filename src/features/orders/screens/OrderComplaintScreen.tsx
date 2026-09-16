import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

const TYPES = [
  { value: 'WRONG_ITEM', label: 'Sai món' },
  { value: 'QUALITY', label: 'Chất lượng không như mô tả' },
  { value: 'REFUND', label: 'Yêu cầu hoàn tiền' },
];

export function OrderComplaintScreen() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const order = useMockDb((s) => s.orders.find((o) => o.id === orderId));
  const addComplaint = useMockDb((s) => s.addComplaint);
  const [type, setType] = useState('WRONG_ITEM');
  const [description, setDescription] = useState('');

  if (!order || !user) return <ErrorState message="Không tìm thấy đơn hàng." />;

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Gửi khiếu nại"
            disabled={!description.trim()}
            onPress={() => {
              addComplaint({
                orderId: order.id,
                customerId: user.id,
                complaint_type: type,
                description,
              });
              showToast('Đã gửi khiếu nại tới quản trị viên');
              navigate(-1);
            }}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Khiếu nại đơn hàng" back subtitle={`#${order.order_code}`} />
      <SelectField
        label="Loại khiếu nại"
        value={type}
        onChange={setType}
        layout="inline"
        options={TYPES}
      />
      <TextField
        label="Mô tả chi tiết"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Mô tả vấn đề bạn gặp phải..."
      />
    </Screen>
  );
}
