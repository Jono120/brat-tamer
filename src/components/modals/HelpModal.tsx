/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExternalLink } from "lucide-react";
import { useUiState } from "../../store/UiStateProvider";
import { Sheet } from "../ui";
import { FAQ_ITEMS } from "../../constants";

export const HelpModal = () => {
  const { showHelpModal, setShowHelpModal, setShowFeedback } = useUiState();

  return (
    <Sheet
      open={showHelpModal}
      onClose={() => setShowHelpModal(false)}
      title="Help & FAQ"
      variant="center"
      maxHeight
    >
      <div className="space-y-6">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="space-y-2">
            <div className="text-sm font-bold text-brand-ink flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
              {item.question}
            </div>
            <p className="text-sm text-brand-ink/80 leading-relaxed pl-3.5">
              {item.answer}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-brand-primary/5 rounded-3xl border border-brand-primary/15">
        <div className="text-sm font-bold text-brand-ink mb-1">
          Support development
        </div>
        <p className="text-xs text-muted mb-3 leading-relaxed">
          Enjoying the app? Contributions help fund ongoing development.
        </p>
        <div className="flex flex-col gap-2">
          <a
            href="https://ko-fi.com/jono420"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl bg-card-bg border border-brand-ink/10 text-sm font-bold text-brand-ink"
          >
            Ko-fi
            <ExternalLink
              size={14}
              strokeWidth={2}
              className="text-brand-primary"
            />
          </a>
          <a
            href="https://buymeacoffee.com/jono420"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl bg-card-bg border border-brand-ink/10 text-sm font-bold text-brand-ink"
          >
            Buy Me a Coffee
            <ExternalLink
              size={14}
              strokeWidth={2}
              className="text-brand-primary"
            />
          </a>
        </div>
      </div>

      <div className="mt-8 p-6 bg-bg-primary rounded-3xl border border-brand-ink/5">
        <div className="text-sm font-bold text-brand-ink mb-2">
          Still need help?
        </div>
        <p className="text-xs text-muted mb-4">
          Our community is here to support you. Feel free to send us feedback or
          report issues.
        </p>
        <button
          onClick={() => {
            setShowHelpModal(false);
            setShowFeedback(true);
          }}
          className="min-h-[44px] text-xs font-black text-brand-primary uppercase tracking-widest"
        >
          Contact Support
        </button>
      </div>
    </Sheet>
  );
};
