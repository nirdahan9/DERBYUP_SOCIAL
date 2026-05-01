import test from "node:test";
import assert from "node:assert/strict";
import { mapAgentRow, StaticAgentStore } from "./agentStore.js";

test("maps postgres agent rows to shared agent definitions", () => {
  const agent = mapAgentRow({
    id: "research-agent",
    role: "research",
    title: "Evidence Research Agent",
    reports_to: "cmo-orchestrator",
    status: "enabled",
    budget_cents_monthly: 4000,
    model: "llama-3.3-70b-versatile",
    capabilities: ["serper_search", "manual_sources"],
    skill_path: "packages/agents/skills/research-agent.md"
  });

  assert.deepEqual(agent, {
    id: "research-agent",
    role: "research",
    title: "Evidence Research Agent",
    reportsTo: "cmo-orchestrator",
    status: "enabled",
    budgetCentsMonthly: 4000,
    model: "llama-3.3-70b-versatile",
    capabilities: ["serper_search", "manual_sources"],
    skillPath: "packages/agents/skills/research-agent.md"
  });
});

test("drops malformed capabilities instead of leaking invalid DB values", () => {
  const agent = mapAgentRow({
    id: "visual-agent",
    role: "visual",
    title: "Visual Prompt Agent",
    reports_to: null,
    status: "paused",
    budget_cents_monthly: 1000,
    model: "llama-3.3-70b-versatile",
    capabilities: ["imagen_prompts", 123, null],
    skill_path: "packages/agents/skills/visual-agent.md"
  });

  assert.deepEqual(agent.capabilities, ["imagen_prompts"]);
  assert.equal(agent.reportsTo, undefined);
});

test("static agent store keeps local fallback populated", async () => {
  const agents = await new StaticAgentStore().listAgents();

  assert.ok(agents.length >= 10);
  assert.ok(agents.some((agent) => agent.id === "brand-guideline-agent"));
});
