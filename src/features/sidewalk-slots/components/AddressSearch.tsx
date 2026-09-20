import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { TextField } from '@/components/forms';
import { colors } from '@/theme';
import { searchAddress, type AddressMatch } from '@/services/map/forward-geocode';

type Props = { onPick: (match: AddressMatch) => void };

/** Type an address, pick one of the matches, and the pin moves there. */
export function AddressSearch({ onPick }: Props) {
  const [text, setText] = useState('');
  const search = useMutation({ mutationFn: (query: string) => searchAddress(query) });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (text.trim()) search.mutate(text);
  };

  return (
    <div className="flex flex-col gap-xs">
      <form onSubmit={submit} className="flex items-start gap-xs">
        <div className="flex-1">
          <TextField value={text} onChangeText={setText} placeholder="Nhập địa chỉ, VD: 14 Phan Thanh" maxLength={120} />
        </div>
        <Button
          type="submit"
          label="Tìm"
          fullWidth={false}
          loading={search.isPending}
          disabled={!text.trim()}
          icon={<Icon name="magnify" size={18} color={colors.onPrimary} />}
        />
      </form>
      {search.isError && <p className="text-body-sm text-error">Không tìm được địa chỉ lúc này. Thử lại sau.</p>}
      {search.isSuccess && search.data.length === 0 && (
        <p className="text-body-sm text-muted">Không thấy địa chỉ này ở Đà Nẵng. Thử ghi ngắn hơn, hoặc chạm vào bản đồ.</p>
      )}
      {search.isSuccess && search.data.length > 0 && (
        <ul className="flex flex-col overflow-hidden rounded-sm border border-border">
          {search.data.map((match) => (
            <li key={`${match.latitude},${match.longitude}`} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => {
                  onPick(match);
                  search.reset();
                }}
                className="flex w-full items-start gap-xs p-sm text-left text-body-md text-text hover:bg-bg"
              >
                <Icon name="map-marker-outline" size={18} color={colors.muted} className="mt-0.5 shrink-0" />
                {match.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
