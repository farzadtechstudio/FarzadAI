"use client";

import { useState, useEffect, useMemo } from "react";
import { PlusIcon, TrashIcon, EditIcon, SaveIcon, SearchIcon, EyeIcon } from "./AdminIcons";

interface KnowledgeBaseProps {
  tenantId: string;
}

interface KnowledgeItem {
  id?: string;
  source: "youtube" | "manual" | "document";
  title: string;
  content: string;
  source_url?: string;
  category?: string;
  playlist?: string;
  date?: string;
  length?: number;
  modified_by?: string;
  modified_by_initials?: string;
  is_ai_processed?: boolean;
  created_at?: string;
  updated_at?: string;
}

const CATEGORIES = [
  "AI & Automation",
  "Tesla vs. World",
  "Musk & Strategy",
  "Tech Investing",
  "Politics & Power",
  "First Principles",
  "Market Analysis",
  "Career & Growth",
  "Other",
];

const SOURCES = ["YouTube", "Manual", "Document"];

export default function KnowledgeBase({ tenantId }: KnowledgeBaseProps) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [viewingItem, setViewingItem] = useState<KnowledgeItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [playlistFilter, setPlaylistFilter] = useState("All Playlists");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");

  // Sorting
  const [sortField, setSortField] = useState<"title" | "source" | "category" | "date" | "length">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchItems();
  }, [tenantId]);

  const fetchItems = async () => {
    try {
      const response = await fetch(`/api/admin/knowledge?tenantId=${tenantId}`);
      if (response.ok) {
        const result = await response.json();
        setItems(result.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch knowledge items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique playlists for filter dropdown
  const playlists = useMemo(() => {
    const uniquePlaylists = new Set(items.map((item) => item.playlist).filter(Boolean));
    return Array.from(uniquePlaylists);
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(query)
      );
    }

    // Source filter
    if (sourceFilter !== "All Sources") {
      filtered = filtered.filter(
        (item) => item.source.toLowerCase() === sourceFilter.toLowerCase()
      );
    }

    // Playlist filter
    if (playlistFilter !== "All Playlists") {
      filtered = filtered.filter((item) => item.playlist === playlistFilter);
    }

    // Category filter
    if (categoryFilter !== "All Categories") {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "title":
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case "source":
          aVal = a.source;
          bVal = b.source;
          break;
        case "category":
          aVal = a.category || "";
          bVal = b.category || "";
          break;
        case "date":
          aVal = a.date || a.created_at || "";
          bVal = b.date || b.created_at || "";
          break;
        case "length":
          aVal = a.length || a.content.length;
          bVal = b.length || b.content.length;
          break;
      }

      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  }, [items, searchQuery, sourceFilter, playlistFilter, categoryFilter, sortField, sortDirection]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleAddNew = () => {
    setEditingItem({
      source: "manual",
      title: "",
      content: "",
      source_url: "",
      category: "",
      playlist: "",
      date: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem({ ...item });
    setShowModal(true);
  };

  const handleView = (item: KnowledgeItem) => {
    setViewingItem(item);
    setShowViewModal(true);
  };

  const handleSaveItem = async () => {
    if (!editingItem) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const method = editingItem.id ? "PUT" : "POST";
      const itemToSave = {
        ...editingItem,
        length: editingItem.content.length,
        modified_by: "Current User", // TODO: Get from auth context
        modified_by_initials: "CU",
        updated_at: new Date().toISOString(),
      };

      const response = await fetch("/api/admin/knowledge", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, ...itemToSave }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Knowledge item saved!" });
        setShowModal(false);
        setEditingItem(null);
        fetchItems();
      } else {
        setMessage({ type: "error", text: "Failed to save" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this knowledge item?")) return;

    try {
      const response = await fetch(`/api/admin/knowledge?id=${id}&tenantId=${tenantId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setItems(items.filter((item) => item.id !== id));
        setMessage({ type: "success", text: "Item deleted" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete" });
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatLength = (length?: number, content?: string) => {
    const len = length || content?.length || 0;
    if (len >= 1000) {
      return `${(len / 1000).toFixed(1)}k`;
    }
    return len.toString();
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    <span className="ml-1 text-[var(--text-muted)]">
      {sortField === field ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  if (isLoading) {
    return <div className="text-[var(--text-secondary)]">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Knowledge Base</h2>
          <p className="text-[var(--text-secondary)] mt-1">
            Manage content from YouTube transcripts, documents, and manual entries
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
        >
          <PlusIcon className="w-5 h-5" />
          Add Knowledge
        </button>
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

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        {/* Toggle for AI processed - placeholder for future feature */}
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span className="text-[var(--text-muted)]">Search content</span>
        </label>

        {/* Source Filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option>All Sources</option>
          {SOURCES.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>

        {/* Playlist Filter */}
        <select
          value={playlistFilter}
          onChange={(e) => setPlaylistFilter(e.target.value)}
          className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option>All Playlists</option>
          {playlists.map((playlist) => (
            <option key={playlist} value={playlist}>
              {playlist}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option>All Categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th
                  className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                  onClick={() => handleSort("title")}
                >
                  Title <SortIcon field="title" />
                </th>
                <th
                  className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                  onClick={() => handleSort("source")}
                >
                  Source <SortIcon field="source" />
                </th>
                <th
                  className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                  onClick={() => handleSort("category")}
                >
                  Category <SortIcon field="category" />
                </th>
                <th
                  className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                  onClick={() => handleSort("date")}
                >
                  Date <SortIcon field="date" />
                </th>
                <th
                  className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                  onClick={() => handleSort("length")}
                >
                  Length <SortIcon field="length" />
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">
                  Modified By
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <p className="text-[var(--text-muted)]">
                      {items.length === 0
                        ? "No knowledge items yet"
                        : "No items match your filters"}
                    </p>
                    {items.length === 0 && (
                      <button
                        onClick={handleAddNew}
                        className="mt-4 text-[var(--accent)] hover:underline"
                      >
                        Add your first item
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--background)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-primary)] font-medium max-w-[250px] truncate">
                          {item.title}
                        </span>
                        {item.is_ai_processed && (
                          <span className="text-xs text-[var(--accent)]">✦AI</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--text-secondary)] capitalize">
                        {item.source === "youtube" ? "YouTube" : item.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--text-secondary)]">
                        {item.category || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--text-secondary)]">
                        {formatDate(item.date || item.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--text-secondary)]">
                        {formatLength(item.length, item.content)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-xs font-medium">
                          {item.modified_by_initials || "AA"}
                        </div>
                        <span className="text-[var(--text-secondary)] text-sm max-w-[100px] truncate">
                          {item.modified_by || "Admin"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleView(item)}
                          className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                          title="View"
                        >
                          <EyeIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                          title="Edit"
                        >
                          <EditIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id!)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Count */}
      <p className="mt-4 text-sm text-[var(--text-muted)]">
        Showing {filteredItems.length} of {items.length} transcripts
      </p>

      {/* View Modal */}
      {showViewModal && viewingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[var(--border)] flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {viewingItem.title}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-secondary)]">
                  <span className="capitalize">{viewingItem.source}</span>
                  {viewingItem.category && <span>• {viewingItem.category}</span>}
                  {viewingItem.date && <span>• {formatDate(viewingItem.date)}</span>}
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-[var(--surface)] rounded-lg transition-colors"
              >
                <span className="text-[var(--text-secondary)]">✕</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <pre className="whitespace-pre-wrap text-[var(--text-primary)] font-sans text-sm leading-relaxed">
                {viewingItem.content}
              </pre>
            </div>
            {viewingItem.source_url && (
              <div className="p-4 border-t border-[var(--border)]">
                <a
                  href={viewingItem.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline text-sm"
                >
                  View original source →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {editingItem.id ? "Edit Knowledge Item" : "Add Knowledge Item"}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Source Type
                  </label>
                  <select
                    value={editingItem.source}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        source: e.target.value as "youtube" | "manual" | "document",
                      })
                    }
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)]"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="youtube">YouTube Transcript</option>
                    <option value="document">Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Category
                  </label>
                  <select
                    value={editingItem.category || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, category: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)]"
                  >
                    <option value="">Select category...</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, title: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)]"
                  placeholder="e.g., Tesla FSD Strategy Analysis"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Playlist (optional)
                  </label>
                  <input
                    type="text"
                    value={editingItem.playlist || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, playlist: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)]"
                    placeholder="e.g., Tesla Deep Dives"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editingItem.date || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, date: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Content
                </label>
                <textarea
                  value={editingItem.content}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, content: e.target.value })
                  }
                  rows={10}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] resize-none font-mono text-sm"
                  placeholder="Paste your content, transcript, or knowledge here..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Source URL (optional)
                </label>
                <input
                  type="url"
                  value={editingItem.source_url || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, source_url: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)]"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border)] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--surface)] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                disabled={isSaving || !editingItem.title || !editingItem.content}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <SaveIcon className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
