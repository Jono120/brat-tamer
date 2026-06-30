/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search, Settings } from "lucide-react";
import { Card } from "../components/ui";
import { TaskIcon } from "../components/TaskIcon";
import { useAdmin } from "../store/hooks";
import { useUiState } from "../store/UiStateProvider";

/** Admin portal: community progress and global goals. */
export const AdminScreen = () => {
  const {
    allUsers,
    allUsersLogs,
    globalTasks,
    today,
    adminSearchQuery,
    setAdminSearchQuery,
  } = useAdmin();
  const { openAddTask } = useUiState();

  const filteredUsers = allUsers
    .filter((u) =>
      u.displayName.toLowerCase().includes(adminSearchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      const aLogs = allUsersLogs.filter(
        (l) => l.userId === a.uid && l.date === today,
      ).length;
      const bLogs = allUsersLogs.filter(
        (l) => l.userId === b.uid && l.date === today,
      ).length;
      return bLogs - aLogs;
    });

  return (
    <div className="space-y-6 pb-12">
      <h2 className="text-lg font-bold text-brand-ink">Admin Portal</h2>

      <Card className="border-brand-primary/10 shadow-xl shadow-brand-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-sm font-bold text-brand-ink">
            Community Progress
          </h3>
          <div className="relative flex-1 max-w-xs">
            <Search
              size={14}
              strokeWidth={2}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search users..."
              aria-label="Search users"
              value={adminSearchQuery}
              onChange={(e) => setAdminSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 min-h-[44px] bg-bg-primary rounded-xl text-sm font-semibold text-brand-ink border-2 border-transparent focus:border-brand-primary outline-none transition-all"
            />
          </div>
        </div>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredUsers.map((u) => {
            const userTodayLogs = allUsersLogs.filter(
              (l) => l.userId === u.uid && l.date === today,
            );
            return (
              <div
                key={u.uid}
                className="flex items-center justify-between p-3 bg-bg-primary rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <img src={u.photoURL} className="w-8 h-8 rounded-full" alt="" />
                  <div>
                    <div className="text-sm font-bold text-brand-ink">
                      {u.displayName}
                    </div>
                    <div className="text-[11px] text-muted uppercase font-black">
                      {u.role}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-brand-primary">
                    {userTodayLogs.length} Stickers Today
                  </div>
                </div>
              </div>
            );
          })}
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted text-sm font-bold uppercase tracking-widest">
              No users found
            </div>
          )}
        </div>
      </Card>

      <Card className="border-brand-accent/10 shadow-xl shadow-brand-accent/5">
        <h3 className="text-sm font-bold text-brand-ink mb-4">
          Global Goals & Challenges
        </h3>
        <div className="space-y-3">
          {globalTasks.map((t) => {
            const completions = allUsersLogs.filter(
              (l) => l.taskId === t.id && l.date === today,
            ).length;
            return (
              <div
                key={t.id}
                className="flex flex-col p-4 bg-bg-primary rounded-2xl border border-brand-accent/20"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-xl">
                      <TaskIcon name={t.icon} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-brand-ink">
                        {t.title}
                      </div>
                      {t.isDailyChallenge && (
                        <div className="text-[11px] font-black text-brand-primary uppercase">
                          Active Challenge
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Edit ${t.title}`}
                    onClick={() => openAddTask(t)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-brand-ink/5 rounded-lg text-muted"
                  >
                    <Settings size={14} strokeWidth={2} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-muted uppercase">
                    Completion Rate
                  </div>
                  <div className="text-sm font-black text-brand-accent">
                    {completions} / {allUsers.length} Users
                  </div>
                </div>
                <div className="mt-2 w-full h-1.5 bg-brand-ink/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-accent transition-all duration-500"
                    style={{
                      width: `${(completions / Math.max(1, allUsers.length)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => openAddTask(null)}
            className="w-full py-3 min-h-[52px] border-2 border-dashed border-brand-accent/30 rounded-2xl text-brand-ink text-sm font-bold uppercase tracking-widest"
          >
            + Add Global Goal
          </button>
        </div>
      </Card>
    </div>
  );
};
