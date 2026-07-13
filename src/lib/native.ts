/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from "@capacitor/core";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "./supabaseClient";

/**
 * Custom-scheme redirect used for OAuth / magic-link on iOS & Android.
 * Must stay in sync with `additional_redirect_urls` in `supabase/config.toml`,
 * the Supabase dashboard allow-list, the Android intent-filter
 * (`android/app/src/main/AndroidManifest.xml`) and iOS `CFBundleURLSchemes`.
 */
export const NATIVE_AUTH_CALLBACK_URL = "com.carestickers.app://auth-callback";

/** True when running inside the iOS / Android Capacitor shell (not the plain web app). */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Open an OAuth authorization URL in the system browser (SFSafariViewController /
 * Chrome Custom Tab). Google blocks sign-in from generic WebViews, so native
 * OAuth must leave the WebView; the redirect comes back via the deep link below.
 */
export async function openAuthUrlInSystemBrowser(url: string): Promise<void> {
  await Browser.open({ url, windowName: "_self" });
}

/**
 * Register the `appUrlOpen` deep-link listener. When the OS routes
 * `com.carestickers.app://auth-callback?code=...` back to the app, exchange the
 * PKCE code for a session so `onAuthStateChange` hydrates the signed-in user.
 * No-op on the web. Call once at startup.
 */
export function initNativeDeepLinks(): void {
  if (!isNativePlatform()) return;

  App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
    void handleDeepLink(event.url);
  });
}

async function handleDeepLink(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (!url.startsWith(NATIVE_AUTH_CALLBACK_URL)) return;

  // Close the system-browser sheet regardless of outcome (unsupported on Android; ignore).
  try {
    await Browser.close();
  } catch {
    /* ignore */
  }

  const code = parsed.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("OAuth code exchange failed:", error.message);
    return;
  }

  const errorDescription = parsed.searchParams.get("error_description");
  if (errorDescription) {
    console.error("OAuth callback returned an error:", errorDescription);
  }
}
