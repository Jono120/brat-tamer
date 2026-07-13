import { withSupabase } from "@supabase/server";
import type { Database } from "@/types/database";

/**
 * Rotates the daily challenge atomically via `rotate_daily_challenge()` in Postgres.
 * Invoke via Supabase cron with `Authorization: Bearer <SUPABASE_SECRET_KEY>`.
 */
export default {
  fetch: withSupabase<Database>({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "POST required" }, { status: 405 });
    }

    const { data, error } = await ctx.supabaseAdmin.rpc(
      "rotate_daily_challenge",
    );

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data);
  }),
};
