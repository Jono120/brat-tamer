/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ThemePreference = "light" | "dark" | undefined;

/** True when the OS/browser is set to a dark color scheme. */
export const systemPrefersDark = (): boolean =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;

/** Resolves the effective theme: explicit user choice wins, else device theme. */
export const resolveTheme = (preference: ThemePreference): "light" | "dark" =>
  preference ?? (systemPrefersDark() ? "dark" : "light");

/** Applies the effective theme to the document root. */
export const applyTheme = (preference: ThemePreference): void => {
  document.documentElement.classList.toggle(
    "dark",
    resolveTheme(preference) === "dark",
  );
};

/**
 * Re-applies the theme whenever the device color scheme changes, as long as
 * the user hasn't picked an explicit theme. Returns an unsubscribe function.
 */
export const watchSystemTheme = (
  getPreference: () => ThemePreference,
): (() => void) => {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (!getPreference()) applyTheme(undefined);
  };
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
