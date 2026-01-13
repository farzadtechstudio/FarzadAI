"use client";

import { Chat } from "@/types";
import {
  PlusIcon,
  MessageIcon,
  TrashIcon,
  ChevronLeftIcon,
  ExternalLinkIcon,
} from "./Icons";
import { format } from "date-fns";

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  isOpen: boolean;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onToggleSidebar: () => void;
}

export default function Sidebar({
  chats,
  currentChatId,
  isOpen,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onToggleSidebar,
}: SidebarProps) {
  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-[var(--surface)] border-r border-[var(--border)] z-40 transition-all duration-300 ${
          isOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Chat History
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={onNewChat}
                className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                title="New Chat"
              >
                <ExternalLinkIcon className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={onToggleSidebar}
                className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                title="Close Sidebar"
              >
                <ChevronLeftIcon className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-2">
            {chats.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">
                No conversations yet
              </p>
            ) : (
              <div className="space-y-1">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      currentChatId === chat.id
                        ? "bg-[var(--surface-hover)]"
                        : "hover:bg-[var(--surface-hover)]"
                    }`}
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <MessageIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)] truncate">
                        {chat.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {format(new Date(chat.updatedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                      title="Delete Chat"
                    >
                      <TrashIcon className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--border)]">
            <button
              onClick={() => {
                if (
                  confirm("Are you sure you want to clear all chat history?")
                ) {
                  chats.forEach((chat) => onDeleteChat(chat.id));
                }
              }}
              className="flex items-center gap-2 w-full p-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
              Clear All History
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggleSidebar}
        />
      )}
    </>
  );
}
