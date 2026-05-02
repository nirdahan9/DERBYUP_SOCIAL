import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Check, Play, RefreshCw, X } from "lucide-react";
import type { AgentDefinition, AgentEvent, PipelineRun, ResearchInsight, SocialDraft } from "@social-agents/shared";
import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? "" : "http://localhost:4100");

function App() {
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();
  const selectedRun = useMemo(() => runs.find((run) => run.id === selectedRunId) ?? runs[0], [runs, selectedRunId]);

  async function refresh() {
    const [agentsResponse, runsResponse, eventsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/agents`),
      fetch(`${apiBaseUrl}/api/runs`),
      fetch(`${apiBaseUrl}/api/events${selectedRunId ? `?runId=${selectedRunId}` : ""}`)
    ]);
    setAgents((await agentsResponse.json()).agents);
    const nextRuns = (await runsResponse.json()).runs;
    setRuns(nextRuns);
    setEvents((await eventsResponse.json()).events);
    if (!selectedRunId && nextRuns[0]) setSelectedRunId(nextRuns[0].id);
  }

  async function createRun() {
    await fetch(`${apiBaseUrl}/api/runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        goal: "Create an evidence-backed weekly social pack",
        platforms: ["linkedin", "instagram", "tiktok"],
        manualSources: []
      })
    });
    await refresh();
  }

  async function updateDraft(draft: SocialDraft, action: "approve" | "reject") {
    await fetch(`${apiBaseUrl}/api/drafts/${draft.id}/${action}`, { method: "POST" });
    await refresh();
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Social Agent Control Plane</p>
          <h1>חברת אייגנטים לסושיאל, מותג ווידאו</h1>
        </div>
        <div className="actions">
          <button className="iconButton" onClick={refresh} title="Refresh">
            <RefreshCw size={18} />
          </button>
          <button className="primaryButton" onClick={createRun}>
            <Play size={18} />
            הרץ פייפליין
          </button>
        </div>
      </header>

      <section className="layout">
        <aside className="panel roster">
          <h2>Agents</h2>
          {agents.map((agent) => (
            <div className="agentRow" key={agent.id}>
              <div>
                <strong>{agent.title}</strong>
                <span>{agent.role}</span>
              </div>
              <small className={agent.status}>{agent.status}</small>
            </div>
          ))}
        </aside>

        <section className="workspace">
          <div className="panel runStrip">
            <h2>Runs</h2>
            <div className="runButtons">
              {runs.map((run) => (
                <button className={run.id === selectedRun?.id ? "selected" : ""} key={run.id} onClick={() => setSelectedRunId(run.id)}>
                  {run.status}
                  <span>{run.goal}</span>
                </button>
              ))}
              {runs.length === 0 ? <p className="empty">אין runs עדיין. לחץ על הרץ פייפליין.</p> : null}
            </div>
          </div>

          {selectedRun ? (
            <div className="grid">
              <ResearchBriefView run={selectedRun} />
              <DraftsView drafts={selectedRun.drafts} onAction={updateDraft} />
              <EventsView events={events.filter((event) => event.runId === selectedRun.id)} />
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function ResearchBriefView({ run }: { run: PipelineRun }) {
  const brief = run.researchBrief;
  if (!brief) return <section className="panel">No research brief yet.</section>;

  const insights = [...brief.marketSignals, ...brief.audienceInsights, ...brief.competitorPatterns, ...brief.riskFlags];
  return (
    <section className="panel">
      <h2>Research Brief</h2>
      <div className="insightList">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </section>
  );
}

function InsightCard({ insight }: { insight: ResearchInsight }) {
  return (
    <article className="insight">
      <div className="insightHeader">
        <strong>{insight.insight}</strong>
        <small>{insight.confidence}</small>
      </div>
      <p>{insight.recommendedAction}</p>
      {insight.evidence.map((evidence) => (
        <div className="source" key={`${evidence.sourceType}-${evidence.sourceUrl ?? evidence.uploadedAssetId ?? evidence.evidenceNote}`}>
          <span>{evidence.sourceType}</span>
          <p>{evidence.evidenceNote}</p>
        </div>
      ))}
    </article>
  );
}

function DraftsView({ drafts, onAction }: { drafts: SocialDraft[]; onAction: (draft: SocialDraft, action: "approve" | "reject") => void }) {
  return (
    <section className="panel">
      <h2>Draft Approval</h2>
      <div className="draftList">
        {drafts.map((draft) => (
          <article className="draft" key={draft.id}>
            <div className="draftHeader">
              <strong>{draft.platform}</strong>
              <small>{draft.status}</small>
            </div>
            <p className="caption">{draft.caption}</p>
            <p className={draft.brandReview.passed ? "pass" : "needsEdit"}>
              Brand: {draft.brandReview.passed ? "pass" : draft.brandReview.requiredEdits.join(", ")}
            </p>
            <div className="actions">
              <button className="iconButton" onClick={() => onAction(draft, "approve")} title="Approve">
                <Check size={18} />
              </button>
              <button className="iconButton danger" onClick={() => onAction(draft, "reject")} title="Reject">
                <X size={18} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EventsView({ events }: { events: AgentEvent[] }) {
  return (
    <section className="panel events">
      <h2>Live Work Feed</h2>
      {events.map((event) => (
        <div className="event" key={event.id}>
          <span>{event.agentId}</span>
          <p>{event.message}</p>
        </div>
      ))}
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
