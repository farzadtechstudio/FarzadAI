"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, UploadIcon, EyeIcon } from "./AdminIcons";

interface YouTubeFeedProps {
  tenantId: string;
}

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  thumbnail: string;
  published_at: string;
  playlist?: string;
  playlist_id?: string;
  duration?: string;
  view_count?: number;
  is_imported: boolean;
  knowledge_item_id?: string;
}

// External link icon
const ExternalLinkIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
);

// Refresh icon
const RefreshIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

// Calendar icon
const CalendarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

// Check icon
const CheckIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Document icon
const DocumentIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
  </svg>
);

// Settings icon
const SettingsIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default function YouTubeFeed({ tenantId }: YouTubeFeedProps) {
  const router = useRouter();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [channelName, setChannelName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Connection modal
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [channelInput, setChannelInput] = useState("");
  const [channelNameInput, setChannelNameInput] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("All Time");
  const [playlistFilter, setPlaylistFilter] = useState("All Playlists");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting
  const [sortColumn, setSortColumn] = useState<"title" | "date" | "playlist" | "status">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Cache info
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchYouTubeData();
  }, [tenantId]);

  const fetchYouTubeData = async () => {
    try {
      const response = await fetch(`/api/admin/youtube?tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
        setChannelId(data.channel_id || null);
        setChannelName(data.channel_name || null);
        setLastSynced(data.last_synced || null);
        setHasApiKey(data.has_api_key || false);
      }
    } catch (error) {
      console.error("Failed to fetch YouTube data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique playlists
  const playlists = useMemo(() => {
    const uniquePlaylists = new Set(videos.map((v) => v.playlist).filter(Boolean));
    return Array.from(uniquePlaylists) as string[];
  }, [videos]);

  // Handle sort column click
  const handleSort = (column: "title" | "date" | "playlist" | "status") => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection(column === "date" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  // Get sort indicator for column
  const getSortIndicator = (column: "title" | "date" | "playlist" | "status") => {
    if (sortColumn !== column) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  // Filter and paginate videos
  const filteredVideos = useMemo(() => {
    let filtered = videos;

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((v) => v.title.toLowerCase().includes(query));
    }

    // Date filter
    if (dateFilter !== "All Time") {
      const now = new Date();
      let cutoff: Date;

      switch (dateFilter) {
        case "Last 7 days":
          cutoff = new Date(now.setDate(now.getDate() - 7));
          break;
        case "Last 30 days":
          cutoff = new Date(now.setDate(now.getDate() - 30));
          break;
        case "Last 90 days":
          cutoff = new Date(now.setDate(now.getDate() - 90));
          break;
        case "This year":
          cutoff = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          cutoff = new Date(0);
      }

      filtered = filtered.filter((v) => new Date(v.published_at) >= cutoff);
    }

    // Playlist filter
    if (playlistFilter !== "All Playlists") {
      filtered = filtered.filter((v) => v.playlist === playlistFilter);
    }

    // Status filter
    if (statusFilter === "Imported") {
      filtered = filtered.filter((v) => v.is_imported);
    } else if (statusFilter === "Not Imported") {
      filtered = filtered.filter((v) => !v.is_imported);
    }

    // Sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "date":
          comparison = new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
          break;
        case "playlist":
          comparison = (a.playlist || "").localeCompare(b.playlist || "");
          break;
        case "status":
          comparison = (a.is_imported ? 1 : 0) - (b.is_imported ? 1 : 0);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [videos, searchQuery, dateFilter, playlistFilter, statusFilter, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);
  const paginatedVideos = filteredVideos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const importedCount = videos.filter((v) => v.is_imported).length;

  const handleSync = async () => {
    setIsSyncing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/youtube/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchYouTubeData(); // Reload all data
        setMessage({ type: "success", text: `Synced ${data.videos_added || 0} new videos` });
      } else {
        setMessage({ type: "error", text: "Failed to sync from YouTube" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to sync from YouTube" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReload = async () => {
    setIsRefreshing(true);
    await fetchYouTubeData();
    setIsRefreshing(false);
  };

  const openSettingsModal = () => {
    setChannelInput(channelId || "");
    setChannelNameInput(channelName || "");
    setApiKeyInput(""); // Don't pre-fill API key for security
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async () => {
    if (!channelInput.trim()) {
      setMessage({ type: "error", text: "Please enter a channel ID" });
      return;
    }

    setIsConnecting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/youtube", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          channel_id: channelInput.trim(),
          channel_name: channelNameInput.trim() || "My Channel",
          ...(apiKeyInput.trim() && { api_key: apiKeyInput.trim() }),
        }),
      });

      if (response.ok) {
        setChannelId(channelInput.trim());
        setChannelName(channelNameInput.trim() || "My Channel");
        if (apiKeyInput.trim()) {
          setHasApiKey(true);
        }
        setShowSettingsModal(false);
        setChannelInput("");
        setChannelNameInput("");
        setApiKeyInput("");
        setMessage({ type: "success", text: "Settings updated successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to update settings" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update settings" });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    if (!channelInput.trim()) {
      setMessage({ type: "error", text: "Please enter a channel ID or URL" });
      return;
    }

    if (!apiKeyInput.trim()) {
      setMessage({ type: "error", text: "Please enter your YouTube API key" });
      return;
    }

    setIsConnecting(true);
    setMessage(null);

    try {
      // Extract channel ID from URL if needed
      let channelIdValue = channelInput.trim();
      if (channelIdValue.includes("youtube.com")) {
        const match = channelIdValue.match(/channel\/([^\/\?]+)/);
        if (match) {
          channelIdValue = match[1];
        }
      }

      const response = await fetch("/api/admin/youtube", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          channel_id: channelIdValue,
          channel_name: channelNameInput.trim() || "My Channel",
          api_key: apiKeyInput.trim(),
        }),
      });

      if (response.ok) {
        setChannelId(channelIdValue);
        setChannelName(channelNameInput.trim() || "My Channel");
        setHasApiKey(true);
        setShowConnectModal(false);
        setChannelInput("");
        setChannelNameInput("");
        setApiKeyInput("");
        setMessage({ type: "success", text: "YouTube channel connected! Click 'Sync from YouTube' to fetch videos." });
      } else {
        setMessage({ type: "error", text: "Failed to connect YouTube channel" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to connect YouTube channel" });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleImport = async (video: YouTubeVideo) => {
    setIsImporting(video.id);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/youtube/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, videoId: video.id }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state
        setVideos((prev) =>
          prev.map((v) =>
            v.id === video.id ? { ...v, is_imported: true } : v
          )
        );
        setMessage({ type: "success", text: `Imported "${video.title}"` });
        // Navigate to video detail page after short delay
        setTimeout(() => {
          router.push(`/admin/videos/${video.video_id}`);
        }, 500);
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to import video" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to import video" });
    } finally {
      setIsImporting(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatCacheTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  if (isLoading) {
    return <div className="text-[var(--text-secondary)]">Loading...</div>;
  }

  // No channel connected state
  if (!channelId) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-16 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Connect Your YouTube Channel
          </h3>
          <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
            Connect your YouTube channel to automatically import video transcripts into your knowledge base.
          </p>
          <button
            onClick={() => setShowConnectModal(true)}
            className="px-6 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
          >
            Connect YouTube Channel
          </button>
        </div>

        {/* Connect Modal */}
        {showConnectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                Connect YouTube Channel
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    value={channelNameInput}
                    onChange={(e) => setChannelNameInput(e.target.value)}
                    placeholder="e.g., My Awesome Channel"
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Channel ID or URL
                  </label>
                  <input
                    type="text"
                    value={channelInput}
                    onChange={(e) => setChannelInput(e.target.value)}
                    placeholder="e.g., UCxxxxxx or youtube.com/channel/..."
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Find your channel ID in YouTube Studio under Settings → Advanced Settings
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    YouTube API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Get your API key from the{" "}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline"
                    >
                      Google Cloud Console
                    </a>
                    . Enable the YouTube Data API v3.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowConnectModal(false);
                    setChannelInput("");
                    setChannelNameInput("");
                    setApiKeyInput("");
                  }}
                  className="flex-1 px-4 py-2 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] font-medium rounded-xl hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isConnecting ? "Connecting..." : "Connect"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">YouTube Source Feed</h2>
          <p className="text-[var(--text-secondary)] mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
          {lastSynced && (
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Loaded from cache ({formatCacheTime(lastSynced)})
              {isRefreshing && <span className="text-[var(--accent)] ml-2">• Refreshing in background...</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openSettingsModal}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-medium rounded-xl hover:bg-[var(--surface-hover)] transition-colors"
            title="Channel Settings"
          >
            <SettingsIcon className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={handleReload}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-medium rounded-xl hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Reload
          </button>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync from YouTube"}
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              YouTube Channel Settings
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={channelNameInput}
                  onChange={(e) => setChannelNameInput(e.target.value)}
                  placeholder="e.g., My Awesome Channel"
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Channel ID
                </label>
                <input
                  type="text"
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  placeholder="e.g., UCxxxxxx"
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  YouTube API Key {!hasApiKey && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={hasApiKey ? "••••••••••••••••••••" : "AIzaSy..."}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {hasApiKey ? "Leave blank to keep existing API key, or enter a new one to update." : "Required. "}
                  Get your API key from the{" "}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:underline"
                  >
                    Google Cloud Console
                  </a>
                </p>
              </div>

              {!hasApiKey && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    You need to add a YouTube API key to sync videos from your channel.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  setChannelInput("");
                  setChannelNameInput("");
                  setApiKeyInput("");
                }}
                className="flex-1 px-4 py-2 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] font-medium rounded-xl hover:bg-[var(--surface-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={isConnecting}
                className="flex-1 px-4 py-2 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isConnecting ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search videos..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option>All Time</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>This year</option>
          </select>
        </div>

        {/* Playlist Filter */}
        <select
          value={playlistFilter}
          onChange={(e) => {
            setPlaylistFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option>All Playlists</option>
          {playlists.map((playlist) => (
            <option key={playlist} value={playlist}>
              {playlist}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option>All Status</option>
          <option>Imported</option>
          <option>Not Imported</option>
        </select>

        {/* Items per page */}
        <div className="ml-auto flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span>Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[100px]" />
              <col className="w-[35%]" />
              <col className="w-[120px]" />
              <col className="w-[20%]" />
              <col className="w-[120px]" />
              <col className="w-[140px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">
                  Thumbnail
                </th>
                <th
                  onClick={() => handleSort("title")}
                  className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
                >
                  Title {getSortIndicator("title")}
                </th>
                <th
                  onClick={() => handleSort("date")}
                  className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
                >
                  Date {getSortIndicator("date")}
                </th>
                <th
                  onClick={() => handleSort("playlist")}
                  className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
                >
                  Playlist {getSortIndicator("playlist")}
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
                >
                  Status {getSortIndicator("status")}
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedVideos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <p className="text-[var(--text-muted)]">
                      {videos.length === 0
                        ? "No videos found. Click 'Sync from YouTube' to fetch your videos."
                        : "No videos match your filters"}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedVideos.map((video) => (
                  <tr
                    key={video.id}
                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--background)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="w-[80px] h-[45px] rounded-lg overflow-hidden bg-[var(--background)]">
                        {video.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                              <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--text-primary)] font-medium line-clamp-2 max-w-[400px]">
                        {video.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--text-secondary)]">
                        {formatDate(video.published_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--accent)] font-medium">
                        {video.playlist || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {video.is_imported ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckIcon className="w-4 h-4" />
                          Imported
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">Not imported</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {video.is_imported ? (
                          <button
                            onClick={() => router.push(`/admin/videos/${video.video_id}`)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                          >
                            <DocumentIcon className="w-4 h-4" />
                            View
                          </button>
                        ) : (
                          <button
                            onClick={() => handleImport(video)}
                            disabled={isImporting === video.id}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            <UploadIcon className="w-4 h-4" />
                            {isImporting === video.id ? "Importing..." : "Import"}
                          </button>
                        )}
                        <a
                          href={`https://youtube.com/watch?v=${video.video_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                          title="Open in YouTube"
                        >
                          <ExternalLinkIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <p className="text-[var(--text-muted)]">
          Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredVideos.length)} of {filteredVideos.length} videos
        </p>

        <div className="flex items-center gap-4">
          <span className="text-[var(--text-secondary)]">
            {importedCount} imported
          </span>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="text-[var(--text-primary)]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
