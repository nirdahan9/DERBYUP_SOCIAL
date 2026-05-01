import test from "node:test";
import assert from "node:assert/strict";
import type { AgentLlmProvider } from "./llmProvider.js";
import { runBrandReviewTask, runCreativeTask, runResearchTask, runStrategyTask, type PipelineInput } from "./taskRunner.js";

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

class StaticProvider implements AgentLlmProvider {
  readonly prompts: string[] = [];

  constructor(private readonly value: unknown) {}

  async generateJson<T>(request: { prompt: string }): Promise<T> {
    this.prompts.push(request.prompt);
    return this.value as T;
  }
}
