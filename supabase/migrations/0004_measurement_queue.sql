-- Measurement queue. runs.status 'queued' is the queue; a worker claims one run at a time, calls the engine, and reports back.
-- Two kinds of caller use the same functions: a signed-in editor (own workspace only) and the scheduled worker,
-- which has no user session and proves itself with a secret kept in private.worker_config (never exposed through the API).
-- claim_run:         takes the oldest waiting run for the given engines and marks it running. Runs stuck in 'running' for 5 minutes are taken again.
-- complete_run:      stores the answer, mentions and citations of a claimed run (or its failure) and refreshes that day's metrics.
-- enqueue_scheduled: worker only. Queues today's runs for brands set to daily measurement that have not been measured today (KST).
-- scheduler_active:  whether scheduled measurement has been switched on (see supabase/ops/activate_scheduler.sql).
alter table public.brands add column schedule text not null default 'off' check (schedule in ('off','daily'));
create index runs_waiting on public.runs(scheduled_at) where status in ('queued','running');

create table private.worker_config (id boolean primary key default true check (id), secret text, url text);
insert into private.worker_config default values;
alter table private.worker_config enable row level security;  -- no policies: only the functions below (owner rights) read it
revoke all on private.worker_config from public, anon, authenticated;

create function private.is_worker(candidate text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(char_length(candidate) >= 32 and candidate = (select c.secret from private.worker_config c), false);
$$;
revoke all on function private.is_worker(text) from public, anon, authenticated;

create function public.scheduler_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.worker_config c where c.url is not null and c.secret is not null);
$$;
revoke all on function public.scheduler_active() from public, anon;
grant execute on function public.scheduler_active() to authenticated;

create function public.claim_run(worker_secret text, engine_keys text[], target_ws uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if not private.is_worker(worker_secret) and (target_ws is null or not private.can_edit(target_ws)) then
    raise exception 'not allowed';
  end if;
  select ru.id, ru.engine_key, p.text, p.brand_id into r
  from public.runs ru join public.prompts p on p.id = ru.prompt_id
  where (ru.status = 'queued' or (ru.status = 'running' and ru.started_at < now() - interval '5 minutes'))
    and ru.engine_key = any(engine_keys)
    and (target_ws is null or ru.workspace_id = target_ws)
  order by ru.scheduled_at, ru.id limit 1 for update of ru skip locked;
  if not found then return null; end if;
  update public.runs set status = 'running', started_at = now() where id = r.id;
  return jsonb_build_object('run_id', r.id, 'engine', r.engine_key, 'prompt', r.text,
    'brand', (select jsonb_build_object('id', b.id, 'name', b.name, 'aliases', b.aliases, 'domain', b.domain) from public.brands b where b.id = r.brand_id),
    'competitors', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'aliases', c.aliases)) from public.competitors c where c.brand_id = r.brand_id), '[]'::jsonb));
end $$;

create function public.complete_run(worker_secret text, target_run uuid, result jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare r record; aid uuid := gen_random_uuid();
begin
  select ru.id, ru.workspace_id, ru.status, p.brand_id into r
  from public.runs ru join public.prompts p on p.id = ru.prompt_id where ru.id = target_run for update of ru;
  if not found then return; end if;
  if not private.is_worker(worker_secret) and not private.can_edit(r.workspace_id) then raise exception 'not allowed'; end if;
  if r.status <> 'running' then return; end if;  -- already reported (a stuck run that was taken again)
  if result->>'status' is distinct from 'done' or coalesce(result->>'text', '') = '' then
    update public.runs set status = 'failed', finished_at = now(), error_code = left(coalesce(result->>'error_code', 'unknown'), 40) where id = r.id;
    return;
  end if;
  update public.runs set status = 'done', finished_at = now(), error_code = null where id = r.id;
  insert into public.answers(id, workspace_id, run_id, raw_text, model_version)
    values (aid, r.workspace_id, r.id, left(result->>'text', 20000), left(result->>'model_version', 80));
  -- Ids are only kept when they belong to this run's brand, so a caller cannot attach rows to another workspace's entities.
  insert into public.mentions(workspace_id, answer_id, brand_id, competitor_id, name, position, snippet)
    select r.workspace_id, aid,
           case when (m->>'brand_id')::uuid = r.brand_id then r.brand_id end,
           (select c.id from public.competitors c where c.id = (m->>'competitor_id')::uuid and c.brand_id = r.brand_id),
           left(m->>'name', 80), (m->>'position')::int, left(m->>'snippet', 200)
    from jsonb_array_elements(coalesce(result->'mentions', '[]'::jsonb)) m
    where coalesce(m->>'name', '') <> '' limit 50;
  insert into public.citations(workspace_id, answer_id, url, domain, is_owned, rank)
    select r.workspace_id, aid, left(c->>'url', 2000), left(c->>'domain', 255), coalesce((c->>'is_owned')::boolean, false), (c->>'rank')::int
    from jsonb_array_elements(coalesce(result->'citations', '[]'::jsonb)) c
    where coalesce(c->>'url', '') <> '' limit 50;
  perform public.refresh_metrics(r.brand_id, (now() at time zone 'Asia/Seoul')::date);
end $$;

create function public.enqueue_scheduled(worker_secret text, engine_keys text[])
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not private.is_worker(worker_secret) then raise exception 'not allowed'; end if;
  insert into public.runs(workspace_id, prompt_id, engine_key, status)
  select b.workspace_id, p.id, e.key, 'queued'
  from public.brands b
  cross join lateral (select pr.id from public.prompts pr where pr.brand_id = b.id and pr.active
                      order by (pr.tier = 'core') desc, pr.created_at limit 20) p
  join public.engines e on e.enabled and e.key = any(engine_keys)
  where b.schedule = 'daily'
    and not exists (select 1 from public.runs r2 join public.prompts p2 on p2.id = r2.prompt_id
                    where p2.brand_id = b.id and r2.status in ('queued', 'running', 'done')
                      and (r2.scheduled_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date);
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.claim_run(text, text[], uuid), public.complete_run(text, uuid, jsonb), public.enqueue_scheduled(text, text[]) from public;
grant execute on function public.claim_run(text, text[], uuid), public.complete_run(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.enqueue_scheduled(text, text[]) to anon;

-- Called by pg_cron once scheduling is switched on. Does nothing until private.worker_config has a url and a secret.
create function private.worker_tick(task text) returns void
language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select * into c from private.worker_config;
  if c.url is null or c.secret is null then return; end if;
  if task = 'drain' and not exists (select 1 from public.runs ru where ru.status = 'queued'
       or (ru.status = 'running' and ru.started_at < now() - interval '5 minutes')) then return; end if;
  perform net.http_post(url := c.url || '?task=' || task, body := '{}'::jsonb,
    headers := jsonb_build_object('authorization', 'Bearer ' || c.secret, 'content-type', 'application/json'),
    timeout_milliseconds := 58000);
end $$;
revoke all on function private.worker_tick(text) from public, anon, authenticated;
