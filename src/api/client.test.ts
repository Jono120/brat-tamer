import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Token now comes from the Supabase session, not localStorage.
const { getSession, signOut } = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("../lib/supabaseClient", () => ({
  supabase: { auth: { getSession, signOut } },
}));

import { apiFetch, api, getAccessToken } from "./client";

describe("api client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    getSession.mockReset();
    signOut.mockReset();
    getSession.mockResolvedValue({
      data: { session: { access_token: "jwt-token" } },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getAccessToken returns the session access token", async () => {
    expect(await getAccessToken()).toBe("jwt-token");
    getSession.mockResolvedValueOnce({ data: { session: null } });
    expect(await getAccessToken()).toBeNull();
  });

  it("apiFetch sends Authorization from the Supabase session", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"user":"u"}',
    });

    await api.get("/api/me");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer jwt-token");
  });

  it("signs out on 401", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "",
    });

    await expect(api.get("/api/me")).rejects.toThrow(/Unauthorized/);
    expect(signOut).toHaveBeenCalled();
  });

  it("throws with server error body", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: "Bad input" }),
    });

    await expect(api.post("/api/x", {})).rejects.toThrow(/Bad input/);
  });

  it("apiFetch is exported", () => {
    expect(typeof apiFetch).toBe("function");
  });
});
