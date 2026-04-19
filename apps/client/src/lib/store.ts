import { create } from "zustand";

/** Placeholder global store — auth, rental state land here in later phases. */
type AppState = {
  ready: boolean;
  setReady: (v: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  ready: false,
  setReady: (v) => set({ ready: v }),
}));
