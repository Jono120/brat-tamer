/**
 * Builds allowed CORS origins: primary site(s) plus Capacitor / Ionic WebView origins
 * so native app shells can call the API with credentials.
 */
export function buildAllowedCorsOrigins(): Set<string> {
  const frontend = process.env.FRONTEND_URL || "http://localhost:3000";
  const extra = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const set = new Set<string>();
  for (const part of frontend.split(",")) {
    const t = part.trim();
    if (t) set.add(t);
  }
  for (const e of extra) set.add(e);

  if (process.env.ALLOW_CAPACITOR_ORIGINS !== "false") {
    for (const o of [
      "capacitor://localhost",
      "ionic://localhost",
      "https://localhost",
    ]) {
      set.add(o);
    }
  }

  return set;
}
