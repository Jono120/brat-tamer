/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useUiState } from "../../store/UiStateProvider";
import { PRIVACY_SECTIONS } from "../../constants";
import { Sheet } from "../ui";

export const PrivacyModal = () => {
  const { showPrivacyModal, setShowPrivacyModal } = useUiState();

  return (
    <Sheet
      open={showPrivacyModal}
      onClose={() => setShowPrivacyModal(false)}
      title="Privacy Policy"
      variant="center"
      maxHeight
    >
      <p className="text-xs text-muted mb-6">
        <em>Last updated: July 2026</em>
      </p>

      <div className="space-y-6">
        {PRIVACY_SECTIONS.map((section) => (
          <div key={section.heading} className="space-y-2">
            <h3 className="text-sm font-bold text-brand-ink flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
              {section.heading}
            </h3>
            <p className="text-sm text-brand-ink/80 leading-relaxed pl-3.5">
              {section.body}
            </p>
          </div>
        ))}
      </div>
    </Sheet>
  );
};
