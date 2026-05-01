import type { AgentEvent, BrandGuideline, ContentAngle, PipelineRun, SocialDraft } from "@social-agents/shared";
import type { AgentLlmProvider } from "./llmProvider.js";
import { runBrandReviewTask, runCreativeTask, runResearchTask, runStrategyTask, type PipelineInput } from "./taskRunner.js";

export interface OrchestratorResult {
  run: PipelineRun;
  events: AgentEvent[];
}

export async function runSocialPipeline(input: PipelineInput): Promise<OrchestratorResult> {
  const now = new Date().toISOString();
  const runId = `run_${Date.now()}`;
  const events: AgentEvent[] = [];

  const emit = (agentId: string, type: AgentEvent["type"], message: string, metadata?: Record<string, unknown>) => {
    events.push({
      id: `evt_${events.length + 1}_${Date.now()}`,
      runId,
      agentId,
      type,
      message,
      createdAt: new Date().toISOString(),
      metadata
    });
  };

  emit("cmo-orchestrator", "run_started", `Started social pipeline for: ${input.goal}`);
  emit("research-agent", "task_started", "Collecting evidence-backed research signals.");
  const provider = input.llmProvider;

  const researchBrief = await runResearchTask(input);
  emit("research-agent", "task_completed", "Research brief completed.", { sections: Object.keys(researchBrief) });

  emit("strategy-agent", "task_started", "Turning research brief into platform angles.");
  const angles = await runStrategyTask(researchBrief, input.platforms, provider);
  emit("strategy-agent", "task_completed", "Strategy angles completed.", { count: angles.length });

  const drafts: SocialDraft[] = [];
  for (const angle of angles) {
    drafts.push(await buildDraft(runId, angle, input.brand, emit, provider));
  }

  emit("packager-agent", "task_started", "Packaging drafts for admin approval.", { draftIds: drafts.map((draft) => draft.id) });
  emit("packager-agent", "task_completed", "Draft package completed.", { draftIds: drafts.map((draft) => draft.id) });
  emit("packager-agent", "approval_needed", "Drafts packaged and waiting for admin approval.", { draftIds: drafts.map((draft) => draft.id) });

  const run: PipelineRun = {
    id: runId,
    status: "awaiting_approval",
    goal: input.goal,
    createdAt: now,
    updatedAt: new Date().toISOString(),
    researchBrief,
    drafts
  };

  return { run, events };
}

async function buildDraft(
  runId: string,
  angle: ContentAngle,
  brand: BrandGuideline,
  emit: (agentId: string, type: AgentEvent["type"], message: string, metadata?: Record<string, unknown>) => void,
  provider?: AgentLlmProvider
): Promise<SocialDraft> {
  emit("creative-content-agent", "task_started", `Creating draft for ${angle.platform}.`, { angleId: angle.id });
  const creative = await runCreativeTask(angle, brand, provider);
  emit("creative-content-agent", "task_completed", `Creative draft created for ${angle.platform}.`);

  emit("brand-guideline-agent", "task_started", `Reviewing ${angle.platform} draft against brand guidelines.`);
  const brandReview = await runBrandReviewTask(brand, creative.caption, creative.imagePrompt, provider);
  emit("brand-guideline-agent", "task_completed", `Brand review ${brandReview.passed ? "passed" : "needs edits"}.`, {
    requiredEdits: brandReview.requiredEdits
  });

  return {
    id: `draft_${angle.id}_${Date.now()}`,
    runId,
    platform: angle.platform,
    status: "pending",
    caption: creative.caption,
    hook: creative.hook,
    imagePrompt: creative.imagePrompt,
    videoSpec: creative.videoSpec,
    brandReview
  };
}
