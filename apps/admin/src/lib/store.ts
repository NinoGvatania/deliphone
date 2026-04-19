import { create } from "zustand";

type AdminState = {
  ready: boolean;
  setReady: (v: boolean) => void;
};

export const useAdminStore = create<AdminState>((set) => ({
  ready: false,
  setReady: (v) => set({ ready: v }),
}));
