'use server';

import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { RULEPACK, review } from '../../../lib/compliance';

const text = (form: FormData, key: string, max: number) => String(form.get(key) || '').trim().slice(0, max);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const back = (msg: string, id?: string): never =>
  redirect('/app/contents?' + (id ? `id=${id}&` : '') + 'm=' + encodeURIComponent(msg));

function validate(title: string, body: string) {
  if (title.length < 2) return '제목을 2자 이상 입력해 주세요.';
  if (body.length < 20) return '본문을 20자 이상 입력해 주세요.';
  return null;
}

async function saveReview(supabase: ReturnType<typeof createClient>, workspaceId: string, contentId: string, title: string, body: string) {
  const result = review(title + '\n' + body);
  const { error } = await supabase.from('compliance_reviews').insert({
    workspace_id: workspaceId, content_id: contentId, rulepack: RULEPACK.name, rulepack_version: RULEPACK.version,
    verdict: result.verdict, findings: result.findings,
  });
  return error ? null : result;
}

export async function createContent(form: FormData) {
  const supabase = createClient();
  const title = text(form, 'title', 120), body = text(form, 'body', 20000);
  const brandId = text(form, 'brand_id', 40), promptId = text(form, 'prompt_id', 40);
  const problem = validate(title, body);
  if (problem) back(problem);
  const { data: brand } = await supabase.from('brands').select('id,workspace_id').eq('id', UUID.test(brandId) ? brandId : '00000000-0000-0000-0000-000000000000').single();
  if (!brand) back('브랜드를 찾지 못했습니다.');
  const { data: row, error } = await supabase.from('contents').insert({
    workspace_id: brand!.workspace_id, brand_id: brand!.id, prompt_id: UUID.test(promptId) ? promptId : null,
    title, body_md: body, status: 'in_review',
  }).select('id').single();
  if (error || !row) back('초안을 저장하지 못했습니다. 편집 권한이 있는지 확인해 주세요.');
  const result = await saveReview(supabase, brand!.workspace_id, row!.id, title, body);
  back(result ? '초안을 저장하고 검수했습니다.' : '초안은 저장했지만 검수 결과를 기록하지 못했습니다.', row!.id);
}

export async function updateContent(form: FormData) {
  const supabase = createClient();
  const id = text(form, 'id', 40), title = text(form, 'title', 120), body = text(form, 'body', 20000);
  if (!UUID.test(id)) back('콘텐츠를 찾지 못했습니다.');
  const problem = validate(title, body);
  if (problem) back(problem, id);
  const { data: cur } = await supabase.from('contents').select('id,workspace_id,version,status').eq('id', id).single();
  if (!cur) back('콘텐츠를 찾지 못했습니다.');
  if (cur!.status === 'published') back('발행된 콘텐츠는 수정할 수 없습니다.', id);
  // Any edit sends the draft back to review, including one that was already approved.
  const { data: saved, error } = await supabase.from('contents')
    .update({ title, body_md: body, version: cur!.version + 1, status: 'in_review' }).eq('id', id).select('id');
  if (error || !saved?.length) back('수정 내용을 저장하지 못했습니다. 편집 권한이 있는지 확인해 주세요.', id);
  const result = await saveReview(supabase, cur!.workspace_id, id, title, body);
  back(result ? '수정 내용을 저장하고 다시 검수했습니다.' : '저장했지만 검수 결과를 기록하지 못했습니다.', id);
}

export async function approveContent(form: FormData) {
  const supabase = createClient();
  const id = text(form, 'id', 40);
  if (!UUID.test(id)) back('콘텐츠를 찾지 못했습니다.');
  const [{ data: auth }, { data: cur }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('contents').select('id,workspace_id,title,body_md,version,status').eq('id', id).single(),
  ]);
  if (!auth.user || !cur) back('콘텐츠를 찾지 못했습니다.');
  if (cur!.status !== 'in_review') back('검수 중인 콘텐츠만 승인할 수 있습니다.', id);
  // Re-check the stored text instead of trusting an earlier review row.
  if (review(cur!.title + '\n' + cur!.body_md).verdict === 'block') back('차단 항목이 남아 있어 승인할 수 없습니다. 문구를 고친 뒤 다시 저장해 주세요.', id);
  const { data: saved, error } = await supabase.from('contents').update({ status: 'approved' }).eq('id', id).eq('version', cur!.version).select('id');
  if (error || !saved?.length) back('승인하지 못했습니다. 편집 권한이 있는지 확인해 주세요.', id);
  await supabase.from('audit_logs').insert({ workspace_id: cur!.workspace_id, actor: auth.user!.id, action: 'content.approve', target: id, diff: { version: cur!.version } });
  back('승인했습니다. 발행 채널은 아직 연결되지 않았습니다.', id);
}
