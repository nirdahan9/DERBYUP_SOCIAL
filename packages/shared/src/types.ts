export type AgentRole =
  | "orchestrator"
  | "research"
  | "strategy"
  | "brand"
  | "creative"
  | "visual"
  | "video"
  | "seo_geo"
  | "packager"
  | "publisher";

export type AgentStatus = "enabled" | "disabled" | "paused";
export type RunStatus = "queued" | "running" | "awaiting_approval" | "completed" | "failed";
export type TaskStatus = "queued" | "running" | "completed" | "failed" | "skipped";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type Confidence = "low" | "medium" | "high" | "hypothesis";

export type ResearchSourceType =
  | "serper_search"
  | "google_trends"
  | "youtube_api"
  | "rss"
  | "public_url"
  | "manual_competitor_url"
  | "uploaded_asset"
  | "internal_analytics"
  | "google_drive"
  | "hypothesis";

export interface AgentDefinition {
  id: string;
  role: AgentRole;
  title: string;
  reportsTo?: string;
  status: AgentStatus;
  budgetCentsMonthly: number;
  model: string;
  capabilities: string[];
  skillPath: string;
}

export interface ResearchEvidence {
  sourceType: ResearchSourceType;
  sourceUrl?: string;
  uploadedAssetId?: string;
  evidenceNote: string;
}

export interface ResearchInsight {
  id: string;
  insight: string;
  confidence: Confidence;
  evidence: ResearchEvidence[];
  recommendedAction: string;
}

export interface ResearchBrief {
  marketSignals: ResearchInsight[];
  audienceInsights: ResearchInsight[];
  competitorPatterns: ResearchInsight[];
  riskFlags: ResearchInsight[];
  platformNotes: Record<string, string[]>;
}

export interface ContentAngle {
  id: string;
  title: string;
  platform: "linkedin" | "instagram" | "tiktok" | "youtube_shorts";
  hook: string;
  format: string;
  cta: string;
  sourceInsightIds: string[];
}

export interface BrandGuideline {
  id: string;
  name: string;
  voice: string[];
  visualRules: string[];
  requiredClaims: string[];
  bannedClaims: string[];
  preferredWords: string[];
  bannedWords: string[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface BrandReview {
  passed: boolean;
  notes: string[];
  requiredEdits: string[];
}

export interface SocialDraft {
  id: string;
  runId: string;
  platform: ContentAngle["platform"];
  status: ApprovalStatus;
  caption: string;
  hook: string;
  imagePrompt?: string;
  videoSpec?: ShortVideoRenderSpec;
  brandReview: BrandReview;
}

export interface ShortVideoRenderSpec {
  id: string;
  width: 1080;
  height: 1920;
  fps: 30;
  durationSeconds: number;
  title: string;
  captions: string[];
  cta: string;
  brand: BrandGuideline;
}

export interface AgentEvent {
  id: string;
  runId: string;
  agentId: string;
  type: "run_started" | "task_started" | "task_completed" | "approval_needed" | "run_completed" | "run_failed";
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface AgentTask {
  id: string;
  runId: string;
  agentId: string;
  status: TaskStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface PipelineRun {
  id: string;
  status: RunStatus;
  goal: string;
  createdAt: string;
  updatedAt: string;
  researchBrief?: ResearchBrief;
  drafts: SocialDraft[];
}
