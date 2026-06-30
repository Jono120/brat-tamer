/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion } from "motion/react";
import { Smile } from "lucide-react";
import { Button } from "../components/ui";
import { useAuth } from "../store/hooks";
import { errorMessage } from "../lib/errors";

/** Sign-in / sign-up screen shown to unauthenticated users. */
export const AuthScreen = () => {
  const { login, register, loginWithProvider, sendMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [busy, setBusy] = useState(false);

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
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              className="w-4 h-4"
              alt=""
            />
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
