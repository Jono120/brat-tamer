import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildAllowedCorsOrigins } from "./corsConfig.js";

const KEYS = [
  "FRONTEND_URL",
  "CORS_ORIGINS",
  "ALLOW_CAPACITOR_ORIGINS",
] as const;

describe("buildAllowedCorsOrigins", () => {
  const snapshot: Partial<Record<(typeof KEYS)[number], string | undefined>> =
    {};

  beforeEach(() => {
    for (const k of KEYS) {
      snapshot[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of KEYS) {
      const v = snapshot[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("includes default localhost and Capacitor origins by default", () => {
    const set = buildAllowedCorsOrigins();
    expect(set.has("http://localhost:3000")).toBe(true);
    expect(set.has("capacitor://localhost")).toBe(true);
    expect(set.has("https://localhost")).toBe(true);
  });

  it("splits comma-separated FRONTEND_URL", () => {
    process.env.FRONTEND_URL = "https://a.com, https://b.com";
    const set = buildAllowedCorsOrigins();
    expect(set.has("https://a.com")).toBe(true);
    expect(set.has("https://b.com")).toBe(true);
  });

  it("merges CORS_ORIGINS", () => {
    process.env.FRONTEND_URL = "https://app.com";
    process.env.CORS_ORIGINS = "https://preview.net";
    const set = buildAllowedCorsOrigins();
    expect(set.has("https://app.com")).toBe(true);
    expect(set.has("https://preview.net")).toBe(true);
  });

  it("can disable Capacitor origins", () => {
    process.env.ALLOW_CAPACITOR_ORIGINS = "false";
    const set = buildAllowedCorsOrigins();
    expect(set.has("capacitor://localhost")).toBe(false);
  });
});
