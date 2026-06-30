/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useData } from "./DataProvider";

/** Authentication, profile, theme, onboarding and notification concerns. */
export function useAuth() {
  const d = useData();
  return {
    user: d.user,
    profile: d.profile,
    isAuthReady: d.isAuthReady,
    isAdmin: d.isAdmin,
    isGroupAdmin: d.isGroupAdmin,
    onboardingStep: d.onboardingStep,
    setOnboardingStep: d.setOnboardingStep,
    notificationsEnabled: d.notificationsEnabled,
    requestNotificationPermission: d.requestNotificationPermission,
    login: d.login,
    register: d.register,
    loginWithProvider: d.loginWithProvider,
    sendMagicLink: d.sendMagicLink,
    logout: d.logout,
    toggleTheme: d.toggleTheme,
    completeOnboarding: d.completeOnboarding,
    uploadAvatar: d.uploadAvatar,
    selectPresetAvatar: d.selectPresetAvatar,
  };
}

/** Tasks, logs and sticker mutations. */
export function useTasks() {
  const d = useData();
  return {
    tasks: d.tasks,
    globalTasks: d.globalTasks,
    logs: d.logs,
    allLogs: d.allLogs,
    today: d.today,
    hasLoadedData: d.hasLoadedData,
    isAdmin: d.isAdmin,
    toggleSticker: d.toggleSticker,
    createTask: d.createTask,
    updateTask: d.updateTask,
    deleteTask: d.deleteTask,
  };
}

/** Social interactions, sharing and group membership. */
export function useSocial() {
  const d = useData();
  return {
    interactions: d.interactions,
    group: d.group,
    hasLoadedData: d.hasLoadedData,
    sendInteraction: d.sendInteraction,
    shareProgress: d.shareProgress,
    generateInviteLink: d.generateInviteLink,
    createGroup: d.createGroup,
    joinGroup: d.joinGroup,
    submitFeedback: d.submitFeedback,
  };
}

/** Admin portal data: users, community logs and search. */
export function useAdmin() {
  const d = useData();
  return {
    allUsers: d.allUsers,
    allUsersLogs: d.allUsersLogs,
    globalTasks: d.globalTasks,
    today: d.today,
    hasLoadedData: d.hasLoadedData,
    adminSearchQuery: d.adminSearchQuery,
    setAdminSearchQuery: d.setAdminSearchQuery,
  };
}
