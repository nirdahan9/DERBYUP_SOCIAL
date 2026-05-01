import type { AgentDefinition } from "@social-agents/shared";

export const defaultAgentRoster: AgentDefinition[] = [
  {
    id: "cmo-orchestrator",
    role: "orchestrator",
    title: "CMO Orchestrator",
    status: "enabled",
    budgetCentsMonthly: 5000,
    model: "llama-3.3-70b-versatile",
    capabilities: ["pipeline_control", "budget_guardrails", "approval_gates"],
    skillPath: "packages/agents/skills/cmo-orchestrator.md"
  },
  {
    id: "research-agent",
    role: "research",
    title: "Evidence Research Agent",
    reportsTo: "cmo-orchestrator",
    status: "enabled",
    budgetCentsMonthly: 4000,
    model: "llama-3.3-70b-versatile",
    capabilities: ["serper_search", "youtube_api", "manual_sources", "evidence_briefs"],
    skillPath: "packages/agents/skills/research-agent.md"
  },
  {
    id: "strategy-agent",
    role: "strategy",
    title: "Platform Strategy Agent",
    reportsTo: "cmo-orchestrator",
    status: "enabled",
    budgetCentsMonthly: 3000,
    model: "llama-3.3-70b-versatile",
    capabilities: ["content_angles", "platform_planning", "campaign_briefs"],
    skillPath: "packages/agents/skills/strategy-agent.md"
  },
  {
    id: "brand-guideline-agent",
    role: "brand",
    title: "Brand Guideline Agent",
    reportsTo: "cmo-orchestrator",
    status: "enabled",
    budgetCentsMonthly: 2500,
    model: "llama-3.3-70b-versatile",
    capabilities: ["voice_review", "claim_review", "visual_rules", "brand_fit"],
    skillPath: "packages/agents/skills/brand-guideline-agent.md"
  },
  {
    id: "creative-content-agent",
    role: "creative",
    title: "Hebrew Creative Content Agent",
    reportsTo: "strategy-agent",
    status: "enabled",
    budgetCentsMonthly: 3500,
    model: "llama-3.3-70b-versatile",
    capabilities: ["captions", "hooks", "short_scripts", "hebrew_copy"],
    skillPath: "packages/agents/skills/creative-content-agent.md"
  },
  {
    id: "visual-agent",
    role: "visual",
    title: "Visual Prompt Agent",
    reportsTo: "creative-content-agent",
    status: "enabled",
    budgetCentsMonthly: 3500,
    model: "llama-3.3-70b-versatile",
    capabilities: ["imagen_prompts", "asset_direction", "thumbnail_prompts"],
    skillPath: "packages/agents/skills/visual-agent.md"
  },
  {
    id: "video-agent",
    role: "video",
    title: "Remotion Video Agent",
    reportsTo: "creative-content-agent",
    status: "enabled",
    budgetCentsMonthly: 3500,
    model: "llama-3.3-70b-versatile",
    capabilities: ["render_specs", "captions", "vertical_video"],
    skillPath: "packages/agents/skills/video-agent.md"
  },
  {
    id: "seo-geo-agent",
    role: "seo_geo",
    title: "SEO/GEO Agent",
    reportsTo: "strategy-agent",
    status: "enabled",
    budgetCentsMonthly: 2000,
    model: "llama-3.3-70b-versatile",
    capabilities: ["hashtags", "keywords", "location_context"],
    skillPath: "packages/agents/skills/seo-geo-agent.md"
  },
  {
    id: "packager-agent",
    role: "packager",
    title: "Draft Packager Agent",
    reportsTo: "cmo-orchestrator",
    status: "enabled",
    budgetCentsMonthly: 1500,
    model: "llama-3.3-70b-versatile",
    capabilities: ["draft_json", "approval_payloads", "manual_export"],
    skillPath: "packages/agents/skills/packager-agent.md"
  },
  {
    id: "publisher-agent",
    role: "publisher",
    title: "Manual Publisher Agent",
    reportsTo: "cmo-orchestrator",
    status: "disabled",
    budgetCentsMonthly: 0,
    model: "llama-3.3-70b-versatile",
    capabilities: ["manual_export", "publishing_later"],
    skillPath: "packages/agents/skills/publisher-agent.md"
  }
];

export function getAgentById(agentId: string): AgentDefinition {
  const agent = defaultAgentRoster.find((candidate) => candidate.id === agentId);
  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
  }
  return agent;
}
