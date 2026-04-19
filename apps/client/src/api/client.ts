/**
 * API client — thin wrapper over fetch for the Deliphone backend.
 */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

type RequestOptions = {
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
};

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, params, headers = {} } = options;

    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams(params);
      url += `?${qs.toString()}`;
    }

    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };
    if (this.token) {
      reqHeaders["Authorization"] = `Bearer ${this.token}`;
    }

    const resp = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!resp.ok) {
      const error = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new ApiError(resp.status, error.detail || "Unknown error");
    }

    if (resp.status === 204) return undefined as T;
    return resp.json();
  }

  get<T = unknown>(path: string, params?: Record<string, string>) {
    return this.request<T>(path, { params });
  }

  post<T = unknown>(path: string, body?: unknown, params?: Record<string, string>) {
    return this.request<T>(path, { method: "POST", body, params });
  }

  delete<T = unknown>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const api = new ApiClient(API_BASE);
