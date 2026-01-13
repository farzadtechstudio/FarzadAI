import { KnowledgeItem } from "@/types";

// This is the Farzad knowledge base - content from YouTube transcripts and manual input
// In production, this would be stored in a database like Supabase or a vector database like Pinecone

export const farzadKnowledge: KnowledgeItem[] = [
  {
    id: "1",
    source: "manual",
    title: "First Principles Thinking",
    content: `First principles thinking means breaking down complex problems to their fundamental truths and building up from there, rather than reasoning by analogy.

When analyzing any situation, I ask: What do we know to be absolutely true? What are the base constraints? What can we derive from physics or basic logic?

For example, with Tesla, instead of comparing them to other car companies, I look at: What are the fundamental economics of transportation? What does manufacturing physics allow? What are the real bottlenecks in battery chemistry and production?

This approach helps avoid getting caught up in conventional wisdom or what everyone else is doing. The market often misprice things because they reason by analogy to what has happened before, rather than thinking from first principles about what is actually possible.`,
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    source: "youtube",
    title: "Tesla Full Self-Driving Analysis",
    content: `Tesla's FSD approach is fundamentally different from others. They're using vision-only, end-to-end neural networks trained on billions of miles of real driving data.

The key insight is that humans drive with two eyes and a brain - no lidar, no radar. If the problem can be solved with vision (and it obviously can, since humans do it), then the question is just about training the right neural network.

Tesla has three advantages:
1. Scale - millions of cars collecting data
2. Compute - massive training clusters with custom Dojo chips
3. Vertical integration - they control hardware and software

The bear thesis is always "they've been promising FSD for years." But the bull thesis looks at the rate of improvement. Each version is measurably better. The question is whether the improvement curve reaches superhuman driving before competitors catch up, and I believe it will.`,
    sourceUrl: "https://youtube.com/@farzadmesbahi",
    createdAt: new Date("2024-06-15"),
  },
  {
    id: "3",
    source: "youtube",
    title: "AI and the Future of Work",
    content: `AI isn't just going to change some jobs - it's going to restructure the entire economy. But I'm fundamentally optimistic.

Here's how I think about it: Every major technology shift has created more jobs than it destroyed. The printing press, electricity, the internet - each one was predicted to cause mass unemployment, and each one created new industries we couldn't have imagined.

The key is to position yourself as someone who uses AI as a tool, not competes with it. The people who will thrive are:
1. Those who can direct AI and know what to ask for
2. Those with domain expertise who can verify AI output
3. Those who can combine AI capabilities in novel ways
4. Those focused on uniquely human skills - creativity, empathy, leadership

Don't fear AI - learn to leverage it. The gap between those who use AI effectively and those who don't will be one of the biggest career differentiators of the next decade.`,
    sourceUrl: "https://youtube.com/@farzadmesbahi",
    createdAt: new Date("2024-03-20"),
  },
  {
    id: "4",
    source: "manual",
    title: "Investment Philosophy",
    content: `My approach to investing is about finding asymmetric opportunities where the potential upside vastly outweighs the downside.

I look for:
1. Businesses with strong competitive moats
2. Management teams that think long-term
3. Situations where the market is mispricing future potential
4. Companies at technological or market inflection points

The biggest mistake most investors make is thinking too short-term. Markets are increasingly dominated by algorithms and quarterly thinking. That creates opportunities for patient capital willing to look 5-10 years out.

I also believe in concentration over diversification for those with conviction and research. As Buffett says, diversification is protection against ignorance. If you've done the work and have conviction, you don't need to own 50 stocks.

Note: This is my personal investment philosophy and not financial advice. Everyone's situation is different.`,
    createdAt: new Date("2024-02-10"),
  },
  {
    id: "5",
    source: "youtube",
    title: "Optimus Robot and Tesla's Long-Term Vision",
    content: `People focus on Tesla's car business, but I think Optimus could be the biggest story.

Think about it from first principles: What is the largest market in the world? Labor. The global labor market is over $40 trillion annually. If you can build a humanoid robot that can do general purpose labor at scale, you've created the most valuable product in human history.

Tesla's advantages here:
1. They already have the AI expertise from FSD
2. They have manufacturing scale and know-how
3. They have the capital to fund R&D
4. They can be their own first customer in factories

The skeptics say robots are hard. True. But Tesla has done hard things before. The question isn't whether it's hard - it's whether Tesla is the best positioned to solve it. And I believe they are.

Timeline is uncertain, but the potential is massive. Even if Optimus takes longer than Elon suggests (which is likely), the end state is transformational.`,
    sourceUrl: "https://youtube.com/@farzadmesbahi",
    createdAt: new Date("2024-07-01"),
  },
  {
    id: "6",
    source: "manual",
    title: "Communication and Content Creation",
    content: `Clear thinking leads to clear communication. If you can't explain something simply, you probably don't understand it well enough.

When I make content, I try to:
1. Start with first principles - what are the fundamental facts?
2. Build a clear logical framework
3. Use concrete examples to illustrate abstract concepts
4. Acknowledge uncertainty and opposing views
5. Focus on what's actually useful, not just interesting

The goal isn't to show how smart I am - it's to help people think more clearly about complex topics. That means cutting through noise, challenging lazy thinking, and focusing on what actually matters.

Social media rewards hot takes and controversy. I try to resist that and focus on substance. It's a longer game but builds more trust and credibility over time.`,
    createdAt: new Date("2024-04-05"),
  },
  {
    id: "7",
    source: "youtube",
    title: "Energy and the Future",
    content: `Energy is the foundation of civilization. Every major advance in human progress has been accompanied by access to more abundant, cheaper energy.

Solar and batteries are following exponential cost curves. This is one of the most important trends of our time. Energy that was expensive becomes cheap, which enables things that were impossible.

Tesla's energy business is underrated. Megapack deployments are accelerating. As more renewables come online, the need for storage grows exponentially. Grid-scale storage is a massive market.

The transition won't happen overnight, but the direction is clear. Countries and companies that move faster on the energy transition will have competitive advantages. Those that lag will face higher costs and reduced competitiveness.

I'm optimistic about the future of energy. The technology is here - it's now about deployment and scale.`,
    sourceUrl: "https://youtube.com/@farzadmesbahi",
    createdAt: new Date("2024-05-15"),
  },
  {
    id: "8",
    source: "manual",
    title: "Critical Thinking and Independent Analysis",
    content: `One of the most valuable skills is the ability to think independently. This means:

1. Questioning consensus - just because everyone believes something doesn't make it true
2. Going to primary sources - don't rely on summaries or headlines
3. Understanding incentives - who benefits from a particular narrative?
4. Separating signal from noise - most information is irrelevant
5. Being willing to change your mind - strong opinions, loosely held

The financial media is often wrong. Not because journalists are bad, but because their incentives don't align with good analysis. They need clicks and views, which rewards sensationalism over accuracy.

Do your own research. Read the actual filings, not the headlines. Listen to the full earnings calls, not just the soundbites. Form your own view based on primary sources.

This takes more work, but it's the only way to develop genuine insight and avoid being misled by the crowd.`,
    createdAt: new Date("2024-01-15"),
  },
];

// Function to search knowledge base for relevant context
export function searchKnowledge(query: string, limit: number = 3): KnowledgeItem[] {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter((word) => word.length > 3);

  // Score each knowledge item based on keyword matches
  const scored = farzadKnowledge.map((item) => {
    const contentLower = (item.title + " " + item.content).toLowerCase();
    let score = 0;

    for (const keyword of keywords) {
      if (contentLower.includes(keyword)) {
        score += 1;
        // Bonus for title match
        if (item.title.toLowerCase().includes(keyword)) {
          score += 2;
        }
      }
    }

    return { item, score };
  });

  // Sort by score and return top matches
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);
}

// Get all knowledge items for a specific topic
export function getKnowledgeByTopic(topic: string): KnowledgeItem[] {
  const topicLower = topic.toLowerCase();
  return farzadKnowledge.filter(
    (item) =>
      item.title.toLowerCase().includes(topicLower) ||
      item.content.toLowerCase().includes(topicLower)
  );
}
