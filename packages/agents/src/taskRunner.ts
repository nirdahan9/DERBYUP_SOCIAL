import {
  assertValidResearchInsight,
  type BrandGuideline,
  type BrandReview,
  type Confidence,
  type ContentAngle,
  type ResearchBrief,
  type ResearchEvidence,
  type ResearchInsight,
  type ResearchSourceType,
  type ShortVideoRenderSpec,
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
    const rawBrief = await provider.generateJson<unknown>({
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
    const brief = normalizeResearchBrief(rawBrief, input.platforms);

    applySerperSignals(brief, serperSignals);
    applyYouTubeSignals(brief, youtubeSignals);
    validateResearchBrief(brief);
    return brief;
  }

  const marketSignals: ResearchInsight[] = [
    {
      id: "signal-before-after",
      insight: "Audience-facing content should emphasize visible before/after transformation.",
      confidence: input.manualSources?.length ? "medium" : "hypothesis",
      evidence: input.manualSources?.length
        ? input.manualSources.map((sourceUrl) => ({
            sourceType: "manual_competitor_url",
            sourceUrl,
            evidenceNote: "Manual competitor source supplied for pattern analysis."
          }))
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
    const rawAngles = await provider.generateJson<unknown>({
      system: "You are the Strategy Agent. Convert research into platform-specific social content angles.",
      prompt: [
        `Platforms: ${platforms.join(", ")}`,
        `Research brief JSON: ${JSON.stringify(brief)}`,
        "Return a JSON array of ContentAngle objects.",
        "Each object must include id, title, platform, hook, format, cta, and sourceInsightIds."
      ].join("\n")
    });
    return normalizeContentAngles(rawAngles, platforms);
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
    const rawReview = await provider.generateJson<unknown>({
      system: "You are the Brand Guideline Agent. Review content for tone, claims, banned language, and brand fit.",
      prompt: [
        `Brand guideline JSON: ${JSON.stringify(brand)}`,
        `Caption: ${caption}`,
        `Image prompt: ${imagePrompt ?? ""}`,
        "Return a BrandReview JSON object with passed, notes, and requiredEdits."
      ].join("\n")
    });
    return normalizeBrandReview(rawReview);
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
    const rawCreative = await provider.generateJson<unknown>({
      system: "You are the Creative Content Agent. Write Hebrew social content and visual/video direction.",
      prompt: [
        `Content angle JSON: ${JSON.stringify(angle)}`,
        `Brand guideline JSON: ${JSON.stringify(brand)}`,
        "Return JSON with caption, hook, optional imagePrompt, and optional videoSpec.",
        "If videoSpec is included, it must match width 1080, height 1920, fps 30, durationSeconds, title, captions, cta, and brand."
      ].join("\n")
    });
    return normalizeCreativeDraft(rawCreative, angle, brand);
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

function normalizeResearchBrief(value: unknown, platforms: ContentAngle["platform"][]): ResearchBrief {
  const record = asRecord(value);
  return {
    marketSignals: normalizeResearchInsights(record?.marketSignals),
    audienceInsights: normalizeResearchInsights(record?.audienceInsights),
    competitorPatterns: normalizeResearchInsights(record?.competitorPatterns),
    riskFlags: normalizeResearchInsights(record?.riskFlags),
    platformNotes: normalizePlatformNotes(record?.platformNotes, platforms)
  };
}

function normalizeResearchInsights(value: unknown): ResearchInsight[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => normalizeResearchInsight(item, index)).filter((item): item is ResearchInsight => Boolean(item));
}

function normalizeResearchInsight(value: unknown, index: number): ResearchInsight | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const evidence = normalizeResearchEvidenceList(record.evidence);
  const hasConcreteEvidence = evidence.some((item) => item.sourceType !== "hypothesis");
  const confidence = normalizeConfidence(record.confidence, hasConcreteEvidence ? "medium" : "hypothesis");

  return {
    id: stringField(record.id, `llm-insight-${index + 1}`),
    insight: stringField(record.insight, "LLM returned an insight without text; review this item manually."),
    confidence: hasConcreteEvidence ? confidence : "hypothesis",
    evidence:
      evidence.length > 0
        ? evidence
        : [
            {
              sourceType: "hypothesis",
              evidenceNote: "LLM returned this insight without evidence; treat it as a hypothesis."
            }
          ],
    recommendedAction: stringField(record.recommendedAction ?? record.recommended_action, "Review and validate this insight before use.")
  };
}

function normalizeResearchEvidenceList(value: unknown): ResearchEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeResearchEvidence).filter((item): item is ResearchEvidence => Boolean(item));
}

function normalizeResearchEvidence(value: unknown): ResearchEvidence | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const sourceType = normalizeSourceType(record.sourceType ?? record.source_type);
  const sourceUrl = optionalStringField(record.sourceUrl ?? record.source_url);
  const uploadedAssetId = optionalStringField(record.uploadedAssetId ?? record.uploaded_asset_id);

  if (sourceType === "uploaded_asset") {
    return {
      sourceType,
      uploadedAssetId,
      evidenceNote: stringField(record.evidenceNote ?? record.evidence_note, "Uploaded asset evidence returned without a note.")
    };
  }

  if (sourceType === "hypothesis" || !sourceUrl) {
    return {
      sourceType: "hypothesis",
      evidenceNote: stringField(record.evidenceNote ?? record.evidence_note, "Evidence source was missing; treated as a hypothesis.")
    };
  }

  return {
    sourceType,
    sourceUrl,
    evidenceNote: stringField(record.evidenceNote ?? record.evidence_note, "Evidence note was missing from the LLM response.")
  };
}

function normalizePlatformNotes(value: unknown, platforms: ContentAngle["platform"][]): Record<string, string[]> {
  const record = asRecord(value);
  const notes: Record<string, string[]> = {};
  for (const platform of platforms) {
    const raw = record?.[platform];
    notes[platform] = Array.isArray(raw) ? raw.map((item) => String(item)).filter(Boolean) : [];
  }
  return notes;
}

function normalizeContentAngles(value: unknown, platforms: ContentAngle["platform"][]): ContentAngle[] {
  if (!Array.isArray(value)) return fallbackContentAngles(platforms);
  const angles = value.map((item, index) => normalizeContentAngle(item, platforms, index)).filter((item): item is ContentAngle => Boolean(item));
  return angles.length ? angles : fallbackContentAngles(platforms);
}

function normalizeContentAngle(value: unknown, platforms: ContentAngle["platform"][], index: number): ContentAngle | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const platform = normalizePlatform(record.platform, platforms[index] ?? platforms[0] ?? "linkedin");
  return {
    id: stringField(record.id, `angle-${platform}-${index + 1}`),
    title: stringField(record.title, `DerbyUp ${platform} angle`),
    platform,
    hook: stringField(record.hook, "מי באמת מבין כדורגל?"),
    format: stringField(record.format, platform === "linkedin" ? "text_post" : "vertical_short"),
    cta: stringField(record.cta, "פתחו ליגה פרטית והזמינו חברים"),
    sourceInsightIds: Array.isArray(record.sourceInsightIds)
      ? record.sourceInsightIds.map((item) => String(item)).filter(Boolean)
      : Array.isArray(record.source_insight_ids)
        ? record.source_insight_ids.map((item) => String(item)).filter(Boolean)
        : []
  };
}

function fallbackContentAngles(platforms: ContentAngle["platform"][]): ContentAngle[] {
  return platforms.map((platform, index) => ({
    id: `angle-${platform}-${index + 1}`,
    title: `DerbyUp matchday angle for ${platform}`,
    platform,
    hook: "מי באמת מבין כדורגל?",
    format: platform === "linkedin" ? "text_post" : "vertical_short",
    cta: "פתחו ליגה פרטית והזמינו חברים",
    sourceInsightIds: []
  }));
}

function normalizeCreativeDraft(
  value: unknown,
  angle: ContentAngle,
  brand: BrandGuideline
): Pick<SocialDraft, "caption" | "hook" | "imagePrompt" | "videoSpec"> {
  const record = asRecord(value);
  return {
    caption: stringField(record?.caption, `${angle.hook}\n\n${angle.cta}`),
    hook: stringField(record?.hook, angle.hook),
    imagePrompt: optionalStringField(record?.imagePrompt ?? record?.image_prompt),
    videoSpec: normalizeVideoSpec(record?.videoSpec ?? record?.video_spec, angle, brand)
  };
}

function normalizeVideoSpec(value: unknown, angle: ContentAngle, brand: BrandGuideline): ShortVideoRenderSpec | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  return {
    id: stringField(record.id, `video-${angle.id}`),
    width: 1080,
    height: 1920,
    fps: 30,
    durationSeconds: numberField(record.durationSeconds ?? record.duration_seconds, 18),
    title: stringField(record.title, angle.title),
    captions: Array.isArray(record.captions) ? record.captions.map((item) => String(item)).filter(Boolean) : [angle.hook, angle.cta],
    cta: stringField(record.cta, angle.cta),
    brand
  };
}

function normalizeBrandReview(value: unknown): BrandReview {
  const record = asRecord(value);
  return {
    passed: typeof record?.passed === "boolean" ? record.passed : false,
    notes: normalizeStringArray(record?.notes),
    requiredEdits: normalizeStringArray(record?.requiredEdits ?? record?.required_edits)
  };
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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function stringField(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalStringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberField(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function normalizeConfidence(value: unknown, fallback: Confidence): Confidence {
  return value === "low" || value === "medium" || value === "high" || value === "hypothesis" ? value : fallback;
}

function normalizeSourceType(value: unknown): ResearchSourceType {
  const allowed: ResearchSourceType[] = [
    "serper_search",
    "google_trends",
    "youtube_api",
    "rss",
    "public_url",
    "manual_competitor_url",
    "uploaded_asset",
    "internal_analytics",
    "google_drive",
    "hypothesis"
  ];
  return typeof value === "string" && allowed.includes(value as ResearchSourceType) ? (value as ResearchSourceType) : "hypothesis";
}

function normalizePlatform(value: unknown, fallback: ContentAngle["platform"]): ContentAngle["platform"] {
  const allowed: ContentAngle["platform"][] = ["linkedin", "instagram", "tiktok", "youtube_shorts"];
  return typeof value === "string" && allowed.includes(value as ContentAngle["platform"]) ? (value as ContentAngle["platform"]) : fallback;
}
