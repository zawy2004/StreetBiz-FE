import { create } from 'zustand';

type ToastState = {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  hide: () => set({ message: null }),
}));

export function showToast(message: string) {
  useToastStore.getState().show(message);
}
