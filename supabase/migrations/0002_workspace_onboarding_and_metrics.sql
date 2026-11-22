-- Applied to the ansra project on 2026-11-22. See the functions for behaviour.
-- create_workspace: the only way a signed-in user gets a workspace + first brand (max 3 owned).
-- refresh_metrics:  rebuilds one day's metrics_daily rows for a brand from stored answers (caller's rights, RLS applies).
-- brand_ranking:    top brand names by mention count for a brand since a given time (caller's rights).
create function public.create_workspace(ws_name text, brand_name text, brand_aliases text[] default '{}',
                                        brand_domain text default null, brand_region text default null, brand_vertical text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); ws uuid; b uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if char_length(coalesce(ws_name,'')) not between 1 and 80 or char_length(coalesce(brand_name,'')) not between 1 and 80 then
    raise exception 'invalid name';
  end if;
  if (select count(*) from public.memberships m where m.user_id = uid and m.role = 'owner') >= 3 then
    raise exception 'workspace limit reached';
  end if;
  insert into public.workspaces(name) values (ws_name) returning id into ws;
  insert into public.memberships(workspace_id, user_id, role) values (ws, uid, 'owner');
  insert into public.brands(workspace_id, name, aliases, domain, region, vertical)
    values (ws, brand_name, coalesce(brand_aliases,'{}'), brand_domain, brand_region, brand_vertical) returning id into b;
  insert into public.audit_logs(workspace_id, actor, action, target) values (ws, uid, 'workspace.create', b::text);
  return ws;
end $$;
revoke all on function public.create_workspace(text,text,text[],text,text,text) from public, anon;
grant execute on function public.create_workspace(text,text,text[],text,text,text) to authenticated;

create function public.refresh_metrics(target_brand uuid, target_day date)
returns void language sql security invoker set search_path = '' as $$
  with a as (
    select p.workspace_id, p.brand_id, r.engine_key, an.id as answer_id
    from public.prompts p
    join public.runs r on r.prompt_id = p.id and r.status = 'done'
    join public.answers an on an.run_id = r.id
    where p.brand_id = target_brand and (an.captured_at at time zone 'Asia/Seoul')::date = target_day
  ), m as (
    select a.answer_id, min(mn.position) as position
    from a join public.mentions mn on mn.answer_id = a.answer_id and mn.brand_id = target_brand
    group by a.answer_id
  ), c as (
    select a.engine_key, count(distinct ci.url) as cited
    from a join public.citations ci on ci.answer_id = a.answer_id and ci.is_owned
    group by a.engine_key
  )
  insert into public.metrics_daily(workspace_id, brand_id, engine_key, date, sample_n, mention_n, avg_position, cited_urls)
  select a.workspace_id, a.brand_id, a.engine_key, target_day, count(*), count(m.answer_id),
         round(avg(m.position), 2), coalesce(max(c.cited), 0)
  from a left join m on m.answer_id = a.answer_id left join c on c.engine_key = a.engine_key
  group by a.workspace_id, a.brand_id, a.engine_key
  on conflict (brand_id, engine_key, date) do update
    set sample_n = excluded.sample_n, mention_n = excluded.mention_n,
        avg_position = excluded.avg_position, cited_urls = excluded.cited_urls;
$$;
revoke all on function public.refresh_metrics(uuid, date) from public, anon;
grant execute on function public.refresh_metrics(uuid, date) to authenticated;

create function public.brand_ranking(target_brand uuid, since timestamptz)
returns table(name text, mentions bigint, is_own boolean) language sql stable security invoker set search_path = '' as $$
  select mn.name, count(*) as mentions, bool_or(mn.brand_id = target_brand) as is_own
  from public.mentions mn
  join public.answers an on an.id = mn.answer_id
  join public.runs r on r.id = an.run_id
  join public.prompts p on p.id = r.prompt_id
  where p.brand_id = target_brand and an.captured_at >= since
  group by mn.name order by mentions desc limit 10;
$$;
revoke all on function public.brand_ranking(uuid, timestamptz) from public, anon;
grant execute on function public.brand_ranking(uuid, timestamptz) to authenticated;
