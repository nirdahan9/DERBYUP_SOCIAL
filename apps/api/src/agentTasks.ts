import type { AgentEvent, AgentTask } from "@social-agents/shared";

export function collectAgentTaskRecords(events: AgentEvent[]): AgentTask[] {
  const tasks: AgentTask[] = [];
  const openTasks = new Map<string, AgentTask[]>();

  for (const event of events) {
    if (event.type === "task_started") {
      const task: AgentTask = {
        id: `task_${event.id}`,
        runId: event.runId,
        agentId: event.agentId,
        status: "running",
        input: event.metadata ?? {},
        startedAt: event.createdAt,
        createdAt: event.createdAt
      };

      tasks.push(task);
      const key = taskKey(event);
      openTasks.set(key, [...(openTasks.get(key) ?? []), task]);
      continue;
    }

    if (event.type === "task_completed") {
      const key = taskKey(event);
      const queue = openTasks.get(key) ?? [];
      const task = queue.shift();
      if (!task) continue;

      task.status = "completed";
      task.output = event.metadata ?? { message: event.message };
      task.completedAt = event.createdAt;
      openTasks.set(key, queue);
    }
  }

  return tasks;
}

function taskKey(event: AgentEvent): string {
  return `${event.runId}:${event.agentId}`;
}
