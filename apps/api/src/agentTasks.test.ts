import test from "node:test";
import assert from "node:assert/strict";
import { collectAgentTaskRecords } from "./agentTasks.js";
import type { AgentEvent } from "@social-agents/shared";

test("collects task records from started and completed events", () => {
  const events: AgentEvent[] = [
    event("evt_1", "research-agent", "task_started", "Research started", "2026-05-01T08:00:00.000Z", {
      sourcePolicy: "approved_only"
    }),
    event("evt_2", "research-agent", "task_completed", "Research completed", "2026-05-01T08:00:05.000Z", {
      sections: ["marketSignals"]
    }),
    event("evt_3", "strategy-agent", "task_started", "Strategy started", "2026-05-01T08:00:06.000Z"),
    event("evt_4", "strategy-agent", "task_completed", "Strategy completed", "2026-05-01T08:00:07.000Z", { count: 2 })
  ];

  const tasks = collectAgentTaskRecords(events);

  assert.equal(tasks.length, 2);
  assert.deepEqual(tasks[0], {
    id: "task_evt_1",
    runId: "run_123",
    agentId: "research-agent",
    status: "completed",
    input: { sourcePolicy: "approved_only" },
    output: { sections: ["marketSignals"] },
    startedAt: "2026-05-01T08:00:00.000Z",
    completedAt: "2026-05-01T08:00:05.000Z",
    createdAt: "2026-05-01T08:00:00.000Z"
  });
  assert.equal(tasks[1]?.id, "task_evt_3");
  assert.equal(tasks[1]?.status, "completed");
  assert.deepEqual(tasks[1]?.output, { count: 2 });
});

test("keeps unpaired started events as running tasks", () => {
  const tasks = collectAgentTaskRecords([
    event("evt_1", "video-agent", "task_started", "Render started", "2026-05-01T08:00:00.000Z", { draftId: "draft_1" })
  ]);

  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.status, "running");
  assert.equal(tasks[0]?.completedAt, undefined);
});

test("ignores completed events that have no matching start", () => {
  const tasks = collectAgentTaskRecords([
    event("evt_1", "research-agent", "task_completed", "Research completed", "2026-05-01T08:00:00.000Z")
  ]);

  assert.deepEqual(tasks, []);
});

function event(
  id: string,
  agentId: string,
  type: AgentEvent["type"],
  message: string,
  createdAt: string,
  metadata?: Record<string, unknown>
): AgentEvent {
  return {
    id,
    runId: "run_123",
    agentId,
    type,
    message,
    createdAt,
    metadata
  };
}
