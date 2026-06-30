/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Smile, Plus, Check, Users } from "lucide-react";

export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((s: string) => s.trim().toLowerCase())
  .filter(Boolean);

export const PRESET_ICONS = [
  "droplets",
  "moon",
  "sun",
  "book",
  "coffee",
  "smile",
  "zap",
  "heart",
];

export const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe",
];

export const FAQ_ITEMS = [
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

export const ONBOARDING_STEPS = [
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

/** Navigation tab definitions shared by routing + bottom nav + sidebar. */
export const NAV_TABS = [
  { id: "home", path: "/", label: "Home", icon: "home" },
  { id: "calendar", path: "/stats", label: "Stats", icon: "calendar" },
  { id: "social", path: "/social", label: "Social", icon: "users" },
  { id: "admin", path: "/admin", label: "Admin", icon: "monitor", adminOnly: true },
  { id: "settings", path: "/settings", label: "Settings", icon: "settings" },
] as const;
