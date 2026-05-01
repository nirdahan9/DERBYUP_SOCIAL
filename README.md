# Social Agent Control Plane

Paperclip-inspired control plane for social media agents, brand governance, and Remotion video generation.

This repository is intentionally separate from any existing dashboard or Railway project. The MVP starts with a local-first API, deterministic mocked agent execution, a PostgreSQL schema, agent skill definitions, and a React admin UI scaffold.

## Quick Start

```bash
pnpm install
pnpm dev
```

API defaults to `http://localhost:4100`. The web app defaults to Vite's dev server.

## MVP Pipeline

```text
Research -> Strategy -> Brand Guideline Review -> Creative -> Packager -> Approval
```

The Research V1 contract does not perform aggressive scraping. Every insight must be evidence-backed with a source URL or uploaded asset, otherwise it is marked as a hypothesis.

## Important Packages

- `apps/api`: Node HTTP API, in-memory MVP store, worker entrypoints, PostgreSQL migration.
- `apps/web`: Admin UI for agents, runs, research briefs, and approvals.
- `packages/agents`: Skill loader, agent roster, deterministic task runner, orchestrator.
- `packages/shared`: Shared types and validation.
- `packages/remotion`: Vertical short-form render spec and Remotion composition.

## Next Runtime Steps

1. Create a fresh PostgreSQL database, set `DATABASE_URL`, then run `corepack pnpm --filter @social-agents/api db:migrate`.
2. Copy `.env.example` to `.env` and add only the keys needed for the connector being tested.
3. Run one mocked pipeline via `POST /api/runs`.
4. Replace mocked connector outputs with Serper/YouTube/Gemini implementations one connector at a time.
