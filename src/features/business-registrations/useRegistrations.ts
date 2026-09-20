import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  vendorRegistrationApi,
  type ApiEvidence,
  type ApiEvidenceType,
  type ApiRegistration,
} from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import type { BusinessRegistration } from '@/mocks/types';

export const REGISTRATIONS_KEY = ['vendor', 'registrations'];

/** Presents a mock registration in the shape the screens now read. */
function fromMock(r: BusinessRegistration): ApiRegistration {
  return {
    registrationId: Number(r.id.replace(/\D/g, '')) || 0,
    vendorType: r.vendor_type,
    displayName: r.business_name,
    declaredAddress: r.address,
    addressLatitude: null,
    addressLongitude: null,
    wardUnitId: 10,
    // The mock seed predates the backend's status set; PENDING is its SUBMITTED.
    registrationStatus: (r.registration_status === 'PENDING'
      ? 'SUBMITTED'
      : r.registration_status) as ApiRegistration['registrationStatus'],
    fastTrackFlag: r.fast_track,
    reviewDecisionReason: r.review_note ?? null,
    reviewedAt: null,
    createdAt: r.submitted_at,
    updatedAt: null,
    // The mock seed predates the Mẫu số 01 (Thông tư 68/2025/TT-BTC) field set -- demo mode
    // shows these as not-yet-filled rather than inventing plausible-looking fake values.
    ownerDateOfBirth: null,
    ownerGender: null,
    ownerEthnicity: null,
    ownerNationality: null,
    idType: null,
    idIssuedDate: null,
    idIssuedPlace: null,
    permanentAddress: null,
    contactAddress: null,
    businessLine: null,
    businessLineCode: null,
    capitalAmount: null,
    laborCount: null,
    plannedStartDate: null,
    foodSafetyCommitmentAt: null,
    identityVerifiedAt: null,
    identityVerificationNote: null,
    householdMembers: [],
  };
}

function useMockRegistrations() {
  const user = useAuthStore((s) => s.user);
  const all = useMockDb((s) => s.registrations);
  return all.filter((r) => r.vendorId === user?.vendorId);
}

/** REG-03: the caller's registrations. */
export function useRegistrations() {
  const mock = useMockRegistrations();

  const query = useQuery({
    queryKey: REGISTRATIONS_KEY,
    queryFn: () => vendorRegistrationApi.list(),
    enabled: isLiveApi,
  });

  return {
    registrations: isLiveApi ? (query.data ?? []) : mock.map(fromMock),
    isLoading: isLiveApi && query.isLoading,
    isError: isLiveApi && query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** REG-03 detail: one registration and the evidence attached to it. */
export function useRegistrationDetail(registrationId: number) {
  const mock = useMockRegistrations();

  const query = useQuery({
    queryKey: [...REGISTRATIONS_KEY, registrationId],
    queryFn: () => vendorRegistrationApi.get(registrationId),
    enabled: isLiveApi && Number.isFinite(registrationId),
  });

  if (!isLiveApi) {
    const found = mock.find((r) => fromMock(r).registrationId === registrationId);
    const evidence: ApiEvidence[] =
      found?.evidence.map((e, index) => ({
        evidenceId: index,
        registrationId,
        evidenceType: e.type as ApiEvidenceType,
        fileUrl: e.uri,
        uploadedAt: found.submitted_at,
      })) ?? [];
    return {
      registration: found ? fromMock(found) : undefined,
      evidence,
      isLoading: false,
      isError: false,
      error: null,
      refetch: query.refetch,
    };
  }

  return {
    registration: query.data?.registration,
    evidence: query.data?.evidence ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** REG-05 */
export function useWithdrawRegistration() {
  const queryClient = useQueryClient();
  const mock = useMockRegistrations();
  const withdrawMock = useMockDb((s) => s.withdrawRegistration);

  return useMutation({
    mutationFn: async (registrationId: number) => {
      if (isLiveApi) return vendorRegistrationApi.withdraw(registrationId);
      const found = mock.find((r) => fromMock(r).registrationId === registrationId);
      if (found) withdrawMock(found.id);
      return { message: 'ok' };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REGISTRATIONS_KEY }),
  });
}
