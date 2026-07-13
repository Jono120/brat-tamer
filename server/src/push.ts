/**
 * Push notification scaffold: device-token validation and an FCM HTTP v1 send
 * pipeline (FCM covers Android directly and iOS via its APNs bridge).
 *
 * Sending is gated on the FCM_SERVICE_ACCOUNT_JSON env var (a Firebase service
 * account key). When unset, sends are a logged no-op so the rest of the app —
 * token registration included — works without any Firebase credentials.
 */

import { createSign } from "node:crypto";
import type { Pool } from "pg";
import type { AuthzError } from "./authz.js";

export const PUSH_PLATFORMS = new Set(["ios", "android", "web"]);
const MAX_TOKEN_LENGTH = 4096;
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

export function validatePushRegistration(
  token: unknown,
  platform: unknown,
): AuthzError | null {
  if (typeof token !== "string" || !token.trim()) {
    return { status: 400, error: "token is required" };
  }
  if (token.length > MAX_TOKEN_LENGTH) {
    return {
      status: 400,
      error: `token must be at most ${MAX_TOKEN_LENGTH} characters`,
    };
  }
  if (typeof platform !== "string" || !PUSH_PLATFORMS.has(platform)) {
    return { status: 400, error: "platform must be ios, android, or web" };
  }
  return null;
}

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri: string;
}

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      console.error("FCM_SERVICE_ACCOUNT_JSON is missing required fields.");
      return null;
    }
    return {
      project_id: parsed.project_id,
      client_email: parsed.client_email,
      private_key: parsed.private_key,
      token_uri: parsed.token_uri || "https://oauth2.googleapis.com/token",
    };
  } catch {
    console.error("FCM_SERVICE_ACCOUNT_JSON is not valid JSON.");
    return null;
  }
}

export function pushIsConfigured(): boolean {
  return loadServiceAccount() !== null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/** OAuth2 access token via a signed service-account JWT (no google-auth-library dependency). */
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: FCM_SCOPE,
      aud: sa.token_uri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = base64url(signer.sign(sa.private_key));
  const assertion = `${header}.${claims}.${signature}`;

  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`FCM token exchange failed: ${res.status}`);
  }
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  };
  return body.access_token;
}

export interface PushMessage {
  title: string;
  body: string;
  /** In-app route the client should open when the notification is tapped (e.g. "/social"). */
  url?: string;
}

/**
 * Send one FCM v1 message. Returns "unregistered" when FCM reports the token is
 * dead so the caller can prune it.
 */
async function sendToToken(
  sa: ServiceAccount,
  accessToken: string,
  token: string,
  message: PushMessage,
): Promise<"ok" | "unregistered" | "error"> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: message.title, body: message.body },
          data: message.url ? { url: message.url } : undefined,
        },
      }),
    },
  );
  if (res.ok) return "ok";
  if (res.status === 404 || res.status === 410) return "unregistered";
  const text = await res.text().catch(() => "");
  if (text.includes("UNREGISTERED") || text.includes("INVALID_ARGUMENT")) {
    return "unregistered";
  }
  console.error(`FCM send failed (${res.status}): ${text.slice(0, 500)}`);
  return "error";
}

/**
 * Send a push notification to every registered device of a user, pruning tokens
 * FCM reports as dead. No-op (with a one-line log) when FCM is not configured.
 * Callers should fire-and-forget; failures never block the API response.
 */
export async function sendPushToUser(
  pool: Pool,
  userId: string,
  message: PushMessage,
): Promise<void> {
  const sa = loadServiceAccount();
  if (!sa) {
    console.log(
      `Push not configured (FCM_SERVICE_ACCOUNT_JSON unset); skipping push to user ${userId}.`,
    );
    return;
  }
  const r = await pool.query(
    "SELECT token FROM push_tokens WHERE user_id = $1",
    [userId],
  );
  if (r.rows.length === 0) return;

  const accessToken = await getAccessToken(sa);
  const dead: string[] = [];
  for (const row of r.rows) {
    const token = String(row.token);
    const result = await sendToToken(sa, accessToken, token, message);
    if (result === "unregistered") dead.push(token);
  }
  if (dead.length > 0) {
    await pool.query("DELETE FROM push_tokens WHERE token = ANY($1)", [dead]);
  }
}
