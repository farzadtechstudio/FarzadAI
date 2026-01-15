"use client";

import { useState, useEffect } from "react";

interface AnalyticsDashboardProps {
  tenantId: string;
}

interface AnalyticsData {
  totalVideos: number;
  totalChats: number;
  totalMessages: number;
  totalNotes: number;
  videosThisMonth: number;
  chatsThisWeek: number;
  popularTopics: { name: string; count: number }[];
  recentActivity: { type: string; title: string; date: string }[];
  contentGenerated: {
    summaries: number;
    descriptions: number;
    newsletters: number;
    quotes: number;
    highlights: number;
  };
}

export default function AnalyticsDashboard({ tenantId }: AnalyticsDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("month");

  useEffect(() => {
    loadAnalytics();
  }, [tenantId, timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?tenantId=${tenantId}&range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--text-secondary)]">Loading analytics...</div>
      </div>
    );
  }

  // Default values if no data
  const data = analytics || {
    totalVideos: 0,
    totalChats: 0,
    totalMessages: 0,
    totalNotes: 0,
    videosThisMonth: 0,
    chatsThisWeek: 0,
    popularTopics: [],
    recentActivity: [],
    contentGenerated: {
      summaries: 0,
      descriptions: 0,
      newsletters: 0,
      quotes: 0,
      highlights: 0,
    },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Track your content and engagement metrics
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(["week", "month", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {range === "week" ? "This Week" : range === "month" ? "This Month" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Videos"
          value={data.totalVideos}
          subtitle={`${data.videosThisMonth} this month`}
          icon={
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          }
          color="red"
        />

        <StatCard
          title="Chat Sessions"
          value={data.totalChats}
          subtitle={`${data.chatsThisWeek} this week`}
          icon={
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          }
          color="blue"
        />

        <StatCard
          title="Messages Sent"
          value={data.totalMessages}
          icon={
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" x2="11" y1="2" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          }
          color="green"
        />

        <StatCard
          title="Notes Created"
          value={data.totalNotes}
          icon={
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" x2="8" y1="13" y2="13" />
              <line x1="16" x2="8" y1="17" y2="17" />
            </svg>
          }
          color="purple"
        />
      </div>

      {/* Content Generated */}
      <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Content Generated</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <ContentStat label="Summaries" value={data.contentGenerated.summaries} />
          <ContentStat label="Descriptions" value={data.contentGenerated.descriptions} />
          <ContentStat label="Newsletters" value={data.contentGenerated.newsletters} />
          <ContentStat label="Quotes" value={data.contentGenerated.quotes} />
          <ContentStat label="Highlights" value={data.contentGenerated.highlights} />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Topics */}
        <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Popular Topics</h2>
          {data.popularTopics.length > 0 ? (
            <div className="space-y-3">
              {data.popularTopics.slice(0, 8).map((topic, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {topic.name}
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">{topic.count}</span>
                    </div>
                    <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] rounded-full transition-all"
                        style={{
                          width: `${Math.min((topic.count / (data.popularTopics[0]?.count || 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-muted)] text-sm">No topics data yet. Import some videos to see topic analytics.</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Recent Activity</h2>
          {data.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {data.recentActivity.slice(0, 8).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-[var(--background)] rounded-lg"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activity.type === "video"
                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        : activity.type === "chat"
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    }`}
                  >
                    {activity.type === "video" ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    ) : activity.type === "chat" ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{activity.date}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-muted)] text-sm">No recent activity. Start using the platform to see activity here.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: "red" | "blue" | "green" | "purple";
}) {
  const colorClasses = {
    red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--text-muted)]">{title}</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{value.toLocaleString()}</p>
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ContentStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-4 bg-[var(--background)] rounded-xl">
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
