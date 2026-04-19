import { create } from "zustand";

type OperatorState = {
  ready: boolean;
  setReady: (v: boolean) => void;
};

export const useOperatorStore = create<OperatorState>((set) => ({
  ready: false,
  setReady: (v) => set({ ready: v }),
}));
