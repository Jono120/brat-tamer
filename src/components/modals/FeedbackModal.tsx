/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSocial } from "../../store/hooks";
import { useUiState } from "../../store/UiStateProvider";
import { Button, Sheet, Textarea } from "../ui";

export const FeedbackModal = () => {
  const { submitFeedback } = useSocial();
  const { showFeedback, setShowFeedback } = useUiState();

  return (
    <Sheet
      open={showFeedback}
      onClose={() => setShowFeedback(false)}
      title="Feedback"
      variant="center"
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const ok = await submitFeedback(
            formData.get("content") as string,
            formData.get("type") as "feature" | "issue",
          );
          if (ok) setShowFeedback(false);
        }}
      >
        <div className="mb-4">
          <label
            htmlFor="feedback-type"
            className="block text-xs font-bold uppercase tracking-widest text-muted-strong mb-2"
          >
            Type
          </label>
          <select
            id="feedback-type"
            name="type"
            className="w-full p-4 min-h-[48px] bg-bg-primary rounded-2xl border-2 border-transparent focus:border-brand-primary outline-none font-semibold text-brand-ink"
          >
            <option value="feature">Request Feature</option>
            <option value="issue">Report Issue</option>
          </select>
        </div>
        <div className="mb-6">
          <Textarea
            label="Message"
            name="content"
            required
            rows={4}
            placeholder="Tell us what's on your mind..."
          />
        </div>
        <Button type="submit" size="lg" fullWidth>
          Send Feedback
        </Button>
      </form>
    </Sheet>
  );
};
