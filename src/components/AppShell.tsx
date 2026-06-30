/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
} from "react-router-dom";
import { motion } from "motion/react";
import {
  Home,
  Calendar,
  Users,
  Monitor,
  Settings,
  Plus,
  Zap,
} from "lucide-react";
import { ProgressBar } from "./ui";
import { HomeScreen } from "../screens/HomeScreen";
import { StatsScreen } from "../screens/StatsScreen";
import { SocialScreen } from "../screens/SocialScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { AdminScreen } from "../screens/AdminScreen";
import { AddTaskModal } from "./modals/AddTaskModal";
import { DeleteConfirmModal, SaveConfirmModal } from "./modals/ConfirmModals";
import { FeedbackModal } from "./modals/FeedbackModal";
import { AvatarModal } from "./modals/AvatarModal";
import { InviteModal } from "./modals/InviteModal";
import { HelpModal } from "./modals/HelpModal";
import { CreateGroupModal } from "./modals/CreateGroupModal";
import { OnboardingOverlay } from "./modals/OnboardingOverlay";
import { useAuth, useTasks } from "../store/hooks";
import { useUiState } from "../store/UiStateProvider";
import { calculateStreak } from "../lib/stats";

const NAV_ICONS = {
  home: Home,
  calendar: Calendar,
  users: Users,
  monitor: Monitor,
  settings: Settings,
} as const;

interface NavItem {
  path: string;
  label: string;
  icon: keyof typeof NAV_ICONS;
  idAttr?: string;
}

/** Authenticated application shell: header, routed screens, nav and modals. */
export const AppShell = () => (
  <HashRouter>
    <Shell />
  </HashRouter>
);

const Shell = () => {
  const { profile, user, isAdmin } = useAuth();
  const { tasks, logs, allLogs } = useTasks();
  const { openAddTask } = useUiState();
  const location = useLocation();

  const streak = useMemo(() => calculateStreak(allLogs), [allLogs]);
  const earnedCount = logs.length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  const navItems: NavItem[] = [
    { path: "/", label: "Home", icon: "home" },
    { path: "/stats", label: "Stats", icon: "calendar" },
    { path: "/social", label: "Social", icon: "users", idAttr: "social-tab" },
    ...(isAdmin
      ? [{ path: "/admin", label: "Admin", icon: "monitor" as const }]
      : []),
    { path: "/settings", label: "Settings", icon: "settings" },
  ];

  const isHome = location.pathname === "/";

  return (
    <div className="app-container flex flex-col h-full overflow-hidden bg-bg-primary">
      {/* Safe-area top spacer (replaces the fake status bar) */}
      <div className="safe-top" aria-hidden="true" />

      <header className="px-6 pt-4 pb-4 text-center">
        <h1 className="text-2xl font-bold text-brand-primary tracking-tight">
          Care Chart
        </h1>
        <div className="flex items-center justify-center mt-3 gap-2">
          <img
            src={
              profile?.photoURL ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`
            }
            alt=""
            className="w-8 h-8 rounded-full border-2 border-brand-secondary"
          />
          <span className="font-semibold text-sm text-brand-ink">
            {profile?.displayName}'s Daily Goals
          </span>
        </div>
      </header>

      <div className="px-6 mb-6">
        <div className="flex justify-between items-end mb-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-strong">
              Daily Progress
            </span>
            <div className="text-2xl font-black text-brand-ink">
              {earnedCount} / {totalCount}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-strong">
              Streak
            </span>
            <div className="text-2xl font-black text-brand-primary flex items-center gap-1 justify-end">
              <Zap size={20} strokeWidth={2} fill="currentColor" />
              {streak}
            </div>
          </div>
        </div>
        <ProgressBar value={progress} label="Daily goal progress" />
      </div>

      <main className="flex-1 overflow-y-auto px-6 pb-24">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/stats" element={<StatsScreen />} />
          <Route path="/social" element={<SocialScreen />} />
          <Route
            path="/admin"
            element={isAdmin ? <AdminScreen /> : <Navigate to="/" replace />}
          />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {isHome && (
        <button
          id="add-goal-btn"
          type="button"
          aria-label="Add a new goal"
          onClick={() => openAddTask(null)}
          className="absolute bottom-28 right-6 w-14 h-14 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-brand-primary/40 active:scale-90 transition-transform z-10"
        >
          <Plus size={32} strokeWidth={2.5} />
        </button>
      )}

      <nav
        aria-label="Primary"
        className="bg-card-bg border-t border-brand-ink/5 flex justify-around items-stretch px-2 pb-[env(safe-area-inset-bottom,0px)]"
      >
        {navItems.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              id={item.idAttr}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 flex-1 min-h-[56px] py-2 transition-all ${
                  isActive ? "text-brand-primary" : "text-muted"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={24} strokeWidth={2} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-dot"
                      className="w-1 h-1 rounded-full bg-brand-primary"
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Modals & overlays */}
      <AddTaskModal />
      <SaveConfirmModal />
      <DeleteConfirmModal />
      <FeedbackModal />
      <AvatarModal />
      <InviteModal />
      <HelpModal />
      <CreateGroupModal />
      <OnboardingOverlay />
    </div>
  );
};
