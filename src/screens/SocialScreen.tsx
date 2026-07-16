/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { motion } from "motion/react";
import { Users, HandMetal, MessageCircle } from "lucide-react";
import { EmptyState, ListSkeleton, IconButton } from "../components/ui";
import { useSocial } from "../store/hooks";

/** Social feed of interactions plus real friend high-fives. */
export const SocialScreen = () => {
  const {
    interactions,
    friends,
    sendInteraction,
    markInboxRead,
    hasLoadedData,
  } = useSocial();

  useEffect(() => {
    void markInboxRead();
  }, [markInboxRead]);

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-brand-ink">Social Feed</h2>

      {!hasLoadedData && interactions.length === 0 ? (
        <ListSkeleton count={3} />
      ) : interactions.length > 0 ? (
        <div className="space-y-4">
          {interactions.map((interaction) => (
            <motion.div
              key={interaction.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className={`p-4 rounded-2xl border-2 flex gap-4 items-start transition-all ${
                interaction.type === "high-five"
                  ? "bg-brand-accent/5 border-brand-accent/15"
                  : "bg-brand-primary/5 border-brand-primary/10"
              }`}
            >
              <div
                className={`p-2 rounded-xl ${
                  interaction.type === "high-five"
                    ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/20"
                    : "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
                }`}
              >
                {interaction.type === "high-five" ? (
                  <HandMetal size={20} strokeWidth={2} />
                ) : (
                  <MessageCircle size={20} strokeWidth={2} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-bold text-brand-ink">
                    {interaction.type === "high-five"
                      ? "High-Five Received!"
                      : "New Message"}
                  </div>
                  <div className="text-[11px] text-muted uppercase font-black">
                    {new Date(interaction.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {interaction.content && (
                  <div className="bg-card-bg/60 p-3 rounded-xl border border-border-subtle mt-2">
                    <p className="text-sm text-brand-ink italic">
                      "{interaction.content}"
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Users size={48} strokeWidth={2} />}
          title="No interactions yet"
          description="Share your chart with friends to start getting high-fives!"
        />
      )}

      <div className="pt-4">
        <h3 className="text-sm font-bold text-brand-ink mb-4">Friends</h3>
        {friends.length > 0 ? (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.uid}
                className="flex items-center gap-3 bg-card-bg p-3 rounded-2xl border border-border-subtle"
              >
                <img
                  src={
                    friend.photoURL ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.uid}`
                  }
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-border-subtle"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-brand-ink truncate">
                    {friend.displayName}
                  </div>
                  <div className="text-[11px] text-muted uppercase font-black">
                    {friend.todayStickerCount} sticker
                    {friend.todayStickerCount === 1 ? "" : "s"} today
                  </div>
                </div>
                <IconButton
                  label={`Send high-five to ${friend.displayName}`}
                  size="sm"
                  className="bg-brand-accent text-white"
                  onClick={() => sendInteraction(friend.uid, "high-five")}
                >
                  <HandMetal size={14} strokeWidth={2} />
                </IconButton>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users size={32} strokeWidth={2} />}
            title="No friends yet"
            description="Use Invite Friend in Settings to connect with someone!"
          />
        )}
      </div>
    </div>
  );
};
