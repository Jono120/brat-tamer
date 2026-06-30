/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Check, X } from "lucide-react";
import { Sheet, Button } from "../ui";
import { useTasks } from "../../store/hooks";
import { useUiState } from "../../store/UiStateProvider";

/** Confirmation before deleting a goal. */
export const DeleteConfirmModal = () => {
  const { deleteTask } = useTasks();
  const {
    taskToDelete,
    setTaskToDelete,
    setShowAddTask,
    setEditingTask,
  } = useUiState();

  return (
    <Sheet
      open={!!taskToDelete}
      onClose={() => setTaskToDelete(null)}
      title="Delete Goal?"
      variant="center"
    >
      <div className="text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <X size={32} strokeWidth={2} />
        </div>
        <p className="text-sm text-muted mb-8 font-medium">
          Are you sure you want to delete{" "}
          <span className="text-brand-ink font-bold">
            "{taskToDelete?.title}"
          </span>
          ? This action cannot be undone and all progress will be lost.
        </p>
        <div className="flex gap-4">
          <Button
            variant="ghost"
            onClick={() => setTaskToDelete(null)}
            className="flex-1 !bg-bg-primary !border-transparent"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={async () => {
              if (!taskToDelete) return;
              const ok = await deleteTask(taskToDelete.id);
              if (ok) {
                setTaskToDelete(null);
                setShowAddTask(false);
                setEditingTask(null);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Sheet>
  );
};

/** Confirmation before saving edits to an existing goal. */
export const SaveConfirmModal = () => {
  const { updateTask } = useTasks();
  const {
    pendingTaskUpdate,
    setPendingTaskUpdate,
    editingTask,
    setEditingTask,
    setShowAddTask,
  } = useUiState();

  return (
    <Sheet
      open={!!pendingTaskUpdate}
      onClose={() => setPendingTaskUpdate(null)}
      title="Save Changes?"
      variant="center"
    >
      <div className="text-center">
        <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={32} strokeWidth={2} />
        </div>
        <p className="text-sm text-muted mb-8 font-medium">
          Are you sure you want to save the changes to{" "}
          <span className="text-brand-ink font-bold">
            "{editingTask?.title}"
          </span>
          ?
        </p>
        <div className="flex gap-4">
          <Button
            variant="ghost"
            onClick={() => setPendingTaskUpdate(null)}
            className="flex-1 !bg-bg-primary !border-transparent"
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={async () => {
              if (!editingTask || !pendingTaskUpdate) return;
              const ok = await updateTask(editingTask.id, pendingTaskUpdate);
              if (ok) {
                setPendingTaskUpdate(null);
                setEditingTask(null);
                setShowAddTask(false);
              }
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  );
};
