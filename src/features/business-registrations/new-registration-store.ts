import { create } from 'zustand';

import type { EvidenceFile, VendorType } from '@/mocks/types';

type Draft = {
  vendorType: VendorType;
  businessName: string;
  ownerName: string;
  idNumber: string;
  address: string;
  evidence: EvidenceFile[];
};

type NewRegistrationState = Draft & {
  setField: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  addEvidence: (file: EvidenceFile) => void;
  removeEvidence: (uri: string) => void;
  reset: () => void;
};

const initial: Draft = {
  vendorType: 'ITINERANT',
  businessName: '',
  ownerName: '',
  idNumber: '',
  address: '',
  evidence: [],
};

/** Holds in-progress REG-01/02 form state across the multi-step wizard routes. */
export const useNewRegistrationStore = create<NewRegistrationState>((set) => ({
  ...initial,
  setField: (key, value) => set({ [key]: value } as Partial<Draft>),
  addEvidence: (file) => set((s) => ({ evidence: [...s.evidence, file] })),
  removeEvidence: (uri) => set((s) => ({ evidence: s.evidence.filter((e) => e.uri !== uri) })),
  reset: () => set(initial),
}));
