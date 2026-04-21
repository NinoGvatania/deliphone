const BASE = "/api/v1/admin";
const STORAGE_KEY = "deliphone-admin-auth";

function getToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw)?.token : null;
  } catch { return null; }
}

export async function api<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    // Token expired — clear and redirect to login
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = "/auth";
    throw new Error("Сессия истекла, войдите заново");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = typeof body.detail === "string" ? body.detail : `API ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}
