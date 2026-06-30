/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { careApi, SessionUser } from "../api/careApi";
import { supabase } from "../lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import {
  Task,
  StickerLog,
  UserProfile,
  Interaction,
  Group,
} from "../types";
import { ADMIN_EMAILS } from "../constants";
import { errorMessage } from "../lib/errors";
import { useToast } from "../components/ui/Toast";

export interface TaskPayload {
  title: string;
  icon: string;
  frequency: "daily" | "weekly";
  isGlobal: boolean;
  isDailyChallenge: boolean;
  description: string;
  targetCount: number;
}

interface DataContextValue {
  // session
  user: SessionUser | null;
  profile: UserProfile | null;
  isAuthReady: boolean;
  hasLoadedData: boolean;
  isAdmin: boolean;
  isGroupAdmin: boolean;
  today: string;
  // collections
  tasks: Task[];
  globalTasks: Task[];
  logs: StickerLog[];
  allLogs: StickerLog[];
  interactions: Interaction[];
  group: Group | null;
  allUsers: UserProfile[];
  allUsersLogs: StickerLog[];
  // onboarding / notifications
  onboardingStep: number | null;
  setOnboardingStep: (step: number | null) => void;
  notificationsEnabled: boolean;
  requestNotificationPermission: () => Promise<void>;
  // admin
  adminSearchQuery: string;
  setAdminSearchQuery: (q: string) => void;
  // auth actions (Supabase Auth)
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithProvider: (provider: "google" | "apple") => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleTheme: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  // profile
  uploadAvatar: (file: File) => Promise<void>;
  selectPresetAvatar: (url: string) => Promise<void>;
  // tasks
  toggleSticker: (taskId: string) => Promise<void>;
  createTask: (payload: TaskPayload) => Promise<boolean>;
  updateTask: (id: string, payload: TaskPayload) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  // social
  sendInteraction: (
    toUserId: string,
    type: "high-five" | "message",
    content?: string,
  ) => Promise<void>;
  shareProgress: () => Promise<void>;
  generateInviteLink: () => Promise<void>;
  createGroup: (name: string) => Promise<boolean>;
  joinGroup: (code: string) => Promise<void>;
  // feedback
  submitFeedback: (content: string, type: "feature" | "issue") => Promise<boolean>;
}

const DataContext = createContext<DataContextValue | null>(null);

export const useData = (): DataContextValue => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
};

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const toast = useToast();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<StickerLog[]>([]);
  const [allLogs, setAllLogs] = useState<StickerLog[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allUsersLogs, setAllUsersLogs] = useState<StickerLog[]>([]);
  const [globalTasks, setGlobalTasks] = useState<Task[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [group, setGroup] = useState<Group | null>(null);
  const seenInteractionIds = useRef<Set<string>>(new Set());
  const notificationPrimed = useRef(false);

  const isAdmin =
    profile?.role === "admin" ||
    (!!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  const isGroupAdmin = profile?.role === "group-admin";

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const applyTheme = useCallback((theme?: string) => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Supabase session -> profile hydration, plus optional ?invite= / ?error= handling.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    const err = params.get("error");
    if (invite) setInviteCode(invite);
    if (err) toast.error(`Sign-in failed (${err})`);
    if (invite || err) {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.hash,
      );
    }

    let active = true;
    const hydrate = async (session: Session | null) => {
      if (!session) {
        if (!active) return;
        setUser(null);
        setProfile(null);
        setIsAuthReady(true);
        return;
      }
      try {
        const me = await careApi.me();
        if (!active) return;
        setUser(me.user);
        setProfile(me.profile);
        applyTheme(me.profile.theme);
        if (me.profile.hasCompletedOnboarding === false) setOnboardingStep(0);
      } catch (e) {
        console.error("Failed to load session profile", e);
      } finally {
        if (active) setIsAuthReady(true);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer to avoid re-entrancy issues with the supabase-js auth lock.
      setTimeout(() => void hydrate(session), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            toast.success("You're now connected with your friend!");
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
  }, [user, inviteCode, isProcessingInvite, toast]);

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

  // Data refresh (polling)
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
        applyTheme(me.profile.theme);
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
      } finally {
        if (!cancelled) setHasLoadedData(true);
      }
    };

    void refresh();
    const interval = setInterval(refresh, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, isAuthReady, today, applyTheme]);

  // Notification permission state
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

  // Social notifications
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
          new Notification("New Interaction! \u{1F31F}", {
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

  // --- Auth actions (Supabase Auth) ---
  // The onAuthStateChange listener above hydrates user/profile once a session exists, so these
  // actions only need to kick off the corresponding Supabase flow and surface errors.
  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const loginWithProvider = useCallback(
    async (provider: "google" | "apple") => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw new Error(error.message);
    },
    [],
  );

  const sendMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) throw new Error(error.message);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setTasks([]);
    setLogs([]);
    setAllLogs([]);
    setInteractions([]);
    setGlobalTasks([]);
    setGroup(null);
    setOnboardingStep(null);
    setHasLoadedData(false);
    document.documentElement.classList.remove("dark");
  }, []);

  const toggleTheme = useCallback(async () => {
    if (!user || !profile) return;
    const newTheme = profile.theme === "dark" ? "light" : "dark";
    try {
      await careApi.patchProfile({ theme: newTheme });
      applyTheme(newTheme);
      setProfile({ ...profile, theme: newTheme });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, [user, profile, applyTheme, toast]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    try {
      await careApi.patchProfile({ hasCompletedOnboarding: true });
      setOnboardingStep(null);
    } catch (e) {
      console.error("Error completing onboarding", e);
    }
  }, [user]);

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
  }, []);

  // --- Profile ---
  const uploadAvatar = useCallback(
    (file: File) =>
      new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          if (user) {
            try {
              await careApi.patchProfile({ photoURL: base64String });
              toast.success("Avatar updated!");
            } catch (err) {
              toast.error(errorMessage(err));
            }
          }
          resolve();
        };
        reader.readAsDataURL(file);
      }),
    [user, toast],
  );

  const selectPresetAvatar = useCallback(
    async (url: string) => {
      if (!user) return;
      try {
        await careApi.patchProfile({ photoURL: url });
        toast.success("Avatar updated!");
      } catch (err) {
        toast.error(errorMessage(err));
      }
    },
    [user, toast],
  );

  // --- Tasks ---
  const toggleSticker = useCallback(
    async (taskId: string) => {
      if (!user) return;
      const task = [...globalTasks, ...tasks].find((t) => t.id === taskId);
      if (!task) return;
      const existingLog = logs.find((l) => l.taskId === taskId);
      try {
        if (existingLog) {
          if (task.targetCount && task.targetCount > 1) {
            if ((existingLog.count || 1) < task.targetCount) {
              await careApi.updateLog(existingLog.id, {
                count: (existingLog.count || 1) + 1,
                earnedAt: new Date().toISOString(),
              });
            } else {
              await careApi.deleteLog(existingLog.id);
            }
          } else {
            await careApi.deleteLog(existingLog.id);
          }
        } else {
          await careApi.createLog({
            taskId,
            date: today,
            earnedAt: new Date().toISOString(),
            count: 1,
          });
        }
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    [user, globalTasks, tasks, logs, today, toast],
  );

  const createTask = useCallback(
    async (payload: TaskPayload): Promise<boolean> => {
      if (!user) return false;
      try {
        await careApi.createTask({
          ...payload,
          isGlobal: isAdmin ? payload.isGlobal : false,
          isDailyChallenge: isAdmin ? payload.isDailyChallenge : false,
        });
        toast.success("Goal created!");
        return true;
      } catch (e) {
        toast.error(errorMessage(e));
        return false;
      }
    },
    [user, isAdmin, toast],
  );

  const updateTask = useCallback(
    async (id: string, payload: TaskPayload): Promise<boolean> => {
      if (!user) return false;
      try {
        await careApi.updateTask(id, {
          ...payload,
          isGlobal: isAdmin ? payload.isGlobal : false,
          isDailyChallenge: isAdmin ? payload.isDailyChallenge : false,
        });
        toast.success("Goal updated!");
        return true;
      } catch (e) {
        toast.error(errorMessage(e));
        return false;
      }
    },
    [user, isAdmin, toast],
  );

  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;
      try {
        await careApi.deleteTask(id);
        toast.success("Goal deleted");
        return true;
      } catch (e) {
        toast.error(errorMessage(e));
        return false;
      }
    },
    [user, toast],
  );

  // --- Social ---
  const sendInteraction = useCallback(
    async (
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
        toast.success(type === "high-five" ? "High-five sent!" : "Message sent!");
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    [user, toast],
  );

  const shareProgress = useCallback(async () => {
    const text = `I've earned ${allLogs.length} stickers on CareStickers! \u{1F31F} Join me in our self-care journey!`;
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
      navigator.clipboard.writeText(text + " " + window.location.href);
      toast.success("Progress copied to clipboard!");
    }
  }, [allLogs.length, toast]);

  const generateInviteLink = useCallback(async () => {
    if (!user) return;
    try {
      const { id } = await careApi.createInvite();
      const inviteLink = `${window.location.origin}?invite=${id}`;
      navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied to clipboard!");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, [user, toast]);

  const createGroup = useCallback(
    async (name: string): Promise<boolean> => {
      if (!user) return false;
      try {
        await careApi.createGroup(name);
        const me = await careApi.me();
        setProfile(me.profile);
        toast.success("Group created!");
        return true;
      } catch (e) {
        toast.error(errorMessage(e));
        return false;
      }
    },
    [user, toast],
  );

  const joinGroup = useCallback(
    async (code: string) => {
      if (!user) return;
      try {
        const res = await careApi.joinGroup(code);
        if (res.alreadyMember) {
          toast.info("You are already a member of this group.");
          return;
        }
        const me = await careApi.me();
        setProfile(me.profile);
        toast.success(`Joined group: ${res.group.name}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("Invalid") || msg.includes("404")) {
          toast.error("Invalid invite code.");
          return;
        }
        toast.error(errorMessage(e));
      }
    },
    [user, toast],
  );

  const submitFeedback = useCallback(
    async (content: string, type: "feature" | "issue"): Promise<boolean> => {
      if (!user) return false;
      try {
        await careApi.submitFeedback(content, type);
        toast.success("Thank you for your feedback! \u{1F31F}");
        return true;
      } catch (e) {
        toast.error(errorMessage(e));
        return false;
      }
    },
    [user, toast],
  );

  const value: DataContextValue = {
    user,
    profile,
    isAuthReady,
    hasLoadedData,
    isAdmin,
    isGroupAdmin,
    today,
    tasks,
    globalTasks,
    logs,
    allLogs,
    interactions,
    group,
    allUsers,
    allUsersLogs,
    onboardingStep,
    setOnboardingStep,
    notificationsEnabled,
    requestNotificationPermission,
    adminSearchQuery,
    setAdminSearchQuery,
    login,
    register,
    loginWithProvider,
    sendMagicLink,
    logout,
    toggleTheme,
    completeOnboarding,
    uploadAvatar,
    selectPresetAvatar,
    toggleSticker,
    createTask,
    updateTask,
    deleteTask,
    sendInteraction,
    shareProgress,
    generateInviteLink,
    createGroup,
    joinGroup,
    submitFeedback,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
