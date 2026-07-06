type LogLevel = "error" | "warn" | "info";

interface LogFields {
  path?: string;
  userId?: string;
  status?: number;
  message?: string;
  [key: string]: unknown;
}

/** Structured JSON logging for production observability (Sentry-compatible fields). */
export function logJson(level: LogLevel, msg: string, fields: LogFields = {}): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logRequestError(
  err: unknown,
  req: { path?: string; userId?: string },
  status = 500,
): void {
  logJson("error", err instanceof Error ? err.message : String(err), {
    path: req.path,
    userId: req.userId,
    status,
    stack: err instanceof Error ? err.stack : undefined,
  });
}
