import { describe, it, expect } from "vitest";
import {
  mapGroupRow,
  mapInteractionRow,
  mapLogRow,
  mapTaskRow,
  mapUserRow,
} from "./mappers.js";

describe("mappers", () => {
  it("mapUserRow maps snake_case row and friends", () => {
    const row = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "a@b.com",
      display_name: "Alex",
      photo_url: "https://x/y",
      role: "user",
      theme: "dark",
      group_id: null,
      has_completed_onboarding: true,
    };
    const out = mapUserRow(row, ["friend-1"]);
    expect(out.uid).toBe(row.id);
    expect(out.email).toBe("a@b.com");
    expect(out.displayName).toBe("Alex");
    expect(out.friends).toEqual(["friend-1"]);
    expect(out.theme).toBe("dark");
    expect(out.hasCompletedOnboarding).toBe(true);
  });

  it("mapTaskRow maps task fields", () => {
    const row = {
      id: "t1",
      user_id: "u1",
      title: "Run",
      icon: "zap",
      frequency: "weekly",
      color: null,
      created_at: "2026-01-01T12:00:00.000Z",
      is_global: true,
      is_daily_challenge: false,
      description: "desc",
      target_count: 3,
    };
    const out = mapTaskRow(row);
    expect(out.id).toBe("t1");
    expect(out.userId).toBe("u1");
    expect(out.frequency).toBe("weekly");
    expect(out.isGlobal).toBe(true);
    expect(out.targetCount).toBe(3);
    expect(out.createdAt).toMatch(/2026-01-01/);
  });

  it("mapLogRow handles date string", () => {
    const row = {
      id: "l1",
      user_id: "u1",
      task_id: "t1",
      date: "2026-04-01",
      earned_at: "2026-04-01T10:00:00.000Z",
      count: 2,
    };
    const out = mapLogRow(row);
    expect(out.date).toBe("2026-04-01");
    expect(out.count).toBe(2);
  });

  it("mapInteractionRow maps interaction", () => {
    const row = {
      id: "i1",
      from_user_id: "a",
      to_user_id: "b",
      type: "high-five",
      content: null,
      timestamp: "2026-01-01T00:00:00.000Z",
      read: false,
    };
    const out = mapInteractionRow(row);
    expect(out.type).toBe("high-five");
    expect(out.read).toBe(false);
  });

  it("mapGroupRow maps members array", () => {
    const row = {
      id: "g1",
      name: "Team",
      admin_id: "a1",
      members: ["a1", "b2"],
      invite_code: "ABCDEF",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const out = mapGroupRow(row);
    expect(out.members).toEqual(["a1", "b2"]);
    expect(out.inviteCode).toBe("ABCDEF");
  });
});
