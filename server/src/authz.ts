import type pg from "pg";

export const INTERACTION_TYPES = ["high-five", "message"] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export function isValidInteractionType(type: string): type is InteractionType {
  return (INTERACTION_TYPES as readonly string[]).includes(type);
}

/** Returns true when `friendId` is in the caller's friend graph. */
export async function isFriend(
  pool: pg.Pool,
  userId: string,
  friendId: string,
): Promise<boolean> {
  if (userId === friendId) return false;
  const r = await pool.query(
    `SELECT 1 FROM user_friends WHERE user_id = $1 AND friend_id = $2`,
    [userId, friendId],
  );
  return r.rows.length > 0;
}

export type AuthzError = { status: number; error: string };

/** Validates interaction target and type before insert. */
export async function validateInteraction(
  pool: pg.Pool,
  fromUserId: string,
  toUserId: string,
  type: string,
): Promise<AuthzError | null> {
  if (!isValidInteractionType(type)) {
    return { status: 400, error: "Invalid interaction type" };
  }
  if (fromUserId === toUserId) {
    return { status: 400, error: "Cannot send interaction to yourself" };
  }
  const friends = await isFriend(pool, fromUserId, toUserId);
  if (!friends) {
    return { status: 403, error: "Can only interact with friends" };
  }
  return null;
}

/** Task must exist and be owned by user or marked global. */
export async function validateTaskForLog(
  pool: pg.Pool,
  userId: string,
  taskId: string,
): Promise<AuthzError | null> {
  const r = await pool.query(`SELECT user_id, is_global FROM tasks WHERE id = $1`, [
    taskId,
  ]);
  if (r.rows.length === 0) {
    return { status: 400, error: "Unknown task" };
  }
  const task = r.rows[0];
  const owner = String(task.user_id) === userId;
  if (!owner && !task.is_global) {
    return { status: 403, error: "Task not available" };
  }
  return null;
}

/** Caller must be group admin or listed in members. */
export function canAccessGroup(
  userId: string,
  group: { admin_id: unknown; members: unknown },
): boolean {
  if (String(group.admin_id) === userId) return true;
  const members = group.members as string[] | null;
  if (!Array.isArray(members)) return false;
  return members.map(String).includes(userId);
}

/** Reject accepting an invite that was already used. */
export function inviteAlreadyUsed(invite: { used: boolean }): AuthzError | null {
  if (invite.used) {
    return { status: 410, error: "Invite already used" };
  }
  return null;
}

/** Reject base64 data URLs; accept http(s) URLs or avatars/ storage paths. */
export function validatePhotoUrl(photoURL: string): AuthzError | null {
  if (photoURL.startsWith("data:")) {
    return {
      status: 400,
      error: "Base64 avatars are not allowed; upload via Storage",
    };
  }
  if (
    photoURL.startsWith("avatars/") ||
    photoURL.startsWith("http://") ||
    photoURL.startsWith("https://")
  ) {
    return null;
  }
  return { status: 400, error: "Invalid photo URL" };
}
