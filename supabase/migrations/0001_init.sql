-- WebSentinel initial schema
-- Apply with: supabase db push  (or paste into the Supabase SQL editor)

create table if not exists projects (
  id text primary key,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists sources (
  id text primary key,
  project_id text not null references projects(id),
  name text not null,
  url text not null,
  description text not null default '',
  status text not null default 'pending',
  expected_fields jsonb not null default '[]',
  record_count integer not null default 0,
  health_score numeric not null default 0,
  previous_record_count integer,
  previous_health_score numeric,
  last_run_at timestamptz,
  last_success_at timestamptz,
  self_heals integer not null default 0,
  sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists collectors (
  id text primary key,
  source_id text not null references sources(id),
  -- Real Bright Data collector id, e.g. c_xxxxxxxxx
  collector_id text,
  name text not null default '',
  description text not null default '',
  fields jsonb not null default '[]',
  status text not null default 'creating',
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists runs (
  id text primary key,
  source_id text not null references sources(id),
  collector_row_id text not null,
  collector_id text,
  status text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  record_count integer not null default 0,
  health_score numeric not null default 0,
  field_presence jsonb not null default '{}',
  error text,
  records jsonb not null default '[]',
  simulated boolean not null default false,
  cli_exit_code integer,
  cli_error text,
  created_at timestamptz not null default now()
);

create table if not exists heal_events (
  id text primary key,
  source_id text not null references sources(id),
  source_name text not null,
  collector_id text,
  run_id text,
  detected_at timestamptz not null default now(),
  failure_type text not null,
  stage text not null,
  before_count integer not null default 0,
  before_health numeric not null default 0,
  after_count integer,
  after_health numeric,
  diagnosis text,
  confidence numeric,
  affected_fields jsonb not null default '[]',
  recommended_action text,
  repair_preview text,
  repair_engine text,
  verified boolean not null default false,
  simulated boolean not null default false,
  schedule jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists activities (
  id text primary key,
  type text not null,
  level text not null default 'info',
  title text not null,
  message text not null default '',
  source_name text,
  at timestamptz not null default now(),
  simulated boolean not null default false
);

create table if not exists datasets (
  source_id text primary key references sources(id),
  records jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
