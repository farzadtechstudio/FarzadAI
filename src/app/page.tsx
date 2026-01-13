"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Chat, Message, TenantTopicCard } from "@/types";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import TopicCards from "./components/TopicCards";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";

interface TenantBranding {
  tenant: {
    id: string;
    slug: string;
    brand_name: string;
    tagline: string;
    owner_name: string;
    primary_color: string;
    logo_url: string | null;
  };
  settings: {
    welcome_title: string;
    welcome_subtitle: string;
    placeholder_text: string;
    disclaimer_text: string;
  } | null;
  topicCards: TenantTopicCard[];
}

const STORAGE_KEY = "farzad-ai-chats";

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string>("");
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentChat = chats.find((chat) => chat.id === currentChatId);

  // Load tenant branding
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const host = window.location.host;
        const response = await fetch(`/api/tenant?host=${encodeURIComponent(host)}`);
        if (response.ok) {
          const data = await response.json();
          setBranding(data);

          // Apply primary color as CSS variable
          if (data.tenant?.primary_color) {
            document.documentElement.style.setProperty('--accent', data.tenant.primary_color);
          }
        }
      } catch (error) {
        console.error("Failed to load branding:", error);
      }
    };

    loadBranding();
  }, []);

  // Load chats from localStorage
  useEffect(() => {
    const storageKey = branding?.tenant?.slug
      ? `${branding.tenant.slug}-ai-chats`
      : STORAGE_KEY;

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChats(parsed);
      } catch (e) {
        console.error("Failed to parse saved chats:", e);
      }
    }
  }, [branding?.tenant?.slug]);

  // Save chats to localStorage
  useEffect(() => {
    if (chats.length > 0) {
      const storageKey = branding?.tenant?.slug
        ? `${branding.tenant.slug}-ai-chats`
        : STORAGE_KEY;
      localStorage.setItem(storageKey, JSON.stringify(chats));
    }
  }, [chats, branding?.tenant?.slug]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages]);

  const createNewChat = () => {
    setCurrentChatId(null);
    setPendingPrompt("");
  };

  const handleSelectTopic = (prompt: string) => {
    setPendingPrompt(prompt);
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    let chatId = currentChatId;
    let updatedChats = [...chats];

    if (!chatId) {
      // Create new chat
      const newChat: Chat = {
        id: uuidv4(),
        title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
        messages: [userMessage],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      chatId = newChat.id;
      updatedChats = [newChat, ...updatedChats];
      setCurrentChatId(chatId);
    } else {
      // Add to existing chat
      updatedChats = updatedChats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [...chat.messages, userMessage],
              updatedAt: new Date(),
            }
          : chat
      );
    }

    setChats(updatedChats);
    setPendingPrompt("");
    setIsLoading(true);

    try {
      const currentMessages = updatedChats.find((c) => c.id === chatId)?.messages || [];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          tenantId: branding?.tenant?.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [...chat.messages, assistantMessage],
                updatedAt: new Date(),
              }
            : chat
        )
      );
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content:
          "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date(),
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [...chat.messages, errorMessage],
                updatedAt: new Date(),
              }
            : chat
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setSidebarOpen(false);
    setPendingPrompt("");
  };

  const handleDeleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  };

  // Get display values from branding or use defaults
  const brandName = branding?.tenant?.brand_name || "AI Assistant";
  const tagline = branding?.tenant?.tagline || "Your AI Assistant";
  const ownerName = branding?.tenant?.owner_name || "Assistant";
  const logoUrl = branding?.tenant?.logo_url;
  const welcomeTitle = branding?.settings?.welcome_title || "How can I help you today?";
  const welcomeSubtitle = branding?.settings?.welcome_subtitle || "Ask me anything.";
  const placeholderText = branding?.settings?.placeholder_text || "Type your message...";
  const disclaimerText = branding?.settings?.disclaimer_text || "This AI provides general information only.";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={createNewChat}
        brandName={brandName}
        tagline={tagline}
        logoUrl={logoUrl}
      />

      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        isOpen={sidebarOpen}
        onNewChat={createNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onToggleSidebar={() => setSidebarOpen(false)}
      />

      <main
        className={`pt-16 min-h-screen transition-all duration-300 ${
          sidebarOpen ? "lg:pl-72" : ""
        }`}
      >
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          {/* Chat Messages or Welcome Screen */}
          <div className="flex-1 overflow-y-auto">
            {currentChat && currentChat.messages.length > 0 ? (
              <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {currentChat.messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    brandName={brandName}
                  />
                ))}
                {isLoading && (
                  <ChatMessage
                    message={{
                      id: "loading",
                      role: "assistant",
                      content: "",
                      timestamp: new Date(),
                    }}
                    isLoading
                    brandName={brandName}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-full px-4 py-12">
                <div className="text-center mb-12">
                  <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">
                    {welcomeTitle}
                  </h1>
                  <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
                    {welcomeSubtitle}
                  </p>
                </div>

                <TopicCards
                  onSelectTopic={handleSelectTopic}
                  customCards={branding?.topicCards}
                />

                <p className="text-sm text-[var(--text-muted)] mt-12 text-center max-w-md">
                  {disclaimerText.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < disclaimerText.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-[var(--border)] bg-[var(--background)]">
            <div className="max-w-4xl mx-auto px-4 py-4">
              <ChatInput
                onSend={handleSendMessage}
                isLoading={isLoading}
                initialValue={pendingPrompt}
                placeholder={placeholderText}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
