/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Camera } from "lucide-react";
import { useAuth } from "../../store/hooks";
import { useUiState } from "../../store/UiStateProvider";
import { Sheet } from "../ui";
import { PRESET_AVATARS } from "../../constants";

export const AvatarModal = () => {
  const { uploadAvatar, selectPresetAvatar } = useAuth();
  const { showAvatarModal, setShowAvatarModal } = useUiState();

  return (
    <Sheet
      open={showAvatarModal}
      onClose={() => setShowAvatarModal(false)}
      title="Choose Avatar"
      variant="center"
    >
      <div className="grid grid-cols-3 gap-4 mb-8">
        {PRESET_AVATARS.map((url, i) => (
          <button
            key={i}
            onClick={async () => {
              await selectPresetAvatar(url);
              setShowAvatarModal(false);
            }}
            aria-label={`Select avatar ${i + 1}`}
            className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-brand-primary transition-all"
          >
            <img src={url} className="w-full h-full object-cover" alt="" />
          </button>
        ))}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-brand-ink/10"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase font-bold mb-6">
          <span className="bg-card-bg px-2 text-muted">Or upload custom</span>
        </div>
      </div>

      <label className="w-full py-4 bg-bg-primary rounded-2xl border-2 border-dashed border-brand-ink/15 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-primary/5 transition-all">
        <Camera size={24} strokeWidth={2} className="text-muted mb-2" />
        <span className="text-sm font-bold text-muted">Upload Photo</span>
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await uploadAvatar(file);
            setShowAvatarModal(false);
          }}
          className="sr-only"
        />
      </label>
    </Sheet>
  );
};
