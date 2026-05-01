import { Pool } from "pg";
import { defaultAgentRoster } from "@social-agents/agents";
import type { AgentDefinition, AgentRole, AgentStatus } from "@social-agents/shared";

export interface AgentConfigUpdate {
  budgetCentsMonthly?: number;
  model?: string;
}

interface AgentRow {
  id: string;
  role: string;
  title: string;
  reports_to: string | null;
  status: AgentStatus;
  budget_cents_monthly: number;
  model: string;
  capabilities: unknown;
  skill_path: string;
}

export interface AgentStore {
  listAgents(): Promise<AgentDefinition[]>;
  updateAgentStatus(agentId: string, status: AgentStatus): Promise<AgentDefinition>;
  updateAgentConfig(agentId: string, config: AgentConfigUpdate): Promise<AgentDefinition>;
}

export class StaticAgentStore implements AgentStore {
  private readonly statusOverrides = new Map<string, AgentStatus>();
  private readonly configOverrides = new Map<string, AgentConfigUpdate>();

  async listAgents(): Promise<AgentDefinition[]> {
    return defaultAgentRoster.map((agent) => ({
      ...agent,
      ...this.configOverrides.get(agent.id),
      status: this.statusOverrides.get(agent.id) ?? agent.status
    }));
  }

  async updateAgentStatus(agentId: string, status: AgentStatus): Promise<AgentDefinition> {
    const agent = defaultAgentRoster.find((candidate) => candidate.id === agentId);
    if (!agent) throw new Error(`Unknown agent: ${agentId}`);

    this.statusOverrides.set(agentId, status);
    return { ...agent, status };
  }

  async updateAgentConfig(agentId: string, config: AgentConfigUpdate): Promise<AgentDefinition> {
    const agent = defaultAgentRoster.find((candidate) => candidate.id === agentId);
    if (!agent) throw new Error(`Unknown agent: ${agentId}`);

    const existing = this.configOverrides.get(agentId) ?? {};
    const nextConfig = { ...existing, ...config };
    this.configOverrides.set(agentId, nextConfig);

    return {
      ...agent,
      ...nextConfig,
      status: this.statusOverrides.get(agentId) ?? agent.status
    };
  }
}

export class PostgresAgentStore implements AgentStore {
  constructor(private readonly pool: Pool) {}

  static fromEnv(): PostgresAgentStore | undefined {
    if (!process.env.DATABASE_URL) return undefined;
    return new PostgresAgentStore(
      new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
      })
    );
  }

  async listAgents(): Promise<AgentDefinition[]> {
    const result = await this.pool.query<AgentRow>("select * from agents order by created_at asc");
    return result.rows.map(mapAgentRow);
  }

  async updateAgentStatus(agentId: string, status: AgentStatus): Promise<AgentDefinition> {
    const result = await this.pool.query<AgentRow>(
      `
        update agents
        set status = $2, updated_at = now()
        where id = $1
        returning *
      `,
      [agentId, status]
    );
    const row = result.rows[0];
    if (!row) throw new Error(`Unknown agent: ${agentId}`);
    return mapAgentRow(row);
  }

  async updateAgentConfig(agentId: string, config: AgentConfigUpdate): Promise<AgentDefinition> {
    const result = await this.pool.query<AgentRow>(
      `
        update agents
        set
          model = coalesce($2, model),
          budget_cents_monthly = coalesce($3, budget_cents_monthly),
          updated_at = now()
        where id = $1
        returning *
      `,
      [agentId, config.model ?? null, config.budgetCentsMonthly ?? null]
    );
    const row = result.rows[0];
    if (!row) throw new Error(`Unknown agent: ${agentId}`);
    return mapAgentRow(row);
  }
}

export function isAgentStatus(value: unknown): value is AgentStatus {
  return value === "enabled" || value === "disabled" || value === "paused";
}

export function parseAgentConfigUpdate(value: unknown): AgentConfigUpdate | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const body = value as Record<string, unknown>;
  const config: AgentConfigUpdate = {};

  if ("model" in body) {
    if (typeof body.model !== "string" || body.model.trim().length === 0) return undefined;
    config.model = body.model.trim();
  }

  if ("budgetCentsMonthly" in body) {
    const budgetCentsMonthly = body.budgetCentsMonthly;
    if (
      typeof budgetCentsMonthly !== "number" ||
      !Number.isInteger(budgetCentsMonthly) ||
      budgetCentsMonthly < 0
    ) {
      return undefined;
    }
    config.budgetCentsMonthly = budgetCentsMonthly;
  }

  if (config.model === undefined && config.budgetCentsMonthly === undefined) return undefined;
  return config;
}

export function mapAgentRow(row: AgentRow): AgentDefinition {
  return {
    id: row.id,
    role: row.role as AgentRole,
    title: row.title,
    reportsTo: row.reports_to ?? undefined,
    status: row.status,
    budgetCentsMonthly: row.budget_cents_monthly,
    model: row.model,
    capabilities: normalizeCapabilities(row.capabilities),
    skillPath: row.skill_path
  };
}

function normalizeCapabilities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((capability): capability is string => typeof capability === "string");
}

export const agentStore: AgentStore = PostgresAgentStore.fromEnv() ?? new StaticAgentStore();
export const agentStoreKind = agentStore instanceof PostgresAgentStore ? "postgres" : "memory";
