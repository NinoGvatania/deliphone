import { getAdminToken, clearAdminAuth } from "@/stores/auth";

const BASE = "/api/v1/admin";

export async function api<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    clearAdminAuth();
    window.location.href = "/auth";
    throw new Error("Сессия истекла");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body.detail;
    const msg = typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ")
        : `Ошибка ${res.status}`;
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

/** Raw fetch without /admin prefix — for auth endpoints */
export async function authFetch<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/v1/admin${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(typeof data.detail === "string" ? data.detail : `Ошибка ${res.status}`);
  }
  return res.json() as Promise<T>;
}
