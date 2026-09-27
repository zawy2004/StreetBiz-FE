import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Icon } from '@/components/common';
import { FilterChips, PhotoPicker, TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { EmptyState, LoadingState, showToast } from '@/components/feedback';
import { errorMessage, vendorRegistrationApi } from '@/core/api';
import { sideApi } from '@/core/api/side-api';
import { reverseGeocode } from '@/services/map/reverse-geocode';
import { useRegistrations } from '@/features/business-registrations/useRegistrations';
import { colors } from '@/theme';
import { AddressSearch } from '../components/AddressSearch';
import { Callout } from '../components/Callout';
import { LocationPicker } from '../components/LocationPicker';
import { MySlotsTabs } from '../components/MySlotsTabs';

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
  // Only a GPS fix re-centres the map; tapping it to place the pin must not move the view under the finger.
  const [viewKey, setViewKey] = useState(0);
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
        setViewKey((key) => key + 1);
        setLocating(false);
      },
      () => {
        setLocateError('Không lấy được vị trí. Hãy cho phép định vị hoặc chạm vào bản đồ để chọn.');
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

  const queryClient = useQueryClient();
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
      // The proposal appears as a new pending slot on the zone map and in My slots.
      void queryClient.invalidateQueries({ queryKey: ['side'] });
      showToast(result.message);
      navigate(-1);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  if (loadingRegistrations) return <LoadingState />;
  if (!registrationId) {
    return (
      <Screen>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-md">
          <MySlotsTabs />
          <EmptyState
            icon="file-document-outline"
            title="Cần có hồ sơ đăng ký kinh doanh"
            description="Vui lòng nộp hồ sơ đăng ký trước khi đề xuất ô mới."
            action={
              <Button
                label="Nộp hồ sơ đăng ký"
                fullWidth={false}
                onPress={() => navigate('/vendor/registrations/new/type')}
              />
            }
          />
        </div>
      </Screen>
    );
  }

  const handleSubmit = () => {
    if (!activeZoneId) return setError('Vui lòng chọn khu vực.');
    if (!position) return setError('Vui lòng chọn vị trí trên bản đồ hoặc lấy vị trí hiện tại.');
    if (!photoFile) return setError('Vui lòng chụp ảnh vị trí.');
    setError(undefined);
    submit.mutate();
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="mx-auto w-full max-w-2xl">
            <Button label="Gửi đề xuất" loading={submit.isPending} onPress={handleSubmit} />
          </div>
        </StickyActions>
      }
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-md">
        <MySlotsTabs />
        <AppHeader title="Đề xuất ô mới" back subtitle="Dành cho địa chỉ chưa có ô trong lưới" />

        <Card>
          <div className="flex flex-col gap-sm">
            <p className="flex items-center gap-xs text-headline-sm text-text">
              <Icon name="crosshairs-gps" size={20} color={colors.primary} />
              Vị trí đề xuất
            </p>
            <div className="rounded-sm bg-bg p-sm">
              <p className="text-body-md text-text">
                {!position
                  ? 'Chưa chọn vị trí'
                  : address.isPending
                    ? 'Đang tra địa chỉ…'
                    : (address.data ?? 'Không tra được địa chỉ cho vị trí này')}
              </p>
              {position && (
                <p className="mt-0.5 font-number text-body-sm text-muted">
                  {position.latitude.toFixed(6)}°, {position.longitude.toFixed(6)}°
                </p>
              )}
            </div>
            <AddressSearch
              onPick={(match) => {
                setPosition({ latitude: match.latitude, longitude: match.longitude });
                setViewKey((key) => key + 1);
              }}
            />
            <LocationPicker position={position} viewKey={viewKey} onPick={setPosition} />
            <p className="text-body-sm text-muted">Hoặc chạm vào bản đồ để đặt và chỉnh lại vị trí ô.</p>
            <Button
              label="Lấy vị trí hiện tại"
              variant="outline"
              loading={locating}
              onPress={locate}
              icon={<Icon name="crosshairs-gps" size={18} color={colors.indigo} />}
            />
            {locateError ? <Callout tone="danger">{locateError}</Callout> : null}
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-sm">
            <p className="text-headline-sm text-text">
              Khu vực <span className="text-primary">*</span>
            </p>
            {zones.length > 0 ? (
              <>
                <p className="text-body-sm text-muted">Chọn tuyến đường gần vị trí nhất</p>
                <FilterChips
                  value={String(activeZoneId)}
                  onChange={(v) => setZoneId(Number(v))}
                  options={zones.map((z) => ({ value: String(z.zoneId), label: z.zoneName }))}
                />
              </>
            ) : (
              <p className="text-body-sm text-muted">Đang tải danh sách khu vực…</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-sm">
            <p className="text-headline-sm text-text">Kích thước ước tính</p>
            <div className="flex gap-sm">
              <div className="flex-1">
                <TextField
                  label="Mặt tiền (m)"
                  value={widthMeters}
                  onChangeText={setWidthMeters}
                  keyboardType="numeric"
                  placeholder="VD: 3.5"
                />
              </div>
              <div className="flex-1">
                <TextField
                  label="Chiều sâu (m)"
                  value={lengthMeters}
                  onChangeText={setLengthMeters}
                  keyboardType="numeric"
                  placeholder="VD: 2.0"
                />
              </div>
            </div>
            <p className="text-body-sm text-muted">Không bắt buộc. Phường sẽ xác nhận kích thước khi khảo sát.</p>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-sm">
            <p className="flex items-center justify-between text-headline-sm text-text">
              <span>
                Ảnh vị trí <span className="text-primary">*</span>
              </span>
              <span className="rounded-full bg-tint-primary px-xs text-badge uppercase text-primary">Bắt buộc</span>
            </p>
            <p className="text-body-sm text-muted">Chụp rõ vỉa hè và mặt tiền nhà liền kề (JPG, PNG hoặc WEBP, tối đa 5 MB).</p>
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
          </div>
        </Card>

        {error ? <Callout tone="danger">{error}</Callout> : null}
        <Callout tone="neutral">Phường sẽ xem xét và khảo sát vị trí bạn đề xuất trước khi thêm vào lưới ô.</Callout>
      </div>
    </Screen>
  );
}
