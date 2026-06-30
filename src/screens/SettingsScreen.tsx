/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Users,
  Plus,
  Moon,
  Sun,
  Zap,
  HelpCircle,
  ChevronRight,
  Info,
  MessageCircle,
  LogOut,
  Camera,
  ExternalLink,
} from "lucide-react";
import { Card, Toggle, Button, IconButton } from "../components/ui";
import { useToast } from "../components/ui/Toast";
import { useAuth, useSocial } from "../store/hooks";
import { useUiState } from "../store/UiStateProvider";

/** Settings: profile, groups, appearance, notifications, help, account. */
export const SettingsScreen = () => {
  const toast = useToast();
  const {
    profile,
    toggleTheme,
    notificationsEnabled,
    requestNotificationPermission,
    logout,
    setOnboardingStep,
  } = useAuth();
  const { group, joinGroup } = useSocial();
  const {
    setShowInviteModal,
    setShowAvatarModal,
    setShowHelpModal,
    setShowFeedback,
    setShowCreateGroup,
  } = useUiState();

  const isDark = profile?.theme === "dark";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-brand-ink">Settings</h2>

      <div className="space-y-4">
        <Card className="flex items-center gap-4">
          <div className="relative">
            <img
              src={profile?.photoURL}
              className="w-16 h-16 rounded-full border-2 border-brand-primary object-cover"
              alt=""
            />
            <IconButton
              label="Change avatar"
              size="sm"
              onClick={() => setShowAvatarModal(true)}
              className="absolute -bottom-2 -right-2 bg-brand-primary text-white shadow-lg !min-w-[36px] !min-h-[36px] p-1.5"
            >
              <Camera size={14} strokeWidth={2} />
            </IconButton>
          </div>
          <div>
            <div className="text-sm font-bold text-brand-ink">
              {profile?.displayName}
            </div>
            <div className="text-xs text-muted-strong font-bold uppercase tracking-wider">
              {profile?.role}
            </div>
            <button
              type="button"
              onClick={() => setShowAvatarModal(true)}
              className="text-xs font-bold text-brand-primary uppercase mt-1 min-h-[44px]"
            >
              Change Avatar
            </button>
          </div>
        </Card>

        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="w-full flex items-center justify-between p-4 min-h-[56px] bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-primary/20 font-bold"
        >
          <div className="flex items-center gap-3">
            <Users size={20} strokeWidth={2} />
            <span>Invite Friend</span>
          </div>
          <Plus size={20} strokeWidth={2} />
        </button>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-brand-primary/10 p-2 rounded-xl text-brand-primary">
              <Users size={20} strokeWidth={2} />
            </div>
            <span className="font-bold text-sm text-brand-ink">My Group</span>
          </div>

          {group ? (
            <div className="space-y-4">
              <div className="p-4 bg-bg-primary rounded-2xl">
                <div className="text-sm font-bold text-brand-ink">
                  {group.name}
                </div>
                <div className="text-xs text-muted mt-1">
                  Invite Code:{" "}
                  <span className="text-brand-primary font-black">
                    {group.inviteCode}
                  </span>
                </div>
                <div className="text-xs text-muted mt-1">
                  {group.members.length} Members
                </div>
              </div>
              <Button
                variant="ghost"
                fullWidth
                className="!bg-brand-primary/10 !text-brand-primary !border-transparent uppercase tracking-wider text-sm"
                onClick={() => {
                  navigator.clipboard.writeText(group.inviteCode);
                  toast.success("Invite code copied!");
                }}
              >
                Copy Invite Code
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button fullWidth onClick={() => setShowCreateGroup(true)}>
                Create a Group
              </Button>
              <Button
                variant="ghost"
                fullWidth
                className="!bg-bg-primary !border-transparent"
                onClick={() => {
                  const code = window.prompt("Enter Group Invite Code:");
                  if (code) joinGroup(code);
                }}
              >
                Join a Group
              </Button>
            </div>
          )}
        </Card>

        <Card className="!rounded-2xl !p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand-primary/10 p-2 rounded-xl text-brand-primary">
                {isDark ? (
                  <Moon size={20} strokeWidth={2} />
                ) : (
                  <Sun size={20} strokeWidth={2} />
                )}
              </div>
              <span className="font-bold text-sm text-brand-ink">
                Appearance
              </span>
            </div>
            <Toggle
              checked={isDark}
              onChange={toggleTheme}
              label="Toggle dark mode"
            />
          </div>
          <div className="text-xs font-bold text-muted uppercase tracking-wider">
            {isDark ? "Dark Mode Active" : "Light Mode Active"}
          </div>
        </Card>

        <Card className="!rounded-2xl !p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand-accent/15 p-2 rounded-xl text-brand-ink">
                <Zap size={20} strokeWidth={2} />
              </div>
              <span className="font-bold text-sm text-brand-ink">
                Notifications
              </span>
            </div>
            <Toggle
              checked={notificationsEnabled}
              onChange={requestNotificationPermission}
              label="Enable push notifications"
            />
          </div>
          <div className="text-xs font-bold text-muted uppercase tracking-wider">
            {notificationsEnabled
              ? "Push Notifications Enabled"
              : "Notifications Disabled"}
          </div>
        </Card>

        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className="w-full flex items-center justify-between p-4 min-h-[56px] bg-card-bg rounded-2xl border border-brand-ink/5 shadow-sm text-brand-ink font-bold"
        >
          <div className="flex items-center gap-3">
            <HelpCircle size={20} strokeWidth={2} />
            <span>Help & FAQ</span>
          </div>
          <ChevronRight size={20} strokeWidth={2} />
        </button>

        <Card className="!rounded-2xl !p-4">
          <div className="text-xs font-black uppercase tracking-wider text-muted-strong mb-2">
            Support development
          </div>
          <p className="text-sm text-muted leading-relaxed mb-3">
            If you would like to help keep CareStickers growing, you can support
            the project on Ko-fi or Buy Me a Coffee.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="https://ko-fi.com/jono420"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 py-3 px-4 min-h-[48px] rounded-xl bg-bg-primary border border-brand-ink/5 text-sm font-bold text-brand-ink hover:border-brand-primary/30 transition-colors"
            >
              <span>Ko-fi</span>
              <ExternalLink size={16} strokeWidth={2} className="text-brand-primary shrink-0" />
            </a>
            <a
              href="https://buymeacoffee.com/jono420"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 py-3 px-4 min-h-[48px] rounded-xl bg-bg-primary border border-brand-ink/5 text-sm font-bold text-brand-ink hover:border-brand-primary/30 transition-colors"
            >
              <span>Buy Me a Coffee</span>
              <ExternalLink size={16} strokeWidth={2} className="text-brand-primary shrink-0" />
            </a>
          </div>
        </Card>

        <button
          type="button"
          onClick={() => setOnboardingStep(0)}
          className="w-full flex items-center justify-between p-4 min-h-[56px] bg-card-bg rounded-2xl border border-brand-ink/5 shadow-sm text-brand-ink font-bold"
        >
          <div className="flex items-center gap-3">
            <Info size={20} strokeWidth={2} />
            <span>Replay Tutorial</span>
          </div>
          <ChevronRight size={20} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => setShowFeedback(true)}
          className="w-full flex items-center justify-between p-4 min-h-[56px] bg-card-bg rounded-2xl border border-brand-ink/5 shadow-sm text-brand-accent font-bold"
        >
          <span>Request Feature / Report Issue</span>
          <MessageCircle size={20} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-between p-4 min-h-[56px] bg-card-bg rounded-2xl border border-brand-ink/5 shadow-sm text-brand-primary font-bold"
        >
          <span>Logout</span>
          <LogOut size={20} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};
