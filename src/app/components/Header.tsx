"use client";

import { useState, useEffect } from "react";
import {
  MenuIcon,
  ExternalLinkIcon,
  LogoutIcon,
  MoonIcon,
  SunIcon,
} from "./Icons";

interface HeaderProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  brandName?: string;
  tagline?: string;
  logoUrl?: string | null;
}

export default function Header({
  onToggleSidebar,
  onNewChat,
  brandName = "AI Assistant",
  tagline = "Your AI Assistant",
  logoUrl,
}: HeaderProps) {
  const [isDark, setIsDark] = useState(false);

  // Get initials from brand name
  const initials = brandName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)] z-50">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left section */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
            title="Toggle Sidebar"
          >
            <MenuIcon className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--surface)] flex items-center justify-center border border-[var(--border)] overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {initials}
                </span>
              )}
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                {brandName}
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                {tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1">
          <button
            onClick={onNewChat}
            className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
            title="New Chat"
          >
            <ExternalLinkIcon className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <a
            href="/admin/login"
            className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
            title="Admin Login"
          >
            <LogoutIcon className="w-5 h-5 text-[var(--text-secondary)]" />
          </a>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
            title="Toggle Theme"
          >
            {isDark ? (
              <SunIcon className="w-5 h-5 text-[var(--text-secondary)]" />
            ) : (
              <MoonIcon className="w-5 h-5 text-[var(--text-secondary)]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
