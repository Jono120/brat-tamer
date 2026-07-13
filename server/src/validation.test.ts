import { describe, it, expect } from "vitest";
import { generateGroupInviteCode } from "./authz.js";
import {
  validateDisplayName,
  validateFeedback,
  validateTheme,
} from "./validation.js";

describe("generateGroupInviteCode", () => {
  it("returns 12 uppercase hex characters", () => {
    const code = generateGroupInviteCode();
    expect(code).toMatch(/^[0-9A-F]{12}$/);
  });
});

describe("validateDisplayName", () => {
  it("rejects empty names", () => {
    expect(validateDisplayName("   ")?.error).toMatch(/required/i);
  });

  it("rejects overly long names", () => {
    expect(validateDisplayName("a".repeat(101))?.status).toBe(400);
  });
});

describe("validateTheme", () => {
  it("accepts light and dark", () => {
    expect(validateTheme("light")).toBeNull();
    expect(validateTheme("dark")).toBeNull();
  });

  it("rejects invalid themes", () => {
    expect(validateTheme("sepia")?.status).toBe(400);
  });
});

describe("validateFeedback", () => {
  it("requires content and valid type", () => {
    expect(validateFeedback("", "feature")?.status).toBe(400);
    expect(validateFeedback("hello", "other")?.status).toBe(400);
  });

  it("accepts valid feedback", () => {
    expect(validateFeedback("Nice app", "issue")).toBeNull();
  });
});
