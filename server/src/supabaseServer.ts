import {
  createSupabaseContext,
  type SupabaseContext,
  type WithSupabaseConfig,
} from "@supabase/server";
import { resolveEnv } from "@supabase/server/core";
import type { NextFunction, Request, Response } from "express";

/** Converts an Express request into a Web API Request for `@supabase/server`. */
export function toWebRequest(req: Request): globalThis.Request {
  const host = req.get("host") ?? "localhost";
  const url = `${req.protocol}://${host}${req.originalUrl}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  return new Request(url, { method: req.method, headers });
}

/** True when JWT verification is configured (`SUPABASE_JWKS` or `SUPABASE_JWKS_URL`). */
export function isSupabaseAuthConfigured(): boolean {
  const { data: env, error } = resolveEnv();
  if (error || !env) return false;
  return env.jwks != null;
}

export function warnIfSupabaseAuthMissing(): void {
  if (!isSupabaseAuthConfigured()) {
    console.warn(
      "Warning: Supabase auth is not configured. Set SUPABASE_URL (and SUPABASE_JWKS_URL or SUPABASE_JWKS) to verify access tokens.",
    );
  }
}

/**
 * Express middleware wrapping `createSupabaseContext`.
 * Validates auth and attaches an RLS-scoped client (`req.supabaseContext.supabase`)
 * and admin client (`req.supabaseContext.supabaseAdmin`).
 */
export function withSupabaseExpress(config: WithSupabaseConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { data: ctx, error } = await createSupabaseContext(
      toWebRequest(req),
      { ...config, cors: false },
    );
    if (error) {
      res.status(error.status).json({ message: error.message, code: error.code });
      return;
    }
    attachSupabaseContext(req, ctx);
    next();
  };
}

function attachSupabaseContext(req: Request, ctx: SupabaseContext): void {
  req.supabaseContext = ctx;
  if (ctx.userClaims?.id) {
    req.userId = ctx.userClaims.id;
    req.userEmail = ctx.userClaims.email ?? "";
  }
}

/**
 * Verifies a Supabase user JWT (`auth: "user"`) for existing Express routes.
 * Preserves the legacy `{ error: string }` response shape used by the API client.
 */
export async function jwtAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isSupabaseAuthConfigured()) {
    res.status(500).json({
      error:
        "Supabase auth is not configured (set SUPABASE_URL or SUPABASE_JWKS_URL)",
    });
    return;
  }

  const { data: ctx, error } = await createSupabaseContext(
    toWebRequest(req),
    { auth: "user", cors: false },
  );
  if (error) {
    const message =
      error.status === 401 ? "Invalid token" : error.message;
    res.status(error.status).json({ error: message });
    return;
  }

  attachSupabaseContext(req, ctx);
  next();
}
