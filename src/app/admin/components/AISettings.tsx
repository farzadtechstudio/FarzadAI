"use client";

import { useState, useEffect } from "react";
import { SaveIcon } from "./AdminIcons";

interface AISettingsProps {
  tenantId: string;
}

interface AISettingsData {
  system_prompt: string;
  openai_model: string;
  max_tokens: number;
  temperature: number;
}

const modelOptions = [
  { value: "gpt-4-turbo-preview", label: "GPT-4 Turbo (Recommended)" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Faster, cheaper)" },
];

export default function AISettings({ tenantId }: AISettingsProps) {
  const [data, setData] = useState<AISettingsData>({
    system_prompt: "",
    openai_model: "gpt-4-turbo-preview",
    max_tokens: 2000,
    temperature: 0.7,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [tenantId]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/admin/ai-settings?tenantId=${tenantId}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch AI settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, ...data }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "AI settings saved successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to save settings" });
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
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">AI Settings</h2>
        <p className="text-[var(--text-secondary)] mt-1">
          Configure the AI personality and behavior
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
        {/* System Prompt */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            System Prompt (AI Personality)
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            This defines how the AI behaves, its expertise, communication style, and personality.
            Be specific about the person it represents.
          </p>
          <textarea
            value={data.system_prompt}
            onChange={(e) => setData({ ...data, system_prompt: e.target.value })}
            rows={15}
            className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] font-mono text-sm resize-none"
            placeholder={`Example:
You are [Name] AI, an AI assistant that embodies [Name]'s thinking style and expertise.

Your areas of expertise:
- Topic 1
- Topic 2

Your communication style:
- Be direct and substantive
- Use first principles thinking
- Provide concrete examples

Important: You provide insights, not financial/legal/personal advice.`}
          />
        </section>

        {/* Model Settings */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Model Configuration
          </h3>
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                AI Model
              </label>
              <select
                value={data.openai_model}
                onChange={(e) => setData({ ...data, openai_model: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                {modelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Max Response Length (tokens)
              </label>
              <input
                type="number"
                value={data.max_tokens}
                onChange={(e) => setData({ ...data, max_tokens: parseInt(e.target.value) || 2000 })}
                min={100}
                max={4000}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Higher = longer responses. Recommended: 1500-2500
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Temperature (Creativity): {data.temperature}
              </label>
              <input
                type="range"
                value={data.temperature}
                onChange={(e) => setData({ ...data, temperature: parseFloat(e.target.value) })}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                <span>More focused (0)</span>
                <span>More creative (1)</span>
              </div>
            </div>
          </div>
        </section>

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
