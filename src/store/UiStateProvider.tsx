/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useMemo, useState } from "react";
import { Task } from "../types";

export type SortBy = "date" | "alpha";

export interface PendingTaskUpdate {
  title: string;
  icon: string;
  frequency: "daily" | "weekly";
  isGlobal: boolean;
  isDailyChallenge: boolean;
  description: string;
  targetCount: number;
}

interface UiStateContextValue {
  // modal flags
  showAddTask: boolean;
  setShowAddTask: (v: boolean) => void;
  showFeedback: boolean;
  setShowFeedback: (v: boolean) => void;
  showInviteModal: boolean;
  setShowInviteModal: (v: boolean) => void;
  showHelpModal: boolean;
  setShowHelpModal: (v: boolean) => void;
  showAvatarModal: boolean;
  setShowAvatarModal: (v: boolean) => void;
  showCreateGroup: boolean;
  setShowCreateGroup: (v: boolean) => void;
  // editing / selection
  editingTask: Task | null;
  setEditingTask: (t: Task | null) => void;
  taskToDelete: Task | null;
  setTaskToDelete: (t: Task | null) => void;
  pendingTaskUpdate: PendingTaskUpdate | null;
  setPendingTaskUpdate: (p: PendingTaskUpdate | null) => void;
  selectedDate: string | null;
  setSelectedDate: (d: string | null) => void;
  calendarDate: Date;
  setCalendarDate: (d: Date) => void;
  sortBy: SortBy;
  setSortBy: (s: SortBy) => void;
  // helpers
  openAddTask: (task?: Task | null) => void;
  closeAddTask: () => void;
}

const UiStateContext = createContext<UiStateContextValue | null>(null);

export const useUiState = (): UiStateContextValue => {
  const ctx = useContext(UiStateContext);
  if (!ctx) throw new Error("useUiState must be used within a UiStateProvider");
  return ctx;
};

export const UiStateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [showAddTask, setShowAddTask] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [pendingTaskUpdate, setPendingTaskUpdate] =
    useState<PendingTaskUpdate | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [sortBy, setSortBy] = useState<SortBy>("date");

  const value = useMemo<UiStateContextValue>(
    () => ({
      showAddTask,
      setShowAddTask,
      showFeedback,
      setShowFeedback,
      showInviteModal,
      setShowInviteModal,
      showHelpModal,
      setShowHelpModal,
      showAvatarModal,
      setShowAvatarModal,
      showCreateGroup,
      setShowCreateGroup,
      editingTask,
      setEditingTask,
      taskToDelete,
      setTaskToDelete,
      pendingTaskUpdate,
      setPendingTaskUpdate,
      selectedDate,
      setSelectedDate,
      calendarDate,
      setCalendarDate,
      sortBy,
      setSortBy,
      openAddTask: (task: Task | null = null) => {
        setEditingTask(task);
        setShowAddTask(true);
      },
      closeAddTask: () => {
        setShowAddTask(false);
        setEditingTask(null);
      },
    }),
    [
      showAddTask,
      showFeedback,
      showInviteModal,
      showHelpModal,
      showAvatarModal,
      showCreateGroup,
      editingTask,
      taskToDelete,
      pendingTaskUpdate,
      selectedDate,
      calendarDate,
      sortBy,
    ],
  );

  return (
    <UiStateContext.Provider value={value}>{children}</UiStateContext.Provider>
  );
};
