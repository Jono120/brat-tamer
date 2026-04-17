export function mapUserRow(
  row: Record<string, unknown>,
  friends: string[],
): {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  friends?: string[];
  theme?: "light" | "dark";
  role?: "admin" | "user" | "group-admin";
  groupId?: string;
  hasCompletedOnboarding?: boolean;
} {
  return {
    uid: String(row.id),
    displayName: String(row.display_name),
    photoURL: row.photo_url != null ? String(row.photo_url) : "",
    email: String(row.email),
    friends,
    theme: row.theme != null ? (row.theme as "light" | "dark") : undefined,
    role:
      row.role != null
        ? (row.role as "admin" | "user" | "group-admin")
        : undefined,
    groupId: row.group_id != null ? String(row.group_id) : undefined,
    hasCompletedOnboarding: Boolean(row.has_completed_onboarding),
  };
}

export function mapTaskRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    icon: String(row.icon),
    frequency: row.frequency as "daily" | "weekly",
    color: row.color != null ? String(row.color) : undefined,
    createdAt: new Date(row.created_at as string).toISOString(),
    isGlobal: Boolean(row.is_global),
    isDailyChallenge: Boolean(row.is_daily_challenge),
    description: row.description != null ? String(row.description) : undefined,
    targetCount:
      row.target_count != null ? Number(row.target_count) : undefined,
  };
}

export function mapLogRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    taskId: String(row.task_id),
    date:
      row.date instanceof Date
        ? row.date.toISOString().split("T")[0]
        : String(row.date).slice(0, 10),
    earnedAt: new Date(row.earned_at as string).toISOString(),
    count: row.count != null ? Number(row.count) : undefined,
  };
}

export function mapInteractionRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    fromUserId: String(row.from_user_id),
    toUserId: String(row.to_user_id),
    type: row.type as "high-five" | "message",
    content: row.content != null ? String(row.content) : undefined,
    timestamp: new Date(row.timestamp as string).toISOString(),
    read: Boolean(row.read),
  };
}

export function mapGroupRow(row: Record<string, unknown>) {
  const members = row.members as string[];
  return {
    id: String(row.id),
    name: String(row.name),
    adminId: String(row.admin_id),
    members: Array.isArray(members) ? members.map(String) : [],
    inviteCode: String(row.invite_code),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}
