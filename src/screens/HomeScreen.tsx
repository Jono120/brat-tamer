/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, Check, Settings, Share2, Sparkles } from "lucide-react";
import { TaskIcon } from "../components/TaskIcon";
import { Button, EmptyState, StickerGridSkeleton } from "../components/ui";
import { useTasks, useSocial } from "../store/hooks";
import { useUiState } from "../store/UiStateProvider";

/** Home: daily challenge, goal grid and sharing. */
export const HomeScreen = () => {
  const {
    tasks,
    globalTasks,
    logs,
    toggleSticker,
    isAdmin,
    hasLoadedData,
  } = useTasks();
  const { shareProgress } = useSocial();
  const { sortBy, setSortBy, openAddTask } = useUiState();

  const sortedTasks = useMemo(() => {
    const allTasks = [...globalTasks, ...tasks];
    const uniqueTasks = Array.from(
      new Map(allTasks.map((t) => [t.id, t])).values(),
    );
    return uniqueTasks.sort((a, b) => {
      if (sortBy === "alpha") return a.title.localeCompare(b.title);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [globalTasks, tasks, sortBy]);

  const dailyChallenge = globalTasks.find((t) => t.isDailyChallenge);
  const showSkeleton = !hasLoadedData && sortedTasks.length === 0;

  return (
    <div className="space-y-6">
      {dailyChallenge && (
        <div className="bg-gradient-to-br from-brand-primary to-brand-secondary p-6 rounded-[32px] text-white shadow-xl shadow-brand-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Star size={80} strokeWidth={2} />
          </div>
          <div className="relative z-10">
            <div className="text-xs font-black uppercase tracking-[0.2em] mb-2 text-white/90">
              Daily Challenge
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <TaskIcon name={dailyChallenge.icon} className="text-white" />
              </div>
              <div>
                <div className="text-xl font-black">{dailyChallenge.title}</div>
                <div className="text-sm font-bold text-white/80">
                  Complete this for extra pride!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-strong">
          My Goals
        </h3>
        <div className="flex gap-2" role="group" aria-label="Sort goals">
          <button
            type="button"
            aria-pressed={sortBy === "date"}
            onClick={() => setSortBy("date")}
            className={`text-[11px] font-black uppercase tracking-widest px-3 py-2 min-h-[44px] rounded-md transition-all ${sortBy === "date" ? "bg-brand-primary text-white" : "bg-brand-ink/5 text-muted"}`}
          >
            Newest
          </button>
          <button
            type="button"
            aria-pressed={sortBy === "alpha"}
            onClick={() => setSortBy("alpha")}
            className={`text-[11px] font-black uppercase tracking-widest px-3 py-2 min-h-[44px] rounded-md transition-all ${sortBy === "alpha" ? "bg-brand-primary text-white" : "bg-brand-ink/5 text-muted"}`}
          >
            A-Z
          </button>
        </div>
      </div>

      {showSkeleton ? (
        <StickerGridSkeleton count={4} />
      ) : sortedTasks.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={48} strokeWidth={2} />}
          title="No goals yet"
          description="Add your first self-care goal to start earning stickers."
          action={
            <Button onClick={() => openAddTask(null)}>Add your first goal</Button>
          }
        />
      ) : (
        <div id="sticker-grid" className="grid grid-cols-2 gap-4">
          <AnimatePresence>
            {sortedTasks.map((task) => {
              const log = logs.find((l) => l.taskId === task.id);
              const isEarned =
                task.targetCount && task.targetCount > 1
                  ? (log?.count || 0) >= task.targetCount
                  : !!log;
              const isGlobal = task.isGlobal;
              const hasProgress = task.targetCount && task.targetCount > 1;
              const currentCount = log?.count || 0;

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative"
                >
                  <button
                    type="button"
                    aria-label={`${task.title}${isEarned ? ", completed" : ""}. Tap to ${isEarned ? "remove sticker" : "earn sticker"}.`}
                    aria-pressed={isEarned}
                    onClick={() => toggleSticker(task.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (isGlobal && !isAdmin) return;
                      openAddTask(task);
                    }}
                    className={`w-full sticker-slot relative flex flex-col items-center justify-center h-32 rounded-[32px] border-2 transition-all overflow-hidden ${
                      isEarned
                        ? "bg-card-bg border-brand-secondary shadow-lg shadow-brand-secondary/20"
                        : "bg-bg-primary border-dashed border-brand-ink/15"
                    } ${isGlobal ? "border-brand-accent/40" : ""}`}
                  >
                    {hasProgress && !isEarned && currentCount > 0 && (
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-ink/5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(currentCount / task.targetCount!) * 100}%`,
                          }}
                          transition={{ type: "spring", damping: 20, stiffness: 100 }}
                          className="h-full bg-brand-primary/40"
                        />
                      </div>
                    )}

                    {isGlobal && (
                      <div className="absolute top-2 right-2 bg-brand-accent/15 text-brand-ink text-[11px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                        Global
                      </div>
                    )}

                    <div className="relative mb-2">
                      <motion.div
                        key={`${task.id}-${currentCount}`}
                        initial={{ scale: 1 }}
                        animate={{
                          scale: [1, 1.25, 1],
                          rotate: isEarned ? [0, 15, -15, 0] : [0, 5, -5, 0],
                        }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className={`text-4xl transition-all ${isEarned || (hasProgress && currentCount > 0) ? "scale-110" : "opacity-30 grayscale"}`}
                      >
                        <TaskIcon
                          name={task.icon}
                          className={
                            isEarned
                              ? "text-brand-primary"
                              : currentCount > 0
                                ? "text-brand-primary/70"
                                : "text-muted"
                          }
                        />
                      </motion.div>

                      {isEarned && (
                        <motion.div
                          key={`burst-${task.id}-${currentCount}`}
                          initial="initial"
                          animate="animate"
                          className="absolute inset-0 pointer-events-none flex items-center justify-center"
                        >
                          {[...Array(8)].map((_, i) => (
                            <motion.div
                              key={i}
                              variants={{
                                initial: { scale: 0, x: 0, y: 0, opacity: 1 },
                                animate: {
                                  scale: [0, 1, 0],
                                  opacity: [1, 1, 0],
                                  x: Math.cos((i * 45 * Math.PI) / 180) * 45,
                                  y: Math.sin((i * 45 * Math.PI) / 180) * 45,
                                },
                              }}
                              transition={{
                                duration: 0.6,
                                ease: "easeOut",
                                delay: i * 0.02,
                              }}
                              className="absolute w-1.5 h-1.5 bg-brand-primary rounded-full"
                            />
                          ))}
                        </motion.div>
                      )}
                    </div>

                    <span
                      className={`text-xs font-bold uppercase tracking-tight ${isEarned || (hasProgress && currentCount > 0) ? "text-brand-ink" : "text-muted"}`}
                    >
                      {task.title}
                    </span>

                    {hasProgress && !isEarned && currentCount > 0 && (
                      <div className="absolute top-2 left-2 bg-brand-primary/10 text-brand-primary text-[11px] font-black px-1.5 py-0.5 rounded-full">
                        {currentCount}/{task.targetCount}
                      </div>
                    )}
                    {task.description && (
                      <span className="text-[11px] text-muted px-4 text-center line-clamp-1 mt-0.5">
                        {task.description}
                      </span>
                    )}
                    <div className="text-[11px] font-bold text-muted uppercase mt-1">
                      {task.frequency}
                    </div>
                    {isEarned && (
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute -top-1 -right-1 bg-brand-success text-brand-ink p-1 rounded-full shadow-md"
                      >
                        <Check size={12} strokeWidth={4} />
                      </motion.div>
                    )}
                  </button>
                  {(!isGlobal || isAdmin) && (
                    <button
                      type="button"
                      aria-label={`Edit ${task.title}`}
                      onClick={() => openAddTask(task)}
                      className="absolute top-2 left-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-brand-ink/5 rounded-full text-muted hover:text-brand-primary transition-colors"
                    >
                      <Settings size={14} strokeWidth={2} />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <button
        type="button"
        onClick={shareProgress}
        className="w-full flex items-center justify-center gap-2 py-4 min-h-[52px] bg-card-bg rounded-2xl border-2 border-brand-secondary text-brand-secondary font-bold shadow-sm"
      >
        <Share2 size={20} strokeWidth={2} />
        Share Progress
      </button>
    </div>
  );
};
