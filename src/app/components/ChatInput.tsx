"use client";

import { useState, useRef, useEffect } from "react";
import { SendIcon } from "./Icons";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  initialValue?: string;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  isLoading,
  initialValue = "",
  placeholder = "What should we think through together?",
}: ChatInputProps) {
  const [input, setInput] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative flex items-end gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-2 shadow-lg">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="chat-input flex-1 resize-none bg-transparent px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none min-h-[44px] max-h-[200px]"
        rows={1}
        disabled={isLoading}
      />
      <button
        onClick={handleSubmit}
        disabled={!input.trim() || isLoading}
        className={`p-3 rounded-xl transition-all ${
          input.trim() && !isLoading
            ? "bg-[var(--accent)] text-white hover:opacity-90"
            : "bg-[var(--surface-hover)] text-[var(--text-muted)]"
        }`}
      >
        <SendIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
