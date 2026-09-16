import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { PhotoPicker, SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { AiHint } from '@/components/status';
import { showToast } from '@/components/feedback';
import { env } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';

export function RecordViolationScreen() {
  const [searchParams] = useSearchParams();
  const paramVendorId = searchParams.get('vendorId') ?? undefined;
  const slotId = searchParams.get('slotId') ?? undefined;
  const navigate = useNavigate();
  const vendors = useMockDb((s) => s.vendors);
  const violationTypes = useMockDb((s) => s.violationTypes);
  const recordViolation = useMockDb((s) => s.recordViolation);

  const [vendorId, setVendorId] = useState(paramVendorId ?? vendors[0]?.id ?? '');
  const [typeCode, setTypeCode] = useState(violationTypes[0]?.code ?? '');
  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();

  const violationType = violationTypes.find((t) => t.code === typeCode);

  const submit = () => {
    if (!vendorId || !typeCode) return;
    recordViolation(
      {
        vendorId,
        slotId,
        violation_type: typeCode,
        note: note || violationType?.label || '',
        photoUris: photoUri ? [photoUri] : [],
        reportedBy: 'WARD',
      },
      violationType?.default_amount,
    );
    showToast('Đã lập biên bản vi phạm');
    navigate(-1);
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Lập biên bản" variant="danger" onPress={submit} />
        </StickyActions>
      }
    >
      <AppHeader title="Lập biên bản vi phạm" back />

      {!paramVendorId ? (
        <Section title="Hộ kinh doanh">
          <SelectField
            value={vendorId}
            onChange={setVendorId}
            layout="inline"
            options={vendors.map((v) => ({ value: v.id, label: v.business_name }))}
          />
        </Section>
      ) : null}

      <Section title="Loại vi phạm">
        <SelectField
          value={typeCode}
          onChange={setTypeCode}
          options={violationTypes.map((t) => ({
            value: t.code,
            label: t.label,
            description: `Mức phạt ${t.default_amount.toLocaleString('vi-VN')} đ`,
          }))}
        />
      </Section>

      {env.enableAiCompliance ? (
        <AiHint title="Phân tích ảnh hiện trường">
          Tải ảnh để hệ thống ước tính mức độ lấn chiếm lối đi bộ và gợi ý loại vi phạm phù hợp.
        </AiHint>
      ) : null}

      <PhotoPicker
        label="Ảnh hiện trường"
        uri={photoUri}
        onChange={setPhotoUri}
        onRemove={() => setPhotoUri(undefined)}
      />
      <TextField
        label="Ghi chú"
        value={note}
        onChangeText={setNote}
        multiline
        placeholder="Mô tả vi phạm..."
      />

      {violationType ? (
        <Card>
          <p className="text-body-md text-muted">Mức phạt áp dụng</p>
          <p className="text-headline-lg text-primary">
            {violationType.default_amount.toLocaleString('vi-VN')} đ
          </p>
        </Card>
      ) : null}
    </Screen>
  );
}
