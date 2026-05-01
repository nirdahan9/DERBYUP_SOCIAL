import { existsSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { loadSkill, type LoadedSkill } from "@social-agents/agents";
import type { AgentDefinition } from "@social-agents/shared";
import { agentStore, type AgentStore } from "./agentStore.js";

export interface AgentSkill {
  agentId: string;
  skillPath: string;
  skill: LoadedSkill;
}

export async function listAgentSkills(store: AgentStore = agentStore, rootDir = findProjectRoot()): Promise<AgentSkill[]> {
  const agents = await store.listAgents();
  return Promise.all(agents.map((agent) => loadAgentSkill(agent, rootDir)));
}

export async function getAgentSkill(agentId: string, store: AgentStore = agentStore, rootDir = findProjectRoot()): Promise<AgentSkill | undefined> {
  const agents = await store.listAgents();
  const agent = agents.find((candidate) => candidate.id === agentId);
  return agent ? loadAgentSkill(agent, rootDir) : undefined;
}

export function findProjectRoot(startDir = process.cwd()): string {
  let current = resolve(startDir);
  while (true) {
    if (existsSync(resolve(current, "pnpm-workspace.yaml"))) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(startDir);
    current = parent;
  }
}

export function resolveSkillPath(rootDir: string, skillPath: string): string {
  const root = resolve(rootDir);
  const absolutePath = resolve(root, skillPath);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${sep}`)) {
    throw new Error(`Skill path escapes project root: ${skillPath}`);
  }
  return absolutePath;
}

async function loadAgentSkill(agent: AgentDefinition, rootDir: string): Promise<AgentSkill> {
  const absolutePath = resolveSkillPath(rootDir, agent.skillPath);
  return {
    agentId: agent.id,
    skillPath: agent.skillPath,
    skill: await loadSkill(absolutePath)
  };
}
