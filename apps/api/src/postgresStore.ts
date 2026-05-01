import { Pool } from "pg";
import type { AgentEvent, ApprovalStatus, PipelineRun, SocialDraft } from "@social-agents/shared";
import { collectResearchSourceRecords } from "./researchSources.js";
import type { RunStore } from "./store.js";

interface RunRow {
  id: string;
  status: PipelineRun["status"];
  goal: string;
  research_brief: PipelineRun["researchBrief"] | null;
  created_at: Date;
  updated_at: Date;
}

interface DraftRow {
  id: string;
  run_id: string;
  platform: SocialDraft["platform"];
  status: ApprovalStatus;
  hook: string;
  caption: string;
  image_prompt: string | null;
  video_spec: SocialDraft["videoSpec"] | null;
  brand_review: SocialDraft["brandReview"];
}

interface EventRow {
  id: string;
  run_id: string;
  agent_id: string;
  type: AgentEvent["type"];
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export class PostgresStore implements RunStore {
  constructor(private readonly pool: Pool) {}

  static fromEnv(): PostgresStore | undefined {
    if (!process.env.DATABASE_URL) return undefined;
    return new PostgresStore(
      new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
      })
    );
  }

  async listRuns(): Promise<PipelineRun[]> {
    const result = await this.pool.query<RunRow>("select * from runs order by created_at desc limit 100");
    return Promise.all(result.rows.map((row) => this.hydrateRun(row)));
  }

  async getRun(runId: string): Promise<PipelineRun | undefined> {
    const result = await this.pool.query<RunRow>("select * from runs where id = $1", [runId]);
    const row = result.rows[0];
    return row ? this.hydrateRun(row) : undefined;
  }

  async saveRun(run: PipelineRun): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `
          insert into runs (id, status, goal, input, research_brief, created_at, updated_at)
          values ($1, $2, $3, $4, $5, $6, $7)
          on conflict (id) do update set
            status = excluded.status,
            goal = excluded.goal,
            research_brief = excluded.research_brief,
            updated_at = excluded.updated_at
        `,
        [run.id, run.status, run.goal, {}, run.researchBrief ?? null, run.createdAt, run.updatedAt]
      );

      await client.query("delete from research_sources where run_id = $1", [run.id]);
      const researchSources = collectResearchSourceRecords(run.id, run.researchBrief);
      for (const source of researchSources) {
        await client.query(
          `
            insert into research_sources (id, run_id, source_type, source_url, uploaded_asset_id, evidence_note)
            values ($1, $2, $3, $4, $5, $6)
          `,
          [source.id, source.runId, source.sourceType, source.sourceUrl ?? null, source.uploadedAssetId ?? null, source.evidenceNote]
        );
      }

      for (const draft of run.drafts) {
        await client.query(
          `
            insert into social_drafts (id, run_id, platform, status, hook, caption, image_prompt, video_spec, brand_review)
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            on conflict (id) do update set
              status = excluded.status,
              hook = excluded.hook,
              caption = excluded.caption,
              image_prompt = excluded.image_prompt,
              video_spec = excluded.video_spec,
              brand_review = excluded.brand_review,
              updated_at = now()
          `,
          [
            draft.id,
            draft.runId,
            draft.platform,
            draft.status,
            draft.hook,
            draft.caption,
            draft.imagePrompt ?? null,
            draft.videoSpec ?? null,
            draft.brandReview
          ]
        );
      }

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async appendEvents(events: AgentEvent[]): Promise<void> {
    for (const event of events) {
      await this.pool.query(
        `
          insert into events (id, run_id, agent_id, type, message, metadata, created_at)
          values ($1, $2, $3, $4, $5, $6, $7)
          on conflict (id) do nothing
        `,
        [event.id, event.runId, event.agentId, event.type, event.message, event.metadata ?? {}, event.createdAt]
      );
    }
  }

  async listEvents(runId?: string): Promise<AgentEvent[]> {
    const result = runId
      ? await this.pool.query<EventRow>("select * from events where run_id = $1 order by created_at asc", [runId])
      : await this.pool.query<EventRow>("select * from events order by created_at asc limit 500");

    return result.rows.map((row) => ({
      id: row.id,
      runId: row.run_id,
      agentId: row.agent_id,
      type: row.type,
      message: row.message,
      createdAt: row.created_at.toISOString(),
      metadata: row.metadata ?? undefined
    }));
  }

  async updateDraftStatus(draftId: string, status: ApprovalStatus): Promise<SocialDraft> {
    const result = await this.pool.query<DraftRow>(
      `
        update social_drafts
        set status = $2, updated_at = now()
        where id = $1
        returning *
      `,
      [draftId, status]
    );
    const row = result.rows[0];
    if (!row) throw new Error(`Unknown draft: ${draftId}`);

    await this.pool.query("insert into approvals (draft_id, status) values ($1, $2)", [draftId, status]);
    await this.syncRunStatus(row.run_id);
    return mapDraft(row);
  }

  private async hydrateRun(row: RunRow): Promise<PipelineRun> {
    const drafts = await this.pool.query<DraftRow>("select * from social_drafts where run_id = $1 order by created_at asc", [row.id]);
    return {
      id: row.id,
      status: row.status,
      goal: row.goal,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      researchBrief: row.research_brief ?? undefined,
      drafts: drafts.rows.map(mapDraft)
    };
  }

  private async syncRunStatus(runId: string): Promise<void> {
    const result = await this.pool.query<{ pending_count: string; rejected_count: string }>(
      `
        select
          count(*) filter (where status = 'pending') as pending_count,
          count(*) filter (where status = 'rejected') as rejected_count
        from social_drafts
        where run_id = $1
      `,
      [runId]
    );
    const counts = result.rows[0];
    if (!counts || Number(counts.pending_count) > 0) return;

    const nextStatus = Number(counts.rejected_count) > 0 ? "awaiting_approval" : "completed";
    await this.pool.query("update runs set status = $2, updated_at = now() where id = $1", [runId, nextStatus]);
  }
}

function mapDraft(row: DraftRow): SocialDraft {
  return {
    id: row.id,
    runId: row.run_id,
    platform: row.platform,
    status: row.status,
    hook: row.hook,
    caption: row.caption,
    imagePrompt: row.image_prompt ?? undefined,
    videoSpec: row.video_spec ?? undefined,
    brandReview: row.brand_review
  };
}
