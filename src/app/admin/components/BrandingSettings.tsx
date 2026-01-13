"use client";

import { useState, useEffect } from "react";
import { SaveIcon, UploadIcon } from "./AdminIcons";

interface BrandingSettingsProps {
  tenantId: string;
}

interface BrandingData {
  brand_name: string;
  tagline: string;
  owner_name: string;
  primary_color: string;
  logo_url: string;
  welcome_title: string;
  welcome_subtitle: string;
  placeholder_text: string;
  disclaimer_text: string;
}

export default function BrandingSettings({ tenantId }: BrandingSettingsProps) {
  const [data, setData] = useState<BrandingData>({
    brand_name: "",
    tagline: "",
    owner_name: "",
    primary_color: "#3b5998",
    logo_url: "",
    welcome_title: "",
    welcome_subtitle: "",
    placeholder_text: "",
    disclaimer_text: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchBranding();
  }, [tenantId]);

  const fetchBranding = async () => {
    try {
      const response = await fetch(`/api/admin/branding?tenantId=${tenantId}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch branding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, ...data }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Branding saved successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to save branding" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-[var(--text-secondary)]">Loading...</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Branding Settings</h2>
        <p className="text-[var(--text-secondary)] mt-1">
          Customize how your AI assistant looks and feels
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* Basic Info */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Basic Information</h3>
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Brand Name
              </label>
              <input
                type="text"
                value={data.brand_name}
                onChange={(e) => setData({ ...data, brand_name: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="e.g., Aly AI"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                This appears in the header (e.g., &quot;FARZAD AI&quot;)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Tagline
              </label>
              <input
                type="text"
                value={data.tagline}
                onChange={(e) => setData({ ...data, tagline: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="e.g., Independent Thinker's Assistant"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Owner/Creator Name
              </label>
              <input
                type="text"
                value={data.owner_name}
                onChange={(e) => setData({ ...data, owner_name: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="e.g., Farzad Mesbahi"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                The person this AI represents
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Primary Color
              </label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={data.primary_color}
                  onChange={(e) => setData({ ...data, primary_color: e.target.value })}
                  className="w-12 h-12 rounded-lg cursor-pointer border border-[var(--border)]"
                />
                <input
                  type="text"
                  value={data.primary_color}
                  onChange={(e) => setData({ ...data, primary_color: e.target.value })}
                  className="flex-1 px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="#3b5998"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Welcome Screen */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Welcome Screen</h3>
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Welcome Title
              </label>
              <input
                type="text"
                value={data.welcome_title}
                onChange={(e) => setData({ ...data, welcome_title: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="e.g., What do you want to understand about the future?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Welcome Subtitle
              </label>
              <textarea
                value={data.welcome_subtitle}
                onChange={(e) => setData({ ...data, welcome_subtitle: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                placeholder="e.g., Ask me anything about technology, AI, Tesla..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Input Placeholder
              </label>
              <input
                type="text"
                value={data.placeholder_text}
                onChange={(e) => setData({ ...data, placeholder_text: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="e.g., What should we think through together?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Disclaimer Text
              </label>
              <textarea
                value={data.disclaimer_text}
                onChange={(e) => setData({ ...data, disclaimer_text: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                placeholder="e.g., This AI provides general insights, not financial advice..."
              />
            </div>
          </div>
        </section>

        {/* Logo Upload */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Logo</h3>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
              {data.logo_url ? (
                <img src={data.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-[var(--text-muted)]">
                  {data.brand_name?.substring(0, 2).toUpperCase() || "AI"}
                </span>
              )}
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={data.logo_url}
                onChange={(e) => setData({ ...data, logo_url: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Enter logo URL or upload"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Recommended: 200x200px, PNG or SVG
              </p>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <SaveIcon className="w-5 h-5" />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
