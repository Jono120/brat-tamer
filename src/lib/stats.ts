/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StickerLog, Task } from "../types";

/** Current consecutive daily streak (counting today/yesterday as live). */
export function calculateStreak(allLogs: StickerLog[]): number {
  if (allLogs.length === 0) return 0;
  const dates = Array.from(new Set(allLogs.map((l) => l.date)))
    .sort()
    .reverse();
  let streak = 0;
  let curr = new Date();

  for (let i = 0; i < dates.length; i++) {
    const d = new Date(dates[i]);
    const diff = Math.floor(
      (curr.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff <= 1) {
      streak++;
      curr = d;
    } else {
      break;
    }
  }
  return streak;
}

/** Longest consecutive daily streak ever recorded. */
export function calculateLongestStreak(allLogs: StickerLog[]): number {
  if (allLogs.length === 0) return 0;
  const dates = Array.from(new Set(allLogs.map((l) => l.date))).sort();
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  for (const dateStr of dates) {
    const d = new Date(dateStr);
    if (lastDate) {
      const diff = Math.floor(
        (d.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      currentStreak = diff === 1 ? currentStreak + 1 : 1;
    } else {
      currentStreak = 1;
    }
    maxStreak = Math.max(maxStreak, currentStreak);
    lastDate = d;
  }
  return maxStreak;
}

export interface WeeklyStats {
  count: number;
  bestTask: Task | undefined;
  completionRate: number;
}

/** Weekly totals: stickers earned, most consistent task, completion rate. */
export function getWeeklyStats(
  allLogs: StickerLog[],
  tasks: Task[],
): WeeklyStats {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyLogs = allLogs.filter((l) => new Date(l.date) >= sevenDaysAgo);

  const taskCounts: Record<string, number> = {};
  weeklyLogs.forEach((l) => {
    taskCounts[l.taskId] = (taskCounts[l.taskId] || 0) + 1;
  });

  let bestTaskId = "";
  let maxCount = 0;
  Object.entries(taskCounts).forEach(([id, count]) => {
    if (count > maxCount) {
      maxCount = count;
      bestTaskId = id;
    }
  });

  const bestTask = tasks.find((t) => t.id === bestTaskId);
  const completionRate =
    tasks.length > 0 ? (weeklyLogs.length / (tasks.length * 7)) * 100 : 0;

  return {
    count: weeklyLogs.length,
    bestTask,
    completionRate: Math.min(100, Math.round(completionRate)),
  };
}
