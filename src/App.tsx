/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Heart } from "lucide-react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ui";
import { DataProvider } from "./store/DataProvider";
import { UiStateProvider } from "./store/UiStateProvider";
import { useAuth } from "./store/hooks";
import { AuthScreen } from "./screens/AuthScreen";
import { AppShell } from "./components/AppShell";

/** Decides between the loading state, auth screen and the app shell. */
function Root() {
  const { isAuthReady, user } = useAuth();

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <div className="animate-bounce text-brand-primary">
          <Heart size={48} strokeWidth={2} fill="currentColor" />
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <UiStateProvider>
      <AppShell />
    </UiStateProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <DataProvider>
          <Root />
        </DataProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
