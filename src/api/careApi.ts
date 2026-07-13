import { api } from "./client";
import type {
  Feedback,
  FriendProfile,
  Group,
  Interaction,
  StickerLog,
  Task,
  UserProfile,
} from "../types";

export type SessionUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export type MeResponse = {
  user: SessionUser;
  profile: UserProfile;
};

export type AdminLogsResponse = {
  logs: StickerLog[];
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type AdminFeedbackResponse = {
  feedback: Feedback[];
  limit: number;
  offset: number;
  hasMore: boolean;
};

export const careApi = {
  me: () => api.get("/api/me") as Promise<MeResponse>,
  patchProfile: (
    body: Partial<{
      displayName: string;
      photoURL: string;
      theme: string;
      hasCompletedOnboarding: boolean;
    }>,
  ) => api.patch("/api/profile", body) as Promise<{ profile: UserProfile }>,

  friends: () => api.get("/api/friends") as Promise<FriendProfile[]>,

  tasksMine: () => api.get("/api/tasks/mine") as Promise<Task[]>,
  tasksGlobal: () => api.get("/api/tasks/global") as Promise<Task[]>,
  createTask: (body: Parameters<typeof buildTaskBody>[0]) =>
    api.post("/api/tasks", buildTaskBody(body)) as Promise<Task>,
  updateTask: (id: string, body: Partial<TaskBody>) =>
    api.patch(`/api/tasks/${id}`, body) as Promise<Task>,
  deleteTask: (id: string) =>
    api.delete(`/api/tasks/${id}`) as Promise<{ ok: boolean }>,

  logsMine: (date?: string) =>
    (date
      ? api.get(`/api/logs/mine?date=${encodeURIComponent(date)}`)
      : api.get("/api/logs/mine")) as Promise<StickerLog[]>,
  createLog: (body: {
    taskId: string;
    date: string;
    earnedAt: string;
    count?: number;
    note?: string;
  }) => api.post("/api/logs", body) as Promise<StickerLog>,
  updateLog: (
    id: string,
    body: { count?: number; earnedAt?: string; note?: string },
  ) => api.patch(`/api/logs/${id}`, body) as Promise<StickerLog>,
  deleteLog: (id: string) =>
    api.delete(`/api/logs/${id}`) as Promise<{ ok: boolean }>,

  interactionsInbox: () =>
    api.get("/api/interactions/inbox") as Promise<Interaction[]>,
  createInteraction: (body: {
    toUserId: string;
    type: string;
    content?: string;
    timestamp: string;
  }) => api.post("/api/interactions", body) as Promise<Interaction>,
  markInteractionRead: (id: string) =>
    api.patch(`/api/interactions/${id}/read`, {}) as Promise<Interaction>,
  markInboxRead: () =>
    api.post("/api/interactions/inbox/mark-read", {}) as Promise<{ ok: boolean }>,

  group: (id: string) => api.get(`/api/groups/${id}`) as Promise<Group>,
  createGroup: (name: string) =>
    api.post("/api/groups", { name }) as Promise<Group>,
  joinGroup: (code: string) =>
    api.post("/api/groups/join", { code }) as Promise<{
      group: Group;
      alreadyMember?: boolean;
    }>,

  createInvite: () => api.post("/api/invites", {}) as Promise<{ id: string }>,
  getInvite: (id: string) =>
    api.get(`/api/invites/${id}`) as Promise<{
      valid: boolean;
      inviterId?: string;
      used?: boolean;
    }>,
  acceptInvite: (id: string) =>
    api.post(`/api/invites/${id}/accept`, {}) as Promise<{ ok: boolean }>,

  submitFeedback: (content: string, type: "feature" | "issue") =>
    api.post("/api/feedback", { content, type }) as Promise<{ ok: boolean }>,

  registerPushToken: (token: string, platform: "ios" | "android" | "web") =>
    api.post("/api/push/register", { token, platform }) as Promise<{
      ok: boolean;
    }>,
  unregisterPushToken: (token: string) =>
    api.delete("/api/push/register", { token }) as Promise<{ ok: boolean }>,

  adminUsers: () => api.get("/api/admin/users") as Promise<UserProfile[]>,
  adminLogs: (params?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    const qs = q.toString();
    return api.get(
      `/api/admin/logs${qs ? `?${qs}` : ""}`,
    ) as Promise<AdminLogsResponse>;
  },
  adminFeedback: (params?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    const qs = q.toString();
    return api.get(
      `/api/admin/feedback${qs ? `?${qs}` : ""}`,
    ) as Promise<AdminFeedbackResponse>;
  },
  reviewFeedback: (id: string) =>
    api.patch(`/api/admin/feedback/${id}`, {}) as Promise<Feedback>,
  setDailyChallenge: (taskId: string) =>
    api.post(`/api/admin/tasks/${taskId}/daily-challenge`, {}) as Promise<Task>,
};

type TaskBody = {
  title: string;
  icon: string;
  frequency: "daily" | "weekly";
  isGlobal?: boolean;
  isDailyChallenge?: boolean;
  description?: string;
  targetCount?: number;
  requiresNote?: boolean;
};

function buildTaskBody(b: {
  title: string;
  icon: string;
  frequency: "daily" | "weekly";
  isGlobal?: boolean;
  isDailyChallenge?: boolean;
  description?: string;
  targetCount?: number;
  requiresNote?: boolean;
}): TaskBody {
  return {
    title: b.title,
    icon: b.icon,
    frequency: b.frequency,
    isGlobal: b.isGlobal,
    isDailyChallenge: b.isDailyChallenge,
    description: b.description,
    targetCount: b.targetCount,
    requiresNote: b.requiresNote,
  };
}
