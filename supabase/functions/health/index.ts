import { withSupabase } from "npm:@supabase/server";

export default {
  fetch: withSupabase({ auth: "none" }, async () => {
    return Response.json({ status: "ok", time: new Date().toISOString() });
  }),
};
