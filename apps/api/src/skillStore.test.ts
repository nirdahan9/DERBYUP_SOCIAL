import test from "node:test";
import assert from "node:assert/strict";
import { findProjectRoot, listAgentSkills, resolveSkillPath } from "./skillStore.js";
import type { AgentDefinition } from "@social-agents/shared";
import type { AgentStore } from "./agentStore.js";

test("loads skills for agents from their configured skill paths", async () => {
  const skills = await listAgentSkills(new SingleAgentStore());

  assert.equal(skills.length, 1);
  assert.equal(skills[0]?.agentId, "content-strategy-test-agent");
  assert.equal(skills[0]?.skill.id, "strategy-agent");
  assert.equal(skills[0]?.skill.version, "1.0.0");
  assert.match(skills[0]?.skill.description ?? "", /social content strategy/);
  assert.match(skills[0]?.skill.content ?? "", /Platform Strategy Agent/);
});

test("rejects skill paths that escape the project root", () => {
  assert.throws(() => resolveSkillPath(process.cwd(), "../outside.md"), /escapes project root/);
});

test("finds the monorepo root from a package subdirectory", () => {
  const root = findProjectRoot(process.cwd());

  assert.ok(root.endsWith("New project"));
});

class SingleAgentStore implements AgentStore {
  async listAgents(): Promise<AgentDefinition[]> {
    return [
      {
        id: "content-strategy-test-agent",
        role: "strategy",
        title: "Content Strategy Test Agent",
        status: "enabled",
        budgetCentsMonthly: 0,
        model: "test",
        capabilities: ["content_strategy"],
        skillPath: "packages/agents/skills/strategy-agent.md"
      }
    ];
  }
}
