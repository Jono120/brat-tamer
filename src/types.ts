export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  friends?: string[];
  theme?: "light" | "dark";
  role?: "admin" | "user" | "group-admin";
  groupId?: string;
  hasCompletedOnboarding?: boolean;
  /**
   * How the user signed up: "email" (email/password, hashed by Supabase Auth) or a
   * third-party OAuth provider ("google", "apple"). OAuth users have no password.
   */
  authProvider?: string;
}

export interface FriendProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  todayStickerCount: number;
}

export interface Group {
  id: string;
  name: string;
  adminId: string;
  members: string[];
  inviteCode: string;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  icon: string;
  frequency: "daily" | "weekly";
  color?: string;
  createdAt: string;
  isGlobal?: boolean;
  isDailyChallenge?: boolean;
  description?: string;
  targetCount?: number;
  /** Admin-controlled: prompts the user for a note before earning the sticker. */
  requiresNote?: boolean;
}

export interface Interaction {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: "high-five" | "message";
  content?: string;
  timestamp: string;
  read: boolean;
}

export interface StickerLog {
  id: string;
  userId: string;
  taskId: string;
  date: string; // YYYY-MM-DD
  earnedAt: string;
  count?: number;
  /** Optional free-text note, e.g. gratitude entry for the daily challenge. */
  note?: string;
}

export interface Invite {
  id: string;
  inviterId: string;
  createdAt: string;
  used?: boolean;
}

export interface Feedback {
  id: string;
  userId: string;
  userEmail: string;
  content: string;
  type: "feature" | "issue";
  timestamp: string;
  status: "pending" | "reviewed";
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}
