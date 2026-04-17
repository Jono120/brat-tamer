/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Home,
  Users,
  Trophy,
  Settings,
  LogOut,
  Check,
  X,
  Heart,
  Droplets,
  Moon,
  Sun,
  Book,
  Coffee,
  Smile,
  Zap,
  Calendar,
  Share2,
  HandMetal,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  Monitor,
  Copy,
  ExternalLink,
  HelpCircle,
  Info,
  Camera,
  Search,
} from "lucide-react";
import { careApi, SessionUser } from "./api/careApi";
import { getToken, setToken } from "./api/client";
import { signInWithApple } from "./lib/appleSignIn";
import {
  Task,
  StickerLog,
  UserProfile,
  OperationType,
  FirestoreErrorInfo,
  Interaction,
  Group,
} from "./types";
import { ErrorBoundary } from "./components/ErrorBoundary";

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// --- Error Handling ---
/**
 * Handles API errors by logging them and throwing a standardized error object compatible with ErrorBoundary.
 */
function handleApiError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: undefined,
      email: undefined,
      emailVerified: undefined,
      isAnonymous: undefined,
      tenantId: undefined,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error("API Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

/**
 * Renders a task icon with consistent styling.
 * @param {string} name - The name of the icon to render.
 * @param {string} [className] - Optional CSS classes for styling.
 * @returns {React.ReactNode} The rendered icon component.
 */
const TaskIcon = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => {
  const icons: Record<string, React.ReactNode> = {
    droplets: <Droplets size={20} strokeWidth={2} className={className} />,
    moon: <Moon size={20} strokeWidth={2} className={className} />,
    sun: <Sun size={20} strokeWidth={2} className={className} />,
    book: <Book size={20} strokeWidth={2} className={className} />,
    coffee: <Coffee size={20} strokeWidth={2} className={className} />,
    smile: <Smile size={20} strokeWidth={2} className={className} />,
    zap: <Zap size={20} strokeWidth={2} className={className} />,
    heart: <Heart size={20} strokeWidth={2} className={className} />,
  };
  return (
    icons[name] || <Heart size={20} strokeWidth={2} className={className} />
  );
};

const PRESET_ICONS = [
  "droplets",
  "moon",
  "sun",
  "book",
  "coffee",
  "smile",
  "zap",
  "heart",
];

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe",
];

const FAQ_ITEMS = [
  {
    question: "How do I earn stickers?",
    answer:
      "Simply tap on any goal on your home screen once you've completed it. A vibrant sticker will appear, and your progress will be tracked!",
  },
  {
    question: "What are Global Goals?",
    answer:
      "Global Goals are community-wide challenges set by administrators. Everyone works on these together, and you can see the community's progress in the Admin Portal.",
  },
  {
    question: "How do I add friends?",
    answer:
      "Go to the 'Social' tab and click 'Invite Friend'. Share your unique link with them. Once they join using your link, you'll be automatically connected!",
  },
  {
    question: "Can I change my theme?",
    answer:
      "Yes! Go to the 'Settings' tab and toggle between Light and Dark mode to suit your preference.",
  },
];

const ONBOARDING_STEPS = [
  {
    title: "Welcome to CareStickers!",
    description:
      "Your journey to a better self starts here. Let's show you around!",
    icon: <Smile size={48} strokeWidth={2} className="text-brand-primary" />,
    target: null,
  },
  {
    title: "Create Goals",
    description:
      "Tap the plus button to add your self-care goals. Daily or weekly, you decide!",
    icon: <Plus size={48} strokeWidth={2} className="text-brand-primary" />,
    target: "#add-goal-btn",
  },
  {
    title: "Earn Stickers",
    description:
      "Tap a goal to earn a sticker. Watch your chart fill up with color!",
    icon: <Check size={48} strokeWidth={2} className="text-brand-primary" />,
    target: "#sticker-grid",
  },
  {
    title: "Connect",
    description: "Invite friends to share progress and send high-fives!",
    icon: <Users size={48} strokeWidth={2} className="text-brand-primary" />,
    target: "#social-tab",
  },
];

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<StickerLog[]>([]);
  const [allLogs, setAllLogs] = useState<StickerLog[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allUsersLogs, setAllUsersLogs] = useState<StickerLog[]>([]);
  const [globalTasks, setGlobalTasks] = useState<Task[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "alpha">("date");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [pendingTaskUpdate, setPendingTaskUpdate] = useState<{
    title: string;
    icon: string;
    frequency: "daily" | "weekly";
    isGlobal: boolean;
    isDailyChallenge: boolean;
    description: string;
    targetCount: number;
  } | null>(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [group, setGroup] = useState<Group | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const seenInteractionIds = useRef<Set<string>>(new Set());
  const notificationPrimed = useRef(false);

  const isAdmin =
    profile?.role === "admin" ||
    (!!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  const isGroupAdmin = profile?.role === "group-admin";

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // OAuth redirect (?token=) + optional ?invite=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    const token = params.get("token");
    const err = params.get("error");
    if (invite) {
      setInviteCode(invite);
    }
    if (err) {
      setAuthError(`Sign-in failed (${err})`);
    }
    if (token) {
      setToken(token);
    }
    if (invite || token || err) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    async function boot() {
      if (!getToken()) {
        setIsAuthReady(true);
        return;
      }
      try {
        const me = await careApi.me();
        setUser(me.user);
        setProfile(me.profile);
        if (me.profile.theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
        if (me.profile.hasCompletedOnboarding === false) {
          setOnboardingStep(0);
        }
      } catch {
        setToken(null);
        setUser(null);
        setProfile(null);
      } finally {
        setIsAuthReady(true);
      }
    }
    void boot();
  }, []);

  // Handle Invite (friend link)
  useEffect(() => {
    if (user && inviteCode && !isProcessingInvite) {
      const processInvite = async () => {
        setIsProcessingInvite(true);
        try {
          const inv = await careApi.getInvite(inviteCode);
          if (inv.inviterId !== user.uid) {
            await careApi.acceptInvite(inviteCode);
            const me = await careApi.me();
            setProfile(me.profile);
            alert("You're now connected with your friend!");
          }
        } catch (e) {
          console.error("Error processing invite", e);
        } finally {
          setInviteCode(null);
          setIsProcessingInvite(false);
        }
      };
      void processInvite();
    }
  }, [user, inviteCode, isProcessingInvite]);

  // Group (poll)
  useEffect(() => {
    if (!user || !profile?.groupId) {
      setGroup(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const g = await careApi.group(profile.groupId!);
        if (!cancelled) setGroup(g);
      } catch {
        if (!cancelled) setGroup(null);
      }
    };
    void load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user, profile?.groupId]);

  // Data refresh (replaces Firestore listeners)
  useEffect(() => {
    if (!user || !isAuthReady) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const [me, mine, glob, logsToday, logsAll, inbox] = await Promise.all([
          careApi.me(),
          careApi.tasksMine(),
          careApi.tasksGlobal(),
          careApi.logsMine(today),
          careApi.logsMine(),
          careApi.interactionsInbox(),
        ]);
        if (cancelled) return;
        setUser(me.user);
        setProfile(me.profile);
        setTasks(mine);
        setGlobalTasks(glob);
        setLogs(logsToday);
        setAllLogs(logsAll);
        setInteractions(inbox);
        if (me.profile.theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
        const adminUser =
          me.profile.role === "admin" ||
          (!!me.user.email &&
            ADMIN_EMAILS.includes(me.user.email.toLowerCase()));
        if (adminUser) {
          const [users, allL] = await Promise.all([
            careApi.adminUsers(),
            careApi.adminLogs(),
          ]);
          if (!cancelled) {
            setAllUsers(users);
            setAllUsersLogs(allL);
          }
        } else {
          setAllUsers([]);
          setAllUsersLogs([]);
        }
      } catch (e) {
        console.error(e);
      }
    };

    void refresh();
    const interval = setInterval(refresh, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, isAuthReady, today]);

  /**
   * Toggles a sticker for a specific task on the current day.
   * If the task has a target count, increments the count or deletes the log if target is exceeded.
   * @param {string} taskId - The ID of the task to toggle.
   */
  const toggleSticker = async (taskId: string) => {
    if (!user) return;
    const task = [...globalTasks, ...tasks].find((t) => t.id === taskId);
    if (!task) return;

    const existingLog = logs.find((l) => l.taskId === taskId);

    if (existingLog) {
      if (task.targetCount && task.targetCount > 1) {
        if ((existingLog.count || 1) < task.targetCount) {
          try {
            await careApi.updateLog(existingLog.id, {
              count: (existingLog.count || 1) + 1,
              earnedAt: new Date().toISOString(),
            });
          } catch (e) {
            handleApiError(e, OperationType.UPDATE, `logs/${existingLog.id}`);
          }
        } else {
          try {
            await careApi.deleteLog(existingLog.id);
          } catch (e) {
            handleApiError(e, OperationType.DELETE, `logs/${existingLog.id}`);
          }
        }
      } else {
        try {
          await careApi.deleteLog(existingLog.id);
        } catch (e) {
          handleApiError(e, OperationType.DELETE, `logs/${existingLog.id}`);
        }
      }
    } else {
      try {
        await careApi.createLog({
          taskId,
          date: today,
          earnedAt: new Date().toISOString(),
          count: 1,
        });
      } catch (e) {
        handleApiError(e, OperationType.CREATE, "logs");
      }
    }
  };

  const sortedTasks = useMemo(() => {
    const allTasks = [...globalTasks, ...tasks];
    // Ensure unique tasks by ID to prevent duplicate key errors
    const uniqueTasks = Array.from(
      new Map(allTasks.map((t) => [t.id, t])).values(),
    );

    return uniqueTasks.sort((a, b) => {
      if (sortBy === "alpha") {
        return a.title.localeCompare(b.title);
      } else {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    });
  }, [globalTasks, tasks, sortBy]);

  /**
   * Adds a new task or updates an existing one.
   * If editing, prompts for confirmation before saving.
   */
  const addTask = async (
    title: string,
    icon: string,
    frequency: "daily" | "weekly",
    isGlobal: boolean = false,
    isDailyChallenge: boolean = false,
    description: string = "",
    targetCount: number = 1,
  ) => {
    if (!user) return;

    // If editing, show confirmation modal instead of saving directly
    if (editingTask) {
      setPendingTaskUpdate({
        title,
        icon,
        frequency,
        isGlobal: isAdmin ? isGlobal : false,
        isDailyChallenge: isAdmin ? isDailyChallenge : false,
        description,
        targetCount,
      });
      return;
    }

    try {
      await careApi.createTask({
        title,
        icon,
        frequency,
        isGlobal: isAdmin ? isGlobal : false,
        isDailyChallenge: isAdmin ? isDailyChallenge : false,
        description,
        targetCount,
      });
      setShowAddTask(false);
    } catch (e) {
      handleApiError(e, OperationType.CREATE, "tasks");
    }
  };

  /**
   * Confirms and saves the pending task update.
   */
  const confirmSaveTask = async () => {
    if (!user || !editingTask || !pendingTaskUpdate) return;

    try {
      await careApi.updateTask(editingTask.id, { ...pendingTaskUpdate });
      setPendingTaskUpdate(null);
      setEditingTask(null);
      setShowAddTask(false);
    } catch (e) {
      handleApiError(e, OperationType.UPDATE, `tasks/${editingTask.id}`);
    }
  };

  /**
   * Deletes a task after user confirmation.
   */
  const deleteTask = async (taskId: string) => {
    if (!user) return;
    try {
      await careApi.deleteTask(taskId);
      setShowAddTask(false);
      setEditingTask(null);
      setTaskToDelete(null);
    } catch (e) {
      handleApiError(e, OperationType.DELETE, `tasks/${taskId}`);
    }
  };

  /**
   * Handles custom avatar upload and converts to base64.
   */
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        if (user) {
          try {
            await careApi.patchProfile({ photoURL: base64String });
            setShowAvatarModal(false);
          } catch (err) {
            handleApiError(err, OperationType.UPDATE, `users/${user.uid}`);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Updates user profile with a preset avatar URL.
   */
  const selectPresetAvatar = async (url: string) => {
    if (user) {
      try {
        await careApi.patchProfile({ photoURL: url });
        setShowAvatarModal(false);
      } catch (err) {
        handleApiError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  /**
   * Sends a social interaction (high-five or message) to another user.
   * @param {toUserId} toUserId - The ID of the recipient user.
   * @param {'high-five' | 'message'} type - The type of interaction.
   * @param {string} [content=''] - Optional message content.
   */
  const sendInteraction = async (
    toUserId: string,
    type: "high-five" | "message",
    content: string = "",
  ) => {
    if (!user) return;
    try {
      await careApi.createInteraction({
        toUserId,
        type,
        content,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      handleApiError(e, OperationType.CREATE, "interactions");
    }
  };

  /**
   * Shares the user's progress using the Web Share API or copies it to the clipboard.
   */
  const shareProgress = async () => {
    const text = `I've earned ${allLogs.length} stickers on CareStickers! 🌟 Join me in our self-care journey!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "CareStickers Progress",
          text,
          url: window.location.href,
        });
      } catch (e) {
        console.error("Error sharing", e);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(text + " " + window.location.href);
      alert("Progress copied to clipboard!");
    }
  };

  /**
   * Calculates the current consecutive daily streak.
   * @returns {number} The current streak in days.
   */
  const calculateStreak = () => {
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
  };

  /**
   * Toggles the application theme between light and dark modes.
   */
  const toggleTheme = async () => {
    if (!user || !profile) return;
    const newTheme = profile.theme === "dark" ? "light" : "dark";
    try {
      await careApi.patchProfile({ theme: newTheme });
    } catch (e) {
      handleApiError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  /**
   * Requests permission for push notifications.
   */
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
  };

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      notificationPrimed.current = false;
      seenInteractionIds.current = new Set();
    }
  }, [user?.uid]);

  // Social notifications (polling-driven interactions list)
  useEffect(() => {
    if (!user || !notificationsEnabled) return;
    if (!notificationPrimed.current) {
      interactions.forEach((i) => seenInteractionIds.current.add(i.id));
      notificationPrimed.current = true;
      return;
    }
    for (const i of interactions) {
      if (!i.read && !seenInteractionIds.current.has(i.id)) {
        try {
          new Notification("New Interaction! 🌟", {
            body: `Someone sent you a ${i.type}!`,
            icon: "/favicon.ico",
          });
        } catch {
          /* ignore */
        }
        seenInteractionIds.current.add(i.id);
      }
    }
  }, [user, notificationsEnabled, interactions]);

  /**
   * Generates a unique invite link for the current user and copies it to the clipboard.
   */
  const generateInviteLink = async () => {
    if (!user) return;
    try {
      const { id } = await careApi.createInvite();
      const inviteLink = `${window.location.origin}?invite=${id}`;
      navigator.clipboard.writeText(inviteLink);
      alert("Invite link copied to clipboard! Send it to your friends.");
    } catch (e) {
      handleApiError(e, OperationType.CREATE, "invites");
    }
  };

  const streak = calculateStreak();

  /**
   * Submits user feedback (feature request or issue report) to Firestore.
   * @param {string} content - The feedback content.
   * @param {'feature' | 'issue'} type - The type of feedback.
   */
  const submitFeedback = async (content: string, type: "feature" | "issue") => {
    if (!user) return;
    try {
      await careApi.submitFeedback(content, type);
      setShowFeedback(false);
      alert("Thank you for your feedback! 🌟");
    } catch (e) {
      handleApiError(e, OperationType.CREATE, "feedback");
    }
  };

  /**
   * Marks the onboarding tutorial as completed for the current user.
   */
  const completeOnboarding = async () => {
    if (!user) return;
    try {
      await careApi.patchProfile({ hasCompletedOnboarding: true });
      setOnboardingStep(null);
    } catch (e) {
      console.error("Error completing onboarding", e);
    }
  };

  /**
   * Calculates the longest consecutive daily streak from all logs.
   * @returns {number} The longest streak in days.
   */
  const calculateLongestStreak = () => {
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
        if (diff === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      maxStreak = Math.max(maxStreak, currentStreak);
      lastDate = d;
    }
    return maxStreak;
  };

  /**
   * Compiles weekly statistics including total logs, best task, and completion rate.
   * @returns {object} An object containing weekly stats.
   */
  const getWeeklyStats = () => {
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
  };

  /**
   * Creates a new group and sets the current user as the group admin.
   * @param {string} name - The name of the group to create.
   */
  const createGroup = async (name: string) => {
    if (!user) return;
    try {
      await careApi.createGroup(name);
      const me = await careApi.me();
      setProfile(me.profile);
      setShowCreateGroup(false);
    } catch (e) {
      handleApiError(e, OperationType.CREATE, "groups");
    }
  };

  /**
   * Joins a group using an invite code.
   * @param {string} code - The invite code for the group.
   */
  const joinGroup = async (code: string) => {
    if (!user) return;
    try {
      const res = await careApi.joinGroup(code);
      if (res.alreadyMember) {
        alert("You are already a member of this group.");
        return;
      }
      const me = await careApi.me();
      setProfile(me.profile);
      alert(`Joined group: ${res.group.name}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Invalid") || msg.includes("404")) {
        alert("Invalid invite code.");
        return;
      }
      handleApiError(e, OperationType.UPDATE, "groups");
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setProfile(null);
    setTasks([]);
    setLogs([]);
    setAllLogs([]);
    setInteractions([]);
    setGlobalTasks([]);
    setGroup(null);
    setOnboardingStep(null);
    document.documentElement.classList.remove("dark");
  };

  const longestStreak = calculateLongestStreak();
  const weeklyStats = getWeeklyStats();
  const totalStickers = allLogs.length;

  const badges = [
    {
      id: "first",
      title: "First Step",
      desc: "Earned 1 sticker",
      icon: <Heart size={24} strokeWidth={2} />,
      unlocked: totalStickers >= 1,
    },
    {
      id: "collector",
      title: "Collector",
      desc: "Earned 10 stickers",
      icon: <Trophy size={24} strokeWidth={2} />,
      unlocked: totalStickers >= 10,
    },
    {
      id: "master",
      title: "Sticker Master",
      desc: "Earned 50 stickers",
      icon: <Star size={24} strokeWidth={2} />,
      unlocked: totalStickers >= 50,
    },
    {
      id: "streak3",
      title: "3-Day Streak",
      desc: "3 day personal best",
      icon: <Zap size={24} strokeWidth={2} />,
      unlocked: longestStreak >= 3,
    },
    {
      id: "streak7",
      title: "Weekly Warrior",
      desc: "7 day personal best",
      icon: <Calendar size={24} strokeWidth={2} />,
      unlocked: longestStreak >= 7,
    },
    {
      id: "streak30",
      title: "Habit Hero",
      desc: "30 day personal best",
      icon: <Smile size={24} strokeWidth={2} />,
      unlocked: longestStreak >= 30,
    },
  ];
  const earnedCount = logs.length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <div className="animate-bounce text-brand-primary">
          <Heart size={48} strokeWidth={2} fill="currentColor" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg-primary p-6 text-center overflow-y-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card-bg p-8 rounded-[40px] shadow-2xl border-4 border-brand-primary max-w-sm w-full"
        >
          <div className="mb-6 flex justify-center">
            <div className="bg-brand-secondary p-4 rounded-full">
              <Smile size={48} strokeWidth={2} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-brand-primary mb-2">
            CareStickers
          </h1>
          <p className="text-brand-ink opacity-70 mb-8 text-sm">
            Track your self-care journey with friends. Earn stickers, stay
            healthy!
          </p>

          <div className="space-y-4 mb-8">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-bg-primary rounded-xl border-2 border-transparent focus:border-brand-primary outline-none text-sm"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-bg-primary rounded-xl border-2 border-transparent focus:border-brand-primary outline-none text-sm"
            />
            {authError && (
              <p className="text-red-500 text-[10px] font-bold">{authError}</p>
            )}
            <button
              onClick={async () => {
                setAuthError("");
                try {
                  const { token } = isLogin
                    ? await careApi.login(email, password)
                    : await careApi.register(email, password);
                  setToken(token);
                  const me = await careApi.me();
                  setUser(me.user);
                  setProfile(me.profile);
                  if (me.profile.theme === "dark") {
                    document.documentElement.classList.add("dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                  }
                  if (me.profile.hasCompletedOnboarding === false) {
                    setOnboardingStep(0);
                  }
                } catch (e: unknown) {
                  setAuthError(e instanceof Error ? e.message : String(e));
                }
              }}
              className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold text-sm shadow-md"
            >
              {isLogin ? "Login" : "Sign Up"}
            </button>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] font-bold text-brand-primary uppercase tracking-widest"
            >
              {isLogin ? "Need an account? Sign Up" : "Have an account? Login"}
            </button>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-ink/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold">
              <span className="bg-card-bg px-2 text-brand-ink/40">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/auth/google";
              }}
              className="w-full py-3 bg-white text-brand-ink border-2 border-brand-ink/5 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                className="w-4 h-4"
                alt=""
              />
              Google
            </button>
            <button
              type="button"
              onClick={async () => {
                setAuthError("");
                try {
                  const idToken = await signInWithApple();
                  const { token } = await careApi.apple(idToken);
                  setToken(token);
                  const me = await careApi.me();
                  setUser(me.user);
                  setProfile(me.profile);
                  if (me.profile.theme === "dark") {
                    document.documentElement.classList.add("dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                  }
                  if (me.profile.hasCompletedOnboarding === false) {
                    setOnboardingStep(0);
                  }
                } catch (e: unknown) {
                  setAuthError(e instanceof Error ? e.message : String(e));
                }
              }}
              className="w-full py-3 bg-white text-brand-ink border-2 border-brand-ink/5 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2"
            >
              <svg
                viewBox="0 0 384 512"
                width="16"
                height="16"
                fill="currentColor"
              >
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
              </svg>
              Apple
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-container flex flex-col h-full overflow-hidden bg-bg-primary">
        {/* Status Bar Simulation */}
        <div className="h-8 px-6 flex justify-between items-center text-[10px] font-bold opacity-40">
          <span>9:41</span>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-ink" />
            <div className="w-1.5 h-1.5 rounded-full bg-brand-ink" />
            <div className="w-1.5 h-1.5 rounded-full bg-brand-ink" />
            <div className="w-1.5 h-1.5 rounded-full border border-brand-ink" />
          </div>
        </div>

        {/* Header */}
        <header className="px-6 py-4 text-center">
          <h1 className="text-2xl font-bold text-brand-primary tracking-tight">
            Care Chart
          </h1>
          <div className="flex items-center justify-center mt-3 gap-2">
            <img
              src={
                profile?.photoURL ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
              }
              alt="Avatar"
              className="w-8 h-8 rounded-full border-2 border-brand-secondary"
            />
            <span className="font-semibold text-sm">
              {profile?.displayName}'s Daily Goals
            </span>
          </div>
        </header>

        {/* Progress */}
        <div className="px-6 mb-6">
          <div className="flex justify-between items-end mb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-40">
                Daily Progress
              </span>
              <div className="text-2xl font-black text-brand-ink">
                {earnedCount} / {totalCount}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-40">
                Streak
              </span>
              <div className="text-2xl font-black text-brand-primary flex items-center gap-1 justify-end">
                <Zap size={20} strokeWidth={2} fill="currentColor" />
                {streak}
              </div>
            </div>
          </div>
          <div className="h-3 bg-brand-ink/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="h-full bg-gradient-to-r from-brand-primary to-brand-accent"
            />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-6 pb-24">
          {activeTab === "home" && (
            <div className="space-y-6">
              {globalTasks.find((t) => t.isDailyChallenge) && (
                <div className="bg-gradient-to-br from-brand-primary to-brand-secondary p-6 rounded-[32px] text-white shadow-xl shadow-brand-primary/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Star size={80} strokeWidth={2} />
                  </div>
                  <div className="relative z-10">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">
                      Daily Challenge
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                        <TaskIcon
                          name={
                            globalTasks.find((t) => t.isDailyChallenge)!.icon
                          }
                          className="text-white"
                        />
                      </div>
                      <div>
                        <div className="text-xl font-black">
                          {globalTasks.find((t) => t.isDailyChallenge)!.title}
                        </div>
                        <div className="text-xs font-bold opacity-70">
                          Complete this for extra pride!
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-ink/40">
                  My Goals
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortBy("date")}
                    className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${sortBy === "date" ? "bg-brand-primary text-white" : "bg-brand-ink/5 text-brand-ink/40"}`}
                  >
                    Newest
                  </button>
                  <button
                    onClick={() => setSortBy("alpha")}
                    className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${sortBy === "alpha" ? "bg-brand-primary text-white" : "bg-brand-ink/5 text-brand-ink/40"}`}
                  >
                    A-Z
                  </button>
                </div>
              </div>

              <div id="sticker-grid" className="grid grid-cols-2 gap-4">
                <AnimatePresence>
                  {sortedTasks.map((task) => {
                    const log = logs.find((l) => l.taskId === task.id);
                    const isEarned =
                      task.targetCount && task.targetCount > 1
                        ? (log?.count || 0) >= task.targetCount
                        : !!log;
                    const isGlobal = task.isGlobal;
                    const hasProgress =
                      task.targetCount && task.targetCount > 1;
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
                          onClick={() => toggleSticker(task.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (isGlobal && !isAdmin) return;
                            setEditingTask(task);
                            setShowAddTask(true);
                          }}
                          className={`w-full sticker-slot relative flex flex-col items-center justify-center h-32 rounded-[32px] border-2 transition-all overflow-hidden ${
                            isEarned
                              ? "bg-card-bg border-brand-secondary shadow-lg shadow-brand-secondary/20"
                              : "bg-bg-primary border-dashed border-brand-ink/10"
                          } ${isGlobal ? "border-brand-accent/30" : ""}`}
                        >
                          {hasProgress && !isEarned && currentCount > 0 && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-ink/5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${(currentCount / task.targetCount!) * 100}%`,
                                }}
                                transition={{
                                  type: "spring",
                                  damping: 20,
                                  stiffness: 100,
                                }}
                                className="h-full bg-brand-primary/40"
                              />
                            </div>
                          )}

                          {isGlobal && (
                            <div className="absolute top-2 right-2 bg-brand-accent/10 text-brand-accent text-[6px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                              Global
                            </div>
                          )}

                          <div className="relative mb-2">
                            <motion.div
                              key={`${task.id}-${currentCount}`}
                              initial={{ scale: 1 }}
                              animate={{
                                scale: [1, 1.25, 1],
                                rotate: isEarned
                                  ? [0, 15, -15, 0]
                                  : [0, 5, -5, 0],
                              }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                              className={`text-4xl transition-all ${isEarned || (hasProgress && currentCount > 0) ? "scale-110" : "opacity-20 grayscale"}`}
                            >
                              <TaskIcon
                                name={task.icon}
                                className={
                                  isEarned
                                    ? "text-brand-primary"
                                    : currentCount > 0
                                      ? "text-brand-primary/60"
                                      : "text-gray-400"
                                }
                              />
                            </motion.div>

                            {/* Celebration Burst on Completion */}
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
                                      initial: {
                                        scale: 0,
                                        x: 0,
                                        y: 0,
                                        opacity: 1,
                                      },
                                      animate: {
                                        scale: [0, 1, 0],
                                        opacity: [1, 1, 0],
                                        x:
                                          Math.cos((i * 45 * Math.PI) / 180) *
                                          45,
                                        y:
                                          Math.sin((i * 45 * Math.PI) / 180) *
                                          45,
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
                            className={`text-[10px] font-bold uppercase tracking-tight ${isEarned || (hasProgress && currentCount > 0) ? "text-brand-ink" : "text-gray-400"}`}
                          >
                            {task.title}
                          </span>

                          {hasProgress && !isEarned && currentCount > 0 && (
                            <div className="absolute top-2 left-2 bg-brand-primary/10 text-brand-primary text-[8px] font-black px-1.5 py-0.5 rounded-full">
                              {currentCount}/{task.targetCount}
                            </div>
                          )}
                          {task.description && (
                            <span className="text-[8px] opacity-40 px-4 text-center line-clamp-1 mt-0.5">
                              {task.description}
                            </span>
                          )}
                          <div className="text-[8px] font-bold opacity-30 uppercase mt-1">
                            {task.frequency}
                          </div>
                          {isEarned && (
                            <motion.div
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              className="absolute -top-1 -right-1 bg-brand-success text-white p-1 rounded-full shadow-md"
                            >
                              <Check size={12} strokeWidth={4} />
                            </motion.div>
                          )}
                        </button>
                        {(!isGlobal || isAdmin) && (
                          <button
                            onClick={() => {
                              setEditingTask(task);
                              setShowAddTask(true);
                            }}
                            className="absolute top-2 left-2 p-1.5 bg-brand-ink/5 rounded-full text-brand-ink/20 hover:text-brand-primary transition-colors"
                          >
                            <Settings size={12} strokeWidth={2} />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {tasks.length === 0 && (
                  <div className="col-span-2 py-12 text-center">
                    <div className="bg-bg-primary rounded-[32px] p-8 border-2 border-dashed border-brand-ink/10">
                      <p className="text-brand-ink/40 text-sm font-medium">
                        No tasks yet. Add your first self-care goal!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={shareProgress}
                className="w-full flex items-center justify-center gap-2 py-4 bg-card-bg rounded-2xl border-2 border-brand-secondary text-brand-secondary font-bold shadow-sm"
              >
                <Share2 size={20} strokeWidth={2} />
                Share Progress
              </button>
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-primary/10 rounded-[32px] p-5 border-2 border-brand-primary/20">
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-40 mb-1">
                    Weekly Score
                  </div>
                  <div className="text-2xl font-black text-brand-primary">
                    {weeklyStats.count}
                  </div>
                  <div className="text-[10px] font-bold opacity-40">
                    Stickers earned
                  </div>
                </div>
                <div className="bg-brand-success/10 rounded-[32px] p-5 border-2 border-brand-success/20">
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-40 mb-1">
                    Consistency
                  </div>
                  <div className="text-2xl font-black text-brand-success">
                    {weeklyStats.completionRate}%
                  </div>
                  <div className="text-[10px] font-bold opacity-40">
                    Completion rate
                  </div>
                </div>
              </div>

              {/* Best Goal */}
              {weeklyStats.bestTask && (
                <div className="bg-card-bg rounded-[32px] p-6 border-2 border-brand-ink/5 shadow-lg shadow-brand-ink/5 flex items-center gap-4">
                  <div className="bg-brand-accent p-3 rounded-2xl text-brand-ink">
                    <Star size={24} strokeWidth={2} fill="currentColor" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-40">
                      Top Performer
                    </div>
                    <h3 className="font-bold text-sm text-brand-ink">
                      {weeklyStats.bestTask.title}
                    </h3>
                    <p className="text-[10px] text-brand-ink/40">
                      Most consistent goal this week
                    </p>
                  </div>
                </div>
              )}

              {/* Longest Streak */}
              <div className="bg-brand-secondary/10 rounded-[32px] p-6 border-2 border-brand-secondary/20 flex items-center gap-4">
                <div className="bg-brand-secondary p-3 rounded-2xl text-white">
                  <Zap size={24} strokeWidth={2} fill="currentColor" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-40">
                    Personal Best
                  </div>
                  <div className="text-2xl font-black text-brand-secondary">
                    {longestStreak} Days
                  </div>
                  <p className="text-[10px] text-brand-ink/40">
                    Your longest streak ever
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-8 mb-4">
                <h2 className="text-lg font-bold text-brand-ink">
                  Progress Calendar
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCalendarDate(
                        new Date(
                          calendarDate.setMonth(calendarDate.getMonth() - 1),
                        ),
                      )
                    }
                    className="p-2 bg-brand-ink/5 rounded-full"
                  >
                    <ChevronLeft size={16} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() =>
                      setCalendarDate(
                        new Date(
                          calendarDate.setMonth(calendarDate.getMonth() + 1),
                        ),
                      )
                    }
                    className="p-2 bg-brand-ink/5 rounded-full"
                  >
                    <ChevronRight size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="bg-card-bg rounded-[32px] p-6 border-2 border-brand-ink/5 shadow-xl shadow-brand-ink/5">
                <div className="text-center font-bold text-brand-primary mb-4">
                  {calendarDate.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div className="grid grid-cols-7 gap-2 text-center">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div
                      key={`${d}-${i}`}
                      className="text-[10px] font-bold opacity-30"
                    >
                      {d}
                    </div>
                  ))}
                  {Array.from({
                    length: new Date(
                      calendarDate.getFullYear(),
                      calendarDate.getMonth(),
                      1,
                    ).getDay(),
                  }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({
                    length: new Date(
                      calendarDate.getFullYear(),
                      calendarDate.getMonth() + 1,
                      0,
                    ).getDate(),
                  }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const hasLog = allLogs.some((l) => l.date === dateStr);
                    const isSelected = selectedDate === dateStr;
                    return (
                      <button
                        key={day}
                        onClick={() =>
                          setSelectedDate(isSelected ? null : dateStr)
                        }
                        className={`aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? "ring-2 ring-brand-primary ring-offset-2"
                            : ""
                        } ${
                          hasLog
                            ? "bg-brand-primary text-white shadow-md shadow-brand-primary/30"
                            : "bg-bg-primary text-brand-ink/20"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <AnimatePresence>
                {selectedDate && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-card-bg rounded-[32px] p-6 border-2 border-brand-primary/10 mt-4">
                      <h3 className="text-xs font-bold text-brand-ink mb-4 flex items-center gap-2">
                        <Calendar
                          size={14}
                          strokeWidth={2}
                          className="text-brand-primary"
                        />
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
                                  <div className="text-xs font-bold text-brand-ink">
                                    {task.title}
                                  </div>
                                </div>
                                {log.count && log.count > 1 && (
                                  <div className="text-[10px] font-black text-brand-primary">
                                    {log.count}x
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        {allLogs.filter((l) => l.date === selectedDate)
                          .length === 0 && (
                          <div className="text-center py-4 text-[10px] font-bold text-brand-ink/20 uppercase tracking-widest">
                            No goals completed
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-brand-secondary/10 rounded-[32px] p-6 border-2 border-brand-secondary/20">
                <div className="flex items-center gap-4">
                  <div className="bg-brand-secondary p-3 rounded-2xl text-white">
                    <Trophy size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-40">
                      Total Stickers
                    </div>
                    <div className="text-2xl font-black text-brand-secondary">
                      {totalStickers}
                    </div>
                  </div>
                </div>
              </div>

              {/* Badges Section */}
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
                          : "bg-bg-primary border-brand-ink/5 opacity-40 grayscale"
                      }`}
                    >
                      <div
                        className={`mb-2 ${badge.unlocked ? "text-brand-accent" : "text-brand-ink/20"}`}
                      >
                        {badge.icon}
                      </div>
                      <div className="text-[8px] font-bold uppercase tracking-wider text-center text-brand-ink">
                        {badge.title}
                      </div>
                      {badge.unlocked && (
                        <div className="mt-1 text-[6px] text-brand-ink/40 text-center">
                          {badge.desc}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "social" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-brand-ink">Social Feed</h2>

              {interactions.length > 0 ? (
                <div className="space-y-4">
                  {interactions.map((interaction) => (
                    <motion.div
                      key={interaction.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className={`p-4 rounded-2xl border-2 flex gap-4 items-start transition-all ${
                        interaction.type === "high-five"
                          ? "bg-brand-accent/5 border-brand-accent/10"
                          : "bg-brand-primary/5 border-brand-primary/10"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl ${
                          interaction.type === "high-five"
                            ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/20"
                            : "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
                        }`}
                      >
                        {interaction.type === "high-five" ? (
                          <HandMetal size={20} strokeWidth={2} />
                        ) : (
                          <MessageCircle size={20} strokeWidth={2} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-bold text-brand-ink">
                            {interaction.type === "high-five"
                              ? "High-Five Received!"
                              : "New Message"}
                          </div>
                          <div className="text-[8px] text-brand-ink/30 uppercase font-black">
                            {new Date(interaction.timestamp).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </div>
                        </div>
                        {interaction.content && (
                          <div className="bg-white/50 p-3 rounded-xl border border-brand-ink/5 mt-2">
                            <p className="text-xs text-brand-ink/80 italic">
                              "{interaction.content}"
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-bg-primary rounded-[32px] p-12 text-center border-2 border-dashed border-brand-ink/10">
                  <Users
                    size={48}
                    strokeWidth={2}
                    className="mx-auto text-brand-ink/20 mb-4"
                  />
                  <p className="text-brand-ink/40 text-sm font-medium">
                    No interactions yet. Share your chart to get high-fives!
                  </p>
                </div>
              )}

              <div className="pt-4">
                <h3 className="text-sm font-bold text-brand-ink mb-4">
                  Quick High-Five (Demo)
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 bg-card-bg p-3 rounded-2xl border border-brand-ink/5 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-ink/10" />
                      <div className="text-[10px] font-bold text-brand-ink">
                        Friend {i}
                      </div>
                      <button
                        onClick={() => sendInteraction("mock-id", "high-five")}
                        className="p-1.5 bg-brand-accent text-white rounded-lg"
                      >
                        <HandMetal size={14} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-brand-ink">Settings</h2>

              <div className="space-y-4">
                <div className="bg-card-bg rounded-[32px] p-6 border-2 border-brand-ink/5 shadow-sm flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={profile?.photoURL}
                      className="w-16 h-16 rounded-full border-2 border-brand-primary object-cover"
                      alt=""
                    />
                    <button
                      onClick={() => setShowAvatarModal(true)}
                      className="absolute -bottom-1 -right-1 bg-brand-primary text-white p-1.5 rounded-full shadow-lg"
                    >
                      <Camera size={12} strokeWidth={2} />
                    </button>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-brand-ink">
                      {profile?.displayName}
                    </div>
                    <div className="text-[10px] text-brand-ink/40 font-bold uppercase tracking-wider">
                      {profile?.role}
                    </div>
                    <button
                      onClick={() => setShowAvatarModal(true)}
                      className="text-[10px] font-bold text-brand-primary uppercase mt-1"
                    >
                      Change Avatar
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowInviteModal(true)}
                  className="w-full flex items-center justify-between p-4 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-primary/20 font-bold"
                >
                  <div className="flex items-center gap-3">
                    <Users size={20} strokeWidth={2} />
                    <span>Invite Friend</span>
                  </div>
                  <Plus size={20} strokeWidth={2} />
                </button>

                {/* Groups Section */}
                <div className="bg-card-bg rounded-[32px] p-6 border-2 border-brand-ink/5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-brand-primary/10 p-2 rounded-xl text-brand-primary">
                        <Users size={20} strokeWidth={2} />
                      </div>
                      <span className="font-bold text-sm text-brand-ink">
                        My Group
                      </span>
                    </div>
                  </div>

                  {group ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-bg-primary rounded-2xl">
                        <div className="text-xs font-bold text-brand-ink">
                          {group.name}
                        </div>
                        <div className="text-[10px] text-brand-ink/40 mt-1">
                          Invite Code:{" "}
                          <span className="text-brand-primary font-black">
                            {group.inviteCode}
                          </span>
                        </div>
                        <div className="text-[10px] text-brand-ink/40 mt-1">
                          {group.members.length} Members
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(group.inviteCode);
                          alert("Invite code copied!");
                        }}
                        className="w-full py-3 bg-brand-primary/10 text-brand-primary rounded-xl text-xs font-bold uppercase tracking-wider"
                      >
                        Copy Invite Code
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowCreateGroup(true)}
                        className="w-full py-3 bg-brand-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-brand-primary/20"
                      >
                        Create a Group
                      </button>
                      <button
                        onClick={() => {
                          const code = window.prompt(
                            "Enter Group Invite Code:",
                          );
                          if (code) joinGroup(code);
                        }}
                        className="w-full py-3 bg-bg-primary text-brand-ink rounded-xl text-xs font-bold uppercase tracking-wider"
                      >
                        Join a Group
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-card-bg rounded-2xl border border-brand-ink/5 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-brand-primary/10 p-2 rounded-xl text-brand-primary">
                        {profile?.theme === "dark" ? (
                          <Moon size={20} strokeWidth={2} />
                        ) : (
                          <Sun size={20} strokeWidth={2} />
                        )}
                      </div>
                      <span className="font-bold text-sm text-brand-ink">
                        Appearance
                      </span>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`w-12 h-6 rounded-full transition-all relative ${profile?.theme === "dark" ? "bg-brand-primary" : "bg-brand-ink/10"}`}
                    >
                      <motion.div
                        animate={{ x: profile?.theme === "dark" ? 24 : 4 }}
                        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                  <div className="text-[10px] font-bold text-brand-ink/40 uppercase tracking-wider">
                    {profile?.theme === "dark"
                      ? "Dark Mode Active"
                      : "Light Mode Active"}
                  </div>
                </div>

                <div className="bg-card-bg rounded-2xl border border-brand-ink/5 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-brand-accent/10 p-2 rounded-xl text-brand-accent">
                        <Zap size={20} strokeWidth={2} />
                      </div>
                      <span className="font-bold text-sm text-brand-ink">
                        Notifications
                      </span>
                    </div>
                    <button
                      onClick={requestNotificationPermission}
                      className={`w-12 h-6 rounded-full transition-all relative ${notificationsEnabled ? "bg-brand-primary" : "bg-brand-ink/10"}`}
                    >
                      <motion.div
                        animate={{ x: notificationsEnabled ? 24 : 4 }}
                        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                  <div className="text-[10px] font-bold text-brand-ink/40 uppercase tracking-wider">
                    {notificationsEnabled
                      ? "Push Notifications Enabled"
                      : "Notifications Disabled"}
                  </div>
                </div>

                <button
                  onClick={() => setShowHelpModal(true)}
                  className="w-full flex items-center justify-between p-4 bg-card-bg rounded-2xl border border-brand-ink/5 shadow-sm text-brand-ink/60 font-bold"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle size={20} strokeWidth={2} />
                    <span>Help & FAQ</span>
                  </div>
                  <ChevronRight size={20} strokeWidth={2} />
                </button>

                <div className="bg-card-bg rounded-2xl border border-brand-ink/5 p-4 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-wider text-brand-ink/40 mb-2">
                    Support development
                  </div>
                  <p className="text-xs text-brand-ink/60 leading-relaxed mb-3">
                    If you would like to help keep CareStickers growing, you can
                    support the project on Ko-fi or Buy Me a Coffee.
                  </p>
                  <div className="flex flex-col gap-2">
                    <a
                      href="https://ko-fi.com/jono420"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 py-3 px-4 rounded-xl bg-bg-primary border border-brand-ink/5 text-sm font-bold text-brand-ink hover:border-brand-primary/30 transition-colors"
                    >
                      <span>Ko-fi</span>
                      <ExternalLink
                        size={16}
                        strokeWidth={2}
                        className="text-brand-primary shrink-0"
                      />
                    </a>
                    <a
                      href="https://buymeacoffee.com/jono420"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 py-3 px-4 rounded-xl bg-bg-primary border border-brand-ink/5 text-sm font-bold text-brand-ink hover:border-brand-primary/30 transition-colors"
                    >
                      <span>Buy Me a Coffee</span>
                      <ExternalLink
                        size={16}
                        strokeWidth={2}
                        className="text-brand-primary shrink-0"
                      />
                    </a>
                  </div>
                </div>

                <button
                  onClick={() => setOnboardingStep(0)}
                  className="w-full flex items-center justify-between p-4 bg-card-bg rounded-2xl border border-brand-ink/5 shadow-sm text-brand-ink/60 font-bold"
                >
                  <div className="flex items-center gap-3">
                    <Info size={20} strokeWidth={2} />
                    <span>Replay Tutorial</span>
                  </div>
                  <ChevronRight size={20} strokeWidth={2} />
                </button>

                <button
                  onClick={() => setShowFeedback(true)}
                  className="w-full flex items-center justify-between p-4 bg-card-bg rounded-2xl border border-brand-ink/5 shadow-sm text-brand-accent font-bold"
                >
                  <span>Request Feature / Report Issue</span>
                  <MessageCircle size={20} strokeWidth={2} />
                </button>

                <button
                  onClick={logout}
                  className="w-full flex items-center justify-between p-4 bg-card-bg rounded-2xl border border-brand-ink/5 shadow-sm text-brand-primary font-bold"
                >
                  <span>Logout</span>
                  <LogOut size={20} strokeWidth={2} />
                </button>
              </div>
            </div>
          )}
          {activeTab === "admin" && isAdmin && (
            <div className="space-y-6 pb-12">
              <h2 className="text-lg font-bold text-brand-ink">Admin Portal</h2>

              <div className="bg-card-bg rounded-[32px] p-6 border-2 border-brand-primary/10 shadow-xl shadow-brand-primary/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="text-sm font-bold text-brand-ink">
                    Community Progress
                  </h3>
                  <div className="relative flex-1 max-w-xs">
                    <Search
                      size={14}
                      strokeWidth={2}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/30"
                    />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-bg-primary rounded-xl text-xs font-semibold text-brand-ink border-2 border-transparent focus:border-brand-primary outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {allUsers
                    .filter((u) =>
                      u.displayName
                        .toLowerCase()
                        .includes(adminSearchQuery.toLowerCase()),
                    )
                    .sort((a, b) => {
                      const aLogs = allUsersLogs.filter(
                        (l) => l.userId === a.uid && l.date === today,
                      ).length;
                      const bLogs = allUsersLogs.filter(
                        (l) => l.userId === b.uid && l.date === today,
                      ).length;
                      return bLogs - aLogs;
                    })
                    .map((u) => {
                      const userTodayLogs = allUsersLogs.filter(
                        (l) => l.userId === u.uid && l.date === today,
                      );
                      return (
                        <div
                          key={u.uid}
                          className="flex items-center justify-between p-3 bg-bg-primary rounded-2xl"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={u.photoURL}
                              className="w-8 h-8 rounded-full"
                              alt=""
                            />
                            <div>
                              <div className="text-xs font-bold text-brand-ink">
                                {u.displayName}
                              </div>
                              <div className="text-[8px] text-brand-ink/40 uppercase font-black">
                                {u.role}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black text-brand-primary">
                              {userTodayLogs.length} Stickers Today
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {allUsers.filter((u) =>
                    u.displayName
                      .toLowerCase()
                      .includes(adminSearchQuery.toLowerCase()),
                  ).length === 0 && (
                    <div className="text-center py-8 text-brand-ink/20 text-xs font-bold uppercase tracking-widest">
                      No users found
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-card-bg rounded-[32px] p-6 border-2 border-brand-accent/10 shadow-xl shadow-brand-accent/5">
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
                              <div className="text-xs font-bold text-brand-ink">
                                {t.title}
                              </div>
                              {t.isDailyChallenge && (
                                <div className="text-[8px] font-black text-brand-primary uppercase">
                                  Active Challenge
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingTask(t);
                              setShowAddTask(true);
                            }}
                            className="p-2 bg-brand-ink/5 rounded-lg text-brand-ink/40"
                          >
                            <Settings size={14} strokeWidth={2} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-bold text-brand-ink/40 uppercase">
                            Completion Rate
                          </div>
                          <div className="text-xs font-black text-brand-accent">
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
                    onClick={() => {
                      setEditingTask(null);
                      setShowAddTask(true);
                    }}
                    className="w-full py-3 border-2 border-dashed border-brand-accent/20 rounded-2xl text-brand-accent text-xs font-bold uppercase tracking-widest"
                  >
                    + Add Global Goal
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* FAB */}
        {activeTab === "home" && (
          <button
            id="add-goal-btn"
            onClick={() => setShowAddTask(true)}
            className="absolute bottom-24 right-6 w-14 h-14 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-brand-primary/40 active:scale-90 transition-transform z-10"
          >
            <Plus size={32} strokeWidth={2.5} />
          </button>
        )}

        {/* Navigation */}
        <nav className="h-20 bg-card-bg border-t border-brand-ink/5 flex justify-around items-center px-4 pb-4">
          {[
            {
              id: "home",
              icon: <Home size={24} strokeWidth={2} />,
              label: "Home",
            },
            {
              id: "calendar",
              icon: <Calendar size={24} strokeWidth={2} />,
              label: "Stats",
            },
            {
              id: "social",
              icon: <Users size={24} strokeWidth={2} />,
              label: "Social",
              idAttr: "social-tab",
            },
            ...(isAdmin
              ? [
                  {
                    id: "admin",
                    icon: <Monitor size={24} strokeWidth={2} />,
                    label: "Admin",
                  },
                ]
              : []),
            {
              id: "settings",
              icon: <Settings size={24} strokeWidth={2} />,
              label: "Settings",
            },
          ].map((item) => (
            <button
              key={item.id}
              id={item.idAttr}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === item.id
                  ? "text-brand-primary"
                  : "text-brand-ink/20"
              }`}
            >
              {item.icon}
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {item.label}
              </span>
              {activeTab === item.id && (
                <motion.div
                  layoutId="nav-dot"
                  className="w-1 h-1 rounded-full bg-brand-primary"
                />
              )}
            </button>
          ))}
        </nav>

        {/* Add Task Modal */}
        <AnimatePresence>
          {showAddTask && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-ink/60 backdrop-blur-sm z-50 flex items-end"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-full bg-card-bg rounded-t-[40px] p-8 pb-12"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-brand-ink">
                    {editingTask ? "Edit Goal" : "New Goal"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddTask(false);
                      setEditingTask(null);
                    }}
                    className="text-brand-ink/40"
                  >
                    <X size={24} strokeWidth={2} />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    addTask(
                      formData.get("title") as string,
                      formData.get("icon") as string,
                      formData.get("frequency") as "daily" | "weekly",
                      formData.get("isGlobal") === "on",
                      formData.get("isDailyChallenge") === "on",
                      formData.get("description") as string,
                      parseInt(formData.get("targetCount") as string) || 1,
                    );
                  }}
                >
                  <div className="mb-6">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-2">
                      Goal Name
                    </label>
                    <input
                      name="title"
                      required
                      defaultValue={editingTask?.title}
                      placeholder="e.g. Drink Water"
                      className="w-full p-4 bg-bg-primary rounded-2xl border-2 border-transparent focus:border-brand-primary outline-none transition-all font-semibold text-brand-ink"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      name="description"
                      defaultValue={editingTask?.description}
                      placeholder="e.g. Drink at least 8 glasses of water today"
                      rows={2}
                      className="w-full p-4 bg-bg-primary rounded-2xl border-2 border-transparent focus:border-brand-primary outline-none transition-all font-semibold text-brand-ink resize-none"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-2">
                      Frequency
                    </label>
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
                            className="peer hidden"
                          />
                          <div className="py-3 text-center bg-bg-primary rounded-xl border-2 border-transparent peer-checked:border-brand-primary peer-checked:bg-brand-primary/5 transition-all text-xs font-bold uppercase tracking-wider text-brand-ink/40 peer-checked:text-brand-primary">
                            {freq}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-2">
                      Target Count (Optional)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        name="targetCount"
                        min="1"
                        max="100"
                        defaultValue={editingTask?.targetCount || 1}
                        className="w-24 p-4 bg-bg-primary rounded-2xl border-2 border-transparent focus:border-brand-primary outline-none transition-all font-semibold text-brand-ink"
                      />
                      <div className="text-[10px] text-brand-ink/40 font-medium">
                        Set how many times you want to do this (e.g. 8 glasses
                        of water)
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
                          className="peer hidden"
                        />
                        <div className="w-10 h-5 bg-bg-primary rounded-full relative transition-all peer-checked:bg-brand-accent">
                          <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/60">
                          Global Goal
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="isDailyChallenge"
                          defaultChecked={editingTask?.isDailyChallenge}
                          className="peer hidden"
                        />
                        <div className="w-10 h-5 bg-bg-primary rounded-full relative transition-all peer-checked:bg-brand-primary">
                          <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/60">
                          Daily Challenge
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="mb-8">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-4">
                      Select Icon
                    </label>
                    <div className="grid grid-cols-4 gap-4">
                      {PRESET_ICONS.map((icon) => (
                        <label
                          key={icon}
                          className="relative cursor-pointer group"
                        >
                          <input
                            type="radio"
                            name="icon"
                            value={icon}
                            defaultChecked={
                              editingTask
                                ? editingTask.icon === icon
                                : icon === "heart"
                            }
                            className="peer hidden"
                          />
                          <div className="w-full aspect-square bg-bg-primary rounded-2xl flex items-center justify-center border-2 border-transparent peer-checked:border-brand-primary peer-checked:bg-brand-primary/5 transition-all">
                            <TaskIcon
                              name={icon}
                              className="text-brand-ink/20 group-hover:text-brand-primary transition-colors"
                            />
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {editingTask && (
                      <button
                        type="button"
                        onClick={() => setTaskToDelete(editingTask)}
                        className="flex-1 py-4 bg-red-50 text-red-500 rounded-2xl font-bold text-lg border-2 border-red-100"
                      >
                        Delete
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-[2] py-4 bg-brand-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-brand-primary/20"
                    >
                      {editingTask ? "Save Changes" : "Create Goal"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Modal */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="w-full max-w-sm bg-card-bg rounded-[40px] p-8 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-brand-ink">Feedback</h2>
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="text-brand-ink/40"
                  >
                    <X size={24} strokeWidth={2} />
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    submitFeedback(
                      formData.get("content") as string,
                      formData.get("type") as "feature" | "issue",
                    );
                  }}
                >
                  <div className="mb-4">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-2">
                      Type
                    </label>
                    <select
                      name="type"
                      className="w-full p-4 bg-bg-primary rounded-2xl border-2 border-transparent focus:border-brand-primary outline-none font-semibold text-brand-ink"
                    >
                      <option value="feature">Request Feature</option>
                      <option value="issue">Report Issue</option>
                    </select>
                  </div>
                  <div className="mb-6">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-2">
                      Message
                    </label>
                    <textarea
                      name="content"
                      required
                      rows={4}
                      placeholder="Tell us what's on your mind..."
                      className="w-full p-4 bg-bg-primary rounded-2xl border-2 border-transparent focus:border-brand-primary outline-none font-semibold text-brand-ink resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold text-lg shadow-lg"
                  >
                    Send Feedback
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Onboarding Overlay */}
        <AnimatePresence>
          {onboardingStep !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] flex items-center justify-center p-8 text-center"
            >
              <div className="absolute inset-0 bg-brand-primary/90 backdrop-blur-md" />

              <div className="max-w-xs relative z-10">
                <motion.div
                  key={onboardingStep}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                >
                  <div className="bg-white p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-xl">
                    {ONBOARDING_STEPS[onboardingStep].icon}
                  </div>
                  <h2 className="text-3xl font-black text-white mb-4">
                    {ONBOARDING_STEPS[onboardingStep].title}
                  </h2>
                  <p className="text-white/80 font-medium mb-12 text-sm">
                    {ONBOARDING_STEPS[onboardingStep].description}
                  </p>

                  <div className="flex gap-4">
                    {onboardingStep > 0 && (
                      <button
                        onClick={() => setOnboardingStep(onboardingStep - 1)}
                        className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-black text-lg border-2 border-white/20"
                      >
                        Back
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (onboardingStep < ONBOARDING_STEPS.length - 1) {
                          setOnboardingStep(onboardingStep + 1);
                        } else {
                          completeOnboarding();
                        }
                      }}
                      className="flex-[2] py-4 bg-white text-brand-primary rounded-2xl font-black text-lg shadow-xl"
                    >
                      {onboardingStep === ONBOARDING_STEPS.length - 1
                        ? "Let's Go!"
                        : "Next"}
                    </button>
                  </div>

                  <button
                    onClick={completeOnboarding}
                    className="mt-8 text-white/40 text-[10px] font-bold uppercase tracking-widest"
                  >
                    Skip Tutorial
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Group Modal */}
        <AnimatePresence>
          {showCreateGroup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-ink/60 backdrop-blur-sm z-50 flex items-end"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="w-full bg-card-bg rounded-t-[40px] p-8 pb-12"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-brand-ink">
                    Create a Group
                  </h2>
                  <button
                    onClick={() => setShowCreateGroup(false)}
                    className="text-brand-ink/40"
                  >
                    <X size={24} strokeWidth={2} />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    createGroup(formData.get("name") as string);
                  }}
                >
                  <div className="mb-8">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-2">
                      Group Name
                    </label>
                    <input
                      name="name"
                      required
                      placeholder="e.g. The Sticker Squad"
                      className="w-full p-4 bg-bg-primary rounded-2xl border-2 border-transparent focus:border-brand-primary outline-none transition-all font-semibold text-brand-ink"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-brand-primary/20"
                  >
                    Create Group
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {taskToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-ink/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="w-full max-w-sm bg-card-bg rounded-[40px] p-8 shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <X size={32} strokeWidth={2} />
                </div>
                <h2 className="text-xl font-bold text-brand-ink mb-2">
                  Delete Goal?
                </h2>
                <p className="text-xs text-brand-ink/40 mb-8 font-medium">
                  Are you sure you want to delete{" "}
                  <span className="text-brand-ink font-bold">
                    "{taskToDelete.title}"
                  </span>
                  ? This action cannot be undone and all progress will be lost.
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() => setTaskToDelete(null)}
                    className="flex-1 py-4 bg-bg-primary text-brand-ink rounded-2xl font-bold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteTask(taskToDelete.id)}
                    className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save Confirmation Modal */}
        <AnimatePresence>
          {pendingTaskUpdate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-ink/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="w-full max-w-sm bg-card-bg rounded-[40px] p-8 shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check size={32} strokeWidth={2} />
                </div>
                <h2 className="text-xl font-bold text-brand-ink mb-2">
                  Save Changes?
                </h2>
                <p className="text-xs text-brand-ink/40 mb-8 font-medium">
                  Are you sure you want to save the changes to{" "}
                  <span className="text-brand-ink font-bold">
                    "{editingTask?.title}"
                  </span>
                  ?
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() => setPendingTaskUpdate(null)}
                    className="flex-1 py-4 bg-bg-primary text-brand-ink rounded-2xl font-bold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSaveTask}
                    className="flex-1 py-4 bg-brand-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-brand-primary/20"
                  >
                    Save
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showAvatarModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="w-full max-w-sm bg-card-bg rounded-[40px] p-8 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-brand-ink">
                    Choose Avatar
                  </h2>
                  <button
                    onClick={() => setShowAvatarModal(false)}
                    className="text-brand-ink/40"
                  >
                    <X size={24} strokeWidth={2} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => selectPresetAvatar(url)}
                      className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-brand-primary transition-all"
                    >
                      <img
                        src={url}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-brand-ink/10"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold mb-6">
                    <span className="bg-card-bg px-2 text-brand-ink/40">
                      Or upload custom
                    </span>
                  </div>
                </div>

                <label className="w-full py-4 bg-bg-primary rounded-2xl border-2 border-dashed border-brand-ink/10 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-primary/5 transition-all">
                  <Camera
                    size={24}
                    strokeWidth={2}
                    className="text-brand-ink/20 mb-2"
                  />
                  <span className="text-xs font-bold text-brand-ink/40">
                    Upload Photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invite Modal */}
        <AnimatePresence>
          {showInviteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="w-full max-w-sm bg-card-bg rounded-[40px] p-8 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-brand-ink">
                    Invite a Friend
                  </h2>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="text-brand-ink/40"
                  >
                    <X size={24} strokeWidth={2} />
                  </button>
                </div>

                <div className="bg-bg-primary p-6 rounded-3xl mb-8 text-center">
                  <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-primary">
                    <Users size={32} strokeWidth={2} />
                  </div>
                  <p className="text-xs text-brand-ink/60 font-medium mb-6">
                    Share this link with a friend. Once they join, you'll be
                    connected!
                  </p>

                  <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-brand-ink/5 mb-4">
                    <div className="flex-1 text-[10px] font-mono text-brand-ink/40 truncate px-2">
                      {window.location.origin}?invite={user?.uid}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}?invite=${user?.uid}`,
                        );
                        alert("Link copied to clipboard!");
                      }}
                      className="p-2 bg-brand-primary text-white rounded-lg"
                    >
                      <Copy size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      const text = `Join me on CareStickers! ${window.location.origin}?invite=${user?.uid}`;
                      window.open(
                        `mailto:?subject=Join me on CareStickers&body=${encodeURIComponent(text)}`,
                      );
                    }}
                    className="py-3 bg-bg-primary text-brand-ink rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} strokeWidth={2} />
                    Email
                  </button>
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: "CareStickers",
                          text: "Join me on CareStickers!",
                          url: `${window.location.origin}?invite=${user?.uid}`,
                        });
                      } else {
                        alert(
                          "Sharing not supported on this browser. Use copy link instead.",
                        );
                      }
                    }}
                    className="py-3 bg-brand-primary text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Share2 size={16} strokeWidth={2} />
                    Share
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help Modal */}
        <AnimatePresence>
          {showHelpModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="w-full max-w-sm bg-card-bg rounded-[40px] p-8 shadow-2xl max-h-[80vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-brand-ink">
                    Help & FAQ
                  </h2>
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="text-brand-ink/40"
                  >
                    <X size={24} strokeWidth={2} />
                  </button>
                </div>

                <div className="space-y-6">
                  {FAQ_ITEMS.map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="text-sm font-bold text-brand-ink flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                        {item.question}
                      </div>
                      <p className="text-xs text-brand-ink/60 leading-relaxed pl-3.5">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-6 bg-brand-primary/5 rounded-3xl border border-brand-primary/15">
                  <div className="text-xs font-bold text-brand-ink mb-1">
                    Support development
                  </div>
                  <p className="text-[10px] text-brand-ink/50 mb-3 leading-relaxed">
                    Enjoying the app? Contributions help fund ongoing
                    development.
                  </p>
                  <div className="flex flex-col gap-2">
                    <a
                      href="https://ko-fi.com/jono420"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl bg-card-bg border border-brand-ink/10 text-xs font-bold text-brand-ink"
                    >
                      Ko-fi
                      <ExternalLink
                        size={14}
                        strokeWidth={2}
                        className="text-brand-primary"
                      />
                    </a>
                    <a
                      href="https://buymeacoffee.com/jono420"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl bg-card-bg border border-brand-ink/10 text-xs font-bold text-brand-ink"
                    >
                      Buy Me a Coffee
                      <ExternalLink
                        size={14}
                        strokeWidth={2}
                        className="text-brand-primary"
                      />
                    </a>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-bg-primary rounded-3xl border border-brand-ink/5">
                  <div className="text-xs font-bold text-brand-ink mb-2">
                    Still need help?
                  </div>
                  <p className="text-[10px] text-brand-ink/40 mb-4">
                    Our community is here to support you. Feel free to send us
                    feedback or report issues.
                  </p>
                  <button
                    onClick={() => {
                      setShowHelpModal(false);
                      setShowFeedback(true);
                    }}
                    className="text-[10px] font-black text-brand-primary uppercase tracking-widest"
                  >
                    Contact Support
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
