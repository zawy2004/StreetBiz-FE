import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Card } from '@/components/common';
import { parsePoint, wardApi, type WardCase } from '../ward-api';

export function LocationReview({ record, onSaved }: { record: WardCase; onSaved: () => void }) {
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(String(record.location?.latitude ?? ''));
  const [longitude, setLongitude] = useState(String(record.location?.longitude ?? ''));
  const point = parsePoint(latitude, longitude);
  const pointKey = JSON.stringify(point);
  const search = useMutation({ mutationFn: wardApi.search });
  const verify = useMutation({
    mutationFn: async () => {
      if (!point) throw new Error('Nhập đầy đủ vĩ độ và kinh độ hợp lệ.');
      return { ...(await wardApi.verify(point)), pointKey };
    },
  });
  const pin = useMutation({
    mutationFn: () => {
      if (!point) throw new Error('Tọa độ không hợp lệ.');
      return wardApi.pin(record.id, point);
    },
    onSuccess: onSaved,
  });
  const busy = search.isPending || verify.isPending || pin.isPending;
  const verified = verify.data?.pointKey === pointKey ? verify.data : undefined;
  return (
    <Card>
      <h2 className="mb-sm text-headline-sm">Vị trí và ranh giới phường</h2>
      <div className="flex flex-col gap-sm">
        <label>
          Địa chỉ tìm kiếm
          <input
            className="mt-xs w-full rounded-sm border border-border p-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={busy}
            maxLength={500}
          />
        </label>
        <Button
          label="Tìm tọa độ từ địa chỉ"
          variant="outline"
          loading={search.isPending}
          disabled={busy || !address.trim()}
          onPress={() => search.mutate(address)}
        />
        {search.data?.length === 0 && <p>Không tìm thấy địa chỉ. Bạn có thể nhập tọa độ.</p>}
        {search.data?.map((hit, index) => (
          <button
            type="button"
            key={index}
            className="rounded-sm border border-border p-sm text-left"
            disabled={busy}
            onClick={() => {
              setLatitude(String(hit.point.latitude));
              setLongitude(String(hit.point.longitude));
              pin.reset();
            }}
          >
            {hit.label}
          </button>
        ))}
        <div className="grid grid-cols-2 gap-sm">
          <label>
            Vĩ độ
            <input
              aria-label="Vĩ độ"
              className="mt-xs w-full rounded-sm border border-border p-sm"
              inputMode="decimal"
              value={latitude}
              disabled={busy}
              onChange={(e) => {
                setLatitude(e.target.value);
                pin.reset();
              }}
            />
          </label>
          <label>
            Kinh độ
            <input
              aria-label="Kinh độ"
              className="mt-xs w-full rounded-sm border border-border p-sm"
              inputMode="decimal"
              value={longitude}
              disabled={busy}
              onChange={(e) => {
                setLongitude(e.target.value);
                pin.reset();
              }}
            />
          </label>
        </div>
        {point && (
          <a
            className="text-indigo underline"
            target="_blank"
            rel="noreferrer"
            href={`https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=18/${point.latitude}/${point.longitude}`}
          >
            Xem vị trí trên OpenStreetMap
          </a>
        )}
        <Button
          label="Kiểm tra ranh giới"
          disabled={!point || busy}
          loading={verify.isPending}
          variant="outline"
          onPress={() => verify.mutate()}
        />
        {verified && (
          <p role="status" className={verified.inside ? 'text-tertiary' : 'text-error'}>
            {verified.inside ? 'Trong ranh giới phường' : 'Ngoài ranh giới phường'} · Bản ranh giới:{' '}
            {verified.boundaryVersion}
          </p>
        )}
        {record.kind === 'proposals' && record.status === 'PENDING' && (
          <Button
            label="Lưu tọa độ đề xuất"
            disabled={!verified?.inside || busy}
            loading={pin.isPending}
            onPress={() => pin.mutate()}
          />
        )}
        {pin.isSuccess && <p role="status">Đã lưu tọa độ và tải lại hồ sơ.</p>}
        {[search.error, verify.error, pin.error].filter(Boolean).map((error, index) => (
          <p key={index} role="alert" className="text-error">
            {error?.message}
          </p>
        ))}
      </div>
    </Card>
  );
}
