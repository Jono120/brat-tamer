import { withSupabase } from "@supabase/server";
import type { Database } from "@/types/database";

/**
 * Rotates the daily challenge: clears the current flag and promotes the next
 * global task (by created_at). Invoke via Supabase cron or manual POST.
 */
export default {
  fetch: withSupabase<Database>({ auth: "none" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "POST required" }, { status: 405 });
    }

    const supabase = ctx.supabaseAdmin;

    const { data: current } = await supabase
      .from("tasks")
      .select("id")
      .eq("is_daily_challenge", true)
      .eq("is_global", true)
      .maybeSingle();

    const { data: candidates } = await supabase
      .from("tasks")
      .select("id, created_at")
      .eq("is_global", true)
      .order("created_at", { ascending: true });

    if (!candidates || candidates.length === 0) {
      return Response.json({ ok: true, message: "No global tasks" });
    }

    await supabase
      .from("tasks")
      .update({ is_daily_challenge: false })
      .eq("is_daily_challenge", true);

    const currentIdx = current
      ? candidates.findIndex((t) => t.id === current.id)
      : -1;
    const nextIdx = (currentIdx + 1) % candidates.length;
    const nextId = candidates[nextIdx].id;

    await supabase
      .from("tasks")
      .update({ is_daily_challenge: true })
      .eq("id", nextId);

    return Response.json({
      ok: true,
      previousId: current?.id ?? null,
      nextId,
    });
  }),
};
