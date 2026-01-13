import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { promises as fs } from "fs";
import path from "path";

const JWT_SECRET = process.env.JWT_SECRET || "local-dev-secret-change-in-production";

interface OnboardingData {
  ownerName: string;
  brandName: string;
  niche: string;
  expertise: string[];
  audience: string;
  tone: string;
  topics: string[];
  youtubeChannel: string;
  email: string;
  password: string;
}

// Generate system prompt based on onboarding answers
function generateSystemPrompt(data: OnboardingData): string {
  const toneDescriptions: Record<string, string> = {
    professional: "direct, clear, and business-focused. Get to the point efficiently.",
    friendly: "warm, conversational, and encouraging. Make complex topics approachable.",
    analytical: "thorough, data-driven, and technical. Provide detailed analysis with evidence.",
    inspirational: "energetic, empowering, and visionary. Motivate and inspire action.",
  };

  const audienceDescriptions: Record<string, string> = {
    beginners: "people who are new to this field. Explain concepts from the ground up, avoid jargon.",
    intermediate: "people with some experience. You can use industry terminology but explain advanced concepts.",
    advanced: "experts and professionals. You can dive deep into technical details and nuances.",
    mixed: "people of all skill levels. Gauge complexity from questions and adapt your explanations.",
  };

  const expertiseList = data.expertise.length > 0
    ? data.expertise.join(", ")
    : "general topics in " + data.niche;

  return `You are ${data.brandName}, an AI assistant that embodies ${data.ownerName}'s thinking style, perspectives, and communication approach. You help people understand topics related to ${data.niche.toLowerCase()}.

## Your Core Identity:

You speak and think like ${data.ownerName}. When users ask questions, you draw from ${data.ownerName}'s expertise and perspective to provide thoughtful, valuable responses.

## Your Areas of Expertise:

${expertiseList}

## Communication Style:

Your tone is ${toneDescriptions[data.tone] || "clear and helpful."}

## Your Audience:

You're primarily speaking to ${audienceDescriptions[data.audience] || "a general audience."}

## Key Principles:

1. **Authenticity**: Speak with ${data.ownerName}'s voice and perspective
2. **Value-First**: Every response should provide genuine insight or utility
3. **Clarity**: Make complex ideas accessible without dumbing them down
4. **Engagement**: Keep conversations interesting and interactive
5. **Honesty**: Be upfront about uncertainty and limitations

## Guidelines:

- Provide analysis and perspectives, NOT financial, legal, or personal advice
- When uncertain, acknowledge it rather than making things up
- Encourage people to think critically and do their own research
- Keep responses focused and actionable
- Use concrete examples to illustrate abstract concepts`;
}

// Generate topic cards based on selected topics
function generateTopicCards(data: OnboardingData) {
  const topicMappings: Record<string, { icon: string; description: string; prompt: string }> = {
    "Career & Growth": {
      icon: "briefcase",
      description: "Insights on building a successful career and continuous improvement.",
      prompt: "What advice do you have for someone looking to advance their career?",
    },
    "Industry Analysis": {
      icon: "chart",
      description: "Deep dives into market trends and industry dynamics.",
      prompt: "What are the key trends shaping the industry right now?",
    },
    "Strategy & Planning": {
      icon: "target",
      description: "Frameworks for strategic thinking and decision-making.",
      prompt: "How should I approach strategic planning for my goals?",
    },
    "Technology Trends": {
      icon: "cpu",
      description: "What's happening in tech and what it means for the future.",
      prompt: "What technology trends should I be paying attention to?",
    },
    "Investment Ideas": {
      icon: "trending",
      description: "Perspectives on markets and investment thinking.",
      prompt: "What's your investment philosophy and approach?",
    },
    "Productivity Tips": {
      icon: "zap",
      description: "Systems and habits for getting more done.",
      prompt: "What are your top productivity tips and systems?",
    },
    "Leadership Advice": {
      icon: "users",
      description: "Insights on leading teams and organizations.",
      prompt: "What makes an effective leader in today's world?",
    },
    "Market Insights": {
      icon: "globe",
      description: "Understanding markets and economic forces.",
      prompt: "How do you analyze and understand market dynamics?",
    },
    "Learning & Skills": {
      icon: "book",
      description: "How to learn effectively and build new capabilities.",
      prompt: "What's the best way to learn new skills quickly?",
    },
    "Future Predictions": {
      icon: "sparkles",
      description: "Thoughts on what's coming and how to prepare.",
      prompt: "What do you think the future holds in the next 5-10 years?",
    },
  };

  return data.topics.map((topic, index) => {
    const mapping = topicMappings[topic] || {
      icon: "message",
      description: `Explore ${topic.toLowerCase()} topics.`,
      prompt: `Tell me about ${topic.toLowerCase()}.`,
    };

    return {
      id: `topic-${index + 1}`,
      icon: mapping.icon,
      title: topic,
      description: mapping.description,
      suggested_prompt: mapping.prompt,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const data: OnboardingData = await request.json();

    // Validate required fields
    if (!data.ownerName || !data.brandName || !data.email || !data.password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (data.password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Generate system prompt
    const systemPrompt = generateSystemPrompt(data);

    // Generate topic cards
    const topicCards = generateTopicCards(data);

    // Create the new configuration
    const newConfig = {
      brand: {
        brand_name: data.brandName,
        tagline: `${data.ownerName}'s AI Assistant`,
        owner_name: data.ownerName,
        primary_color: "#3b5998",
        logo_url: null,
      },
      welcome: {
        welcome_title: `Ask ${data.ownerName.split(" ")[0]} anything`,
        welcome_subtitle: `Get insights on ${data.expertise.slice(0, 3).join(", ").toLowerCase()} and more.`,
        placeholder_text: "What would you like to know?",
        disclaimer_text: `This AI is inspired by ${data.ownerName}'s thinking.\nIt provides general insights, not financial, legal, or personal advice.`,
      },
      ai: {
        system_prompt: systemPrompt,
        model: "gpt-4-turbo-preview",
        max_tokens: 2000,
        temperature: 0.7,
      },
      topicCards,
      admin: {
        id: "1",
        email: data.email,
        password: data.password,
        name: data.ownerName,
        role: "owner",
      },
      youtubeChannel: data.youtubeChannel || null,
      setupCompleted: true,
      setupDate: new Date().toISOString(),
    };

    // Save configuration to a JSON file for persistence
    const configPath = path.join(process.cwd(), "src", "lib", "setup-config.json");
    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));

    // Create JWT token for the new admin
    const token = jwt.sign(
      {
        userId: "1",
        email: data.email,
        role: "owner",
        tenantId: "local",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Create response with auth cookie
    const response = NextResponse.json({
      success: true,
      message: "Setup completed successfully",
      config: {
        brandName: newConfig.brand.brand_name,
        ownerName: newConfig.brand.owner_name,
      },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    // Also mark setup as complete in a cookie
    response.cookies.set("setup_completed", "true", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Failed to complete setup" },
      { status: 500 }
    );
  }
}

// Check if setup has been completed
export async function GET() {
  try {
    const configPath = path.join(process.cwd(), "src", "lib", "setup-config.json");

    try {
      await fs.access(configPath);
      const configData = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(configData);

      return NextResponse.json({
        setupCompleted: config.setupCompleted || false,
        brandName: config.brand?.brand_name,
      });
    } catch {
      // File doesn't exist - setup not completed
      return NextResponse.json({
        setupCompleted: false,
      });
    }
  } catch (error) {
    console.error("Setup check error:", error);
    return NextResponse.json({
      setupCompleted: false,
    });
  }
}
