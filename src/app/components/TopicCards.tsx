"use client";

import { TopicCard, TenantTopicCard } from "@/types";
import { CarIcon, BrainIcon, GlobeIcon, TargetIcon } from "./Icons";

interface TopicCardsProps {
  onSelectTopic: (prompt: string) => void;
  customCards?: TenantTopicCard[];
}

// Default topics (used when no custom cards are provided)
const defaultTopics: TopicCard[] = [
  {
    id: "tesla",
    icon: "car",
    title: "Tesla & Autonomy",
    description:
      "Clear explanations on FSD, robotics, manufacturing, and Tesla's long-term strategy.",
    suggestedPrompt:
      "Can you explain Tesla's Full Self-Driving strategy and how it compares to other autonomous vehicle approaches?",
  },
  {
    id: "ai-work",
    icon: "brain",
    title: "AI & The Future of Work",
    description:
      "How AI reshapes careers, productivity, and the next decade of opportunity.",
    suggestedPrompt:
      "How will AI transform the job market over the next 5-10 years, and how should people prepare?",
  },
  {
    id: "innovation",
    icon: "globe",
    title: "Innovation & Society",
    description:
      "The deeper implications of technology shifts on daily life and work.",
    suggestedPrompt:
      "What are the most significant ways technology is changing society that people aren't paying enough attention to?",
  },
  {
    id: "strategy",
    icon: "target",
    title: "Strategy & First Principles",
    description:
      "Frameworks for reasoning clearly about complex, uncertain problems.",
    suggestedPrompt:
      "Can you explain first-principles thinking and how to apply it to make better decisions?",
  },
];

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  car: CarIcon,
  brain: BrainIcon,
  globe: GlobeIcon,
  target: TargetIcon,
  // Additional icons for custom cards
  chart: BrainIcon,
  code: BrainIcon,
  heart: GlobeIcon,
  star: TargetIcon,
};

export default function TopicCards({ onSelectTopic, customCards }: TopicCardsProps) {
  // Use custom cards if provided and not empty, otherwise use defaults
  const topics = customCards && customCards.length > 0
    ? customCards.map((card) => ({
        id: card.id,
        icon: card.icon,
        title: card.title,
        description: card.description || "",
        suggestedPrompt: card.suggested_prompt,
      }))
    : defaultTopics;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
      {topics.map((topic) => {
        const IconComponent = iconMap[topic.icon] || TargetIcon;
        return (
          <button
            key={topic.id}
            onClick={() => onSelectTopic(topic.suggestedPrompt)}
            className="topic-card flex items-start gap-4 p-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-left hover:border-[var(--accent)] transition-all"
          >
            <div className="p-2.5 rounded-lg bg-[var(--surface-hover)]">
              <IconComponent className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                {topic.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {topic.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
