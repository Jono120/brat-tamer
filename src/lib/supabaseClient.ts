import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaced early in dev so a missing config is obvious rather than a silent 401 later.
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. Supabase auth will not work.",
  );
}

/**
 * Browser Supabase client. The anon key is public by design (shipped to the client) and safe
 * because the Express API enforces access in app code; never put the service_role key here.
 *
 * PKCE flow + detectSessionInUrl let OAuth / magic-link redirects complete in the browser and
 * (with the right redirect URLs) inside the Capacitor WebView.
 */
export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
