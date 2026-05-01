import {
  assertValidResearchInsight,
  type BrandGuideline,
  type BrandReview,
  type ContentAngle,
  type ResearchBrief,
  type ResearchInsight,
  type SocialDraft
} from "@social-agents/shared";
import { createDefaultLlmProvider, type AgentLlmProvider } from "./llmProvider.js";
import { createDefaultSerperConnector, serperResultToEvidence, type SerperSearchResult } from "./serperConnector.js";
import { createDefaultYouTubeConnector, youtubeVideoToEvidence, type YouTubeSearchVideo } from "./youtubeConnector.js";

export interface SerperResearchConnector {
  search(query: string, options?: { num?: number; gl?: string; hl?: string }): Promise<SerperSearchResult[]>;
}

export interface YouTubeResearchConnector {
  searchVideos(query: string, options?: { maxResults?: number }): Promise<YouTubeSearchVideo[]>;
}

export interface PipelineInput {
  goal: string;
  platforms: ContentAngle["platform"][];
  brand: BrandGuideline;
  manualSources?: string[];
  llmProvider?: AgentLlmProvider;
  serperConnector?: SerperResearchConnector;
  youtubeConnector?: YouTubeResearchConnector;
}

export async function runResearchTask(input: PipelineInput): Promise<ResearchBrief> {
  const provider = input.llmProvider ?? createDefaultLlmProvider();
  const serperSignals = await collectSerperSignals(input);
  const youtubeSignals = await collectYouTubeSignals(input);

  if (provider) {
    const brief = await provider.generateJson<ResearchBrief>({
      system: "You are the Research Agent for a social media control plane. Produce evidence-aware research only.",
      prompt: [
        `Goal: ${input.goal}`,
        `Platforms: ${input.platforms.join(", ")}`,
        `Manual sources: ${(input.manualSources ?? []).join(", ") || "none"}`,
        `Serper public search signals JSON: ${JSON.stringify(serperSignals.results)}`,
        `YouTube public video signals JSON: ${JSON.stringify(youtubeSignals.videos)}`,
        "Return a ResearchBrief JSON object with marketSignals, audienceInsights, competitorPatterns, riskFlags, and platformNotes.",
        "Every insight must include id, insight, confidence, evidence, and recommendedAction.",
        "If no concrete source exists, use confidence \"hypothesis\" and sourceType \"hypothesis\"."
      ].join("\n")
    });

    applySerperSignals(brief, serperSignals);
    applyYouTubeSignals(brief, youtubeSignals);
    validateResearchBrief(brief);
    return brief;
  }

  const sourceUrl = input.manualSources?.[0] ?? "https://trends.google.com/trends/";
  const marketSignals: ResearchInsight[] = [
    {
      id: "signal-before-after",
      insight: "Audience-facing content should emphasize visible before/after transformation.",
      confidence: input.manualSources?.length ? "medium" : "hypothesis",
      evidence: input.manualSources?.length
        ? [
            {
              sourceType: "manual_competitor_url",
              sourceUrl,
              evidenceNote: "Manual competitor source supplied for pattern analysis."
            }
          ]
        : [
            {
              sourceType: "hypothesis",
              evidenceNote: "No concrete external source was supplied; treat this as a hypothesis for review."
            }
          ],
      recommendedAction: "Create one post that demonstrates the transformation in the first three seconds."
    }
  ];

  if (serperSignals.results.length) {
    marketSignals.push(createSerperMarketSignal(serperSignals.results));
  }

  const brief: ResearchBrief = {
    marketSignals,
    audienceInsights: [
      {
        id: "audience-clarity",
        insight: "The audience likely needs concise proof, not broad inspiration.",
        confidence: "hypothesis",
        evidence: [
          {
            sourceType: "hypothesis",
            evidenceNote: "Derived from the campaign goal only; validate with analytics or customer questions."
          }
        ],
        recommendedAction: "Use a specific pain point and one measurable outcome in the caption."
      }
    ],
    competitorPatterns: youtubeSignals.videos.length ? [createYouTubeCompetitorPattern(youtubeSignals.videos)] : [],
    riskFlags: [
      {
        id: "risk-unverified-claims",
        insight: "Avoid performance claims that are not backed by a source.",
        confidence: "high",
        evidence: [
          {
            sourceType: "public_url",
            sourceUrl: "https://www.ftc.gov/business-guidance/advertising-marketing",
            evidenceNote: "Marketing claims should be supportable and not misleading."
          }
        ],
        recommendedAction: "Route all numeric claims through the Brand Guideline Agent before packaging."
      }
    ],
    platformNotes: Object.fromEntries(input.platforms.map((platform) => [platform, ["Lead with a hook, proof, and a single CTA."]]))
  };

  applySerperSignals(brief, serperSignals);
  applyYouTubeSignals(brief, youtubeSignals);
  validateResearchBrief(brief);

  return brief;
}

export async function runStrategyTask(
  brief: ResearchBrief,
  platforms: ContentAngle["platform"][],
  provider: AgentLlmProvider | undefined = createDefaultLlmProvider()
): Promise<ContentAngle[]> {
  if (provider) {
    return provider.generateJson<ContentAngle[]>({
      system: "You are the Strategy Agent. Convert research into platform-specific social content angles.",
      prompt: [
        `Platforms: ${platforms.join(", ")}`,
        `Research brief JSON: ${JSON.stringify(brief)}`,
        "Return a JSON array of ContentAngle objects.",
        "Each object must include id, title, platform, hook, format, cta, and sourceInsightIds."
      ].join("\n")
    });
  }

  return platforms.map((platform, index) => ({
    id: `angle-${platform}-${index + 1}`,
    title: `Transformation proof for ${platform}`,
    platform,
    hook: "מה השתנה כשהפכנו רעיון לתהליך מדיד?",
    format: platform === "linkedin" ? "text_post" : "vertical_short",
    cta: "שלחו לנו הודעה ונבנה לכם תהליך דומה",
    sourceInsightIds: [
      brief.marketSignals[0]?.id ?? "signal-before-after",
      brief.audienceInsights[0]?.id ?? "audience-clarity"
    ]
  }));
}

export async function runBrandReviewTask(
  brand: BrandGuideline,
  caption: string,
  imagePrompt?: string,
  provider: AgentLlmProvider | undefined = createDefaultLlmProvider()
): Promise<BrandReview> {
  if (provider) {
    return provider.generateJson<BrandReview>({
      system: "You are the Brand Guideline Agent. Review content for tone, claims, banned language, and brand fit.",
      prompt: [
        `Brand guideline JSON: ${JSON.stringify(brand)}`,
        `Caption: ${caption}`,
        `Image prompt: ${imagePrompt ?? ""}`,
        "Return a BrandReview JSON object with passed, notes, and requiredEdits."
      ].join("\n")
    });
  }

  const requiredEdits: string[] = [];
  const notes: string[] = [];
  const reviewText = `${caption} ${imagePrompt ?? ""}`.toLowerCase();

  for (const bannedWord of brand.bannedWords) {
    if (reviewText.includes(bannedWord.toLowerCase())) {
      requiredEdits.push(`Remove banned word: ${bannedWord}`);
    }
  }

  for (const bannedClaim of brand.bannedClaims) {
    if (reviewText.includes(bannedClaim.toLowerCase())) {
      requiredEdits.push(`Remove or substantiate banned claim: ${bannedClaim}`);
    }
  }

  if (brand.voice.length > 0) {
    notes.push(`Voice target: ${brand.voice.join(", ")}`);
  }

  return {
    passed: requiredEdits.length === 0,
    notes,
    requiredEdits
  };
}

export async function runCreativeTask(
  angle: ContentAngle,
  brand: BrandGuideline,
  provider: AgentLlmProvider | undefined = createDefaultLlmProvider()
): Promise<Pick<SocialDraft, "caption" | "hook" | "imagePrompt" | "videoSpec">> {
  if (provider) {
    return provider.generateJson<Pick<SocialDraft, "caption" | "hook" | "imagePrompt" | "videoSpec">>({
      system: "You are the Creative Content Agent. Write Hebrew social content and visual/video direction.",
      prompt: [
        `Content angle JSON: ${JSON.stringify(angle)}`,
        `Brand guideline JSON: ${JSON.stringify(brand)}`,
        "Return JSON with caption, hook, optional imagePrompt, and optional videoSpec.",
        "If videoSpec is included, it must match width 1080, height 1920, fps 30, durationSeconds, title, captions, cta, and brand."
      ].join("\n")
    });
  }

  const caption = `${angle.hook}\n\nבמקום עוד פוסט כללי, זה כיוון שמבוסס על אות מחקרי ומותאם ל-${angle.platform}.\n\n${angle.cta}`;
  const imagePrompt = `Create a clean social visual using ${brand.colors.primary}, ${brand.colors.secondary}, and ${brand.colors.accent}. Show a before/after workflow with confident Hebrew brand tone.`;

  return {
    caption,
    hook: angle.hook,
    imagePrompt,
    videoSpec:
      angle.format === "vertical_short"
        ? {
            id: `video-${angle.id}`,
            width: 1080,
            height: 1920,
            fps: 30,
            durationSeconds: 18,
            title: angle.title,
            captions: [angle.hook, "אות מחקרי → זווית תוכן → טיוטה לאישור", angle.cta],
            cta: angle.cta,
            brand
          }
        : undefined
  };
}

function validateResearchBrief(brief: ResearchBrief): void {
  for (const section of [brief.marketSignals, brief.audienceInsights, brief.competitorPatterns, brief.riskFlags]) {
    for (const insight of section) assertValidResearchInsight(insight);
  }
}

async function collectSerperSignals(input: PipelineInput): Promise<{ results: SerperSearchResult[]; error?: string }> {
  const connector = input.serperConnector ?? createDefaultSerperConnector();
  if (!connector) return { results: [] };

  try {
    const results = await connector.search(input.goal, { num: 5, gl: "il", hl: "he" });
    return { results };
  } catch (error) {
    return {
      results: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function collectYouTubeSignals(input: PipelineInput): Promise<{ videos: YouTubeSearchVideo[]; error?: string }> {
  const connector = input.youtubeConnector ?? createDefaultYouTubeConnector();
  if (!connector) return { videos: [] };

  try {
    const videos = await connector.searchVideos(input.goal, { maxResults: 5 });
    return { videos };
  } catch (error) {
    return {
      videos: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function applySerperSignals(brief: ResearchBrief, signals: { results: SerperSearchResult[]; error?: string }): void {
  if (signals.results.length && !brief.marketSignals.some((insight) => insight.id === "serper-public-search-signals")) {
    brief.marketSignals.push(createSerperMarketSignal(signals.results));
  }

  if (signals.error && !brief.riskFlags.some((insight) => insight.id === "serper-connector-error")) {
    brief.riskFlags.push({
      id: "serper-connector-error",
      insight: "Public search research could not be collected through Serper for this run.",
      confidence: "hypothesis",
      evidence: [
        {
          sourceType: "hypothesis",
          evidenceNote: `Serper connector error: ${signals.error}`
        }
      ],
      recommendedAction: "Review the Serper API key, quota, and query settings before relying on public search signals."
    });
  }
}

function applyYouTubeSignals(brief: ResearchBrief, signals: { videos: YouTubeSearchVideo[]; error?: string }): void {
  if (signals.videos.length && !brief.competitorPatterns.some((insight) => insight.id === "youtube-public-video-patterns")) {
    brief.competitorPatterns.push(createYouTubeCompetitorPattern(signals.videos));
  }

  if (signals.error && !brief.riskFlags.some((insight) => insight.id === "youtube-connector-error")) {
    brief.riskFlags.push({
      id: "youtube-connector-error",
      insight: "YouTube public video research could not be collected for this run.",
      confidence: "hypothesis",
      evidence: [
        {
          sourceType: "hypothesis",
          evidenceNote: `YouTube connector error: ${signals.error}`
        }
      ],
      recommendedAction: "Review the YouTube API key, quota, and query settings before relying on YouTube competitor signals."
    });
  }
}

function createSerperMarketSignal(results: SerperSearchResult[]) {
  const titles = results
    .slice(0, 3)
    .map((result) => result.title)
    .filter(Boolean);

  return {
    id: "serper-public-search-signals",
    insight: titles.length
      ? `Public search results around this goal include sources such as: ${titles.join(" | ")}.`
      : "Public search results are available for this goal, but titles were missing from the API response.",
    confidence: "medium" as const,
    evidence: results.map((result) =>
      serperResultToEvidence(result, `Serper public search result${result.position ? ` at position ${result.position}` : ""}.`)
    ),
    recommendedAction: "Use these public search sources to ground market context, questions, and claims before creating content angles."
  };
}

function createYouTubeCompetitorPattern(videos: YouTubeSearchVideo[]) {
  const titles = videos
    .slice(0, 3)
    .map((video) => video.title)
    .filter(Boolean);

  return {
    id: "youtube-public-video-patterns",
    insight: titles.length
      ? `Public YouTube results around this goal include titles such as: ${titles.join(" | ")}.`
      : "Public YouTube results are available for this goal, but titles were missing from the API response.",
    confidence: "medium" as const,
    evidence: videos.map((video) =>
      youtubeVideoToEvidence(video, `YouTube Data API v3 result from channel "${video.channelTitle || "unknown"}".`)
    ),
    recommendedAction: "Use these public video titles as inspiration for hooks and formats, but verify relevance before treating them as competitor proof."
  };
}
