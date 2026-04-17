import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shells for iOS / Android (Capacitor).
 * After `npm run build:cap`, open projects with `npm run cap:open:ios` or `npm run cap:open:android`.
 *
 * Set VITE_API_BASE when building so API calls hit your deployed server (Capacitor WebView is not same-origin with `/api`).
 */
const config: CapacitorConfig = {
  appId: "com.carestickers.app",
  appName: "CareStickers",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
