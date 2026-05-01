import type { AgentEvent, ApprovalStatus, PipelineRun, SocialDraft } from "@social-agents/shared";

export interface RunStore {
  listRuns(): Promise<PipelineRun[]>;
  getRun(runId: string): Promise<PipelineRun | undefined>;
  saveRun(run: PipelineRun): Promise<void>;
  appendEvents(events: AgentEvent[]): Promise<void>;
  listEvents(runId?: string): Promise<AgentEvent[]>;
  updateDraftStatus(draftId: string, status: ApprovalStatus): Promise<SocialDraft>;
}

export class InMemoryStore {
  private runs = new Map<string, PipelineRun>();
  private events: AgentEvent[] = [];

  async listRuns(): Promise<PipelineRun[]> {
    return [...this.runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getRun(runId: string): Promise<PipelineRun | undefined> {
    return this.runs.get(runId);
  }

  async saveRun(run: PipelineRun): Promise<void> {
    this.runs.set(run.id, run);
  }

  async appendEvents(events: AgentEvent[]): Promise<void> {
    this.events.push(...events);
  }

  async listEvents(runId?: string): Promise<AgentEvent[]> {
    return this.events
      .filter((event) => (runId ? event.runId === runId : true))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async updateDraftStatus(draftId: string, status: ApprovalStatus): Promise<SocialDraft> {
    for (const run of this.runs.values()) {
      const draft = run.drafts.find((candidate) => candidate.id === draftId);
      if (!draft) continue;

      draft.status = status;
      run.updatedAt = new Date().toISOString();
      if (run.drafts.every((candidate) => candidate.status !== "pending")) {
        run.status = run.drafts.every((candidate) => candidate.status === "approved") ? "completed" : "awaiting_approval";
      }
      return draft;
    }

    throw new Error(`Unknown draft: ${draftId}`);
  }
}

export const store = new InMemoryStore();
