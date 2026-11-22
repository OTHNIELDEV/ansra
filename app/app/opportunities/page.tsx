import type { Metadata } from 'next';
import Link from 'next/link';
import { getContext } from '../../../lib/brand';
import { card, daysAgo, ghost, muted, pct, td, th } from '../../../lib/ui';

export const metadata: Metadata = { title: '노출 기회 · ANSRA' };
export const dynamic = 'force-dynamic';

type Row = { prompt_id: string; text: string; tier: string; sample_n: number; mention_n: number; avg_position: number | null; top_rival: string | null };

export default async function OpportunitiesPage() {
  const { supabase, brand } = await getContext(true);
  const { data, error } = await supabase.rpc('prompt_opportunities', { target_brand: brand!.id, since: daysAgo(30) });
  const all = ((data || []) as Row[]).map((r) => ({ ...r, sample_n: Number(r.sample_n), mention_n: Number(r.mention_n) }));
  const rate = (r: Row) => r.mention_n / r.sample_n;
  // Lowest mention rate first; core questions win ties. Unmeasured questions are listed separately.
  const measured = all.filter((r) => r.sample_n > 0).sort((a, b) => rate(a) - rate(b) || (a.tier === 'core' ? -1 : 1));
  const pending = all.filter((r) => r.sample_n === 0);

  return (
    <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ margin: 0, fontSize: 20 }}>노출 기회</h1>
      <p style={muted}>{brand!.name}이(가) 답변에 가장 적게 등장한 질문부터 보여 드립니다. 위에 있는 질문일수록 먼저 손볼 가치가 큽니다. 최근 30일 기준입니다.</p>
      {error ? <p role="alert" style={{ ...muted, color: '#B42318' }}>노출 기회를 불러오지 못했습니다.</p> : null}
      {!error && all.length === 0 ? <p style={muted}>활성 질문이 없습니다. 개요 화면에서 질문을 추가해 주세요.</p> : null}
      {measured.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>질문</th><th style={{ ...th, textAlign: 'right' }}>언급률</th><th style={{ ...th, textAlign: 'right' }}>평균 순서</th><th style={th}>가장 자주 나온 다른 이름</th><th style={th}><span style={{ position: 'absolute', left: -9999 }}>작업</span></th></tr></thead>
            <tbody>
              {measured.map((r) => (
                <tr key={r.prompt_id}>
                  <td style={{ ...td, lineHeight: 1.5 }}>{r.text} <span style={{ color: '#5B6470', fontSize: 12 }}>· {r.tier === 'core' ? '핵심' : '일반'}</span></td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, color: rate(r) < 0.2 ? '#B42318' : '#111418' }}>{pct(r.mention_n, r.sample_n)}<div style={{ fontWeight: 400, fontSize: 12, color: '#5B6470' }}>{r.mention_n}/{r.sample_n}회</div></td>
                  <td style={{ ...td, textAlign: 'right' }}>{r.avg_position ?? '—'}</td>
                  <td style={td}>{r.top_rival || '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}><Link href={`/app/contents?prompt=${r.prompt_id}`} style={{ ...ghost, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', whiteSpace: 'nowrap' }}>초안 쓰기</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {pending.length > 0 ? (
        <div style={{ fontSize: 14, color: '#3B424C', lineHeight: 1.7 }}>
          <strong>아직 측정되지 않은 질문 {pending.length}개</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>{pending.map((r) => <li key={r.prompt_id}>{r.text}</li>)}</ul>
        </div>
      ) : null}
    </section>
  );
}
