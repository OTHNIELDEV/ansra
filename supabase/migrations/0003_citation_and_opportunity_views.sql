-- citation_domains:      which sites the engines cited for a brand's questions since a given time (caller's rights, RLS applies).
-- prompt_opportunities:  per active question, how often the brand was mentioned and which other name led (caller's rights).
create function public.citation_domains(target_brand uuid, since timestamptz)
returns table(domain text, citations bigint, answers bigint, is_owned boolean) language sql stable security invoker set search_path = '' as $$
  select coalesce(ci.domain, '(알 수 없음)') as domain, count(*) as citations,
         count(distinct an.id) as answers, bool_or(ci.is_owned) as is_owned
  from public.citations ci
  join public.answers an on an.id = ci.answer_id
  join public.runs r on r.id = an.run_id
  join public.prompts p on p.id = r.prompt_id
  where p.brand_id = target_brand and an.captured_at >= since
  group by 1 order by citations desc limit 30;
$$;
revoke all on function public.citation_domains(uuid, timestamptz) from public, anon;
grant execute on function public.citation_domains(uuid, timestamptz) to authenticated;

create function public.prompt_opportunities(target_brand uuid, since timestamptz)
returns table(prompt_id uuid, text text, tier text, sample_n bigint, mention_n bigint, avg_position numeric, top_rival text)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.text, p.tier,
         count(distinct an.id) as sample_n,
         count(distinct an.id) filter (where mn.id is not null) as mention_n,
         round(avg(mn.position), 2) as avg_position,
         (select m2.name
            from public.mentions m2
            join public.answers a2 on a2.id = m2.answer_id
            join public.runs r2 on r2.id = a2.run_id
           where r2.prompt_id = p.id and a2.captured_at >= since and m2.brand_id is distinct from target_brand
           group by m2.name order by count(*) desc, m2.name limit 1) as top_rival
  from public.prompts p
  left join public.runs r on r.prompt_id = p.id and r.status = 'done'
  left join public.answers an on an.run_id = r.id and an.captured_at >= since
  left join public.mentions mn on mn.answer_id = an.id and mn.brand_id = target_brand
  where p.brand_id = target_brand and p.active
  group by p.id, p.text, p.tier;
$$;
revoke all on function public.prompt_opportunities(uuid, timestamptz) from public, anon;
grant execute on function public.prompt_opportunities(uuid, timestamptz) to authenticated;
