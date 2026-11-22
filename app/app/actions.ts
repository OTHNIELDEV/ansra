'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { extractMentions, mockAdapter, type Entity } from '../../lib/measure';

const text = (form: FormData, key: string, max: number) => String(form.get(key) || '').trim().slice(0, max);
const list = (form: FormData, key: string) => text(form, key, 400).split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
const fail = (msg: string) => redirect('/app?m=' + encodeURIComponent(msg));

export async function signOut() {
  await createClient().auth.signOut();
  redirect('/login');
}

export async function createWorkspace(form: FormData) {
  const supabase = createClient();
  const brandName = text(form, 'brand', 80);
  if (!brandName) return fail('브랜드 이름을 입력해 주세요.');
  const region = text(form, 'region', 40) || null;
  const vertical = text(form, 'vertical', 40) || null;
  const { data: ws, error } = await supabase.rpc('create_workspace', {
    ws_name: text(form, 'workspace', 80) || brandName, brand_name: brandName, brand_aliases: list(form, 'aliases'),
    brand_domain: text(form, 'domain', 120) || null, brand_region: region, brand_vertical: vertical,
  });
  if (error || !ws) return fail('워크스페이스를 만들지 못했습니다.');
  const { data: brand } = await supabase.from('brands').select('id').eq('workspace_id', ws).single();
  if (brand) {
    const rivals = list(form, 'competitors').map((name) => ({ workspace_id: ws, brand_id: brand.id, name }));
    if (rivals.length) await supabase.from('competitors').insert(rivals);
    const head = [region, vertical].filter(Boolean).join(' ') || brandName;
    await supabase.from('prompts').insert(
      [`${head} 추천해 줘`, `${head} 비용은 어느 정도야?`, `${vertical || brandName} 고를 때 기준이 뭐야?`]
        .map((t, i) => ({ workspace_id: ws, brand_id: brand.id, text: t, tier: i === 0 ? 'core' : 'standard', intent: ['추천', '가격', '정보'][i] })),
    );
  }
  revalidatePath('/app');
}

export async function addPrompt(form: FormData) {
  const supabase = createClient();
  const value = text(form, 'text', 200);
  if (value.length < 4) return fail('질문을 4자 이상 입력해 주세요.');
  const { error } = await supabase.from('prompts').insert({
    workspace_id: text(form, 'workspace_id', 40), brand_id: text(form, 'brand_id', 40), text: value,
    tier: form.get('tier') === 'core' ? 'core' : 'standard',
  });
  if (error) return fail('질문을 추가하지 못했습니다. 편집 권한이 있는지 확인해 주세요.');
  revalidatePath('/app');
}

export async function removePrompt(form: FormData) {
  const { error } = await createClient().from('prompts').delete().eq('id', text(form, 'id', 40));
  if (error) return fail('질문을 삭제하지 못했습니다.');
  revalidatePath('/app');
}

// Runs every active question against every enabled engine using the mock adapter.
export async function runMeasurement(form: FormData) {
  const supabase = createClient();
  const brandId = text(form, 'brand_id', 40);
  const { data: brand } = await supabase.from('brands').select('id,workspace_id,name,aliases,domain').eq('id', brandId).single();
  if (!brand) return fail('브랜드를 찾지 못했습니다.');
  const [{ data: rivals }, { data: prompts }, { data: engines }] = await Promise.all([
    supabase.from('competitors').select('id,name,aliases').eq('brand_id', brand.id),
    supabase.from('prompts').select('id,text').eq('brand_id', brand.id).eq('active', true).limit(20),
    supabase.from('engines').select('key').eq('enabled', true),
  ]);
  if (!prompts?.length) return fail('측정할 질문이 없습니다. 질문을 먼저 추가해 주세요.');

  const own: Entity = { name: brand.name, aliases: brand.aliases || [], brandId: brand.id };
  const others: Entity[] = (rivals || []).map((c) => ({ name: c.name, aliases: c.aliases || [], competitorId: c.id }));
  const ws = brand.workspace_id;
  const now = new Date().toISOString();
  const runs: object[] = [], answers: object[] = [], mentions: object[] = [], citations: object[] = [];
  const SAMPLES = 3;

  for (const p of prompts) for (const e of engines || []) for (let s = 0; s < SAMPLES; s++) {
    const out = await mockAdapter({ prompt: p.text, engine: e.key, sample: s, brand: { ...own, domain: brand.domain }, competitors: others });
    const runId = randomUUID(), answerId = randomUUID();
    runs.push({ id: runId, workspace_id: ws, prompt_id: p.id, engine_key: e.key, scheduled_at: now, started_at: now, finished_at: now, status: 'done', cost_krw: 0 });
    answers.push({ id: answerId, workspace_id: ws, run_id: runId, raw_text: out.text, model_version: out.modelVersion, captured_at: now });
    const known = [own, ...others, ...out.extraNames.map((name) => ({ name, aliases: [] as string[] }))];
    extractMentions(out.text, known).forEach((m) => mentions.push({
      workspace_id: ws, answer_id: answerId, brand_id: m.brandId ?? null, competitor_id: m.competitorId ?? null, name: m.name, position: m.position, snippet: m.snippet,
    }));
    out.citations.forEach((c, i) => citations.push({ workspace_id: ws, answer_id: answerId, url: c.url, domain: new URL(c.url).hostname, is_owned: c.isOwned, rank: i + 1 }));
  }

  for (const [table, rows] of [['runs', runs], ['answers', answers], ['mentions', mentions], ['citations', citations]] as const) {
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from(table).insert(rows.slice(i, i + 500));
      if (error) return fail('측정 결과를 저장하지 못했습니다. 편집 권한이 있는지 확인해 주세요.');
    }
  }
  const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const { error } = await supabase.rpc('refresh_metrics', { target_brand: brand.id, target_day: day });
  if (error) return fail('집계하지 못했습니다.');
  revalidatePath('/app');
  redirect('/app?m=' + encodeURIComponent(`모의 측정 ${runs.length}회를 실행했습니다.`));
}
