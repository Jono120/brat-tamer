import type { AuthzError } from "./authz.js";

const THEMES = new Set(["light", "dark"]);
const FEEDBACK_TYPES = new Set(["feature", "issue"]);
const MAX_DISPLAY_NAME = 100;
const MAX_FEEDBACK_CONTENT = 4000;
const MAX_TASK_TITLE = 100;
const MAX_TASK_DESCRIPTION = 500;

export function validateDisplayName(name: string): AuthzError | null {
  const trimmed = name.trim();
  if (!trimmed) return { status: 400, error: "Display name is required" };
  if (trimmed.length > MAX_DISPLAY_NAME) {
    return { status: 400, error: `Display name must be at most ${MAX_DISPLAY_NAME} characters` };
  }
  return null;
}

export function validateTheme(theme: string): AuthzError | null {
  if (!THEMES.has(theme)) {
    return { status: 400, error: "Theme must be light or dark" };
  }
  return null;
}

export function validateFeedback(
  content: unknown,
  type: unknown,
): AuthzError | null {
  if (typeof content !== "string" || !content.trim()) {
    return { status: 400, error: "Feedback content is required" };
  }
  if (content.length > MAX_FEEDBACK_CONTENT) {
    return {
      status: 400,
      error: `Feedback must be at most ${MAX_FEEDBACK_CONTENT} characters`,
    };
  }
  if (typeof type !== "string" || !FEEDBACK_TYPES.has(type)) {
    return { status: 400, error: "Feedback type must be feature or issue" };
  }
  return null;
}

export function validateTaskPayload(
  title: string | undefined,
  icon: string | undefined,
): AuthzError | null {
  if (!title?.trim() || !icon?.trim()) {
    return { status: 400, error: "title and icon required" };
  }
  if (title.trim().length > MAX_TASK_TITLE) {
    return { status: 400, error: `Title must be at most ${MAX_TASK_TITLE} characters` };
  }
  return null;
}

export function clampTaskDescription(description: string): string {
  return description.slice(0, MAX_TASK_DESCRIPTION);
}

const MAX_LOG_NOTE = 500;

/** Normalizes an optional sticker-log note: trims, clamps length, empty/non-string -> null. */
export function normalizeLogNote(note: unknown): string | null {
  if (typeof note !== "string") return null;
  const trimmed = note.trim().slice(0, MAX_LOG_NOTE);
  return trimmed || null;
}
