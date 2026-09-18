import { useState, type ReactNode } from 'react';
import { Button, Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { decodeVendorToken, useVendorApiSession } from '@/core/api/side-api';

/**
 * Gates a screen behind a real backend JWT for the Sidewalk Slot & Rental API
 * (SIDE-01..13). Sign-in is still the mock flow (src/store/auth-store.ts),
 * so there is no real token to attach automatically yet -- paste one here
 * (from POST /api/auth/login, e.g. via Swagger) to call the real backend.
 * Mirrors src/features/ward-administration/components/WardConnection.tsx.
 */
export function VendorConnection({ children }: { children: ReactNode }) {
  const { token, connect, disconnect } = useVendorApiSession();
  const [input, setInput] = useState('');

  if (!token) {
    return (
      <Screen>
        <AppHeader title="Kết nối tài khoản Backend" back subtitle="SIDE-01 … SIDE-13" />
        <Card>
          <p className="mb-md text-body-md">
            Dán access token thật (lấy từ <code>POST /api/auth/login</code>, ví dụ qua Swagger)
            để gọi Backend thật cho các màn ô vỉa hè / hợp đồng.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = input.trim();
              if (trimmed) {
                connect(trimmed);
                setInput('');
              }
            }}
            className="flex flex-col gap-md"
          >
            <label>
              Access token
              <input
                type="password"
                autoComplete="off"
                className="mt-xs w-full rounded-sm border border-border p-sm"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                required
              />
            </label>
            <Button type="submit" label="Kết nối" disabled={!input.trim()} />
          </form>
        </Card>
      </Screen>
    );
  }

  const claims = decodeVendorToken(token);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-sm border-b border-border bg-card px-md py-xs">
        <span className="text-body-sm">{claims ? `${claims.phone} · ${claims.role}` : 'Đã kết nối'}</span>
        <button className="text-body-sm text-indigo" onClick={disconnect}>
          Ngắt kết nối
        </button>
      </div>
      {children}
    </div>
  );
}
