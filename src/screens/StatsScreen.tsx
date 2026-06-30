/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Star,
  Zap,
  Trophy,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Heart,
  Smile,
} from "lucide-react";
import { TaskIcon } from "../components/TaskIcon";
import { Card } from "../components/ui";
import { useTasks } from "../store/hooks";
import { useUiState } from "../store/UiStateProvider";
import { calculateLongestStreak, getWeeklyStats } from "../lib/stats";

/** Stats: weekly summary, calendar heatmap and achievement badges. */
export const StatsScreen = () => {
  const { tasks, globalTasks, allLogs } = useTasks();
  const { calendarDate, setCalendarDate, selectedDate, setSelectedDate } =
    useUiState();

  const longestStreak = useMemo(
    () => calculateLongestStreak(allLogs),
    [allLogs],
  );
  const weeklyStats = useMemo(
    () => getWeeklyStats(allLogs, tasks),
    [allLogs, tasks],
  );
  const totalStickers = allLogs.length;

  const badges = [
    { id: "first", title: "First Step", desc: "Earned 1 sticker", icon: <Heart size={24} strokeWidth={2} />, unlocked: totalStickers >= 1 },
    { id: "collector", title: "Collector", desc: "Earned 10 stickers", icon: <Trophy size={24} strokeWidth={2} />, unlocked: totalStickers >= 10 },
    { id: "master", title: "Sticker Master", desc: "Earned 50 stickers", icon: <Star size={24} strokeWidth={2} />, unlocked: totalStickers >= 50 },
    { id: "streak3", title: "3-Day Streak", desc: "3 day personal best", icon: <Zap size={24} strokeWidth={2} />, unlocked: longestStreak >= 3 },
    { id: "streak7", title: "Weekly Warrior", desc: "7 day personal best", icon: <Calendar size={24} strokeWidth={2} />, unlocked: longestStreak >= 7 },
    { id: "streak30", title: "Habit Hero", desc: "30 day personal best", icon: <Smile size={24} strokeWidth={2} />, unlocked: longestStreak >= 30 },
  ];

  const firstWeekday = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth(),
    1,
  ).getDay();
  const daysInMonth = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() + 1,
    0,
  ).getDate();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-brand-primary/10 rounded-[32px] p-5 border-2 border-brand-primary/20">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-strong mb-1">
            Weekly Score
          </div>
          <div className="text-2xl font-black text-brand-primary">
            {weeklyStats.count}
          </div>
          <div className="text-xs font-bold text-muted">Stickers earned</div>
        </div>
        <div className="bg-brand-success/10 rounded-[32px] p-5 border-2 border-brand-success/20">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-strong mb-1">
            Consistency
          </div>
          <div className="text-2xl font-black text-brand-success">
            {weeklyStats.completionRate}%
          </div>
          <div className="text-xs font-bold text-muted">Completion rate</div>
        </div>
      </div>

      {weeklyStats.bestTask && (
        <Card className="flex items-center gap-4 shadow-lg shadow-brand-ink/5">
          <div className="bg-brand-accent p-3 rounded-2xl text-brand-ink">
            <Star size={24} strokeWidth={2} fill="currentColor" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-strong">
              Top Performer
            </div>
            <h3 className="font-bold text-sm text-brand-ink">
              {weeklyStats.bestTask.title}
            </h3>
            <p className="text-xs text-muted">Most consistent goal this week</p>
          </div>
        </Card>
      )}

      <div className="bg-brand-secondary/10 rounded-[32px] p-6 border-2 border-brand-secondary/20 flex items-center gap-4">
        <div className="bg-brand-secondary p-3 rounded-2xl text-white">
          <Zap size={24} strokeWidth={2} fill="currentColor" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-strong">
            Personal Best
          </div>
          <div className="text-2xl font-black text-brand-secondary">
            {longestStreak} Days
          </div>
          <p className="text-xs text-muted">Your longest streak ever</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-8 mb-4">
        <h2 className="text-lg font-bold text-brand-ink">Progress Calendar</h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() =>
              setCalendarDate(
                new Date(new Date(calendarDate).setMonth(calendarDate.getMonth() - 1)),
              )
            }
            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-brand-ink/5 rounded-full"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() =>
              setCalendarDate(
                new Date(new Date(calendarDate).setMonth(calendarDate.getMonth() + 1)),
              )
            }
            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-brand-ink/5 rounded-full"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <Card className="shadow-xl shadow-brand-ink/5">
        <div className="text-center font-bold text-brand-primary mb-4">
          {calendarDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </div>
        <div className="grid grid-cols-7 gap-2 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={`${d}-${i}`} className="text-xs font-bold text-muted">
              {d}
            </div>
          ))}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasLog = allLogs.some((l) => l.date === dateStr);
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={day}
                type="button"
                aria-label={`${dateStr}${hasLog ? ", has stickers" : ""}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`aspect-square flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                  isSelected ? "ring-2 ring-brand-primary ring-offset-2" : ""
                } ${
                  hasLog
                    ? "bg-brand-primary text-white shadow-md shadow-brand-primary/30"
                    : "bg-bg-primary text-muted"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </Card>

      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-brand-primary/10 mt-4">
              <h3 className="text-sm font-bold text-brand-ink mb-4 flex items-center gap-2">
                <Calendar size={14} strokeWidth={2} className="text-brand-primary" />
                Goals on{" "}
                {new Date(selectedDate).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <div className="space-y-3">
                {allLogs
                  .filter((l) => l.date === selectedDate)
                  .map((log) => {
                    const task = [...globalTasks, ...tasks].find(
                      (t) => t.id === log.taskId,
                    );
                    if (!task) return null;
                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 bg-bg-primary rounded-2xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-lg">
                            <TaskIcon name={task.icon} />
                          </div>
                          <div className="text-sm font-bold text-brand-ink">
                            {task.title}
                          </div>
                        </div>
                        {log.count && log.count > 1 && (
                          <div className="text-xs font-black text-brand-primary">
                            {log.count}x
                          </div>
                        )}
                      </div>
                    );
                  })}
                {allLogs.filter((l) => l.date === selectedDate).length === 0 && (
                  <div className="text-center py-4 text-xs font-bold text-muted uppercase tracking-widest">
                    No goals completed
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-brand-secondary/10 rounded-[32px] p-6 border-2 border-brand-secondary/20">
        <div className="flex items-center gap-4">
          <div className="bg-brand-secondary p-3 rounded-2xl text-white">
            <Trophy size={24} strokeWidth={2} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-strong">
              Total Stickers
            </div>
            <div className="text-2xl font-black text-brand-secondary">
              {totalStickers}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <h2 className="text-lg font-bold text-brand-ink mb-4">
          Badges & Achievements
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                badge.unlocked
                  ? "bg-card-bg border-brand-accent shadow-lg shadow-brand-accent/10"
                  : "bg-bg-primary border-brand-ink/5 opacity-60 grayscale"
              }`}
            >
              <div
                className={`mb-2 ${badge.unlocked ? "text-brand-accent" : "text-muted"}`}
              >
                {badge.icon}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-center text-brand-ink">
                {badge.title}
              </div>
              {badge.unlocked && (
                <div className="mt-1 text-[11px] text-muted text-center">
                  {badge.desc}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
