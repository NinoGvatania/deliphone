import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/api/client";

type PartnerUser = {
  id: string;
  email: string;
  company_name: string | null;
  point_name: string | null;
  operator_name: string | null;
  role: string;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: PartnerUser | null;
  setAuth: (tokens: { access_token: string; refresh_token: string; user: PartnerUser }) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: ({ access_token, refresh_token, user }) => {
        api.setToken(access_token);
        set({ accessToken: access_token, refreshToken: refresh_token, user });
      },
      logout: () => {
        api.setToken(null);
        set({ accessToken: null, refreshToken: null, user: null });
      },
      isAuthenticated: () => !!get().accessToken,
    }),
    { name: "deliphone-partner-auth" },
  ),
);

const stored = useAuthStore.getState();
if (stored.accessToken) {
  api.setToken(stored.accessToken);
}
