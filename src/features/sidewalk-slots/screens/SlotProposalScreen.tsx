import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { Button, Card } from '@/components/common';
import { FilterChips, PhotoPicker, TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { EmptyState, LoadingState, showToast } from '@/components/feedback';
import { errorMessage, vendorRegistrationApi } from '@/core/api';
import { sideApi } from '@/core/api/side-api';
import { reverseGeocode } from '@/services/map/reverse-geocode';
import { useRegistrations } from '@/features/business-registrations/useRegistrations';

// No zones-list endpoint exists -- a zone only shows up here once it has at
// least one slot to search for. Cast a wide, citywide net (not just the
// Nguyễn Văn Linh pilot bbox) so any configured zone can surface, since the
// whole point of this screen is proposing a slot somewhere new.
const DA_NANG_CENTER = { lat: 16.047, lng: 108.206 };
const DA_NANG_RADIUS_METERS = 20_000;

type Position = { latitude: number; longitude: number };

export function SlotProposalScreen() {
  const navigate = useNavigate();
  const { registrations, isLoading: loadingRegistrations } = useRegistrations();
  const registrationId = registrations[0]?.registrationId;

  const zoneOptions = useQuery({
    queryKey: ['side', 'zones-for-proposal'],
    queryFn: () => sideApi.searchSlots({ ...DA_NANG_CENTER, radiusMeters: DA_NANG_RADIUS_METERS, take: 500 }),
  });
  const zones = useMemo(() => {
    const byZone = new Map<number, string>();
    for (const s of zoneOptions.data ?? []) byZone.set(s.zoneId, s.zoneName);
    return [...byZone.entries()].map(([zoneId, zoneName]) => ({ zoneId, zoneName }));
  }, [zoneOptions.data]);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const activeZoneId = zoneId ?? zones[0]?.zoneId ?? null;

  const [position, setPosition] = useState<Position | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string>();
  const address = useQuery({
    queryKey: ['side', 'reverse-geocode', position?.latitude, position?.longitude],
    queryFn: ({ signal }) => reverseGeocode(position!.latitude, position!.longitude, signal),
    enabled: !!position,
    staleTime: Infinity,
  });

  const locate = () => {
    if (!navigator.geolocation) {
      setLocateError('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    setLocating(true);
    setLocateError(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocateError('Không lấy được vị trí. Vui lòng cho phép quyền định vị rồi thử lại.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const [widthMeters, setWidthMeters] = useState('');
  const [lengthMeters, setLengthMeters] = useState('');
  const [photoFile, setPhotoFile] = useState<File>();
  const [photoUri, setPhotoUri] = useState<string>();
  const [error, setError] = useState<string>();

  const submit = useMutation({
    mutationFn: async () => {
      const { fileUrl } = await vendorRegistrationApi.uploadEvidenceFile(photoFile!);
      return sideApi.proposeSlot({
        registrationId: registrationId!,
        zoneId: activeZoneId!,
        latitude: position!.latitude,
        longitude: position!.longitude,
        widthMeters: widthMeters.trim() ? Number(widthMeters) : undefined,
        lengthMeters: lengthMeters.trim() ? Number(lengthMeters) : undefined,
        proposalPhotoUrl: fileUrl,
      });
    },
    onSuccess: (result) => {
      showToast(result.message);
      navigate(-1);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  if (loadingRegistrations) return <LoadingState />;
  if (!registrationId) {
    return (
      <EmptyState
        icon="file-document-outline"
        title="Cần có hồ sơ đăng ký kinh doanh"
        description="Vui lòng nộp hồ sơ đăng ký trước khi đề xuất ô mới."
      />
    );
  }

  const handleSubmit = () => {
    if (!activeZoneId) return setError('Vui lòng chọn khu vực.');
    if (!position) return setError('Vui lòng lấy vị trí hiện tại.');
    if (!photoFile) return setError('Vui lòng chụp ảnh vị trí.');
    setError(undefined);
    submit.mutate();
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Gửi đề xuất" loading={submit.isPending} onPress={handleSubmit} />
        </StickyActions>
      }
    >
      <AppHeader title="Đề xuất ô mới" back subtitle="Dành cho địa chỉ chưa có ô trong lưới" />

      <Card>
        <p className="text-body-md text-text">Vị trí hiện tại</p>
        <p className="mt-1 text-body-sm text-muted">
          {position
            ? (address.data ?? `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`)
            : 'Chưa lấy vị trí'}
        </p>
        <div className="mt-sm">
          <Button
            label={position ? 'Lấy lại vị trí' : 'Lấy vị trí hiện tại'}
            variant="outline"
            loading={locating}
            onPress={locate}
          />
        </div>
        {locateError ? <p className="mt-1 text-body-sm text-error">{locateError}</p> : null}
      </Card>

      {zones.length > 0 ? (
        <div className="flex flex-col gap-2xs">
          <label className="text-label text-text">Khu vực (chọn khu vực gần nhất)</label>
          <FilterChips
            value={String(activeZoneId)}
            onChange={(v) => setZoneId(Number(v))}
            options={zones.map((z) => ({ value: String(z.zoneId), label: z.zoneName }))}
          />
        </div>
      ) : (
        <p className="text-body-sm text-muted">Đang tải danh sách khu vực…</p>
      )}

      <div className="flex gap-sm">
        <div className="flex-1">
          <TextField
            label="Mặt tiền ước tính (m)"
            value={widthMeters}
            onChangeText={setWidthMeters}
            keyboardType="numeric"
          />
        </div>
        <div className="flex-1">
          <TextField
            label="Chiều sâu ước tính (m)"
            value={lengthMeters}
            onChangeText={setLengthMeters}
            keyboardType="numeric"
          />
        </div>
      </div>

      <PhotoPicker
        label="Ảnh vị trí"
        uri={photoUri}
        onChange={(uri, file) => {
          setPhotoUri(uri);
          setPhotoFile(file);
        }}
        onRemove={() => {
          setPhotoUri(undefined);
          setPhotoFile(undefined);
        }}
      />
      {error ? <span className="text-body-sm text-error">{error}</span> : null}
    </Screen>
  );
}
