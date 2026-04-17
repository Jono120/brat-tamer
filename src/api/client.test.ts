import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, setToken, getToken, api } from "./client";

describe("api client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getToken / setToken round-trip", () => {
    expect(getToken()).toBeNull();
    setToken("tok");
    expect(getToken()).toBe("tok");
    setToken(null);
    expect(getToken()).toBeNull();
  });

  it("apiFetch sends Authorization when a token is stored", async () => {
    setToken("jwt-token");
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

  it("clears token on 401", async () => {
    setToken("bad");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "",
    });

    await expect(api.get("/api/me")).rejects.toThrow(/Unauthorized/);
    expect(getToken()).toBeNull();
  });

  it("throws with server error body", async () => {
    setToken("ok");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: "Bad input" }),
    });

    await expect(api.post("/api/x", {})).rejects.toThrow(/Bad input/);
  });
});
