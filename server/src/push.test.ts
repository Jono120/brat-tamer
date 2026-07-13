import { describe, it, expect, afterEach } from "vitest";
import { pushIsConfigured, validatePushRegistration } from "./push.js";

describe("validatePushRegistration", () => {
  it("requires a non-empty token", () => {
    expect(validatePushRegistration("", "ios")?.status).toBe(400);
    expect(validatePushRegistration("   ", "ios")?.status).toBe(400);
    expect(validatePushRegistration(undefined, "ios")?.status).toBe(400);
    expect(validatePushRegistration(42, "ios")?.status).toBe(400);
  });

  it("rejects overly long tokens", () => {
    expect(validatePushRegistration("a".repeat(4097), "ios")?.status).toBe(400);
  });

  it("requires a known platform", () => {
    expect(validatePushRegistration("tok", "windows")?.error).toMatch(
      /platform/i,
    );
    expect(validatePushRegistration("tok", undefined)?.status).toBe(400);
  });

  it("accepts valid registrations", () => {
    expect(validatePushRegistration("tok", "ios")).toBeNull();
    expect(validatePushRegistration("tok", "android")).toBeNull();
    expect(validatePushRegistration("tok", "web")).toBeNull();
  });
});

describe("pushIsConfigured", () => {
  const original = process.env.FCM_SERVICE_ACCOUNT_JSON;

  afterEach(() => {
    if (original === undefined) delete process.env.FCM_SERVICE_ACCOUNT_JSON;
    else process.env.FCM_SERVICE_ACCOUNT_JSON = original;
  });

  it("is false when the env var is unset", () => {
    delete process.env.FCM_SERVICE_ACCOUNT_JSON;
    expect(pushIsConfigured()).toBe(false);
  });

  it("is false for invalid or incomplete JSON", () => {
    process.env.FCM_SERVICE_ACCOUNT_JSON = "not-json";
    expect(pushIsConfigured()).toBe(false);
    process.env.FCM_SERVICE_ACCOUNT_JSON = JSON.stringify({
      project_id: "demo",
    });
    expect(pushIsConfigured()).toBe(false);
  });

  it("is true for a complete service account", () => {
    process.env.FCM_SERVICE_ACCOUNT_JSON = JSON.stringify({
      project_id: "demo",
      client_email: "svc@demo.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
    });
    expect(pushIsConfigured()).toBe(true);
  });
});
