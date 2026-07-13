/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import type { Task } from "../../types";
import { Button, Sheet, Textarea } from "../ui";

interface TaskNoteModalProps {
  task: Task | null;
  onClose: () => void;
  /** Earns the sticker; `note` is empty when the user skips writing one. */
  onSave: (note: string) => void;
}

/**
 * Prompts for a short note before earning a sticker on tasks with
 * `requiresNote` enabled (e.g. the gratitude daily challenge). The task
 * description doubles as the prompt so admins can word it per goal.
 */
export const TaskNoteModal = ({ task, onClose, onSave }: TaskNoteModalProps) => {
  const [note, setNote] = useState("");

  const save = (value: string) => {
    onSave(value.trim());
    setNote("");
  };

  return (
    <Sheet
      open={!!task}
      onClose={() => {
        setNote("");
        onClose();
      }}
      title={task?.title || "Add a note"}
      variant="center"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(note);
        }}
      >
        <div className="mb-6">
          <Textarea
            label={task?.description || "What do you want to remember about this?"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. A sunny walk with a friend..."
            autoFocus
          />
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="flex-1"
            onClick={() => save("")}
          >
            Skip
          </Button>
          <Button type="submit" size="lg" className="flex-[2]" disabled={!note.trim()}>
            Save & earn sticker
          </Button>
        </div>
      </form>
    </Sheet>
  );
};
