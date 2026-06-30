/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Users, HandMetal, MessageCircle } from "lucide-react";
import { EmptyState, ListSkeleton, IconButton } from "../components/ui";
import { useSocial } from "../store/hooks";

/** Social feed of interactions plus quick high-fives. */
export const SocialScreen = () => {
  const { interactions, sendInteraction, hasLoadedData } = useSocial();

  return (
    <div className="space-y-6">
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
                    ? "bg-brand-accent text-brand-ink shadow-lg shadow-brand-accent/20"
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
                  <div className="bg-card-bg/60 p-3 rounded-xl border border-brand-ink/5 mt-2">
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
        <h3 className="text-sm font-bold text-brand-ink mb-4">
          Quick High-Five (Demo)
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 bg-card-bg p-3 rounded-2xl border border-brand-ink/5 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-brand-ink/10" />
              <div className="text-sm font-bold text-brand-ink">Friend {i}</div>
              <IconButton
                label={`Send high-five to Friend ${i}`}
                size="sm"
                className="bg-brand-accent text-brand-ink"
                onClick={() => sendInteraction("mock-id", "high-five")}
              >
                <HandMetal size={14} strokeWidth={2} />
              </IconButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
