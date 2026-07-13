/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Smile } from "lucide-react";
import { Button } from "../components/ui";
import { useAuth } from "../store/hooks";
import { ADMIN_EMAILS } from "../constants";
import { errorMessage } from "../lib/errors";

// Password of the seeded local accounts (supabase/seed.sql) used by the dev-only
// admin bypass below. Public by design for the local stack; never valid in production.
const DEV_SEED_PASSWORD = "password123";

/** Sign-in / sign-up screen shown to unauthenticated users. */
export const AuthScreen = () => {
  const { login, register, loginWithProvider, sendMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const devBypassAttempted = useRef<string | null>(null);

  // Dev-only login bypass: on the Vite dev server, typing an admin email
  // (VITE_ADMIN_EMAILS) signs in immediately with the seeded local password —
  // a real Supabase session, so API calls work. Inert in production builds.
  useEffect(() => {
    if (!import.meta.env.DEV || !isLogin || busy) return;
    const normalized = email.trim().toLowerCase();
    if (!ADMIN_EMAILS.includes(normalized)) return;
    if (devBypassAttempted.current === normalized) return;
    devBypassAttempted.current = normalized;
    setAuthError("");
    setAuthNotice("Dev bypass: signing in as admin\u2026");
    void login(normalized, DEV_SEED_PASSWORD).catch((e) => {
      setAuthNotice("");
      setAuthError(`Dev bypass failed: ${errorMessage(e)}`);
    });
  }, [email, isLogin, busy, login]);

  const submit = async () => {
    setAuthError("");
    setAuthNotice("");
    setBusy(true);
    try {
      if (isLogin) await login(email, password);
      else {
        await register(email, password);
        setAuthNotice(
          "Account created. If email confirmation is enabled, check your inbox to finish signing in.",
        );
      }
    } catch (e) {
      setAuthError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onMagicLink = async () => {
    setAuthError("");
    setAuthNotice("");
    if (!email) {
      setAuthError("Enter your email first.");
      return;
    }
    try {
      await sendMagicLink(email);
      setAuthNotice("Magic link sent! Check your email to sign in.");
    } catch (e) {
      setAuthError(errorMessage(e));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen min-h-[100dvh] bg-bg-primary p-6 text-center overflow-y-auto safe-top safe-bottom">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card-bg p-8 rounded-[40px] shadow-2xl border-4 border-brand-primary max-w-sm w-full"
      >
        <div className="mb-6 flex justify-center">
          <div className="bg-brand-secondary p-4 rounded-full">
            <Smile size={48} strokeWidth={2} className="text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-brand-primary mb-2">
          CareStickers
        </h1>
        <p className="text-muted mb-8 text-sm">
          Track your self-care journey with friends. Earn stickers, stay
          healthy!
        </p>

        <form
          className="space-y-4 mb-8"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <input
            type="email"
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 min-h-[48px] bg-bg-primary rounded-xl border-2 border-transparent focus:border-brand-primary outline-none text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            aria-label="Password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 min-h-[48px] bg-bg-primary rounded-xl border-2 border-transparent focus:border-brand-primary outline-none text-sm"
          />
          {authError && (
            <p role="alert" className="text-red-500 text-sm font-bold">
              {authError}
            </p>
          )}
          {authNotice && (
            <p role="status" className="text-brand-primary text-sm font-bold">
              {authNotice}
            </p>
          )}
          <Button type="submit" size="md" fullWidth disabled={busy}>
            {isLogin ? "Login" : "Sign Up"}
          </Button>
          <button
            type="button"
            onClick={() => void onMagicLink()}
            className="min-h-[44px] w-full text-xs font-bold text-brand-primary uppercase tracking-widest"
          >
            Email me a magic link
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="min-h-[44px] text-xs font-bold text-brand-primary uppercase tracking-widest"
          >
            {isLogin ? "Need an account? Sign Up" : "Have an account? Login"}
          </button>
        </form>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-brand-ink/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase font-bold">
            <span className="bg-card-bg px-2 text-muted">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={async () => {
              setAuthError("");
              try {
                await loginWithProvider("google");
              } catch (e) {
                setAuthError(errorMessage(e));
              }
            }}
            className="w-full py-3 min-h-[48px] bg-white text-brand-ink border-2 border-brand-ink/10 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>
          <button
            type="button"
            onClick={async () => {
              setAuthError("");
              try {
                await loginWithProvider("apple");
              } catch (e) {
                setAuthError(errorMessage(e));
              }
            }}
            className="w-full py-3 min-h-[48px] bg-white text-brand-ink border-2 border-brand-ink/10 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 384 512" width="16" height="16" fill="currentColor">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
            Apple
          </button>
        </div>
      </motion.div>
    </div>
  );
};
