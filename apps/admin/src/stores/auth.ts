/**
 * Admin auth store — single source of truth.
 * Token + user persisted in localStorage, read by api.ts.
 */

const STORAGE_KEY = "deliphone-admin-auth";

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

type Stored = { token: string; user: AdminUser };

function load(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAdminToken(): string | null {
  return load()?.token ?? null;
}

export function getAdminUser(): AdminUser | null {
  return load()?.user ?? null;
}

export function isAdminAuthenticated(): boolean {
  return !!load()?.token;
}

export function setAdminAuth(token: string, user: AdminUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
}

export function clearAdminAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}
