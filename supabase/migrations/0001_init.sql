-- ANSRA initial schema: multi-tenant, every table protected by RLS.
create schema if not exists private;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'starter' check (plan in ('starter','growth','managed','agency')),
  white_label jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','editor','viewer','client')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);

create table public.engines (
  key text primary key,
  label text not null,
  enabled boolean not null default true
);
insert into public.engines(key,label) values
 ('chatgpt','ChatGPT'),('gemini','Gemini'),('perplexity','Perplexity'),
 ('claude','Claude'),('naver_ai','네이버 AI 브리핑'),('google_aio','구글 AI 개요');

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, aliases text[] not null default '{}', domain text, vertical text, region text,
  created_at timestamptz not null default now()
);
create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null, aliases text[] not null default '{}', domain text
);
create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  text text not null, topic text, intent text, locale text not null default 'ko-KR',
  tier text not null default 'standard' check (tier in ('core','standard')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  engine_key text not null references public.engines(key),
  scheduled_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz,
  status text not null default 'queued' check (status in ('queued','running','done','failed','skipped')),
  cost_krw numeric(12,2), error_code text
);
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  raw_text text not null, model_version text, captured_at timestamptz not null default now()
);
create table public.mentions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  answer_id uuid not null references public.answers(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  competitor_id uuid references public.competitors(id) on delete set null,
  name text not null, position int, sentiment numeric(3,2), snippet text
);
create table public.citations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  answer_id uuid not null references public.answers(id) on delete cascade,
  url text not null, domain text, title text, is_owned boolean not null default false, rank int
);
create table public.metrics_daily (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  engine_key text not null references public.engines(key),
  date date not null, sample_n int not null default 0, mention_n int not null default 0,
  avg_position numeric(5,2), cited_urls int not null default 0,
  primary key (brand_id, engine_key, date)
);
create table public.contents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete set null,
  title text not null, body_md text not null default '',
  status text not null default 'draft' check (status in ('draft','in_review','approved','published')),
  version int not null default 1, created_at timestamptz not null default now()
);
create table public.compliance_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_id uuid not null references public.contents(id) on delete cascade,
  rulepack text not null, rulepack_version text not null,
  verdict text not null check (verdict in ('pass','warn','block')),
  findings jsonb not null default '[]'::jsonb,
  reviewer_id uuid references auth.users(id) on delete set null, reviewed_at timestamptz not null default now()
);
create table public.bot_hits (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  bot text not null, path text not null, ts timestamptz not null default now()
);
create table public.conversions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  channel text not null, source text, occurred_at timestamptz not null default now()
);
create table public.audit_logs (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor uuid references auth.users(id) on delete set null,
  action text not null, target text, diff jsonb, ts timestamptz not null default now()
);
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null, phone text not null, company text not null, role text,
  consent_privacy_at timestamptz not null, created_at timestamptz not null default now()
);

create index on public.brands(workspace_id);
create index on public.competitors(workspace_id); create index on public.competitors(brand_id);
create index on public.prompts(workspace_id);     create index on public.prompts(brand_id);
create index on public.runs(workspace_id);        create index on public.runs(prompt_id, scheduled_at); create index on public.runs(engine_key);
create index on public.answers(workspace_id);     create index on public.answers(run_id);
create index on public.mentions(workspace_id);    create index on public.mentions(answer_id); create index on public.mentions(brand_id); create index on public.mentions(competitor_id);
create index on public.citations(workspace_id);   create index on public.citations(answer_id);
create index on public.metrics_daily(workspace_id); create index on public.metrics_daily(engine_key);
create index on public.contents(workspace_id);    create index on public.contents(brand_id); create index on public.contents(prompt_id);
create index on public.compliance_reviews(workspace_id); create index on public.compliance_reviews(content_id); create index on public.compliance_reviews(reviewer_id);
create index on public.bot_hits(workspace_id);    create index on public.bot_hits(brand_id, ts);
create index on public.conversions(workspace_id); create index on public.conversions(brand_id, occurred_at);
create index on public.audit_logs(workspace_id);  create index on public.audit_logs(actor);

-- Membership checks live outside the exposed schema.
create function private.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.workspace_id = ws and m.user_id = (select auth.uid()));
$$;
create function private.can_edit(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.workspace_id = ws and m.user_id = (select auth.uid()) and m.role in ('owner','admin','editor'));
$$;
revoke all on function private.is_member(uuid), private.can_edit(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_member(uuid), private.can_edit(uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.engines enable row level security;
alter table public.leads enable row level security;
alter table public.audit_logs enable row level security;

create policy workspaces_read on public.workspaces for select to authenticated using (private.is_member(id));
create policy memberships_read on public.memberships for select to authenticated using (user_id = (select auth.uid()));
create policy engines_read on public.engines for select to authenticated using (true);
create policy audit_read on public.audit_logs for select to authenticated using (private.is_member(workspace_id));
create policy audit_append on public.audit_logs for insert to authenticated with check (private.can_edit(workspace_id) and actor = (select auth.uid()));
-- Leads: the public form may only add a row; nobody reads them through the API.
create policy leads_submit on public.leads for insert to anon, authenticated
  with check (consent_privacy_at is not null and char_length(name) between 1 and 80
              and char_length(phone) between 7 and 20 and char_length(company) between 1 and 120);

do $$
declare t text;
begin
  foreach t in array array['brands','competitors','prompts','runs','answers','mentions','citations',
                           'metrics_daily','contents','compliance_reviews','bot_hits','conversions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (private.is_member(workspace_id))', t||'_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.can_edit(workspace_id))', t||'_add', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.can_edit(workspace_id)) with check (private.can_edit(workspace_id))', t||'_edit', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.can_edit(workspace_id))', t||'_remove', t);
  end loop;
end $$;
