/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type ActionPerformed,
  type Token,
} from "@capacitor/push-notifications";
import { careApi } from "../api/careApi";
import { isNativePlatform } from "./native";

/**
 * Register global native push listeners. Call once at startup so notification
 * taps are handled even when they cold-start the app. No-op on the web.
 */
export function initNativePushListeners(): void {
  if (!isNativePlatform()) return;

  // Fires after PushNotifications.register(): send the FCM/APNs device token to
  // the API. register() is only invoked while signed in, so the call is authed.
  PushNotifications.addListener("registration", (token: Token) => {
    const platform = Capacitor.getPlatform() as "ios" | "android";
    careApi
      .registerPushToken(token.value, platform)
      .catch((err) => console.error("Failed to register push token:", err));
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("Push registration error:", err);
  });

  // Notification tapped: open the in-app route from the payload (HashRouter).
  PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action: ActionPerformed) => {
      const url = action.notification.data?.url;
      if (typeof url === "string" && url.startsWith("/")) {
        window.location.hash = `#${url}`;
      }
    },
  );
}

/** Whether native push permission is already granted. False on the web. */
export async function nativePushPermissionGranted(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const status = await PushNotifications.checkPermissions();
  return status.receive === "granted";
}

/**
 * Prompt for push permission and register with FCM/APNs. Returns whether
 * permission was granted; the resulting device token arrives via the
 * `registration` listener above.
 */
export async function requestAndRegisterNativePush(): Promise<boolean> {
  const status = await PushNotifications.requestPermissions();
  if (status.receive !== "granted") return false;
  await PushNotifications.register();
  return true;
}

/** Refresh the device token after sign-in when permission is already granted. */
export async function registerNativePushIfPermitted(): Promise<void> {
  if (await nativePushPermissionGranted()) {
    await PushNotifications.register();
  }
}
