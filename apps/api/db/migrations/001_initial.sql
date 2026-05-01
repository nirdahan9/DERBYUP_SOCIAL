do $$
begin
  create type agent_status as enum ('enabled', 'disabled', 'paused');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type run_status as enum ('queued', 'running', 'awaiting_approval', 'completed', 'failed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type task_status as enum ('queued', 'running', 'completed', 'failed', 'skipped');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type approval_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists agents (
  id text primary key,
  role text not null,
  title text not null,
  reports_to text references agents(id),
  status agent_status not null default 'disabled',
  budget_cents_monthly integer not null default 0,
  model text not null,
  capabilities jsonb not null default '[]'::jsonb,
  skill_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists skills (
  id text primary key,
  title text not null,
  description text not null default '',
  capabilities jsonb not null default '[]'::jsonb,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists brand_guidelines (
  id text primary key,
  name text not null,
  voice jsonb not null default '[]'::jsonb,
  visual_rules jsonb not null default '[]'::jsonb,
  required_claims jsonb not null default '[]'::jsonb,
  banned_claims jsonb not null default '[]'::jsonb,
  preferred_words jsonb not null default '[]'::jsonb,
  banned_words jsonb not null default '[]'::jsonb,
  colors jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists runs (
  id text primary key,
  status run_status not null default 'queued',
  goal text not null,
  input jsonb not null default '{}'::jsonb,
  research_brief jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  agent_id text not null references agents(id),
  status task_status not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id text primary key,
  run_id text references runs(id) on delete cascade,
  agent_id text references agents(id),
  type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id text primary key,
  kind text not null,
  source_type text not null,
  url text,
  storage_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists research_sources (
  id text primary key,
  run_id text references runs(id) on delete cascade,
  source_type text not null,
  source_url text,
  uploaded_asset_id text references assets(id),
  evidence_note text not null,
  created_at timestamptz not null default now(),
  constraint research_sources_have_source check (
    source_type = 'hypothesis'
    or source_url is not null
    or uploaded_asset_id is not null
  )
);

create table if not exists social_drafts (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  platform text not null,
  status approval_status not null default 'pending',
  hook text not null,
  caption text not null,
  image_prompt text,
  video_spec jsonb,
  brand_review jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists approvals (
  id text primary key default ('approval_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 8)),
  draft_id text not null references social_drafts(id) on delete cascade,
  status approval_status not null,
  actor text not null default 'admin',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists events_run_id_created_at_idx on events(run_id, created_at);
create index if not exists tasks_run_id_idx on tasks(run_id);
create index if not exists social_drafts_run_id_idx on social_drafts(run_id);
create index if not exists research_sources_run_id_idx on research_sources(run_id);

insert into agents (id, role, title, reports_to, status, budget_cents_monthly, model, capabilities, skill_path)
values
  ('cmo-orchestrator', 'orchestrator', 'CMO Orchestrator', null, 'enabled', 5000, 'llama-3.3-70b-versatile', '["pipeline_control","budget_guardrails","approval_gates"]', 'packages/agents/skills/cmo-orchestrator.md'),
  ('research-agent', 'research', 'Evidence Research Agent', 'cmo-orchestrator', 'enabled', 4000, 'llama-3.3-70b-versatile', '["serper_search","youtube_api","manual_sources","evidence_briefs"]', 'packages/agents/skills/research-agent.md'),
  ('strategy-agent', 'strategy', 'Platform Strategy Agent', 'cmo-orchestrator', 'enabled', 3000, 'llama-3.3-70b-versatile', '["content_angles","platform_planning","campaign_briefs"]', 'packages/agents/skills/strategy-agent.md'),
  ('brand-guideline-agent', 'brand', 'Brand Guideline Agent', 'cmo-orchestrator', 'enabled', 2500, 'llama-3.3-70b-versatile', '["voice_review","claim_review","visual_rules","brand_fit"]', 'packages/agents/skills/brand-guideline-agent.md'),
  ('creative-content-agent', 'creative', 'Hebrew Creative Content Agent', 'strategy-agent', 'enabled', 3500, 'llama-3.3-70b-versatile', '["captions","hooks","short_scripts","hebrew_copy"]', 'packages/agents/skills/creative-content-agent.md'),
  ('visual-agent', 'visual', 'Visual Prompt Agent', 'creative-content-agent', 'enabled', 3500, 'llama-3.3-70b-versatile', '["imagen_prompts","asset_direction","thumbnail_prompts"]', 'packages/agents/skills/visual-agent.md'),
  ('video-agent', 'video', 'Remotion Video Agent', 'creative-content-agent', 'enabled', 3500, 'llama-3.3-70b-versatile', '["render_specs","captions","vertical_video"]', 'packages/agents/skills/video-agent.md'),
  ('seo-geo-agent', 'seo_geo', 'SEO/GEO Agent', 'strategy-agent', 'enabled', 2000, 'llama-3.3-70b-versatile', '["hashtags","keywords","location_context"]', 'packages/agents/skills/seo-geo-agent.md'),
  ('packager-agent', 'packager', 'Draft Packager Agent', 'cmo-orchestrator', 'enabled', 1500, 'llama-3.3-70b-versatile', '["draft_json","approval_payloads","manual_export"]', 'packages/agents/skills/packager-agent.md'),
  ('publisher-agent', 'publisher', 'Manual Publisher Agent', 'cmo-orchestrator', 'disabled', 0, 'llama-3.3-70b-versatile', '["manual_export","publishing_later"]', 'packages/agents/skills/publisher-agent.md')
on conflict (id) do nothing;
