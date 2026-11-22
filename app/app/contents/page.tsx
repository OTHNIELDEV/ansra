import type { Metadata } from 'next';
import Link from 'next/link';
import { getContext } from '../../../lib/brand';
import { RULEPACK, type Finding } from '../../../lib/compliance';
import { card, field, ghost, kst, label, muted, primary } from '../../../lib/ui';
import { approveContent, createContent, updateContent } from './actions';

export const metadata: Metadata = { title: '콘텐츠 검수 · ANSRA' };
export const dynamic = 'force-dynamic';

type Review = { verdict: 'pass' | 'warn' | 'block'; findings: Finding[]; rulepack_version: string; reviewed_at: string };
type Content = { id: string; title: string; body_md: string; status: string; version: number; prompt_id: string | null; created_at: string; compliance_reviews: Review[] };

const STATUS: Record<string, string> = { draft: '초안', in_review: '검수 중', approved: '승인됨', published: '발행됨' };
const VERDICT = {
  pass: { text: '통과', bg: '#E7F6EC', fg: '#0B6B2E' },
  warn: { text: '주의', bg: '#FFF4D6', fg: '#6B4A00' },
  block: { text: '차단', bg: '#FDE7E4', fg: '#B42318' },
} as const;
const badge = (v: { text: string; bg: string; fg: string }) => <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: v.bg, color: v.fg, whiteSpace: 'nowrap' }}>{v.text}</span>;
const latest = (c: Content) => [...(c.compliance_reviews || [])].sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at))[0];
const area = { ...field, minHeight: 220, lineHeight: 1.6, fontFamily: 'inherit', resize: 'vertical' } as const;

export default async function ContentsPage({ searchParams }: { searchParams: { id?: string; prompt?: string; m?: string } }) {
  const { supabase, brand } = await getContext(true);
  const [{ data: rows, error }, { data: prompts }] = await Promise.all([
    supabase.from('contents')
      .select('id,title,body_md,status,version,prompt_id,created_at,compliance_reviews(verdict,findings,rulepack_version,reviewed_at)')
      .eq('brand_id', brand!.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('prompts').select('id,text').eq('brand_id', brand!.id).eq('active', true).order('created_at'),
  ]);
  const list = (rows || []) as unknown as Content[];
  const current = list.find((c) => c.id === searchParams.id) || null;
  const rev = current ? latest(current) : null;
  const promptText = new Map((prompts || []).map((p) => [p.id, p.text]));
  const preset = (prompts || []).find((p) => p.id === searchParams.prompt)?.id || '';

  return (
    <>
      {searchParams.m ? <div role="status" style={{ ...card, background: '#EEF0FE', borderColor: '#C9D0FB', color: '#1B2AA8', fontSize: 14 }}>{searchParams.m}</div> : null}
      <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>콘텐츠 검수</h1>
        <p style={muted}>초안을 저장하면 광고 표현 기본 규칙(v{RULEPACK.version})으로 자동 검수합니다. 문구 패턴만 찾아내는 1차 점검이며 법률 검토를 대신하지 않습니다. 업종별 규정(의료·금융 등)은 아직 반영되지 않았습니다.</p>
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <section style={{ ...card, flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 17 }}>초안 목록</h2>
            {current ? <Link href="/app/contents" style={{ ...ghost, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>새 초안</Link> : null}
          </div>
          {error ? <p role="alert" style={{ ...muted, color: '#B42318' }}>목록을 불러오지 못했습니다.</p> : null}
          {!error && list.length === 0 ? <p style={muted}>아직 초안이 없습니다. 오른쪽에서 첫 초안을 작성해 주세요.</p> : null}
          {list.map((c) => {
            const r = latest(c), on = c.id === current?.id;
            return (
              <Link key={c.id} href={`/app/contents?id=${c.id}`} aria-current={on ? 'true' : undefined}
                style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12, borderRadius: 10, textDecoration: 'none', color: '#111418', background: on ? '#EEF0FE' : 'transparent', borderTop: '1px solid #EEF0F2' }}>
                <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{c.title}</span>
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', fontSize: 12, color: '#5B6470' }}>
                  {r ? badge(VERDICT[r.verdict]) : null}<span>{STATUS[c.status] || c.status} · v{c.version}</span>
                </span>
              </Link>
            );
          })}
        </section>

        <section style={{ ...card, flex: '2 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {current ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 17 }}>검수 결과</h2>
                {rev ? badge(VERDICT[rev.verdict]) : null}
                <span style={{ fontSize: 13, color: '#5B6470' }}>{STATUS[current.status] || current.status} · v{current.version}{rev ? ` · ${kst(rev.reviewed_at)}` : ''}</span>
              </div>
              {current.prompt_id && promptText.get(current.prompt_id) ? <p style={muted}>대상 질문: {promptText.get(current.prompt_id)}</p> : null}
              {!rev ? <p style={muted}>검수 기록이 없습니다. 다시 저장하면 검수합니다.</p> : null}
              {rev && rev.findings.length === 0 ? <p style={muted}>기본 규칙에 걸린 표현이 없습니다.</p> : null}
              {rev && rev.findings.length > 0 ? (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rev.findings.map((f, i) => (
                    <li key={i} style={{ padding: 12, borderRadius: 10, background: '#F6F7F8', fontSize: 14, lineHeight: 1.6 }}>
                      {badge(VERDICT[f.level])} <strong>{f.rule}</strong> · “{f.match}”
                      <div style={{ color: '#3B424C' }}>{f.advice}</div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {current.status === 'published' ? <p style={muted}>발행된 콘텐츠는 수정할 수 없습니다.</p> : (
                <form action={updateContent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input type="hidden" name="id" value={current.id} />
                  <label style={label}>제목<input name="title" required minLength={2} maxLength={120} defaultValue={current.title} style={field} /></label>
                  <label style={label}>본문<textarea name="body" required minLength={20} maxLength={20000} defaultValue={current.body_md} style={area} /></label>
                  <div><button style={ghost}>저장하고 다시 검수</button></div>
                </form>
              )}
              {current.status === 'in_review' ? (
                <form action={approveContent} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', borderTop: '1px solid #EEF0F2', paddingTop: 14 }}>
                  <input type="hidden" name="id" value={current.id} />
                  <button style={{ ...primary, opacity: rev?.verdict === 'block' ? 0.45 : 1 }} disabled={rev?.verdict === 'block'}>승인</button>
                  <span style={{ fontSize: 13, color: '#5B6470' }}>{rev?.verdict === 'block' ? '차단 항목을 고쳐야 승인할 수 있습니다.' : rev?.verdict === 'warn' ? '주의 항목을 확인한 뒤 승인해 주세요.' : '승인 기록은 감사 로그에 남습니다.'}</span>
                </form>
              ) : null}
            </>
          ) : (
            <form key={preset} action={createContent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 17 }}>새 초안</h2>
              <input type="hidden" name="brand_id" value={brand!.id} />
              <label style={label}>대상 질문 (선택)
                <select name="prompt_id" defaultValue={preset} style={{ ...field, background: '#fff' }}>
                  <option value="">선택 안 함</option>
                  {(prompts || []).map((p) => <option key={p.id} value={p.id}>{p.text}</option>)}
                </select>
              </label>
              <label style={label}>제목<input name="title" required minLength={2} maxLength={120} style={field} /></label>
              <label style={label}>본문<textarea name="body" required minLength={20} maxLength={20000} placeholder="질문에 직접 답하는 글을 적어 주세요." style={area} /></label>
              <div><button style={primary}>저장하고 검수</button></div>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
