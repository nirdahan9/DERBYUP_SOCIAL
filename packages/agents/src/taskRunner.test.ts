import test from "node:test";
import assert from "node:assert/strict";
import type { AgentLlmProvider } from "./llmProvider.js";
import { runBrandReviewTask, runCreativeTask, runResearchTask, runStrategyTask, type PipelineInput } from "./taskRunner.js";
import type { SerperSearchResult } from "./serperConnector.js";
import type { YouTubeSearchVideo } from "./youtubeConnector.js";

const brand: PipelineInput["brand"] = {
  id: "brand",
  name: "Brand",
  voice: ["clear"],
  visualRules: [],
  requiredClaims: [],
  bannedClaims: [],
  preferredWords: [],
  bannedWords: [],
  colors: {
    primary: "#101820",
    secondary: "#F2AA4C",
    accent: "#2EC4B6"
  }
};

test("research task can run through an injected LLM provider", async () => {
  const provider = new StaticProvider({
    marketSignals: [
      {
        id: "signal-1",
        insight: "Manual sources show short proof-led content is recurring.",
        confidence: "medium",
        evidence: [
          {
            sourceType: "manual_competitor_url",
            sourceUrl: "https://example.com/source",
            evidenceNote: "Operator supplied competitor URL."
          }
        ],
        recommendedAction: "Create one proof-led post."
      }
    ],
    audienceInsights: [],
    competitorPatterns: [],
    riskFlags: [],
    platformNotes: { linkedin: ["Use a specific proof point."] }
  });

  const brief = await runResearchTask({
    goal: "Create a content pack",
    platforms: ["linkedin"],
    brand,
    manualSources: ["https://example.com/source"],
    llmProvider: provider
  });

  assert.equal(brief.marketSignals[0]?.id, "signal-1");
  assert.match(provider.prompts[0] ?? "", /Create a content pack/);
});

test("research task normalizes snake_case and missing LLM evidence fields", async () => {
  const provider = new StaticProvider({
    marketSignals: [
      {
        id: "signal-snake-case",
        insight: "Sports audiences respond to matchday urgency.",
        confidence: "medium",
        evidence: [
          {
            source_type: "manual_competitor_url",
            source_url: "https://example.com/competitor",
            evidence_note: "Snake case evidence from an LLM response."
          },
          {
            source_type: "public_url"
          }
        ],
        recommended_action: "Create a matchday countdown post."
      }
    ],
    audienceInsights: [],
    competitorPatterns: [],
    riskFlags: [],
    platformNotes: { instagram: ["Use short hooks."] }
  });

  const brief = await runResearchTask({
    goal: "Create DerbyUp matchday content",
    platforms: ["instagram"],
    brand,
    llmProvider: provider
  });

  assert.equal(brief.marketSignals[0]?.recommendedAction, "Create a matchday countdown post.");
  assert.equal(brief.marketSignals[0]?.evidence[0]?.sourceType, "manual_competitor_url");
  assert.equal(brief.marketSignals[0]?.evidence[0]?.evidenceNote, "Snake case evidence from an LLM response.");
  assert.equal(brief.marketSignals[0]?.evidence[1]?.sourceType, "hypothesis");
  assert.match(brief.marketSignals[0]?.evidence[1]?.evidenceNote ?? "", /missing/i);
});

test("research task adds YouTube public video evidence when connector is available", async () => {
  const brief = await runResearchTask({
    goal: "Create short proof videos",
    platforms: ["youtube_shorts", "tiktok"],
    brand,
    youtubeConnector: new StaticYouTubeConnector([
      {
        videoId: "video-1",
        title: "Before and after proof in 20 seconds",
        description: "Example format",
        channelId: "channel-1",
        channelTitle: "Competitor",
        publishedAt: "2026-04-01T08:00:00Z",
        sourceUrl: "https://www.youtube.com/watch?v=video-1"
      }
    ])
  });

  assert.equal(brief.competitorPatterns[0]?.id, "youtube-public-video-patterns");
  assert.equal(brief.competitorPatterns[0]?.evidence[0]?.sourceType, "youtube_api");
  assert.equal(brief.competitorPatterns[0]?.evidence[0]?.sourceUrl, "https://www.youtube.com/watch?v=video-1");
});

test("research task keeps all manual competitor URLs as evidence in fallback mode", async () => {
  const brief = await runResearchTask({
    goal: "Review DerbyUp competitors",
    platforms: ["linkedin"],
    brand,
    manualSources: ["https://www.sport5.co.il/", "https://www.one.co.il/", "https://hapodium.com/"]
  });

  assert.deepEqual(
    brief.marketSignals[0]?.evidence.map((item) => item.sourceUrl),
    ["https://www.sport5.co.il/", "https://www.one.co.il/", "https://hapodium.com/"]
  );
});

test("research task adds Serper public search evidence when connector is available", async () => {
  const brief = await runResearchTask({
    goal: "Create market proof content",
    platforms: ["linkedin"],
    brand,
    serperConnector: new StaticSerperConnector([
      {
        title: "Market proof examples",
        link: "https://example.com/market-proof",
        snippet: "A useful public search result.",
        position: 1
      }
    ])
  });

  assert.equal(brief.marketSignals.some((insight) => insight.id === "serper-public-search-signals"), true);
  const signal = brief.marketSignals.find((insight) => insight.id === "serper-public-search-signals");
  assert.equal(signal?.evidence[0]?.sourceType, "serper_search");
  assert.equal(signal?.evidence[0]?.sourceUrl, "https://example.com/market-proof");
});

test("research task passes YouTube signals into LLM prompts and still keeps evidence in the brief", async () => {
  const provider = new StaticProvider({
    marketSignals: [],
    audienceInsights: [],
    competitorPatterns: [],
    riskFlags: [],
    platformNotes: {}
  });

  const brief = await runResearchTask({
    goal: "Create short proof videos",
    platforms: ["youtube_shorts"],
    brand,
    llmProvider: provider,
    youtubeConnector: new StaticYouTubeConnector([
      {
        videoId: "video-2",
        title: "Three hooks that create trust",
        description: "Example format",
        channelId: "channel-2",
        channelTitle: "Public Channel",
        publishedAt: "2026-04-02T08:00:00Z",
        sourceUrl: "https://www.youtube.com/watch?v=video-2"
      }
    ])
  });

  assert.match(provider.prompts[0] ?? "", /YouTube public video signals JSON/);
  assert.match(provider.prompts[0] ?? "", /Three hooks that create trust/);
  assert.equal(brief.competitorPatterns[0]?.evidence[0]?.sourceType, "youtube_api");
});

test("research task passes Serper signals into LLM prompts and still keeps evidence in the brief", async () => {
  const provider = new StaticProvider({
    marketSignals: [],
    audienceInsights: [],
    competitorPatterns: [],
    riskFlags: [],
    platformNotes: {}
  });

  const brief = await runResearchTask({
    goal: "Create market proof content",
    platforms: ["linkedin"],
    brand,
    llmProvider: provider,
    serperConnector: new StaticSerperConnector([
      {
        title: "Public proof source",
        link: "https://example.com/public-proof",
        snippet: "A useful public search result.",
        position: 2
      }
    ])
  });

  assert.match(provider.prompts[0] ?? "", /Serper public search signals JSON/);
  assert.match(provider.prompts[0] ?? "", /Public proof source/);
  assert.equal(brief.marketSignals.find((insight) => insight.id === "serper-public-search-signals")?.evidence[0]?.sourceType, "serper_search");
});

test("research task records YouTube connector errors as hypothesis risk flags", async () => {
  const brief = await runResearchTask({
    goal: "Create content pack",
    platforms: ["linkedin"],
    brand,
    youtubeConnector: new FailingYouTubeConnector("quota exceeded")
  });

  const risk = brief.riskFlags.find((insight) => insight.id === "youtube-connector-error");

  assert.equal(risk?.confidence, "hypothesis");
  assert.match(risk?.evidence[0]?.evidenceNote ?? "", /quota exceeded/);
});

test("research task records Serper connector errors as hypothesis risk flags", async () => {
  const brief = await runResearchTask({
    goal: "Create content pack",
    platforms: ["linkedin"],
    brand,
    serperConnector: new FailingSerperConnector("invalid api key")
  });

  const risk = brief.riskFlags.find((insight) => insight.id === "serper-connector-error");

  assert.equal(risk?.confidence, "hypothesis");
  assert.match(risk?.evidence[0]?.evidenceNote ?? "", /invalid api key/);
});

test("strategy, creative, and brand tasks can use injected LLM JSON", async () => {
  const strategyProvider = new StaticProvider([
    {
      id: "angle-linkedin-1",
      title: "Proof angle",
      platform: "linkedin",
      hook: "מה ההוכחה הכי קצרה?",
      format: "text_post",
      cta: "דברו איתנו",
      sourceInsightIds: ["signal-1"]
    }
  ]);

  const angles = await runStrategyTask(
    {
      marketSignals: [],
      audienceInsights: [],
      competitorPatterns: [],
      riskFlags: [],
      platformNotes: {}
    },
    ["linkedin"],
    strategyProvider
  );

  const creativeProvider = new StaticProvider({
    caption: "מה ההוכחה הכי קצרה?\n\nטקסט לדוגמה",
    hook: "מה ההוכחה הכי קצרה?",
    imagePrompt: "Clean branded proof visual"
  });
  const creative = await runCreativeTask(angles[0]!, brand, creativeProvider);

  const brandProvider = new StaticProvider({
    passed: true,
    notes: ["Matches voice"],
    requiredEdits: []
  });
  const review = await runBrandReviewTask(brand, creative.caption, creative.imagePrompt, brandProvider);

  assert.equal(angles[0]?.id, "angle-linkedin-1");
  assert.equal(creative.hook, "מה ההוכחה הכי קצרה?");
  assert.equal(review.passed, true);
});

test("strategy, creative, and brand tasks normalize partial LLM JSON", async () => {
  const angles = await runStrategyTask(
    {
      marketSignals: [],
      audienceInsights: [],
      competitorPatterns: [],
      riskFlags: [],
      platformNotes: {}
    },
    ["instagram"],
    new StaticProvider([{ recommended_action: "ignored" }])
  );

  const creative = await runCreativeTask(
    angles[0]!,
    brand,
    new StaticProvider({
      caption: "  נועלים תחזית לפני השריקה  ",
      image_prompt: "  Matchday leaderboard visual  ",
      video_spec: {
        duration_seconds: 12,
        captions: [{ text: "פותחים ליגה" }, { caption: "מזמינים חברים" }]
      }
    })
  );

  const review = await runBrandReviewTask(
    brand,
    creative.caption,
    creative.imagePrompt,
    new StaticProvider({ notes: ["Needs sharper CTA"], required_edits: ["Add no-money-gambling clarity"] })
  );

  assert.equal(angles[0]?.platform, "instagram");
  assert.equal(angles[0]?.hook, "מי באמת מבין כדורגל?");
  assert.equal(creative.caption, "נועלים תחזית לפני השריקה");
  assert.equal(creative.hook, "מי באמת מבין כדורגל?");
  assert.equal(creative.imagePrompt, "Matchday leaderboard visual");
  assert.deepEqual(creative.videoSpec?.captions, ["פותחים ליגה", "מזמינים חברים"]);
  assert.equal(review.passed, false);
  assert.deepEqual(review.requiredEdits, ["Add no-money-gambling clarity"]);
});

class StaticProvider implements AgentLlmProvider {
  readonly prompts: string[] = [];

  constructor(private readonly value: unknown) {}

  async generateJson<T>(request: { prompt: string }): Promise<T> {
    this.prompts.push(request.prompt);
    return this.value as T;
  }
}

class StaticSerperConnector {
  constructor(private readonly results: SerperSearchResult[]) {}

  async search(): Promise<SerperSearchResult[]> {
    return this.results;
  }
}

class StaticYouTubeConnector {
  constructor(private readonly videos: YouTubeSearchVideo[]) {}

  async searchVideos(): Promise<YouTubeSearchVideo[]> {
    return this.videos;
  }
}

class FailingSerperConnector {
  constructor(private readonly message: string) {}

  async search(): Promise<never> {
    throw new Error(this.message);
  }
}

class FailingYouTubeConnector {
  constructor(private readonly message: string) {}

  async searchVideos(): Promise<never> {
    throw new Error(this.message);
  }
}
