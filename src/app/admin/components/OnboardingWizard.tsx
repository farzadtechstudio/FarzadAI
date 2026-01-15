"use client";

import { useState, useEffect } from "react";

interface OnboardingWizardProps {
  tenantId: string;
}

interface OnboardingData {
  // Step 1: Basic Info
  creatorName: string;
  brandName: string;
  websiteUrl: string;

  // Step 2: Social Links
  youtubeChannel: string;
  twitterHandle: string;
  communityLink: string;
  otherPlatforms: string;

  // Step 3: Voice & Style
  voiceSamples: string[];
  voiceDescription: string;
  toneKeywords: string[];
  analyzedVoice?: {
    toneKeywords: string[];
    signaturePhrases: string[];
    sentencePatterns: string;
    vocabularyLevel: string;
    phrasesToAvoid: string[];
  };

  // Step 4: Preferences
  characterLimit: number;
  includeTimestamps: boolean;
  includeHashtags: boolean;
  useEmojis: boolean;
  useDashes: boolean;

  // Step 5: Banned Content
  bannedPhrases: string[];
  bannedOpenings: string[];
}

const TONE_KEYWORDS = [
  "Conversational",
  "Professional",
  "Casual",
  "Educational",
  "Inspirational",
  "Humorous",
  "Direct",
  "Warm",
  "Analytical",
  "Storytelling",
  "Energetic",
  "Calm",
  "Provocative",
  "Supportive",
  "Authoritative",
];

const STEPS = [
  { id: 1, title: "Basic Info", description: "Tell us about yourself" },
  { id: 2, title: "Social Links", description: "Where can people find you?" },
  { id: 3, title: "Voice & Style", description: "How do you communicate?" },
  { id: 4, title: "Preferences", description: "Content formatting options" },
  { id: 5, title: "Banned Content", description: "What to avoid" },
];

export default function OnboardingWizard({ tenantId }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const [data, setData] = useState<OnboardingData>({
    creatorName: "",
    brandName: "",
    websiteUrl: "",
    youtubeChannel: "",
    twitterHandle: "",
    communityLink: "",
    otherPlatforms: "",
    voiceSamples: [],
    voiceDescription: "",
    toneKeywords: [],
    characterLimit: 300,
    includeTimestamps: true,
    includeHashtags: true,
    useEmojis: false,
    useDashes: true,
    bannedPhrases: [],
    bannedOpenings: [],
  });

  // Temporary input states for adding items
  const [newBannedPhrase, setNewBannedPhrase] = useState("");
  const [newBannedOpening, setNewBannedOpening] = useState("");
  const [newVoiceSample, setNewVoiceSample] = useState("");

  // Load existing data
  useEffect(() => {
    loadOnboardingData();
  }, [tenantId]);

  const loadOnboardingData = async () => {
    try {
      const response = await fetch(`/api/admin/onboarding?tenantId=${tenantId}`);
      if (response.ok) {
        const savedData = await response.json();
        if (savedData) {
          setData((prev) => ({ ...prev, ...savedData }));
        }
      }
    } catch (error) {
      console.error("Failed to load onboarding data:", error);
    }
  };

  const saveOnboardingData = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const response = await fetch("/api/admin/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, data }),
      });
      if (response.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("Failed to save onboarding data:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const analyzeVoice = async () => {
    if (data.voiceSamples.length === 0 && !data.voiceDescription) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/admin/onboarding/analyze-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          creatorName: data.creatorName,
          voiceSamples: data.voiceSamples,
          voiceDescription: data.voiceDescription,
        }),
      });

      if (response.ok) {
        const analysis = await response.json();
        setData((prev) => ({
          ...prev,
          analyzedVoice: analysis,
          toneKeywords: [...new Set([...prev.toneKeywords, ...(analysis.toneKeywords || [])])],
        }));
      }
    } catch (error) {
      console.error("Failed to analyze voice:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateData = (field: keyof OnboardingData, value: OnboardingData[keyof OnboardingData]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleToneKeyword = (keyword: string) => {
    setData((prev) => ({
      ...prev,
      toneKeywords: prev.toneKeywords.includes(keyword)
        ? prev.toneKeywords.filter((k) => k !== keyword)
        : [...prev.toneKeywords, keyword],
    }));
  };

  const addVoiceSample = () => {
    if (newVoiceSample.trim()) {
      setData((prev) => ({
        ...prev,
        voiceSamples: [...prev.voiceSamples, newVoiceSample.trim()],
      }));
      setNewVoiceSample("");
    }
  };

  const removeVoiceSample = (index: number) => {
    setData((prev) => ({
      ...prev,
      voiceSamples: prev.voiceSamples.filter((_, i) => i !== index),
    }));
  };

  const addBannedPhrase = () => {
    if (newBannedPhrase.trim()) {
      setData((prev) => ({
        ...prev,
        bannedPhrases: [...prev.bannedPhrases, newBannedPhrase.trim()],
      }));
      setNewBannedPhrase("");
    }
  };

  const removeBannedPhrase = (index: number) => {
    setData((prev) => ({
      ...prev,
      bannedPhrases: prev.bannedPhrases.filter((_, i) => i !== index),
    }));
  };

  const addBannedOpening = () => {
    if (newBannedOpening.trim()) {
      setData((prev) => ({
        ...prev,
        bannedOpenings: [...prev.bannedOpenings, newBannedOpening.trim()],
      }));
      setNewBannedOpening("");
    }
  };

  const removeBannedOpening = (index: number) => {
    setData((prev) => ({
      ...prev,
      bannedOpenings: prev.bannedOpenings.filter((_, i) => i !== index),
    }));
  };

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Creator Name
              </label>
              <input
                type="text"
                value={data.creatorName}
                onChange={(e) => updateData("creatorName", e.target.value)}
                placeholder="Your name or pseudonym"
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Brand Name
              </label>
              <input
                type="text"
                value={data.brandName}
                onChange={(e) => updateData("brandName", e.target.value)}
                placeholder="Your brand or channel name"
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Website URL
              </label>
              <input
                type="url"
                value={data.websiteUrl}
                onChange={(e) => updateData("websiteUrl", e.target.value)}
                placeholder="https://yourwebsite.com"
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                YouTube Channel
              </label>
              <input
                type="url"
                value={data.youtubeChannel}
                onChange={(e) => updateData("youtubeChannel", e.target.value)}
                placeholder="https://youtube.com/@yourchannel"
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Twitter / X
              </label>
              <input
                type="text"
                value={data.twitterHandle}
                onChange={(e) => updateData("twitterHandle", e.target.value)}
                placeholder="@yourhandle"
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Community / Membership Link
              </label>
              <input
                type="url"
                value={data.communityLink}
                onChange={(e) => updateData("communityLink", e.target.value)}
                placeholder="Patreon, Discord, or membership URL"
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Other Platforms
              </label>
              <textarea
                value={data.otherPlatforms}
                onChange={(e) => updateData("otherPlatforms", e.target.value)}
                placeholder="Instagram, TikTok, LinkedIn, etc. (one per line)"
                rows={3}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Voice Samples */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Sample Transcripts (3-5 recommended)
              </label>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Paste transcript excerpts that represent your voice and style.
              </p>
              <div className="flex gap-2 mb-3">
                <textarea
                  value={newVoiceSample}
                  onChange={(e) => setNewVoiceSample(e.target.value)}
                  placeholder="Paste a transcript sample here..."
                  rows={3}
                  className="flex-1 px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none"
                />
              </div>
              <button
                onClick={addVoiceSample}
                disabled={!newVoiceSample.trim()}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                Add Sample
              </button>

              {data.voiceSamples.length > 0 && (
                <div className="mt-4 space-y-2">
                  {data.voiceSamples.map((sample, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-[var(--background)] rounded-lg"
                    >
                      <span className="flex-1 text-sm text-[var(--text-secondary)] line-clamp-2">
                        {sample}
                      </span>
                      <button
                        onClick={() => removeVoiceSample(index)}
                        className="text-red-500 hover:text-red-600 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Voice Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Describe Your Voice (Alternative)
              </label>
              <textarea
                value={data.voiceDescription}
                onChange={(e) => updateData("voiceDescription", e.target.value)}
                placeholder="Describe how you speak in 2-3 sentences. E.g., 'I use casual language with occasional technical terms. I like to tell stories and use analogies...'"
                rows={3}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none"
              />
            </div>

            {/* Analyze Voice Button */}
            {(data.voiceSamples.length > 0 || data.voiceDescription) && (
              <button
                onClick={analyzeVoice}
                disabled={isAnalyzing}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing Your Voice...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                    </svg>
                    Analyze My Voice
                  </>
                )}
              </button>
            )}

            {/* Analyzed Results */}
            {data.analyzedVoice && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl space-y-3">
                <h4 className="font-medium text-[var(--text-primary)]">Voice Analysis Results</h4>

                {data.analyzedVoice.sentencePatterns && (
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Sentence Style:</p>
                    <p className="text-sm text-[var(--text-primary)]">{data.analyzedVoice.sentencePatterns}</p>
                  </div>
                )}

                {data.analyzedVoice.vocabularyLevel && (
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Vocabulary Level:</p>
                    <p className="text-sm text-[var(--text-primary)]">{data.analyzedVoice.vocabularyLevel}</p>
                  </div>
                )}

                {data.analyzedVoice.signaturePhrases?.length > 0 && (
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Signature Phrases:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {data.analyzedVoice.signaturePhrases.map((phrase, i) => (
                        <span key={i} className="px-2 py-1 bg-purple-100 dark:bg-purple-800/30 rounded text-sm text-purple-700 dark:text-purple-300">
                          "{phrase}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.analyzedVoice.phrasesToAvoid?.length > 0 && (
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Phrases to Avoid:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {data.analyzedVoice.phrasesToAvoid.map((phrase, i) => (
                        <span key={i} className="px-2 py-1 bg-red-100 dark:bg-red-800/30 rounded text-sm text-red-700 dark:text-red-300">
                          "{phrase}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tone Keywords */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Tone Keywords
              </label>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Select keywords that describe your communication style.
              </p>
              <div className="flex flex-wrap gap-2">
                {TONE_KEYWORDS.map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => toggleToneKeyword(keyword)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      data.toneKeywords.includes(keyword)
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Character Limit for Descriptions
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="100"
                  max="500"
                  step="50"
                  value={data.characterLimit}
                  onChange={(e) => updateData("characterLimit", parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-[var(--text-primary)] w-20 text-right">
                  {data.characterLimit} chars
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.includeTimestamps}
                  onChange={(e) => updateData("includeTimestamps", e.target.checked)}
                  className="w-5 h-5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">Include Timestamps</span>
                  <p className="text-sm text-[var(--text-muted)]">Add chapter timestamps to descriptions</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.includeHashtags}
                  onChange={(e) => updateData("includeHashtags", e.target.checked)}
                  className="w-5 h-5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">Include Hashtags</span>
                  <p className="text-sm text-[var(--text-muted)]">Add relevant hashtags at the end</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.useEmojis}
                  onChange={(e) => updateData("useEmojis", e.target.checked)}
                  className="w-5 h-5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">Use Emojis</span>
                  <p className="text-sm text-[var(--text-muted)]">Include emojis in generated content</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.useDashes}
                  onChange={(e) => updateData("useDashes", e.target.checked)}
                  className="w-5 h-5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">Use Dashes</span>
                  <p className="text-sm text-[var(--text-muted)]">Use dashes for bullet points and separators</p>
                </div>
              </label>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            {/* Banned Phrases */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Banned Phrases
              </label>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Add phrases you never want in generated content.
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newBannedPhrase}
                  onChange={(e) => setNewBannedPhrase(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addBannedPhrase()}
                  placeholder="e.g., 'game-changer', 'revolutionary'"
                  className="flex-1 px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
                <button
                  onClick={addBannedPhrase}
                  disabled={!newBannedPhrase.trim()}
                  className="px-4 py-3 bg-[var(--accent)] text-white rounded-xl font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              {data.bannedPhrases.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.bannedPhrases.map((phrase, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm"
                    >
                      {phrase}
                      <button
                        onClick={() => removeBannedPhrase(index)}
                        className="ml-1 hover:text-red-900 dark:hover:text-red-100"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" x2="6" y1="6" y2="18" />
                          <line x1="6" x2="18" y1="6" y2="18" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Banned Openings */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Banned Openings
              </label>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Add openings you never want to start content with.
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newBannedOpening}
                  onChange={(e) => setNewBannedOpening(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addBannedOpening()}
                  placeholder="e.g., 'In this video...', 'Hey guys!'"
                  className="flex-1 px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
                <button
                  onClick={addBannedOpening}
                  disabled={!newBannedOpening.trim()}
                  className="px-4 py-3 bg-[var(--accent)] text-white rounded-xl font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              {data.bannedOpenings.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.bannedOpenings.map((opening, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm"
                    >
                      {opening}
                      <button
                        onClick={() => removeBannedOpening(index)}
                        className="ml-1 hover:text-orange-900 dark:hover:text-orange-100"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" x2="6" y1="6" y2="18" />
                          <line x1="6" x2="18" y1="6" y2="18" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Voice Setup</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Help us understand your voice so we can generate content that sounds like you.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 ${
                  currentStep === step.id
                    ? "text-[var(--accent)]"
                    : currentStep > step.id
                    ? "text-green-500"
                    : "text-[var(--text-muted)]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    currentStep === step.id
                      ? "bg-[var(--accent)] text-white"
                      : currentStep > step.id
                      ? "bg-green-500 text-white"
                      : "bg-[var(--background)] text-[var(--text-muted)]"
                  }`}
                >
                  {currentStep > step.id ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <span className="hidden sm:block text-sm font-medium">{step.title}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 lg:w-16 h-0.5 mx-2 ${
                    currentStep > step.id ? "bg-green-500" : "bg-[var(--border)]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-[var(--surface)] rounded-2xl p-6 lg:p-8 border border-[var(--border)]">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {STEPS[currentStep - 1].title}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            {STEPS[currentStep - 1].description}
          </p>
        </div>

        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-6 py-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={saveOnboardingData}
            disabled={isSaving}
            className={`px-6 py-3 rounded-xl font-medium transition-colors ${
              saveStatus === "saved"
                ? "bg-green-500 text-white"
                : saveStatus === "error"
                ? "bg-red-500 text-white"
                : "bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            {isSaving ? "Saving..." : saveStatus === "saved" ? "Saved!" : saveStatus === "error" ? "Error" : "Save Progress"}
          </button>

          {currentStep < 5 ? (
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-medium hover:bg-[var(--accent-hover)] transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={saveOnboardingData}
              disabled={isSaving}
              className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
            >
              Complete Setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
