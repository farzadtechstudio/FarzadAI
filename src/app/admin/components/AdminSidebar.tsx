"use client";

import Link from "next/link";
import {
  PaletteIcon,
  GridIcon,
  DatabaseIcon,
  BrainIcon,
  UsersIcon,
  LogOutIcon,
  HomeIcon,
  YouTubeIcon,
  WandIcon,
  BarChartIcon,
} from "./AdminIcons";

type Tab = "branding" | "topics" | "youtube" | "knowledge" | "ai" | "team" | "onboarding" | "analytics";

interface AdminSidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  user: { name: string; email: string; role: string };
  tenant: { brand_name: string; slug: string };
  onLogout: () => void;
}

interface NavItem {
  id: Tab;
  label: string;
  icon: React.FC<{ className?: string }>;
  href?: string; // Optional direct link
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { id: "onboarding", label: "Onboarding", icon: WandIcon, href: "/admin/onboarding" },
      { id: "analytics", label: "Analytics", icon: BarChartIcon, href: "/admin/analytics" },
    ],
  },
  {
    title: "Customize",
    items: [
      { id: "branding", label: "Branding", icon: PaletteIcon, href: "/admin/branding" },
      { id: "topics", label: "Topic Cards", icon: GridIcon, href: "/admin/topics" },
    ],
  },
  {
    title: "Data Source",
    items: [
      { id: "youtube", label: "YouTube Feed", icon: YouTubeIcon, href: "/admin/youtube" },
      { id: "knowledge", label: "Knowledge Base", icon: DatabaseIcon, href: "/admin/knowledge" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { id: "ai", label: "AI Settings", icon: BrainIcon, href: "/admin/ai" },
      { id: "team", label: "Team", icon: UsersIcon, href: "/admin/team" },
    ],
  },
];

export default function AdminSidebar({
  activeTab,
  onTabChange,
  user,
  tenant,
  onLogout,
}: AdminSidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col z-50">
      {/* Header */}
      <div className="p-6 border-b border-[var(--border)]">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">
          {tenant.brand_name}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">Admin Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {navSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={sectionIndex > 0 ? "mt-6" : ""}>
            {section.title && (
              <p className="px-4 mb-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) =>
                item.href ? (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      activeTab === item.id
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      activeTab === item.id
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)] space-y-2">
        <a
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <HomeIcon className="w-5 h-5" />
          <span className="font-medium">View Chat</span>
        </a>

        <div className="px-4 py-3">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {user.name || user.email}
          </p>
          <p className="text-xs text-[var(--text-muted)] capitalize">{user.role}</p>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOutIcon className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
