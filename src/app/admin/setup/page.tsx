"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

const steps = [
  "welcome",
  "name",
  "brand",
  "niche",
  "expertise",
  "audience",
  "tone",
  "topics",
  "youtube",
  "credentials",
  "generating",
  "complete",
];

export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    ownerName: "",
    brandName: "",
    niche: "",
    expertise: [],
    audience: "",
    tone: "",
    topics: [],
    youtubeChannel: "",
    email: "",
    password: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleExpertiseToggle = (item: string) => {
    setData((prev) => ({
      ...prev,
      expertise: prev.expertise.includes(item)
        ? prev.expertise.filter((e) => e !== item)
        : [...prev.expertise, item],
    }));
  };

  const handleTopicToggle = (item: string) => {
    setData((prev) => ({
      ...prev,
      topics: prev.topics.includes(item)
        ? prev.topics.filter((t) => t !== item)
        : prev.topics.length < 4
        ? [...prev.topics, item]
        : prev.topics,
    }));
  };

  const handleFinish = async () => {
    setCurrentStep(steps.indexOf("generating"));
    setIsGenerating(true);

    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setCurrentStep(steps.indexOf("complete"));
      } else {
        alert("Setup failed. Please try again.");
        setCurrentStep(steps.indexOf("credentials"));
      }
    } catch (error) {
      alert("Setup failed. Please try again.");
      setCurrentStep(steps.indexOf("credentials"));
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStep = () => {
    switch (steps[currentStep]) {
      case "welcome":
        return (
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">✨</span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              Let&apos;s create your AI assistant
            </h1>
            <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
              I&apos;ll ask you a few questions to understand your brand, expertise,
              and how you want your AI to communicate. This will only take a few minutes.
            </p>
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
            >
              Let&apos;s get started
            </button>
          </div>
        );

      case "name":
        return (
          <div>
            <p className="text-sm text-[var(--accent)] mb-2">Step 1 of 8</p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              First, what&apos;s your name?
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              This is the person your AI will represent and speak as.
            </p>
            <input
              type="text"
              value={data.ownerName}
              onChange={(e) => setData({ ...data, ownerName: e.target.value })}
              placeholder="e.g., Farzad Mesbahi"
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] mb-6"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-[var(--text-secondary)] hover:bg-[var(--surface)] rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!data.ownerName.trim()}
                className="flex-1 px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case "brand":
        return (
          <div>
            <p className="text-sm text-[var(--accent)] mb-2">Step 2 of 8</p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              What should we call your AI?
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              This will appear in the header and when your AI responds.
            </p>
            <input
              type="text"
              value={data.brandName}
              onChange={(e) => setData({ ...data, brandName: e.target.value })}
              placeholder={data.ownerName ? `e.g., ${data.ownerName.split(" ")[0]} AI` : "e.g., Farzad AI"}
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] mb-6"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-[var(--text-secondary)] hover:bg-[var(--surface)] rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!data.brandName.trim()}
                className="flex-1 px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case "niche":
        return (
          <div>
            <p className="text-sm text-[var(--accent)] mb-2">Step 3 of 8</p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              What&apos;s your primary niche or industry?
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Select the area that best describes your focus.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                "Technology & AI",
                "Finance & Investing",
                "Health & Wellness",
                "Business & Entrepreneurship",
                "Marketing & Sales",
                "Personal Development",
                "Education & Learning",
                "Creative & Entertainment",
              ].map((niche) => (
                <button
                  key={niche}
                  onClick={() => setData({ ...data, niche })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    data.niche === niche
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent)]"
                  }`}
                >
                  {niche}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-[var(--text-secondary)] hover:bg-[var(--surface)] rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!data.niche}
                className="flex-1 px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case "expertise":
        return (
          <div>
            <p className="text-sm text-[var(--accent)] mb-2">Step 4 of 8</p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              What are your areas of expertise?
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Select all that apply. These help define what your AI knows about.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                "First Principles Thinking",
                "Market Analysis",
                "Technology Trends",
                "Leadership & Management",
                "Product Strategy",
                "Content Creation",
                "Investment Analysis",
                "Career Advice",
                "Industry Insights",
                "Productivity & Systems",
              ].map((item) => (
                <button
                  key={item}
                  onClick={() => handleExpertiseToggle(item)}
                  className={`p-3 rounded-xl border text-left text-sm transition-all ${
                    data.expertise.includes(item)
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent)]"
                  }`}
                >
                  {data.expertise.includes(item) ? "✓ " : ""}{item}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-[var(--text-secondary)] hover:bg-[var(--surface)] rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={data.expertise.length === 0}
                className="flex-1 px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case "audience":
        return (
          <div>
            <p className="text-sm text-[var(--accent)] mb-2">Step 5 of 8</p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Who is your primary audience?
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              This helps your AI tailor its responses appropriately.
            </p>
            <div className="space-y-3 mb-6">
              {[
                { id: "beginners", label: "Beginners", desc: "People new to your field" },
                { id: "intermediate", label: "Intermediate", desc: "People with some experience" },
                { id: "advanced", label: "Advanced professionals", desc: "Experts in the field" },
                { id: "mixed", label: "Mixed audience", desc: "All skill levels" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setData({ ...data, audience: item.id })}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    data.audience === item.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]"
                  }`}
                >
                  <div className={data.audience === item.id ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}>
                    {item.label}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">{item.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-[var(--text-secondary)] hover:bg-[var(--surface)] rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!data.audience}
                className="flex-1 px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case "tone":
        return (
          <div>
            <p className="text-sm text-[var(--accent)] mb-2">Step 6 of 8</p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              How should your AI communicate?
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Choose the tone that best matches your style.
            </p>
            <div className="space-y-3 mb-6">
              {[
                { id: "professional", label: "Professional & Direct", desc: "Clear, concise, business-focused" },
                { id: "friendly", label: "Friendly & Approachable", desc: "Warm, conversational, encouraging" },
                { id: "analytical", label: "Analytical & Detailed", desc: "Data-driven, thorough, technical" },
                { id: "inspirational", label: "Inspirational & Motivating", desc: "Energetic, empowering, visionary" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setData({ ...data, tone: item.id })}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    data.tone === item.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]"
                  }`}
                >
                  <div className={data.tone === item.id ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}>
                    {item.label}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">{item.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-[var(--text-secondary)] hover:bg-[var(--surface)] rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!data.tone}
                className="flex-1 px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case "topics":
        return (
          <div>
            <p className="text-sm text-[var(--accent)] mb-2">Step 7 of 8</p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              What topics should appear on your homepage?
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Select up to 4 topics that will appear as quick-start cards.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                "Career & Growth",
                "Industry Analysis",
                "Strategy & Planning",
                "Technology Trends",
                "Investment Ideas",
                "Productivity Tips",
                "Leadership Advice",
                "Market Insights",
                "Learning & Skills",
                "Future Predictions",
              ].map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleTopicToggle(topic)}
                  disabled={!data.topics.includes(topic) && data.topics.length >= 4}
                  className={`p-3 rounded-xl border text-left text-sm transition-all ${
                    data.topics.includes(topic)
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : data.topics.length >= 4
                      ? "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] opacity-50"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent)]"
                  }`}
                >
                  {data.topics.includes(topic) ? "✓ " : ""}{topic}
                </button>
              ))}
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Selected: {data.topics.length}/4
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-[var(--text-secondary)] hover:bg-[var(--surface)] rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={data.topics.length === 0}
                className="flex-1 px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case "youtube":
        return (
          <div>
            <p className="text-sm text-[var(--accent)] mb-2">Step 8 of 8</p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Do you have a YouTube channel?
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              We can import your video transcripts to train your AI. (Optional)
            </p>
            <input
              type="text"
              value={data.youtubeChannel}
              onChange={(e) => setData({ ...data, youtubeChannel: e.target.value })}
              placeholder="e.g., https://youtube.com/@yourchannel"
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-[var(--text-secondary)] hover:bg-[var(--surface)] rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                {data.youtubeChannel ? "Continue" : "Skip for now"}
              </button>
            </div>
          </div>
        );

      case "credentials":
        return (
          <div>
            <p className="text-sm text-[var(--accent)] mb-2">Almost done!</p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Create your admin account
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              You&apos;ll use this to access your dashboard and manage your AI.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={data.password}
                  onChange={(e) => setData({ ...data, password: e.target.value })}
                  placeholder="Create a secure password"
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-[var(--text-secondary)] hover:bg-[var(--surface)] rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={!data.email || !data.password || data.password.length < 6}
                className="flex-1 px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Create my AI
              </button>
            </div>
          </div>
        );

      case "generating":
        return (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Creating your AI assistant...
            </h2>
            <p className="text-[var(--text-secondary)]">
              This will only take a moment.
            </p>
          </div>
        );

      case "complete":
        return (
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-green-500 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl text-white">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              {data.brandName} is ready!
            </h2>
            <p className="text-[var(--text-secondary)] mb-8">
              Your AI assistant has been created and configured based on your preferences.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/")}
                className="px-8 py-3 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                Try your AI
              </button>
              <button
                onClick={() => router.push("/admin")}
                className="px-8 py-3 text-[var(--text-secondary)] hover:bg-[var(--surface)] rounded-xl transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {renderStep()}
      </div>
    </div>
  );
}
