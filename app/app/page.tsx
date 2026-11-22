import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { addPrompt, createWorkspace, removePrompt, runMeasurement, signOut } from './actions';

export const metadata: Metadata = { title: 'ANSRA 앱' };
export const dynamic = 'force-dynamic';

const card = { background: '#fff', border: '1px solid #E4E7EB', borderRadius: 14, padding: 20 } as const;
const field = { padding: 12, border: '1px solid #C5CAD2', borderRadius: 10, fontSize: 15, minWidth: 0 } as const;
const label = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 500 } as const;
const primary = { minHeight: 44, padding: '0 18px', background: '#2B3FE0', color: '#fff', border: 0, borderRadius: 10, fontSize: 15, fontWeight: 500 } as const;
const ghost = { minHeight: 44, padding: '0 14px', background: '#fff', color: '#111418', border: '1px solid #C5CAD2', borderRadius: 10, fontSize: 14 } as const;
const pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1) + '%' : '—');

export default async function AppPage({ searchParams }: { searchParams: { m?: string } }) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const { data: brands } = await supabase.from('brands').select('id,workspace_id,name,region,vertical,domain').order('created_at').limit(1);
  const brand = brands?.[0];
  const notice = searchParams.m ? <div role="status" style={{ ...card, background: '#EEF0FE', borderColor: '#C9D0FB', color: '#1B2AA8', fontSize: 14 }}>{searchParams.m}</div> : null;

  const shell = (children: React.ReactNode) => (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, background: '#F6F7F8', minHeight: '100vh' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: '#111418', textDecoration: 'none' }}>ANSRA<span style={{ color: '#2B3FE0' }}>.</span></a>
        <form action={signOut} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 14, color: '#3B424C' }}>
          <span>{auth.user!.email}</span><button style={ghost}>로그아웃</button>
        </form>
      </header>
      {notice}
      {children}
    </main>
  );

  if (!brand) {
    return shell(
      <form action={createWorkspace} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>브랜드 등록</h1>
        <p style={{ margin: 0, fontSize: 14, color: '#3B424C', lineHeight: 1.6 }}>측정할 브랜드를 먼저 등록합니다. 쉼표로 여러 개를 적을 수 있습니다.</p>
        <label style={label}>브랜드 이름<input name="brand" required maxLength={80} style={field} /></label>
        <label style={label}>다르게 불리는 이름 (선택)<input name="aliases" placeholder="예: 줄임말, 영문 이름" style={field} /></label>
        <label style={label}>홈페이지 도메인 (선택)<input name="domain" placeholder="example.co.kr" style={field} /></label>
        <label style={label}>지역 (선택)<input name="region" placeholder="예: 분당" style={field} /></label>
        <label style={label}>업종 (선택)<input name="vertical" placeholder="예: 공인중개사" style={field} /></label>
        <label style={label}>경쟁 브랜드 (선택)<input name="competitors" placeholder="쉼표로 구분" style={field} /></label>
        <button style={primary}>등록하고 시작하기</button>
      </form>,
    );
  }

  const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
  const [{ data: metrics }, { data: engines }, { data: ranking }, { data: prompts }, { data: recent }] = await Promise.all([
    supabase.from('metrics_daily').select('engine_key,sample_n,mention_n,avg_position,cited_urls').eq('brand_id', brand.id).gte('date', since.slice(0, 10)),
    supabase.from('engines').select('key,label').eq('enabled', true),
    supabase.rpc('brand_ranking', { target_brand: brand.id, since }),
    supabase.from('prompts').select('id,text,tier').eq('brand_id', brand.id).order('created_at'),
    supabase.from('answers').select('id,raw_text,captured_at,model_version,runs(engine_key)').eq('workspace_id', brand.workspace_id).order('captured_at', { ascending: false }).limit(5),
  ]);

  const byEngine = new Map<string, { n: number; hit: number }>();
  (metrics || []).forEach((m) => {
    const cur = byEngine.get(m.engine_key) || { n: 0, hit: 0 };
    byEngine.set(m.engine_key, { n: cur.n + m.sample_n, hit: cur.hit + m.mention_n });
  });
  const total = [...byEngine.values()].reduce((a, b) => ({ n: a.n + b.n, hit: a.hit + b.hit }), { n: 0, hit: 0 });
  const labelOf = new Map((engines || []).map((e) => [e.key, e.label]));
  const hasMock = (recent || []).some((r) => r.model_version === 'mock-v1');

  return shell(
    <>
      <section style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>{brand.name}</h1>
          <div style={{ fontSize: 14, color: '#5B6470', marginTop: 4 }}>{[brand.region, brand.vertical, brand.domain].filter(Boolean).join(' · ') || '추가 정보 없음'}</div>
        </div>
        <form action={runMeasurement}><input type="hidden" name="brand_id" value={brand.id} /><button style={primary}>모의 측정 실행</button></form>
      </section>
      <div style={{ ...card, background: '#FFF7E6', borderColor: '#F1D9A6', fontSize: 14, lineHeight: 1.6, color: '#6B4A00' }}>
        지금은 <strong>모의 엔진</strong>이 만든 가짜 답변으로 측정합니다. 아래 수치는 저장·집계 과정이 동작하는지 보여 줄 뿐, 실제 AI 검색 노출과는 관계가 없습니다.
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <div style={card}><div style={{ fontSize: 13, color: '#5B6470' }}>전체 노출 점유율</div><div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700 }}>{pct(total.hit, total.n)}</div><div style={{ fontSize: 12, color: '#5B6470' }}>표본 {total.n}회 · 30일</div></div>
        {(engines || []).map((e) => {
          const m = byEngine.get(e.key) || { n: 0, hit: 0 };
          return <div key={e.key} style={card}><div style={{ fontSize: 13, color: '#5B6470' }}>{e.label}</div><div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700 }}>{pct(m.hit, m.n)}</div><div style={{ fontSize: 12, color: '#5B6470' }}>표본 {m.n}회</div></div>;
        })}
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <section style={{ ...card, flex: '2 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>질문 관리</h2>
          {(prompts || []).map((p) => (
            <form key={p.id} action={removePrompt} style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #EEF0F2', paddingTop: 10 }}>
              <input type="hidden" name="id" value={p.id} />
              <span style={{ fontSize: 14, lineHeight: 1.5 }}>{p.text} <span style={{ color: '#5B6470', fontSize: 12 }}>· {p.tier === 'core' ? '핵심' : '일반'}</span></span>
              <button style={ghost} aria-label={`질문 삭제: ${p.text}`}>삭제</button>
            </form>
          ))}
          <form action={addPrompt} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, borderTop: '1px solid #EEF0F2', paddingTop: 12 }}>
            <input type="hidden" name="workspace_id" value={brand.workspace_id} /><input type="hidden" name="brand_id" value={brand.id} />
            <label style={{ ...label, flex: '1 1 240px' }}>새 질문<input name="text" required minLength={4} maxLength={200} placeholder="고객이 AI에 물을 법한 질문" style={field} /></label>
            <label style={label}>구분<select name="tier" style={{ ...field, background: '#fff' }}><option value="standard">일반</option><option value="core">핵심</option></select></label>
            <button style={{ ...primary, alignSelf: 'flex-end' }}>추가</button>
          </form>
        </section>
        <section style={{ ...card, flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>언급 랭킹</h2>
          {(ranking || []).length === 0 ? <p style={{ margin: 0, fontSize: 14, color: '#5B6470' }}>아직 측정 결과가 없습니다.</p> : null}
          {(ranking || []).map((r: { name: string; mentions: number; is_own: boolean }, i: number) => (
            <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, fontSize: 14, background: r.is_own ? '#EEF0FE' : 'transparent', color: r.is_own ? '#1B2AA8' : '#111418', fontWeight: r.is_own ? 700 : 400 }}>
              <span>{i + 1}. {r.name}</span><span>{r.mentions}회</span>
            </div>
          ))}
        </section>
      </div>

      <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>최근 원본 답변 {hasMock ? <span style={{ fontWeight: 400, fontSize: 13, color: '#5B6470' }}>· 모의 엔진</span> : null}</h2>
        {(recent || []).length === 0 ? <p style={{ margin: 0, fontSize: 14, color: '#5B6470' }}>측정을 실행하면 여기에 답변 원문이 쌓입니다.</p> : null}
        {(recent || []).map((a) => {
          const run = Array.isArray(a.runs) ? a.runs[0] : a.runs;
          return (
            <div key={a.id} style={{ borderTop: '1px solid #EEF0F2', paddingTop: 10, fontSize: 14, lineHeight: 1.6 }}>
              <div style={{ fontSize: 12, color: '#5B6470' }}>{labelOf.get(run?.engine_key) || run?.engine_key} · {new Date(a.captured_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</div>
              {a.raw_text}
            </div>
          );
        })}
      </section>
    </>,
  );
}
