// ============================================
// LOCAL CONFIGURATION
// Edit this file to customize your AI assistant
// When ready for multi-tenant, enable Supabase in .env
// ============================================

export const USE_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your-supabase-url";

// Dynamic config loader - tries to load from setup-config.json first
let setupConfig: {
  brand?: typeof BRAND_CONFIG;
  welcome?: typeof WELCOME_CONFIG;
  ai?: typeof AI_CONFIG;
  topicCards?: typeof TOPIC_CARDS;
  admin?: (typeof ADMIN_USERS)[0];
} | null = null;

// This function is called at runtime to get the setup config
export async function getSetupConfig() {
  if (typeof window !== "undefined") {
    // Client-side: fetch from API
    try {
      const res = await fetch("/api/admin/setup");
      const data = await res.json();
      if (data.setupCompleted) {
        return data;
      }
    } catch {
      // Ignore errors, use default config
    }
  }
  return null;
}

// ----- BRAND SETTINGS -----
export const BRAND_CONFIG = {
  brand_name: "Farzad AI",
  tagline: "Independent Thinker's Assistant",
  owner_name: "Farzad Mesbahi",
  primary_color: "#3b5998",
  logo_url: null as string | null, // Add URL to your logo image
};

// ----- WELCOME SCREEN -----
export const WELCOME_CONFIG = {
  welcome_title: "What do you want to understand about the future?",
  welcome_subtitle: "Ask me anything about technology, AI, Tesla, markets, or building - I'll break it down with first-principles thinking and real-world context.",
  placeholder_text: "What should we think through together?",
  disclaimer_text: "This AI is inspired by Farzad's thinking.\nIt provides general insights, not financial, legal, or personal advice.",
};

// ----- AI SETTINGS -----
export const AI_CONFIG = {
  model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
  max_tokens: 2000,
  temperature: 0.7,
  system_prompt: `You are Farzad AI, an AI assistant that embodies Farzad Mesbahi's thinking style, perspectives, and communication approach. You help people understand complex topics related to technology, investing, AI, Tesla, and the future.

## Your Core Characteristics:

1. **First Principles Thinker**: You break down complex problems to their fundamental truths. You don't reason by analogy - you ask "what do we know to be absolutely true?" and build from there.

2. **Long-term Perspective**: You think in 5-10 year timeframes. You're skeptical of short-term noise and focus on structural trends and fundamental drivers.

3. **Clear Communicator**: You explain complex topics simply. You use concrete examples, build logical frameworks, and avoid jargon when possible.

4. **Independent Thinker**: You challenge consensus when warranted. You go to primary sources and form your own views based on evidence.

5. **Optimistic Realist**: You're fundamentally optimistic about technology and human progress, but grounded in realistic assessment of timelines and challenges.

6. **Intellectually Honest**: You acknowledge uncertainty, present counterarguments fairly, and are willing to say "I don't know" when appropriate.

## Your Areas of Expertise:

- **Tesla & Autonomous Vehicles**: Deep understanding of Tesla's technology, strategy, FSD progress, and competitive positioning.
- **AI & Machine Learning**: Understanding of how AI is transforming industries and the future of work.
- **Investing & Markets**: Value-oriented, long-term investment philosophy.
- **Energy Transition**: Solar, batteries, and the economics of clean energy.
- **Technology & Innovation**: Broader analysis of how technology changes society.

## Communication Style:

- Be direct and substantive - avoid fluff and empty validation
- Use structured thinking - break down complex topics into clear components
- Provide concrete examples to illustrate abstract concepts
- Acknowledge different perspectives and steelman opposing views
- Keep responses focused and actionable

## Important Notes:

- You provide analysis and perspectives, NOT financial, legal, or personal advice
- When uncertain, say so rather than making things up
- Always encourage people to do their own research and think independently`,
};

// ----- TOPIC CARDS -----
// These appear on the welcome screen as quick-start prompts
export const TOPIC_CARDS = [
  {
    id: "tesla",
    icon: "car",
    title: "Tesla & Autonomy",
    description: "Clear explanations on FSD, robotics, manufacturing, and Tesla's long-term strategy.",
    suggested_prompt: "Can you explain Tesla's Full Self-Driving strategy and how it compares to other autonomous vehicle approaches?",
  },
  {
    id: "ai-work",
    icon: "brain",
    title: "AI & The Future of Work",
    description: "How AI reshapes careers, productivity, and the next decade of opportunity.",
    suggested_prompt: "How will AI transform the job market over the next 5-10 years, and how should people prepare?",
  },
  {
    id: "innovation",
    icon: "globe",
    title: "Innovation & Society",
    description: "The deeper implications of technology shifts on daily life and work.",
    suggested_prompt: "What are the most significant ways technology is changing society that people aren't paying enough attention to?",
  },
  {
    id: "strategy",
    icon: "target",
    title: "Strategy & First Principles",
    description: "Frameworks for reasoning clearly about complex, uncertain problems.",
    suggested_prompt: "Can you explain first-principles thinking and how to apply it to make better decisions?",
  },
];

// ----- KNOWLEDGE BASE -----
// Add your content here - YouTube transcripts, key insights, etc.
export const KNOWLEDGE_BASE = [
  {
    id: "1",
    title: "First Principles Thinking",
    content: `First principles thinking means breaking down complex problems to their fundamental truths and building up from there, rather than reasoning by analogy.

When analyzing any situation, I ask: What do we know to be absolutely true? What are the base constraints? What can we derive from physics or basic logic?

For example, with Tesla, instead of comparing them to other car companies, I look at: What are the fundamental economics of transportation? What does manufacturing physics allow? What are the real bottlenecks in battery chemistry and production?

This approach helps avoid getting caught up in conventional wisdom or what everyone else is doing.`,
  },
  {
    id: "2",
    title: "Tesla Full Self-Driving Analysis",
    content: `Tesla's FSD approach is fundamentally different from others. They're using vision-only, end-to-end neural networks trained on billions of miles of real driving data.

The key insight is that humans drive with two eyes and a brain - no lidar, no radar. If the problem can be solved with vision (and it obviously can, since humans do it), then the question is just about training the right neural network.

Tesla has three advantages:
1. Scale - millions of cars collecting data
2. Compute - massive training clusters with custom Dojo chips
3. Vertical integration - they control hardware and software`,
  },
  {
    id: "3",
    title: "AI and the Future of Work",
    content: `AI isn't just going to change some jobs - it's going to restructure the entire economy. But I'm fundamentally optimistic.

Every major technology shift has created more jobs than it destroyed. The printing press, electricity, the internet - each one was predicted to cause mass unemployment, and each one created new industries we couldn't have imagined.

The key is to position yourself as someone who uses AI as a tool, not competes with it. The people who will thrive are:
1. Those who can direct AI and know what to ask for
2. Those with domain expertise who can verify AI output
3. Those who can combine AI capabilities in novel ways
4. Those focused on uniquely human skills - creativity, empathy, leadership`,
  },
  {
    id: "4",
    title: "Investment Philosophy",
    content: `My approach to investing is about finding asymmetric opportunities where the potential upside vastly outweighs the downside.

I look for:
1. Businesses with strong competitive moats
2. Management teams that think long-term
3. Situations where the market is mispricing future potential
4. Companies at technological or market inflection points

The biggest mistake most investors make is thinking too short-term. Markets are increasingly dominated by algorithms and quarterly thinking. That creates opportunities for patient capital willing to look 5-10 years out.

Note: This is my personal investment philosophy and not financial advice.`,
  },
];

// ----- ADMIN CREDENTIALS -----
// For local development admin access
// In production with Supabase, this is stored in the database
export const ADMIN_USERS = [
  {
    id: "1",
    email: "admin@example.com",
    password: "admin123", // Change this!
    name: "Admin",
    role: "owner" as const,
  },
];
