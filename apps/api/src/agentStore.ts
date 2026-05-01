import { Pool } from "pg";
import { defaultAgentRoster } from "@social-agents/agents";
import type { AgentDefinition, AgentRole, AgentStatus } from "@social-agents/shared";

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
}

export class StaticAgentStore implements AgentStore {
  async listAgents(): Promise<AgentDefinition[]> {
    return defaultAgentRoster;
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
