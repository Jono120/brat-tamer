/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion } from "motion/react";
import { KeyRound } from "lucide-react";
import { Button } from "../components/ui";
import { useAuth } from "../store/hooks";
import { errorMessage } from "../lib/errors";

/**
 * Shown after the user follows a password-recovery email link (PKCE `type=recovery`
 * token exchange gives them a session, but they still need to choose a new password).
 */
export const UpdatePasswordScreen = () => {
  const { updatePassword, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
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
            <KeyRound size={48} strokeWidth={2} className="text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-brand-primary mb-2">
          Choose a new password
        </h1>
        <p className="text-muted mb-8 text-sm">
          You followed a password reset link. Set a new password to finish
          signing in.
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <input
            type="password"
            placeholder="New password"
            aria-label="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 min-h-[48px] bg-bg-primary rounded-xl border-2 border-transparent focus:border-brand-primary outline-none text-sm"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            aria-label="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full p-3 min-h-[48px] bg-bg-primary rounded-xl border-2 border-transparent focus:border-brand-primary outline-none text-sm"
          />
          {error && (
            <p role="alert" className="text-red-500 text-sm font-bold">
              {error}
            </p>
          )}
          <Button type="submit" size="md" fullWidth disabled={busy}>
            Update password
          </Button>
          <button
            type="button"
            onClick={() => void logout()}
            className="min-h-[44px] text-xs font-bold text-brand-primary uppercase tracking-widest"
          >
            Cancel and sign out
          </button>
        </form>
      </motion.div>
    </div>
  );
};
