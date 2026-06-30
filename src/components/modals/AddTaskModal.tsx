/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useTasks } from "../../store/hooks";
import { useUiState } from "../../store/UiStateProvider";
import { TaskIcon } from "../TaskIcon";
import { Button, Input, Sheet, Textarea } from "../ui";
import { PRESET_ICONS } from "../../constants";

const LABEL_CLASS =
  "block text-xs font-bold uppercase tracking-widest text-muted-strong mb-2";

export const AddTaskModal = () => {
  const { createTask, isAdmin } = useTasks();
  const {
    showAddTask,
    editingTask,
    closeAddTask,
    setPendingTaskUpdate,
    setTaskToDelete,
  } = useUiState();

  return (
    <Sheet
      open={showAddTask}
      onClose={closeAddTask}
      title={editingTask ? "Edit Goal" : "New Goal"}
      maxHeight
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const payload = {
            title: formData.get("title") as string,
            icon: formData.get("icon") as string,
            frequency: formData.get("frequency") as "daily" | "weekly",
            isGlobal: formData.get("isGlobal") === "on",
            isDailyChallenge: formData.get("isDailyChallenge") === "on",
            description: (formData.get("description") as string) || "",
            targetCount: parseInt(formData.get("targetCount") as string) || 1,
          };
          if (editingTask) {
            // Editing requires explicit confirmation (SaveConfirmModal).
            setPendingTaskUpdate(payload);
            return;
          }
          const ok = await createTask(payload);
          if (ok) closeAddTask();
        }}
      >
        <div className="mb-6">
          <Input
            label="Goal Name"
            name="title"
            required
            defaultValue={editingTask?.title}
            placeholder="e.g. Drink Water"
          />
        </div>

        <div className="mb-6">
          <Textarea
            label="Description (Optional)"
            name="description"
            defaultValue={editingTask?.description}
            placeholder="e.g. Drink at least 8 glasses of water today"
            rows={2}
          />
        </div>

        <div className="mb-6">
          <span className={LABEL_CLASS}>Frequency</span>
          <div className="flex gap-2">
            {["daily", "weekly"].map((freq) => (
              <label key={freq} className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="frequency"
                  value={freq}
                  defaultChecked={
                    editingTask
                      ? editingTask.frequency === freq
                      : freq === "daily"
                  }
                  className="peer sr-only"
                />
                <div className="py-3 min-h-[48px] flex items-center justify-center bg-bg-primary rounded-xl border-2 border-transparent peer-checked:border-brand-primary peer-checked:bg-brand-primary/5 transition-all text-xs font-bold uppercase tracking-wider text-muted peer-checked:text-brand-primary">
                  {freq}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <span className={LABEL_CLASS}>Target Count (Optional)</span>
          <div className="flex items-center gap-4">
            <input
              type="number"
              name="targetCount"
              min="1"
              max="100"
              aria-label="Target count"
              defaultValue={editingTask?.targetCount || 1}
              className="w-24 p-4 bg-bg-primary rounded-2xl border-2 border-transparent focus:border-brand-primary outline-none transition-all font-semibold text-brand-ink"
            />
            <div className="text-xs text-muted font-medium">
              Set how many times you want to do this (e.g. 8 glasses of water)
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="space-y-4 mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isGlobal"
                defaultChecked={editingTask?.isGlobal}
                className="peer sr-only"
              />
              <div className="w-10 h-5 bg-bg-primary rounded-full relative transition-all peer-checked:bg-brand-accent">
                <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-ink">
                Global Goal
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isDailyChallenge"
                defaultChecked={editingTask?.isDailyChallenge}
                className="peer sr-only"
              />
              <div className="w-10 h-5 bg-bg-primary rounded-full relative transition-all peer-checked:bg-brand-primary">
                <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-ink">
                Daily Challenge
              </span>
            </label>
          </div>
        )}

        <div className="mb-8">
          <span className={`${LABEL_CLASS} mb-4`}>Select Icon</span>
          <div className="grid grid-cols-4 gap-4">
            {PRESET_ICONS.map((icon) => (
              <label key={icon} className="relative cursor-pointer group">
                <input
                  type="radio"
                  name="icon"
                  value={icon}
                  defaultChecked={
                    editingTask ? editingTask.icon === icon : icon === "heart"
                  }
                  className="peer sr-only"
                />
                <div className="w-full aspect-square bg-bg-primary rounded-2xl flex items-center justify-center border-2 border-transparent peer-checked:border-brand-primary peer-checked:bg-brand-primary/5 transition-all">
                  <TaskIcon
                    name={icon}
                    className="text-muted group-hover:text-brand-primary transition-colors"
                  />
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          {editingTask && (
            <Button
              type="button"
              variant="danger"
              size="lg"
              className="flex-1 !bg-red-50 !text-red-500 !shadow-none border-2 border-red-100"
              onClick={() => setTaskToDelete(editingTask)}
            >
              Delete
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-[2]">
            {editingTask ? "Save Changes" : "Create Goal"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
};
