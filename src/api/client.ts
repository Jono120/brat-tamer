import { supabase } from "../lib/supabaseClient";

/**
 * Access token for the Express API comes from the current Supabase session rather than a
 * locally-stored app JWT. supabase-js handles persistence and refresh.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function apiBase(): string {
  return import.meta.env.VITE_API_BASE ?? "";
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const body = options.body;
  if (
    body != null &&
    !(body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${apiBase()}${path}`, { ...options, headers });
  if (res.status === 401) {
    await supabase.auth.signOut();
    throw new Error("Unauthorized");
  }
  const data = await parseBody(res);
  if (!res.ok) {
    const msg =
      typeof data === "object" && data != null && "error" in data
        ? String((data as { error: string }).error)
        : typeof data === "string"
          ? data
          : res.statusText;
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  get: (path: string) => apiFetch(path, { method: "GET" }),
  post: (path: string, json?: unknown) =>
    apiFetch(path, {
      method: "POST",
      body: json !== undefined ? JSON.stringify(json) : undefined,
    }),
  patch: (path: string, json: unknown) =>
    apiFetch(path, { method: "PATCH", body: JSON.stringify(json) }),
  delete: (path: string) => apiFetch(path, { method: "DELETE" }),
};
