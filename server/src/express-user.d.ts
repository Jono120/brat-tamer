import type { SupabaseContext } from "@supabase/server";

/** Passport serializes `Express.User`; session strategies attach `{ id }`. */
declare global {
  namespace Express {
    interface User {
      id: string;
    }

    interface Request {
      /** Populated by `@supabase/server` middleware after successful auth. */
      supabaseContext?: SupabaseContext;
      /** Supabase user id (`sub`) from a verified JWT. */
      userId?: string;
      userEmail?: string;
    }
  }
}

export {};
