import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/api/client";

type UserBrief = {
  id: string;
  phone_number: string;
  first_name: string;
  email: string | null;
  status: string;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserBrief | null;
  setAuth: (tokens: { access_token: string; refresh_token: string; user: UserBrief }) => void;
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
    { name: "deliphone-auth" },
  ),
);

// Restore token on app load
const stored = useAuthStore.getState();
if (stored.accessToken) {
  api.setToken(stored.accessToken);
}
