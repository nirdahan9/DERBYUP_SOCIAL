import { createServer } from "node:http";
import { URL } from "node:url";
import { runSocialPipeline } from "@social-agents/agents";
import type { BrandGuideline, ContentAngle } from "@social-agents/shared";
import { agentStore, agentStoreKind } from "./agentStore.js";
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
      const result = await runSocialPipeline({
        goal: body.goal ?? "Create a weekly social content pack",
        platforms: body.platforms?.length ? body.platforms : defaultPlatforms,
        brand: body.brand ?? defaultBrand,
        manualSources: body.manualSources ?? []
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
