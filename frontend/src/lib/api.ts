/**
 * frontend/src/lib/api.ts
 *
 * Typed API Client for frontend communication with Express backend.
 */

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || "").replace(/\/$/, "");

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("auth_token") || "";
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${cleanPath}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = body?.error?.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return (body.data !== undefined ? body.data : body) as T;
}
