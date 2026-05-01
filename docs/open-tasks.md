# Social Agent Control Plane - Open Tasks

Last updated: 2026-05-02

## Current State

- Repo is initialized locally at `/Users/dordavid/Documents/New project`.
- Git remote is connected to `https://github.com/nirdahan9/DERBYUP_SOCIAL.git`.
- Monorepo scaffold exists with API, Web, Shared, Agents, and Remotion packages.
- Agent skills use the requested markdown/frontmatter structure.
- PostgreSQL migration exists and is ready for the Railway database.
- API can use PostgreSQL when `DATABASE_URL` is set, otherwise it falls back to memory.
- Agent tasks use Groq through `GROQ_API_KEY` when configured, otherwise they fall back to deterministic mocks.
- Serper connector can feed public search evidence into Research Agent when `SERPER_API_KEY` is configured.
- YouTube connector can feed public video evidence into Research Agent when `YOUTUBE_API_KEY` is configured.
- `typecheck`, `build`, and `test` pass locally.
- API supports per-agent status, model, and monthly budget updates.
- DerbyUp default competitor sources are configured for Research Agent runs.

## Priority 0 - GitHub And Railway

- [ ] Commit the current project files.
- [ ] Push the first commit to `main`.
- [ ] Create/connect a Railway API service from `nirdahan9/DERBYUP_SOCIAL`.
- [ ] Configure API service build command:
  `corepack pnpm --filter @social-agents/api build`
- [ ] Configure API service start command:
  `corepack pnpm --filter @social-agents/api start`
- [ ] Add Railway API variables:
  - `DATABASE_URL=${{Postgres-Lyl3.DATABASE_URL}}`
  - `DATABASE_SSL=true`
- [ ] Run DB migration:
  `corepack pnpm --filter @social-agents/api db:migrate`
- [ ] Verify `/api/health` returns `store: "postgres"`.

## Priority 1 - Database Persistence

- [x] Create initial schema for agents, skills, runs, tasks, events, assets, research sources, drafts, approvals, and brand guidelines.
- [x] Seed default agent roster in migration.
- [x] Add PostgreSQL store for runs, drafts, events, and approvals.
- [x] Add migration history table so future migrations are tracked safely.
- [x] Persist research evidence into `research_sources`, not only inside `runs.research_brief`.
- [x] Persist task-level records for each agent step.
- [x] Add DB-backed agent roster endpoint instead of returning static roster only.

## Priority 2 - Agent System

- [x] Create first 10 agents:
  - CMO Orchestrator
  - Research Agent
  - Strategy Agent
  - Brand Guideline Agent
  - Creative Content Agent
  - Visual Agent
  - Video Agent
  - SEO/GEO Agent
  - Packager Agent
  - Publisher Agent
- [x] Convert agent skill files to the requested `name`, `description`, `metadata.version` structure.
- [x] Add skill loader support for nested `metadata.version`.
- [x] Load agent skills at runtime and expose them through an API endpoint.
- [x] Add agent enable/disable updates from API.
- [x] Add Groq-only LLM provider with mock fallback when `GROQ_API_KEY` is absent.
- [x] Add model and budget configuration per agent.
- [ ] Add heartbeat schedules for recurring agent work.

## Priority 3 - Research V1

- [x] Define approved source policy and hypothesis rules.
- [x] Validate research insights so unsupported claims are marked as hypotheses.
- [x] Implement Serper connector.
- [x] Feed Serper public search evidence into Research Agent briefs.
- [x] Implement YouTube Data API connector.
- [x] Feed YouTube Data API evidence into Research Agent briefs.
- [x] Add manual competitor URL ingestion.
- [x] Validate manual research source URLs before creating a run.
- [x] Configure DerbyUp default competitor source list.
- [ ] Add uploaded screenshot/export ingestion.
- [ ] Add Google Drive connector later.
- [ ] Add UI for entering manual research sources before creating a run.

## Priority 4 - Pipeline And Drafts

- [x] Implement mocked pipeline:
  `Research -> Strategy -> Brand Review -> Creative -> Packager`
- [x] Create pending social drafts.
- [x] Add approve/reject endpoints.
- [ ] Add edit draft endpoint.
- [ ] Add regenerate draft endpoint.
- [ ] Add SEO/GEO step into the active orchestrator sequence.
- [ ] Add Visual Agent output as a separate tracked step.
- [ ] Add Video Agent output as a separate tracked step.
- [ ] Add manual export endpoint for approved drafts.

## Priority 5 - Admin UI

- [x] Create first dashboard with agent roster, runs, research brief, drafts, and events.
- [ ] Add form for custom campaign goal.
- [ ] Add platform selector.
- [ ] Add manual source URL input.
- [ ] Add brand guideline editor.
- [ ] Add draft edit modal.
- [ ] Add run detail page.
- [ ] Add loading/error states.
- [ ] Add Railway production API URL support via `VITE_API_BASE_URL`.

## Priority 6 - Remotion Video

- [x] Create `ShortVideoRenderSpec`.
- [x] Create `ShortSocialVideo` Remotion composition.
- [x] Create render plan helper.
- [ ] Add real Remotion render command/worker.
- [ ] Add sample render spec fixture.
- [ ] Add smoke test that renders a short MP4.
- [ ] Store rendered video assets in object storage.

## Priority 7 - Connectors And Secrets

- [ ] Add `.env` locally from `.env.example`.
- [ ] Add `GROQ_API_KEY` or `OPENAI_API_KEY`.
- [ ] Add `SERPER_API_KEY`.
- [ ] Add `YOUTUBE_API_KEY`.
- [ ] Add `GEMINI_API_KEY`.
- [ ] Keep publishing tokens disabled until approval flow is stable.

## Priority 8 - Production Readiness

- [ ] Add auth/admin protection.
- [ ] Add structured logging.
- [ ] Add request validation.
- [ ] Add API tests for runs, events, and approvals.
- [ ] Add DB integration tests.
- [ ] Add error handling for failed agent steps.
- [ ] Add rate limits and connector timeouts.
- [ ] Add cost tracking per run and agent.

## Recommended Next Session Order

1. Commit and push the current code to GitHub.
2. Connect Railway API service to the GitHub repo.
3. Add `DATABASE_URL` reference variable to the API service.
4. Run the migration.
5. Verify Postgres persistence with one pipeline run.
6. Add custom run form in the UI.
7. Implement Serper connector.
