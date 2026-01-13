"use client";

import { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, EditIcon, SaveIcon } from "./AdminIcons";

interface TopicCardsSettingsProps {
  tenantId: string;
}

interface TopicCard {
  id?: string;
  icon: string;
  title: string;
  description: string;
  suggested_prompt: string;
  order: number;
  is_active: boolean;
}

const iconOptions = [
  { value: "car", label: "Car (Tesla/Auto)" },
  { value: "brain", label: "Brain (AI/Learning)" },
  { value: "globe", label: "Globe (World/Society)" },
  { value: "target", label: "Target (Strategy/Goals)" },
  { value: "chart", label: "Chart (Business/Finance)" },
  { value: "code", label: "Code (Technology/Dev)" },
  { value: "heart", label: "Heart (Health/Wellness)" },
  { value: "star", label: "Star (Success/Tips)" },
];

export default function TopicCardsSettings({ tenantId }: TopicCardsSettingsProps) {
  const [cards, setCards] = useState<TopicCard[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchCards();
  }, [tenantId]);

  const fetchCards = async () => {
    try {
      const response = await fetch(`/api/admin/topics?tenantId=${tenantId}`);
      if (response.ok) {
        const result = await response.json();
        setCards(result.cards || []);
      }
    } catch (error) {
      console.error("Failed to fetch topic cards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCard = () => {
    const newCard: TopicCard = {
      id: `new-${Date.now()}`,
      icon: "star",
      title: "",
      description: "",
      suggested_prompt: "",
      order: cards.length,
      is_active: true,
    };
    setCards([...cards, newCard]);
    setEditingId(newCard.id!);
  };

  const handleUpdateCard = (id: string, updates: Partial<TopicCard>) => {
    setCards(cards.map((card) => (card.id === id ? { ...card, ...updates } : card)));
  };

  const handleDeleteCard = (id: string) => {
    if (confirm("Are you sure you want to delete this topic card?")) {
      setCards(cards.filter((card) => card.id !== id));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/topics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, cards }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Topic cards saved successfully!" });
        setEditingId(null);
        fetchCards(); // Refresh to get server-assigned IDs
      } else {
        setMessage({ type: "error", text: "Failed to save topic cards" });
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
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Topic Cards</h2>
        <p className="text-[var(--text-secondary)] mt-1">
          Configure the quick-start topics shown on the welcome screen
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

      <div className="space-y-4">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6"
          >
            {editingId === card.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Icon
                    </label>
                    <select
                      value={card.icon}
                      onChange={(e) => handleUpdateCard(card.id!, { icon: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    >
                      {iconOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={card.title}
                      onChange={(e) => handleUpdateCard(card.id!, { title: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      placeholder="e.g., Tesla & Autonomy"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={card.description}
                    onChange={(e) => handleUpdateCard(card.id!, { description: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="Short description of this topic"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Suggested Prompt
                  </label>
                  <textarea
                    value={card.suggested_prompt}
                    onChange={(e) => handleUpdateCard(card.id!, { suggested_prompt: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                    placeholder="The question that will be sent when user clicks this card"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={card.is_active}
                      onChange={(e) => handleUpdateCard(card.id!, { is_active: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-[var(--text-primary)]">Active</span>
                  </label>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    Done editing
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--background)] flex items-center justify-center text-[var(--text-muted)]">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-[var(--text-primary)]">
                    {card.title || "Untitled"}
                    {!card.is_active && (
                      <span className="ml-2 text-xs text-[var(--text-muted)]">(Hidden)</span>
                    )}
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {card.description || "No description"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingId(card.id!)}
                    className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                    title="Edit"
                  >
                    <EditIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                  <button
                    onClick={() => handleDeleteCard(card.id!)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {cards.length < 4 && (
          <button
            onClick={handleAddCard}
            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-[var(--border)] rounded-2xl text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Topic Card
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 mt-6"
        >
          <SaveIcon className="w-5 h-5" />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
