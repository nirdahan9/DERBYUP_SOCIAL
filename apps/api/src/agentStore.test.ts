import test from "node:test";
import assert from "node:assert/strict";
import { isAgentStatus, mapAgentRow, parseAgentConfigUpdate, StaticAgentStore } from "./agentStore.js";

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

test("static agent store applies status updates without mutating defaults", async () => {
  const store = new StaticAgentStore();

  const updated = await store.updateAgentStatus("publisher-agent", "enabled");
  const agents = await store.listAgents();

  assert.equal(updated.status, "enabled");
  assert.equal(agents.find((agent) => agent.id === "publisher-agent")?.status, "enabled");
  assert.equal(agents.find((agent) => agent.id === "research-agent")?.status, "enabled");
});

test("static agent store applies model and budget config updates", async () => {
  const store = new StaticAgentStore();

  const updated = await store.updateAgentConfig("research-agent", {
    budgetCentsMonthly: 9000,
    model: "llama-3.3-70b-versatile"
  });
  const agents = await store.listAgents();

  assert.equal(updated.budgetCentsMonthly, 9000);
  assert.equal(updated.model, "llama-3.3-70b-versatile");
  assert.equal(agents.find((agent) => agent.id === "research-agent")?.budgetCentsMonthly, 9000);
});

test("static agent store combines status and config overrides", async () => {
  const store = new StaticAgentStore();

  await store.updateAgentStatus("publisher-agent", "enabled");
  const updated = await store.updateAgentConfig("publisher-agent", {
    budgetCentsMonthly: 1200
  });

  assert.equal(updated.status, "enabled");
  assert.equal(updated.budgetCentsMonthly, 1200);
});

test("static agent store rejects unknown agents", async () => {
  const store = new StaticAgentStore();

  await assert.rejects(() => store.updateAgentStatus("missing-agent", "disabled"), /Unknown agent/);
  await assert.rejects(() => store.updateAgentConfig("missing-agent", { budgetCentsMonthly: 1 }), /Unknown agent/);
});

test("validates supported agent statuses", () => {
  assert.equal(isAgentStatus("enabled"), true);
  assert.equal(isAgentStatus("disabled"), true);
  assert.equal(isAgentStatus("paused"), true);
  assert.equal(isAgentStatus("deleted"), false);
  assert.equal(isAgentStatus(undefined), false);
});

test("parses valid agent config update payloads", () => {
  assert.deepEqual(parseAgentConfigUpdate({ model: " llama-3.3-70b-versatile ", budgetCentsMonthly: 0 }), {
    model: "llama-3.3-70b-versatile",
    budgetCentsMonthly: 0
  });
  assert.deepEqual(parseAgentConfigUpdate({ budgetCentsMonthly: 2500 }), {
    budgetCentsMonthly: 2500
  });
});

test("rejects invalid agent config update payloads", () => {
  assert.equal(parseAgentConfigUpdate({}), undefined);
  assert.equal(parseAgentConfigUpdate({ model: "" }), undefined);
  assert.equal(parseAgentConfigUpdate({ model: "   " }), undefined);
  assert.equal(parseAgentConfigUpdate({ budgetCentsMonthly: -1 }), undefined);
  assert.equal(parseAgentConfigUpdate({ budgetCentsMonthly: 1.5 }), undefined);
  assert.equal(parseAgentConfigUpdate(null), undefined);
});
