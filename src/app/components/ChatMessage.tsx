"use client";

import { Message } from "@/types";

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
  brandName?: string;
}

export default function ChatMessage({
  message,
  isLoading,
  brandName = "AI Assistant",
}: ChatMessageProps) {
  const isUser = message.role === "user";

  // Get initials from brand name
  const initials = brandName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}
    >
      <div
        className={`max-w-[85%] md:max-w-[75%] ${
          isUser
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--surface)] text-[var(--text-primary)]"
        } rounded-2xl px-5 py-3 ${isUser ? "rounded-br-md" : "rounded-bl-md"}`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {brandName}
            </span>
          </div>
        )}
        <div className="message-content">
          {isLoading ? (
            <span className="flex items-center gap-1">
              <span>Thinking</span>
              <span className="typing-cursor">|</span>
            </span>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}
