# Railway Setup

This project is a shared pnpm monorepo. Deploy the API as its own Railway service and connect it to the Postgres service through a reference variable.

## 1. Push The Repo

Railway deploys from GitHub, so the local code must be committed and pushed to:

```text
https://github.com/nirdahan9/DERBYUP_SOCIAL.git
```

## 2. Create The API Service

In the same Railway project that already contains `Postgres-Lyl3`:

1. Click `+ New`.
2. Choose `GitHub Repo`.
3. Select `nirdahan9/DERBYUP_SOCIAL`.
4. If Railway detects multiple packages, choose the API service/package.
5. If it asks for commands, use:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @social-agents/api build
corepack pnpm --filter @social-agents/api start
```

Recommended service settings:

- Build command: `corepack pnpm --filter @social-agents/api build`
- Start command: `corepack pnpm --filter @social-agents/api start`
- Watch paths:
  - `/apps/api/**`
  - `/packages/agents/**`
  - `/packages/shared/**`
  - `/packages/remotion/**`
  - `/package.json`
  - `/pnpm-lock.yaml`
  - `/pnpm-workspace.yaml`

Do not set Root Directory to `apps/api` for this shared monorepo, because the API imports workspace packages from `packages/*`.

## 3. Connect API To Postgres

Open the API service in Railway:

1. Go to `Variables`.
2. Add:

```text
DATABASE_URL=${{Postgres-Lyl3.DATABASE_URL}}
DATABASE_SSL=true
```

If Railway renamed the database service differently, use that exact service name in the reference variable.

The API health endpoint will show which store is active:

```text
/api/health
```

Expected after the variable is connected:

```json
{
  "status": "ok",
  "store": "postgres"
}
```

## 4. Run The Migration

After the API service has `DATABASE_URL`, run the migration from Railway or locally with the same variable:

```bash
corepack pnpm --filter @social-agents/api db:migrate
```

This creates:

- agents
- skills
- brand_guidelines
- runs
- tasks
- events
- assets
- research_sources
- social_drafts
- approvals

It also seeds the initial agent roster.

## 5. Continue From VS Code

Open this folder in VS Code:

```bash
code "/Users/dordavid/Documents/New project"
```

Use the VS Code terminal from the repo root:

```bash
corepack pnpm install
corepack pnpm dev:api
corepack pnpm dev:web
```

The conversation itself stays in Codex, but the project state is just files and Git, so continuing from VS Code means editing/running this same folder and pushing changes to GitHub when ready.
