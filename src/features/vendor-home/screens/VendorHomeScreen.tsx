import { useEffect, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Screen } from '@/components/layout';
import { sideApi } from '@/core/api/side-api';
import { isLiveApi } from '@/core/config/env';
import { useRegistrations } from '@/features/business-registrations/useRegistrations';
import { useFeeItems, usePenalties } from '@/features/fee-schedules/useFinance';
import { hkdCode } from '@/features/sidewalk-slots/slot-format';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import {
  HoldLine,
  HomeGreeting,
  RegisterPath,
  ShortcutTiles,
  TodayBoard,
} from '../components/HomeParts';
import { PermitPass, PermitPassSkeleton, type PermitCard } from '../components/PermitPass';
import { buildTodos } from '../todos';

/**
 * Vendor home: "the board at the counter at dawn". How many things are waiting
 * and how much to pay (TodayBoard), the permit as a pass with its days left,
 * any slot hold counting down, and four way-finding tiles.
 */
export function VendorHomeScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  // Shared with the registrations list/detail screens, so this stays correct
  // against StreetBiz-BE instead of always reporting "no registration yet".
  const { registrations, isLoading: registrationsLoading } = useRegistrations();
  // Unfiltered, so they share their cache with FinanceHomeScreen; both hooks
  // already switch between StreetBiz-BE and the mock store.
  const { feeItems, isLoading: feesLoading } = useFeeItems();
  const { penalties, isLoading: penaltiesLoading } = usePenalties();
  const { card: permit, loading: permitLoading } = useCurrentPermit();
  const holds = useCachedHolds(
    user?.id,
    registrations.find((r) => r.registrationStatus === 'APPROVED')?.registrationId,
  );
  const online = useOnline();

  const todos = buildTodos(registrations, feeItems, penalties);

  const latest = registrations.reduce<(typeof registrations)[number] | null>(
    (acc, r) => (!acc || Date.parse(r.createdAt) > Date.parse(acc.createdAt) ? r : acc),
    null,
  );
  const approved = registrations.find((r) => r.registrationStatus === 'APPROVED');
  const hkdSource = approved ?? latest;

  const showPassCell = permitLoading || permit !== null || holds.length > 0;

  return (
    <Screen width="wide">
      <HomeGreeting
        fullName={user?.fullName ?? ''}
        hkd={hkdSource ? hkdCode(hkdSource.registrationId) : null}
        latestStatus={latest?.registrationStatus ?? null}
        loading={registrationsLoading}
      />

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-lg">
          <TodayBoard
            todos={todos}
            loading={registrationsLoading || feesLoading || penaltiesLoading}
            onOpen={(path) => navigate(path)}
          />

          {!registrationsLoading && registrations.length === 0 ? (
            <RegisterPath onStart={() => navigate('/vendor/registrations/new/type')} />
          ) : null}
        </div>

        <div
          className={`grid min-w-0 items-start gap-lg xl:sticky xl:top-0 xl:grid-cols-1 ${
            showPassCell ? 'md:grid-cols-2' : ''
          }`}
        >
          {showPassCell ? (
            <div className="flex min-w-0 flex-col gap-sm">
              {permit ? (
                <PermitPass
                  card={permit}
                  online={online}
                  onOpen={() => navigate(`/vendor/slots/contracts/${permit.contractId}/permit`)}
                />
              ) : permitLoading ? (
                <PermitPassSkeleton />
              ) : null}
              {holds.length > 0 ? (
                <HoldLine holds={holds} onOpen={() => navigate('/vendor/slots')} />
              ) : null}
            </div>
          ) : null}

          <ShortcutTiles onOpen={(path) => navigate(path)} />
        </div>
      </div>

      {/* Room for the floating assistant button so it never covers the last tiles on a phone. */}
      <div aria-hidden="true" className="h-16 md:hidden" />
    </Screen>
  );
}

/**
 * The permit of the vendor's first ACTIVE contract that has one (a just-approved
 * contract can be ACTIVE before its permit is issued). Live, it uses the same
 * query keys as ContractsListScreen and DigitalPermitScreen, so opening the
 * permit from here reuses the cache.
 */
function useCurrentPermit(): { card: PermitCard | null; loading: boolean } {
  const user = useAuthStore((s) => s.user);

  const contracts = useQuery({
    queryKey: ['side', user?.id, 'contracts'],
    queryFn: () => sideApi.listContracts(),
    enabled: isLiveApi,
  });
  const active = (contracts.data ?? []).filter((c) => c.contractStatus === 'ACTIVE');
  const permits = useQueries({
    queries: active.map((contract) => ({
      queryKey: ['side', user?.id, 'permit', contract.contractId],
      queryFn: () => sideApi.getPermit(contract.contractId),
      enabled: isLiveApi,
      retry: false,
    })),
  });
  const withPermit = active
    .map((contract, i) => ({
      contract,
      permit: permits[i]?.data,
      fetchedAt: permits[i]?.dataUpdatedAt,
    }))
    .find((row) => row.permit);

  const mockContracts = useMockDb((s) => s.contracts).filter(
    (c) => c.vendorId === user?.vendorId && c.contract_status === 'ACTIVE',
  );
  const mockPermit = useMockDb((s) => s.permits).find((p) =>
    mockContracts.some((c) => c.id === p.contractId),
  );
  const mockSlots = useMockDb((s) => s.slots);

  if (!isLiveApi) {
    if (!mockPermit) return { card: null, loading: false };
    const contract = mockContracts.find((c) => c.id === mockPermit.contractId);
    const slot = contract ? mockSlots.find((s) => s.id === contract.slotId) : undefined;
    return {
      card: {
        contractId: mockPermit.contractId,
        label: mockPermit.permit_code,
        status: mockPermit.permit_status,
        slotCode: slot?.slot_code ?? null,
        zoneName: slot?.street ?? null,
        startDate: contract?.start_date ?? null,
        endDate: mockPermit.expires_at ?? null,
        fetchedAt: null,
      },
      loading: false,
    };
  }

  const loading = contracts.isLoading || permits.some((q) => q.isLoading);
  return {
    card: withPermit?.permit
      ? {
          contractId: withPermit.contract.contractId,
          label: `Ô ${withPermit.contract.slotCode}`,
          status: withPermit.permit.effectiveStatus,
          slotCode: withPermit.contract.slotCode,
          zoneName: withPermit.contract.zoneName,
          startDate: withPermit.permit.startDate,
          endDate: withPermit.permit.endDate,
          fetchedAt: withPermit.fetchedAt || null,
        }
      : null,
    loading,
  };
}

/**
 * The slot holds VendorTopBar already keeps (same key as `useHolds`). Read with
 * `enabled: false`, so the home screen never sends a holds request of its own.
 */
function useCachedHolds(userId: string | undefined, registrationId: number | undefined) {
  const query = useQuery({
    queryKey: ['side', userId, 'holds', registrationId],
    queryFn: () => sideApi.listHolds(registrationId!),
    enabled: false,
  });
  return query.data ?? [];
}

function useOnline() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
