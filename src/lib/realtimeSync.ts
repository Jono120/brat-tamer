import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export type RealtimeHandlers = {
  onInteraction?: () => void;
  onStickerLog?: () => void;
  onGroup?: () => void;
};

/** Subscribe to Supabase Realtime for the authenticated user's data (requires RLS). */
export function subscribeRealtime(
  userId: string,
  groupId: string | null | undefined,
  handlers: RealtimeHandlers,
): () => void {
  const channels: RealtimeChannel[] = [];

  const interactions = supabase
    .channel(`interactions:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "interactions",
        filter: `to_user_id=eq.${userId}`,
      },
      () => handlers.onInteraction?.(),
    )
    .subscribe();
  channels.push(interactions);

  const logs = supabase
    .channel(`sticker_logs:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sticker_logs",
        filter: `user_id=eq.${userId}`,
      },
      () => handlers.onStickerLog?.(),
    )
    .subscribe();
  channels.push(logs);

  if (groupId) {
    const group = supabase
      .channel(`groups:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "groups",
          filter: `id=eq.${groupId}`,
        },
        () => handlers.onGroup?.(),
      )
      .subscribe();
    channels.push(group);
  }

  return () => {
    for (const ch of channels) {
      void supabase.removeChannel(ch);
    }
  };
}
