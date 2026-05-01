import { createServer } from "node:http";
import { URL } from "node:url";
import { runSocialPipeline } from "@social-agents/agents";
import { normalizeManualSourceUrls } from "@social-agents/shared";
import type { AgentStatus, BrandGuideline, ContentAngle } from "@social-agents/shared";
import { agentStore, agentStoreKind, isAgentStatus, parseAgentConfigUpdate } from "./agentStore.js";
import { defaultBrand, defaultPlatforms } from "./defaults.js";
import { readJson, sendError, sendJson } from "./http.js";
import { runStore, storeKind } from "./runStore.js";
import { getAgentSkill, listAgentSkills } from "./skillStore.js";

interface CreateRunBody {
  goal?: string;
  platforms?: ContentAngle["platform"][];
  brand?: BrandGuideline;
  manualSources?: string[];
}

interface UpdateAgentStatusBody {
  status?: AgentStatus;
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    const url = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { status: "ok", store: storeKind });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/agents") {
      sendJson(response, 200, { agents: await agentStore.listAgents(), store: agentStoreKind });
      return;
    }

    if (request.method === "PATCH" && url.pathname.match(/^\/api\/agents\/[^/]+\/status$/)) {
      const [, apiSegment, agentsSegment, agentId, statusSegment] = url.pathname.split("/");
      if (apiSegment !== "api" || agentsSegment !== "agents" || statusSegment !== "status") {
        sendJson(response, 404, { error: "Not found." });
        return;
      }
      if (!agentId) {
        sendJson(response, 400, { error: "Missing agent id." });
        return;
      }

      const body = await readJson<UpdateAgentStatusBody>(request);
      if (!isAgentStatus(body.status)) {
        sendJson(response, 400, { error: "Invalid agent status." });
        return;
      }

      let agent;
      try {
        agent = await agentStore.updateAgentStatus(agentId, body.status);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Unknown agent:")) {
          sendJson(response, 404, { error: "Agent not found." });
          return;
        }
        throw error;
      }

      sendJson(response, 200, { agent, store: agentStoreKind });
      return;
    }

    if (request.method === "PATCH" && url.pathname.match(/^\/api\/agents\/[^/]+\/config$/)) {
      const [, apiSegment, agentsSegment, agentId, configSegment] = url.pathname.split("/");
      if (apiSegment !== "api" || agentsSegment !== "agents" || configSegment !== "config") {
        sendJson(response, 404, { error: "Not found." });
        return;
      }
      if (!agentId) {
        sendJson(response, 400, { error: "Missing agent id." });
        return;
      }

      const config = parseAgentConfigUpdate(await readJson<unknown>(request));
      if (!config) {
        sendJson(response, 400, { error: "Invalid agent config." });
        return;
      }

      let agent;
      try {
        agent = await agentStore.updateAgentConfig(agentId, config);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Unknown agent:")) {
          sendJson(response, 404, { error: "Agent not found." });
          return;
        }
        throw error;
      }

      sendJson(response, 200, { agent, store: agentStoreKind });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/skills") {
      sendJson(response, 200, { skills: await listAgentSkills() });
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/skills/")) {
      const agentId = url.pathname.split("/")[3];
      if (!agentId) {
        sendJson(response, 400, { error: "Missing agent id." });
        return;
      }
      const skill = await getAgentSkill(agentId);
      if (!skill) {
        sendJson(response, 404, { error: "Skill not found." });
        return;
      }
      sendJson(response, 200, { skill });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/runs") {
      sendJson(response, 200, { runs: await runStore.listRuns() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/runs") {
      const body = await readJson<CreateRunBody>(request);
      const manualSources = normalizeManualSourceUrls(body.manualSources);
      if (manualSources.errors.length > 0) {
        sendJson(response, 400, { error: "Invalid manual sources.", details: manualSources.errors });
        return;
      }

      const result = await runSocialPipeline({
        goal: body.goal ?? "Create a weekly social content pack",
        platforms: body.platforms?.length ? body.platforms : defaultPlatforms,
        brand: body.brand ?? defaultBrand,
        manualSources: manualSources.sources
      });

      await runStore.saveRun(result.run);
      await runStore.appendEvents(result.events);
      sendJson(response, 201, result);
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/runs/")) {
      const runId = url.pathname.split("/")[3];
      if (!runId) {
        sendJson(response, 400, { error: "Missing run id." });
        return;
      }
      const run = await runStore.getRun(runId);
      if (!run) {
        sendJson(response, 404, { error: "Run not found." });
        return;
      }
      sendJson(response, 200, { run });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/events") {
      sendJson(response, 200, { events: await runStore.listEvents(url.searchParams.get("runId") ?? undefined) });
      return;
    }

    if (request.method === "POST" && url.pathname.match(/^\/api\/drafts\/[^/]+\/(approve|reject)$/)) {
      const [, apiSegment, draftsSegment, draftId, action] = url.pathname.split("/");
      if (apiSegment !== "api" || draftsSegment !== "drafts") {
        sendJson(response, 404, { error: "Not found." });
        return;
      }
      if (!draftId || !action) {
        sendJson(response, 400, { error: "Missing draft id or action." });
        return;
      }
      const draft = await runStore.updateDraftStatus(draftId, action === "approve" ? "approved" : "rejected");
      sendJson(response, 200, { draft });
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    sendError(response, 500, error);
  }
});

const port = Number(process.env.PORT ?? 4100);
const host = process.env.HOST ?? (process.env.RAILWAY_ENVIRONMENT ? "0.0.0.0" : "127.0.0.1");
server.listen(port, host, () => {
  console.log(`Social Agent API listening on http://${host}:${port}`);
});
