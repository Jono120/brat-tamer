import { api } from "./client";
import type {
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

export const careApi = {
  // Identity is owned by Supabase Auth; `me` hydrates the profile for the current session.
  me: () => api.get("/api/me") as Promise<MeResponse>,
  patchProfile: (
    body: Partial<{
      displayName: string;
      photoURL: string;
      theme: string;
      hasCompletedOnboarding: boolean;
    }>,
  ) => api.patch("/api/profile", body) as Promise<{ profile: UserProfile }>,

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
  }) => api.post("/api/logs", body) as Promise<StickerLog>,
  updateLog: (id: string, body: { count?: number; earnedAt?: string }) =>
    api.patch(`/api/logs/${id}`, body) as Promise<StickerLog>,
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
    api.get(`/api/invites/${id}`) as Promise<{ inviterId: string }>,
  acceptInvite: (id: string) =>
    api.post(`/api/invites/${id}/accept`, {}) as Promise<{ ok: boolean }>,

  submitFeedback: (content: string, type: "feature" | "issue") =>
    api.post("/api/feedback", { content, type }) as Promise<{ ok: boolean }>,

  adminUsers: () => api.get("/api/admin/users") as Promise<UserProfile[]>,
  adminLogs: () => api.get("/api/admin/logs") as Promise<StickerLog[]>,
};

type TaskBody = {
  title: string;
  icon: string;
  frequency: "daily" | "weekly";
  isGlobal?: boolean;
  isDailyChallenge?: boolean;
  description?: string;
  targetCount?: number;
};

function buildTaskBody(b: {
  title: string;
  icon: string;
  frequency: "daily" | "weekly";
  isGlobal?: boolean;
  isDailyChallenge?: boolean;
  description?: string;
  targetCount?: number;
}): TaskBody {
  return {
    title: b.title,
    icon: b.icon,
    frequency: b.frequency,
    isGlobal: b.isGlobal,
    isDailyChallenge: b.isDailyChallenge,
    description: b.description,
    targetCount: b.targetCount,
  };
}
