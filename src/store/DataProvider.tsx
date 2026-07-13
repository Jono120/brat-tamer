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
import {
  isNativePlatform,
  NATIVE_AUTH_CALLBACK_URL,
  openAuthUrlInSystemBrowser,
} from "../lib/native";
import {
  nativePushPermissionGranted,
  registerNativePushIfPermitted,
  requestAndRegisterNativePush,
} from "../lib/nativePush";
import type { Session } from "@supabase/supabase-js";
import {
  Task,
  StickerLog,
  UserProfile,
  Interaction,
  Group,
  FriendProfile,
  Feedback,
} from "../types";
import { ADMIN_EMAILS } from "../constants";
import { errorMessage } from "../lib/errors";
import { applyTheme, resolveTheme, watchSystemTheme } from "../lib/theme";
import { subscribeRealtime } from "../lib/realtimeSync";
import { useToast } from "../components/ui/Toast";

const MAX_AVATAR_BYTES = 6 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function activeHashPath(): string {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  return hash.split("?")[0];
}

function pollMs(): number {
  return document.visibilityState === "visible" ? 4000 : 15000;
}

export interface TaskPayload {
  title: string;
  icon: string;
  frequency: "daily" | "weekly";
  isGlobal: boolean;
  isDailyChallenge: boolean;
  description: string;
  targetCount: number;
  requiresNote: boolean;
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
  friends: FriendProfile[];
  group: Group | null;
  allUsers: UserProfile[];
  allUsersLogs: StickerLog[];
  adminFeedback: Feedback[];
  adminLogsHasMore: boolean;
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
  toggleSticker: (taskId: string, note?: string) => Promise<void>;
  createTask: (payload: TaskPayload) => Promise<boolean>;
  updateTask: (id: string, payload: TaskPayload) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  // social
  sendInteraction: (
    toUserId: string,
    type: "high-five" | "message",
    content?: string,
  ) => Promise<void>;
  markInboxRead: () => Promise<void>;
  shareProgress: () => Promise<void>;
  generateInviteLink: () => Promise<void>;
  createGroup: (name: string) => Promise<boolean>;
  joinGroup: (code: string) => Promise<void>;
  // feedback
  submitFeedback: (content: string, type: "feature" | "issue") => Promise<boolean>;
  // admin actions
  loadMoreAdminLogs: () => Promise<void>;
  reviewFeedback: (id: string) => Promise<void>;
  setDailyChallenge: (taskId: string) => Promise<boolean>;
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
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allUsersLogs, setAllUsersLogs] = useState<StickerLog[]>([]);
  const [adminFeedback, setAdminFeedback] = useState<Feedback[]>([]);
  const [adminLogsHasMore, setAdminLogsHasMore] = useState(false);
  const [adminLogsOffset, setAdminLogsOffset] = useState(0);
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

  // Theme: explicit profile choice wins; otherwise follow the device theme
  // (including live OS theme changes while the app is open).
  const themePreference = profile?.theme;
  useEffect(() => {
    applyTheme(themePreference);
    return watchSystemTheme(() => themePreference);
  }, [themePreference]);

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
          if (!inv.valid || inv.used) return;
          if (inv.inviterId && inv.inviterId !== user.uid) {
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
    const tick = () => {
      if (document.visibilityState === "visible") void load();
    };
    const id = setInterval(tick, pollMs());
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user, profile?.groupId]);

  // Data refresh (visibility-aware polling + realtime triggers)
  useEffect(() => {
    if (!user || !isAuthReady) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = async () => {
      try {
        const onAdminTab = activeHashPath() === "/admin";
        const [me, mine, glob, logsToday, logsAll, inbox, friendList] =
          await Promise.all([
            careApi.me(),
            careApi.tasksMine(),
            careApi.tasksGlobal(),
            careApi.logsMine(today),
            careApi.logsMine(),
            careApi.interactionsInbox(),
            careApi.friends(),
          ]);
        if (cancelled) return;
        setUser(me.user);
        setProfile(me.profile);
        setTasks(mine);
        setGlobalTasks(glob);
        setLogs(logsToday);
        setAllLogs(logsAll);
        setInteractions(inbox);
        setFriends(friendList);
        const adminUser =
          me.profile.role === "admin" ||
          (!!me.user.email &&
            ADMIN_EMAILS.includes(me.user.email.toLowerCase()));
        if (adminUser && onAdminTab) {
          const [users, logsPage, feedbackPage] = await Promise.all([
            careApi.adminUsers(),
            careApi.adminLogs({ limit: 500, offset: 0 }),
            careApi.adminFeedback({ limit: 50, offset: 0 }),
          ]);
          if (!cancelled) {
            setAllUsers(users);
            setAllUsersLogs(logsPage.logs);
            setAdminLogsOffset(logsPage.logs.length);
            setAdminLogsHasMore(logsPage.hasMore);
            setAdminFeedback(feedbackPage.feedback);
          }
        } else if (!adminUser) {
          setAllUsers([]);
          setAllUsersLogs([]);
          setAdminFeedback([]);
          setAdminLogsHasMore(false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setHasLoadedData(true);
      }
    };

    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(() => {
        void refresh().finally(schedule);
      }, pollMs());
    };

    void refresh().finally(schedule);

    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onHash = () => void refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("hashchange", onHash);

    const unsubRealtime = subscribeRealtime(
      user.uid,
      profile?.groupId,
      {
        onInteraction: () => void refresh(),
        onStickerLog: () => void refresh(),
        onGroup: () => void refresh(),
      },
    );

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("hashchange", onHash);
      unsubRealtime();
    };
  }, [user, isAuthReady, today, profile?.groupId]);

  // Notification permission state
  useEffect(() => {
    if (isNativePlatform()) {
      nativePushPermissionGranted()
        .then(setNotificationsEnabled)
        .catch(() => setNotificationsEnabled(false));
    } else if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  // Native: refresh the FCM/APNs device token after sign-in when permission
  // was already granted (register() re-fires the `registration` listener,
  // which posts the token to the API under the new session).
  useEffect(() => {
    if (!user?.uid || !isNativePlatform()) return;
    registerNativePushIfPermitted().catch((e) =>
      console.error("Push re-registration failed", e),
    );
  }, [user?.uid]);

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
      if (isNativePlatform()) {
        // Native: OAuth must run in the system browser (Google blocks WebViews) and
        // return via the custom-scheme deep link handled in src/lib/native.ts.
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: NATIVE_AUTH_CALLBACK_URL,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw new Error(error.message);
        if (data?.url) await openAuthUrlInSystemBrowser(data.url);
        return;
      }
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
    setFriends([]);
    setGlobalTasks([]);
    setGroup(null);
    setOnboardingStep(null);
    setHasLoadedData(false);
    applyTheme(undefined);
  }, []);

  const toggleTheme = useCallback(async () => {
    if (!user || !profile) return;
    // Toggle from the *effective* theme so the first tap always visibly
    // flips it, even when the user was following a dark device theme.
    const newTheme = resolveTheme(profile.theme) === "dark" ? "light" : "dark";
    try {
      await careApi.patchProfile({ theme: newTheme });
      setProfile({ ...profile, theme: newTheme });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, [user, profile, toast]);

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
    if (isNativePlatform()) {
      const granted = await requestAndRegisterNativePush();
      setNotificationsEnabled(granted);
      return;
    }
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
  }, []);

  // --- Profile ---
  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!user) return;
      if (file.size > MAX_AVATAR_BYTES) {
        toast.error("Image must be 6 MB or smaller.");
        return;
      }
      if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
        toast.error("Use PNG, JPEG, or WebP images.");
        return;
      }
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const objectPath = `${user.uid}/${crypto.randomUUID()}.${ext}`;
      const storagePath = `avatars/${objectPath}`;
      try {
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(objectPath, file, { upsert: true, contentType: file.type });
        if (uploadErr) throw uploadErr;
        await careApi.patchProfile({ photoURL: storagePath });
        toast.success("Avatar updated!");
      } catch (err) {
        toast.error(errorMessage(err));
      }
    },
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
    async (taskId: string, note?: string) => {
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
                note,
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
            note,
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
          requiresNote: isAdmin ? payload.requiresNote : false,
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
          requiresNote: isAdmin ? payload.requiresNote : false,
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
  const markInboxRead = useCallback(async () => {
    if (!user) return;
    try {
      await careApi.markInboxRead();
      setInteractions((prev) => prev.map((i) => ({ ...i, read: true })));
    } catch (e) {
      console.error("Failed to mark inbox read", e);
    }
  }, [user]);

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

  const loadMoreAdminLogs = useCallback(async () => {
    if (!adminLogsHasMore) return;
    try {
      const page = await careApi.adminLogs({
        limit: 500,
        offset: adminLogsOffset,
      });
      setAllUsersLogs((prev) => [...prev, ...page.logs]);
      setAdminLogsOffset((o) => o + page.logs.length);
      setAdminLogsHasMore(page.hasMore);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, [adminLogsHasMore, adminLogsOffset, toast]);

  const reviewFeedback = useCallback(
    async (id: string) => {
      try {
        await careApi.reviewFeedback(id);
        setAdminFeedback((prev) => prev.filter((f) => f.id !== id));
        toast.success("Feedback marked reviewed");
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    [toast],
  );

  const setDailyChallenge = useCallback(
    async (taskId: string): Promise<boolean> => {
      try {
        await careApi.setDailyChallenge(taskId);
        const glob = await careApi.tasksGlobal();
        setGlobalTasks(glob);
        toast.success("Daily challenge updated!");
        return true;
      } catch (e) {
        toast.error(errorMessage(e));
        return false;
      }
    },
    [toast],
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
    friends,
    group,
    allUsers,
    allUsersLogs,
    adminFeedback,
    adminLogsHasMore,
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
    markInboxRead,
    shareProgress,
    generateInviteLink,
    createGroup,
    joinGroup,
    submitFeedback,
    loadMoreAdminLogs,
    reviewFeedback,
    setDailyChallenge,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
