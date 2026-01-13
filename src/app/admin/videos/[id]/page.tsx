"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface TopicTag {
  name: string;
  confidence: number;
  relevance: number;
}

interface SentimentTone {
  overall: string;
  confidence: number;
  emotions: string[];
  energyLevel: string;
}

interface Insight {
  text: string;
  category: "prediction" | "observation" | "recommendation" | "analysis";
  importance: number;
  timestamp?: string;
}

interface FactCheck {
  status: "verified" | "disputed" | "unverifiable" | "partially_true" | "pending";
  explanation: string;
  sources?: string[];
  checkedAt: string;
}

interface Claim {
  text: string;
  type: "prediction" | "fact" | "opinion" | "projection";
  confidence: number;
  verifiable: boolean;
  timeframe?: string;
  factCheck?: FactCheck;
}

interface SimilarVideo {
  transcriptId: string;
  title: string;
  reason: string;
  relevanceScore: number;
}

interface AIAnalysis {
  topicTags?: TopicTag[];
  sentimentTone?: SentimentTone;
  insights?: Insight[];
  claims?: Claim[];
  similarVideos?: SimilarVideo[];
  // Legacy fields for backward compatibility
  topics?: string[];
  sentiment?: string[];
  keyInsights?: { text: string; type: "Analysis" | "Observation" | "Tip" }[];
}

interface VideoData {
  id: string;
  video_id: string;
  title: string;
  thumbnail: string;
  published_at: string;
  playlist?: string;
  playlist_id?: string;
  duration?: string;
  view_count?: number;
  channel_id?: string;
  channel_name?: string;
  topicFrequency?: Record<string, number>;
  topicCanonicalNames?: Record<string, string>;
  totalImportedVideos?: number;
  transcript?: {
    segments: TranscriptSegment[];
    fullText: string;
    language: string;
    wordCount: number;
    characterCount: number;
  };
  ai_analysis?: AIAnalysis;
}

interface Note {
  id: string;
  title: string;
  type: "newsletter" | "summary" | "description" | "captions" | "quotes" | "highlights";
  content: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// Icons
const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5L5 19z" />
    <path d="M19 14l.5 1.5L21 16l-1.5.5L19 18l-.5-1.5L17 16l1.5-.5L19 14z" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
  </svg>
);

const PencilIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
    <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
  </svg>
);

const QuoteIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21c0 1 0 1 1 1z" />
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
  </svg>
);

const HighlightIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const NoteIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" x2="11" y1="2" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" x2="6" y1="6" y2="18" />
    <line x1="6" x2="18" y1="6" y2="18" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [video, setVideo] = useState<VideoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [autoScroll, setAutoScroll] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isReimporting, setIsReimporting] = useState(false);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [useLocalStorage, setUseLocalStorage] = useState(true);

  // Load chat messages - try Supabase first, fall back to localStorage
  useEffect(() => {
    if (!videoId) return;

    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/user/videos/${videoId}/messages`);
        const data = await response.json();

        if (data.useLocalStorage) {
          setUseLocalStorage(true);
          // Load from localStorage
          const savedChat = localStorage.getItem(`chat-${videoId}`);
          if (savedChat) {
            try {
              const parsed = JSON.parse(savedChat);
              setChatMessages(parsed);
            } catch (e) {
              console.error("Failed to parse saved chat:", e);
            }
          }
        } else {
          setUseLocalStorage(false);
          setChatMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        // Fall back to localStorage
        setUseLocalStorage(true);
        const savedChat = localStorage.getItem(`chat-${videoId}`);
        if (savedChat) {
          try {
            setChatMessages(JSON.parse(savedChat));
          } catch (e) {
            console.error("Failed to parse saved chat:", e);
          }
        }
      }
    };

    loadMessages();
  }, [videoId]);

  // Save chat messages to localStorage only if using localStorage mode
  useEffect(() => {
    if (videoId && chatMessages.length > 0 && useLocalStorage) {
      localStorage.setItem(`chat-${videoId}`, JSON.stringify(chatMessages));
    }
  }, [videoId, chatMessages, useLocalStorage]);

  // Load notes - try Supabase first, fall back to localStorage
  useEffect(() => {
    if (!videoId) return;

    const loadNotes = async () => {
      try {
        const response = await fetch(`/api/user/videos/${videoId}/notes`);
        const data = await response.json();

        if (data.useLocalStorage) {
          // Load from localStorage
          const savedNotes = localStorage.getItem(`notes-${videoId}`);
          if (savedNotes) {
            try {
              const parsed = JSON.parse(savedNotes);
              setNotes(parsed);
            } catch (e) {
              console.error("Failed to parse saved notes:", e);
            }
          }
        } else {
          setNotes(data.notes || []);
        }
      } catch (error) {
        console.error("Error loading notes:", error);
        // Fall back to localStorage
        const savedNotes = localStorage.getItem(`notes-${videoId}`);
        if (savedNotes) {
          try {
            setNotes(JSON.parse(savedNotes));
          } catch (e) {
            console.error("Failed to parse saved notes:", e);
          }
        }
      }
    };

    loadNotes();
  }, [videoId]);

  // Save notes to localStorage only if using localStorage mode
  useEffect(() => {
    if (videoId && notes.length > 0 && useLocalStorage) {
      localStorage.setItem(`notes-${videoId}`, JSON.stringify(notes));
    }
  }, [videoId, notes, useLocalStorage]);

  useEffect(() => {
    if (videoId) {
      fetchVideoData();
    }
  }, [videoId]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Helper to save message to Supabase (non-blocking)
  const saveMessageToSupabase = async (role: "user" | "assistant", content: string) => {
    if (useLocalStorage) return;
    try {
      await fetch(`/api/user/videos/${videoId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content }),
      });
    } catch (error) {
      console.error("Error saving message to Supabase:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput.trim(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    // Save user message to Supabase (non-blocking)
    saveMessageToSupabase("user", userMessage.content);

    try {
      const response = await fetch(`/api/admin/videos/${videoId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          history: chatMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
      };

      setChatMessages((prev) => [...prev, assistantMessage]);

      // Save assistant message to Supabase (non-blocking)
      saveMessageToSupabase("assistant", assistantMessage.content);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const fetchVideoData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/videos/${videoId}`);

      if (!response.ok) {
        throw new Error("Video not found");
      }

      const data = await response.json();
      setVideo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load video");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyTranscript = async () => {
    if (!video?.transcript?.fullText) return;

    await navigator.clipboard.writeText(video.transcript.fullText);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleContentAction = async (action: string) => {
    if (!video?.transcript?.fullText) return;

    setIsGenerating(action);

    // Map action to note type
    const typeMap: Record<string, Note["type"]> = {
      "Summarize Transcript": "summary",
      "Generate Newsletter": "newsletter",
      "Create Website Description": "description",
      "Social Media Captions": "captions",
      "Key Quotes": "quotes",
      "Highlights": "highlights",
    };

    // Map action to prompt
    const promptMap: Record<string, string> = {
      "Summarize Transcript": "Create a comprehensive summary of this video transcript. Include the main topics, key points, and important takeaways. Format with clear sections and bullet points.",
      "Generate Newsletter": "Write an engaging newsletter based on this video content. Include a catchy headline, introduction, key insights, and a call to action. Make it suitable for email distribution.",
      "Create Website Description": "Write a compelling website description for this video content. It should be SEO-friendly, engaging, and summarize what viewers will learn. Keep it between 150-300 words.",
      "Social Media Captions": "Create 3-5 social media captions for different platforms (Twitter/X, LinkedIn, Instagram) based on this video. Include relevant hashtags and make them engaging and shareable.",
      "Key Quotes": "Extract the most impactful and quotable statements from this transcript. List 5-10 key quotes that capture the essence of the video content. Include brief context for each quote.",
      "Highlights": "Create a highlights summary of the most important moments and insights from this video. Format as a bulleted list of key highlights that someone could quickly scan to understand the main value.",
    };

    try {
      const response = await fetch(`/api/admin/videos/${videoId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: promptMap[action] || `Generate ${action} for this video`,
          history: [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      const data = await response.json();

      // Save to Supabase if enabled
      if (!useLocalStorage) {
        try {
          const saveResponse = await fetch(`/api/user/videos/${videoId}/notes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: action,
              type: typeMap[action] || "summary",
              content: data.message,
            }),
          });
          const saveData = await saveResponse.json();
          if (saveData.note) {
            const newNote: Note = {
              id: saveData.note.id,
              title: saveData.note.title,
              type: saveData.note.type,
              content: saveData.note.content,
              createdAt: saveData.note.createdAt,
            };
            setNotes((prev) => [newNote, ...prev]);
            setSelectedNote(newNote);
            return;
          }
        } catch (error) {
          console.error("Error saving note to Supabase:", error);
        }
      }

      // Fallback to localStorage
      const newNote: Note = {
        id: Date.now().toString(),
        title: action,
        type: typeMap[action] || "summary",
        content: data.message,
        createdAt: new Date().toISOString(),
      };

      setNotes((prev) => [newNote, ...prev]);
      setSelectedNote(newNote);
    } catch (error) {
      console.error("Content generation error:", error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleReimportTranscript = async () => {
    if (!video) return;

    setIsReimporting(true);
    try {
      const response = await fetch("/api/admin/youtube/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: "farzad", // TODO: Get from auth context
          videoId: video.video_id,
          forceReimport: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to import transcript");
      }

      // Refresh video data
      await fetchVideoData();
    } catch (err) {
      console.error("Re-import error:", err);
      alert(err instanceof Error ? err.message : "Failed to re-import transcript");
    } finally {
      setIsReimporting(false);
    }
  };

  const filteredSegments = video?.transcript?.segments.filter((segment) =>
    segment.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--text-secondary)]">Loading video...</div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "Video not found"}</p>
          <button
            onClick={() => router.back()}
            className="text-[var(--accent)] hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--background)] overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-[var(--background)] border-b border-[var(--border)] px-6 py-4">
        <Link
          href="/admin/videos"
          className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeftIcon />
          <span>Back to Videos</span>
        </Link>
      </header>

      <div className="flex-1 overflow-hidden max-w-[1800px] mx-auto px-6 py-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Left Column - Video Info & AI Analysis */}
          <div className="lg:col-span-3 overflow-y-auto space-y-6 pr-2">
            {/* Video Card */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
              <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                {video.title}
              </h1>

              {/* Video Thumbnail */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-4">
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center">
                  <a
                    href={`https://www.youtube.com/watch?v=${video.video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                  >
                    <svg className="w-8 h-8 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Video Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
                {video.playlist && (
                  <span className="text-[var(--accent)] font-medium">
                    {video.playlist}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <CalendarIcon />
                  {formatDate(video.published_at)}
                </span>
                {video.transcript && (
                  <span className="flex items-center gap-1">
                    <ClockIcon />
                    {video.transcript.segments.length} segments
                  </span>
                )}
              </div>

              {/* IDs */}
              <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2 text-xs text-[var(--text-muted)]">
                <div className="flex justify-between">
                  <span>Channel ID:</span>
                  <span className="font-mono truncate max-w-[150px]">{video.channel_id || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Video ID:</span>
                  <span className="font-mono">{video.video_id}</span>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <SparklesIcon />
                <h2 className="font-semibold text-[var(--text-primary)]">AI Analysis</h2>
              </div>

              {video.ai_analysis ? (
                <div className="space-y-4">
                  {/* Topics - Heat Map Style (based on frequency across all videos) */}
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                      Topics
                      <span
                        className="w-4 h-4 rounded-full bg-[var(--border)] flex items-center justify-center text-xs cursor-help"
                        title="Darker colors = more frequent across all videos"
                      >?</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const topics = video.ai_analysis.topicTags || video.ai_analysis.topics?.map(t => ({ name: t, confidence: 0.8, relevance: 0.8 })) || [];
                        const frequency = video.topicFrequency || {};
                        const canonicalNames = video.topicCanonicalNames || {};
                        const totalVideos = video.totalImportedVideos || 1;

                        // Normalize topic name for lookup
                        const normalizeTopic = (topic: string): string => {
                          let normalized = topic.trim().toLowerCase();
                          if (normalized.endsWith('ies')) {
                            normalized = normalized.slice(0, -3) + 'y';
                          } else if (normalized.endsWith('es') && !normalized.endsWith('ies')) {
                            normalized = normalized.slice(0, -2);
                          } else if (normalized.endsWith('s') && !normalized.endsWith('ss')) {
                            normalized = normalized.slice(0, -1);
                          }
                          return normalized;
                        };

                        // Deduplicate topics by normalized name
                        const seenNormalized = new Set<string>();
                        const deduplicatedTopics: typeof topics = [];

                        for (const topic of topics) {
                          const normalized = normalizeTopic(topic.name);
                          if (!seenNormalized.has(normalized)) {
                            seenNormalized.add(normalized);
                            deduplicatedTopics.push(topic);
                          }
                        }

                        // Find max frequency for normalization
                        const freqValues = Object.values(frequency);
                        const maxFreq = freqValues.length > 0 ? Math.max(...freqValues) : 1;

                        return deduplicatedTopics.map((topic, i) => {
                          const normalized = normalizeTopic(topic.name);
                          // Use canonical name if available, otherwise original
                          const displayName = canonicalNames[normalized] || topic.name;
                          const count = frequency[normalized] || 1;
                          // Normalize frequency to 0-1 scale
                          const intensity = count / maxFreq;

                          // Define background colors based on intensity levels
                          let bgClass = "bg-blue-100 dark:bg-blue-900/20";
                          let textClass = "text-blue-700 dark:text-blue-300";

                          if (intensity > 0.8) {
                            bgClass = "bg-blue-600 dark:bg-blue-600";
                            textClass = "text-white";
                          } else if (intensity > 0.6) {
                            bgClass = "bg-blue-500 dark:bg-blue-500";
                            textClass = "text-white";
                          } else if (intensity > 0.4) {
                            bgClass = "bg-blue-400 dark:bg-blue-400";
                            textClass = "text-white";
                          } else if (intensity > 0.2) {
                            bgClass = "bg-blue-300 dark:bg-blue-700/50";
                            textClass = "text-blue-800 dark:text-blue-100";
                          }

                          const tooltipText = `${displayName}: ${count} of ${totalVideos} video${totalVideos > 1 ? 's' : ''}`;

                          return (
                            <span
                              key={i}
                              className={`px-3 py-1 rounded-full text-sm font-medium cursor-default ${bgClass} ${textClass}`}
                              title={tooltipText}
                            >
                              {displayName}
                            </span>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Sentiment & Tone */}
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Sentiment & Tone
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {video.ai_analysis.sentimentTone ? (
                        <>
                          <span className="px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full text-sm capitalize">
                            {video.ai_analysis.sentimentTone.overall}
                          </span>
                          {video.ai_analysis.sentimentTone.emotions?.map((emotion, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-[var(--background)] rounded-full text-sm text-[var(--text-primary)] capitalize"
                            >
                              {emotion}
                            </span>
                          ))}
                          <span className="px-3 py-1 bg-[var(--background)] rounded-full text-sm text-[var(--text-primary)]">
                            Energy: {video.ai_analysis.sentimentTone.energyLevel}
                          </span>
                        </>
                      ) : (
                        video.ai_analysis.sentiment?.map((s, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-[var(--background)] rounded-full text-sm text-[var(--text-primary)]"
                          >
                            {s}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Key Insights */}
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Key Insights
                    </h3>
                    <div className="space-y-3">
                      {(video.ai_analysis.insights || video.ai_analysis.keyInsights?.map(k => ({ text: k.text, category: k.type.toLowerCase() as "analysis" | "observation", importance: 0.8, timestamp: undefined as string | undefined })) || []).map((insight, i) => (
                        <div key={i} className="text-sm p-3 bg-[var(--background)] rounded-lg">
                          <p className="text-[var(--text-primary)]">{insight.text}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 text-xs rounded capitalize ${
                              insight.category === "prediction" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" :
                              insight.category === "observation" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                              insight.category === "recommendation" ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                              "bg-[var(--accent)]/10 text-[var(--accent)]"
                            }`}>
                              {insight.category}
                            </span>
                            {insight.timestamp && (
                              <span className="text-xs text-[var(--text-muted)]">{insight.timestamp}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Claims (if available) */}
                  {video.ai_analysis.claims && video.ai_analysis.claims.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Claims & Predictions
                      </h3>
                      <div className="space-y-3">
                        {video.ai_analysis.claims.map((claim, i) => (
                          <div key={i} className="text-sm p-3 bg-[var(--background)] rounded-lg">
                            <p className="text-[var(--text-primary)]">{claim.text}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className={`px-2 py-0.5 text-xs rounded capitalize ${
                                claim.type === "prediction" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" :
                                claim.type === "fact" ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                                "bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400"
                              }`}>
                                {claim.type}
                              </span>
                              {claim.timeframe && (
                                <span className="text-xs text-[var(--text-muted)]">{claim.timeframe}</span>
                              )}
                              {claim.factCheck && (
                                <span className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${
                                  claim.factCheck.status === "verified" ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                                  claim.factCheck.status === "disputed" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                                  claim.factCheck.status === "partially_true" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400" :
                                  claim.factCheck.status === "pending" ? "bg-gray-100 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400" :
                                  "bg-gray-100 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400"
                                }`}>
                                  {claim.factCheck.status === "verified" && "✓"}
                                  {claim.factCheck.status === "disputed" && "✗"}
                                  {claim.factCheck.status === "partially_true" && "~"}
                                  {claim.factCheck.status === "pending" && "⏳"}
                                  {claim.factCheck.status === "unverifiable" && "?"}
                                  {claim.factCheck.status.replace("_", " ")}
                                </span>
                              )}
                            </div>
                            {claim.factCheck && claim.factCheck.explanation && (
                              <p className="mt-2 text-xs text-[var(--text-muted)] italic border-l-2 border-[var(--border)] pl-2">
                                {claim.factCheck.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Similar Videos (if available) */}
                  {video.ai_analysis.similarVideos && video.ai_analysis.similarVideos.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Related Videos
                      </h3>
                      <div className="space-y-2">
                        {video.ai_analysis.similarVideos.map((similar, i) => (
                          <Link
                            key={i}
                            href={`/admin/videos/${similar.transcriptId}`}
                            className="block p-3 bg-[var(--background)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                          >
                            <p className="text-sm font-medium text-[var(--text-primary)]">{similar.title}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">{similar.reason}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  <p className="mb-3">AI analysis not available yet</p>
                  <button className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90 transition-opacity">
                    Generate Analysis
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Transcript */}
          <div className="lg:col-span-5 flex flex-col min-h-0">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col h-full">
              {/* Copy Transcript Button */}
              <button
                onClick={handleCopyTranscript}
                className="w-full py-3 bg-[var(--accent)] text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <CopyIcon />
                {copiedTranscript ? "Copied!" : "Copy Transcript"}
              </button>

              {/* Search & Language */}
              <div className="p-4 border-b border-[var(--border)] flex items-center gap-4">
                <div className="flex-1 relative">
                  <SearchIcon />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Transcript"
                    className="w-full pl-10 pr-4 py-2 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                  />
                </div>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
                >
                  <option value="en">en</option>
                </select>
              </div>

              {/* Transcript Content */}
              <div
                ref={transcriptRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
              >
                {video.transcript?.segments ? (
                  (filteredSegments || video.transcript.segments).map((segment, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-[var(--accent)] font-mono text-sm shrink-0">
                        {formatTimestamp(segment.start)}
                      </span>
                      <p className="text-[var(--text-primary)] text-sm leading-relaxed">
                        {segment.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-[var(--text-muted)]">
                    <p className="mb-4">No transcript available</p>
                    <button
                      onClick={handleReimportTranscript}
                      disabled={isReimporting}
                      className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isReimporting ? "Importing..." : "Import Transcript"}
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-sm text-[var(--text-muted)]">
                <div className="flex items-center gap-4">
                  <span>Word Count: {video.transcript?.wordCount || 0}</span>
                  <span>Character count: {video.transcript?.characterCount || 0}</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleReimportTranscript}
                    disabled={isReimporting}
                    className="px-3 py-1.5 text-xs rounded-lg hover:bg-[var(--background)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-50"
                  >
                    {isReimporting ? "Importing..." : "Re-import Transcript"}
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span>Autoscroll</span>
                    <div
                      onClick={() => setAutoScroll(!autoScroll)}
                      className={`w-10 h-5 rounded-full transition-colors ${
                        autoScroll ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                          autoScroll ? "translate-x-5 ml-0.5" : "translate-x-0.5"
                        }`}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Content Assistant */}
          <div className="lg:col-span-4 overflow-y-auto space-y-6 pr-2">
            {/* Content Assistant */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <SparklesIcon />
                <h2 className="font-semibold text-[var(--text-primary)]">Content Assistant</h2>
              </div>

              {/* Chat with Transcript */}
              <button
                onClick={() => setIsChatOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--accent)] text-white rounded-xl hover:opacity-90 transition-opacity mb-4"
              >
                <ChatIcon />
                <span className="font-medium">Chat with Transcript</span>
              </button>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleContentAction("Summarize Transcript")}
                  disabled={isGenerating === "Summarize Transcript"}
                  className="flex items-center gap-2 px-4 py-3 bg-[var(--background)] rounded-xl text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-sm disabled:opacity-50"
                >
                  <DocumentIcon />
                  {isGenerating === "Summarize Transcript" ? "Generating..." : "Summarize Transcript"}
                </button>
                <button
                  onClick={() => handleContentAction("Generate Newsletter")}
                  disabled={isGenerating === "Generate Newsletter"}
                  className="flex items-center gap-2 px-4 py-3 bg-[var(--background)] rounded-xl text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-sm disabled:opacity-50"
                >
                  <ChatIcon />
                  {isGenerating === "Generate Newsletter" ? "Generating..." : "Generate Newsletter"}
                </button>
                <button
                  onClick={() => handleContentAction("Create Website Description")}
                  disabled={isGenerating === "Create Website Description"}
                  className="flex items-center gap-2 px-4 py-3 bg-[var(--background)] rounded-xl text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-sm disabled:opacity-50"
                >
                  <PencilIcon />
                  {isGenerating === "Create Website Description" ? "Generating..." : "Create Website Description"}
                </button>
                <button
                  onClick={() => handleContentAction("Social Media Captions")}
                  disabled={isGenerating === "Social Media Captions"}
                  className="flex items-center gap-2 px-4 py-3 bg-[var(--background)] rounded-xl text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-sm disabled:opacity-50"
                >
                  <ShareIcon />
                  {isGenerating === "Social Media Captions" ? "Generating..." : "Social Media Captions"}
                </button>
                <button
                  onClick={() => handleContentAction("Key Quotes")}
                  disabled={isGenerating === "Key Quotes"}
                  className="flex items-center gap-2 px-4 py-3 bg-[var(--background)] rounded-xl text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-sm disabled:opacity-50"
                >
                  <QuoteIcon />
                  {isGenerating === "Key Quotes" ? "Generating..." : "Key Quotes"}
                </button>
                <button
                  onClick={() => handleContentAction("Highlights")}
                  disabled={isGenerating === "Highlights"}
                  className="flex items-center gap-2 px-4 py-3 bg-[var(--background)] rounded-xl text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-sm disabled:opacity-50"
                >
                  <HighlightIcon />
                  {isGenerating === "Highlights" ? "Generating..." : "Highlights"}
                </button>
              </div>
            </div>

            {/* Your Notes */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <NoteIcon />
                  <h2 className="font-semibold text-[var(--text-primary)]">Your notes</h2>
                </div>
                {notes.length > 0 && (
                  <span className="text-xs text-[var(--text-muted)]">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
                )}
              </div>

              {notes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-[var(--background)] flex items-center justify-center mx-auto mb-3">
                    <NoteIcon />
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">No notes yet</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Use quick actions above to generate content</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {notes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-[var(--background)] rounded-xl text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {note.type === "summary" && <DocumentIcon />}
                        {note.type === "newsletter" && <ChatIcon />}
                        {note.type === "description" && <PencilIcon />}
                        {note.type === "captions" && <ShareIcon />}
                        {note.type === "quotes" && <QuoteIcon />}
                        {note.type === "highlights" && <HighlightIcon />}
                        <div className="text-left">
                          <span className="block text-sm">{note.title}</span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ChevronRightIcon />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                  <ChatIcon />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Chat with Transcript</h3>
                  <p className="text-sm text-[var(--text-muted)] truncate max-w-[300px]">{video.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {chatMessages.length > 0 && (
                  <button
                    onClick={async () => {
                      setChatMessages([]);
                      if (useLocalStorage) {
                        localStorage.removeItem(`chat-${videoId}`);
                      } else {
                        try {
                          await fetch(`/api/user/videos/${videoId}/messages`, {
                            method: "DELETE",
                          });
                        } catch (error) {
                          console.error("Error clearing chat from Supabase:", error);
                        }
                      }
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg hover:bg-[var(--background)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    Clear chat
                  </button>
                )}
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors text-[var(--text-secondary)]"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-4">
                    <SparklesIcon />
                  </div>
                  <h4 className="font-medium text-[var(--text-primary)] mb-2">
                    Ask anything about this video
                  </h4>
                  <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
                    I have access to the full transcript and AI analysis. Ask me about topics discussed, specific claims, or request summaries.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {["What are the main topics?", "Summarize the key points", "What predictions were made?"].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setChatInput(suggestion);
                          // Auto-send after setting input
                          setTimeout(() => {
                            const userMessage: ChatMessage = {
                              id: Date.now().toString(),
                              role: "user",
                              content: suggestion,
                            };
                            setChatMessages((prev) => [...prev, userMessage]);
                            setIsChatLoading(true);
                            fetch(`/api/admin/videos/${videoId}/chat`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ message: suggestion, history: [] }),
                            })
                              .then((res) => res.json())
                              .then((data) => {
                                setChatMessages((prev) => [
                                  ...prev,
                                  { id: (Date.now() + 1).toString(), role: "assistant", content: data.message },
                                ]);
                              })
                              .catch(() => {
                                setChatMessages((prev) => [
                                  ...prev,
                                  { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, I encountered an error. Please try again." },
                                ]);
                              })
                              .finally(() => {
                                setIsChatLoading(false);
                                setChatInput("");
                              });
                          }, 0);
                        }}
                        disabled={isChatLoading}
                        className="px-3 py-1.5 bg-[var(--background)] rounded-full text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--background)] text-[var(--text-primary)]"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-headings:font-semibold prose-p:my-1.5 prose-ul:my-2 prose-ul:pl-4 prose-ul:list-disc prose-ol:my-2 prose-ol:pl-4 prose-ol:list-decimal prose-li:my-1 prose-li:marker:text-[var(--text-secondary)]">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--background)] rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-[var(--border)]">
              {/* Suggested Questions */}
              <div className="flex flex-wrap gap-2 mb-3">
                {["What are the main topics?", "Summarize the key points", "What predictions were made?", "Key takeaways?", "What claims were fact-checked?"]
                  .filter((s) => !chatMessages.some((m) => m.role === "user" && m.content.toLowerCase() === s.toLowerCase()))
                  .slice(0, 3)
                  .map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setChatInput(suggestion);
                      // Auto-send
                      const userMessage: ChatMessage = {
                        id: Date.now().toString(),
                        role: "user",
                        content: suggestion,
                      };
                      setChatMessages((prev) => [...prev, userMessage]);
                      setIsChatLoading(true);
                      fetch(`/api/admin/videos/${videoId}/chat`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          message: suggestion,
                          history: chatMessages.map((m) => ({ role: m.role, content: m.content }))
                        }),
                      })
                        .then((res) => res.json())
                        .then((data) => {
                          setChatMessages((prev) => [
                            ...prev,
                            { id: (Date.now() + 1).toString(), role: "assistant", content: data.message },
                          ]);
                        })
                        .catch(() => {
                          setChatMessages((prev) => [
                            ...prev,
                            { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, I encountered an error. Please try again." },
                          ]);
                        })
                        .finally(() => {
                          setIsChatLoading(false);
                          setChatInput("");
                        });
                    }}
                    disabled={isChatLoading}
                    className="px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-full text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-3">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyPress}
                  placeholder="Ask a question about this video..."
                  rows={1}
                  className="flex-1 px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                  style={{ minHeight: "48px", maxHeight: "120px" }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="p-3 bg-[var(--accent)] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SendIcon />
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
                Powered by Claude Opus 4.5
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Note Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                  {selectedNote.type === "summary" && <DocumentIcon />}
                  {selectedNote.type === "newsletter" && <ChatIcon />}
                  {selectedNote.type === "description" && <PencilIcon />}
                  {selectedNote.type === "captions" && <ShareIcon />}
                  {selectedNote.type === "quotes" && <QuoteIcon />}
                  {selectedNote.type === "highlights" && <HighlightIcon />}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{selectedNote.title}</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {new Date(selectedNote.createdAt).toLocaleDateString()} at {new Date(selectedNote.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedNote.content);
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg hover:bg-[var(--background)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  Copy
                </button>
                <button
                  onClick={async () => {
                    const noteIdToDelete = selectedNote.id;
                    setNotes((prev) => prev.filter((n) => n.id !== noteIdToDelete));
                    setSelectedNote(null);

                    if (useLocalStorage) {
                      localStorage.setItem(`notes-${videoId}`, JSON.stringify(notes.filter((n) => n.id !== noteIdToDelete)));
                    } else {
                      try {
                        await fetch(`/api/user/videos/${videoId}/notes?noteId=${noteIdToDelete}`, {
                          method: "DELETE",
                        });
                      } catch (error) {
                        console.error("Error deleting note from Supabase:", error);
                      }
                    }
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors text-[var(--text-secondary)]"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            {/* Note Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{selectedNote.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
