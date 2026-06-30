/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Users, Copy, MessageCircle, Share2 } from "lucide-react";
import { useAuth } from "../../store/hooks";
import { useUiState } from "../../store/UiStateProvider";
import { Sheet, useToast } from "../ui";

export const InviteModal = () => {
  const { user } = useAuth();
  const { showInviteModal, setShowInviteModal } = useUiState();
  const toast = useToast();

  const inviteLink = `${window.location.origin}?invite=${user?.uid}`;

  return (
    <Sheet
      open={showInviteModal}
      onClose={() => setShowInviteModal(false)}
      title="Invite a Friend"
      variant="center"
    >
      <div className="bg-bg-primary p-6 rounded-3xl mb-8 text-center">
        <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-primary">
          <Users size={32} strokeWidth={2} />
        </div>
        <p className="text-sm text-brand-ink/80 font-medium mb-6">
          Share this link with a friend. Once they join, you'll be connected!
        </p>

        <div className="flex items-center gap-2 p-2 bg-card-bg rounded-xl border border-brand-ink/5 mb-4">
          <div className="flex-1 text-xs font-mono text-muted truncate px-2">
            {inviteLink}
          </div>
          <button
            aria-label="Copy invite link"
            onClick={() => {
              navigator.clipboard.writeText(inviteLink);
              toast.success("Link copied to clipboard!");
            }}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] bg-brand-primary text-white rounded-lg"
          >
            <Copy size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => {
            const text = `Join me on CareStickers! ${inviteLink}`;
            window.open(
              `mailto:?subject=Join me on CareStickers&body=${encodeURIComponent(text)}`,
            );
          }}
          className="py-3 min-h-[48px] bg-bg-primary text-brand-ink rounded-xl font-bold text-sm flex items-center justify-center gap-2"
        >
          <MessageCircle size={16} strokeWidth={2} />
          Email
        </button>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: "CareStickers",
                text: "Join me on CareStickers!",
                url: inviteLink,
              });
            } else {
              toast.info("Sharing not supported. Use copy link instead.");
            }
          }}
          className="py-3 min-h-[48px] bg-brand-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
        >
          <Share2 size={16} strokeWidth={2} />
          Share
        </button>
      </div>
    </Sheet>
  );
};
