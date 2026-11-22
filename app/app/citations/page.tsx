import type { Metadata } from 'next';
import { getContext } from '../../../lib/brand';
import { card, daysAgo, muted, numeric, pct, td, th } from '../../../lib/ui';

export const metadata: Metadata = { title: '인용 출처 · ANSRA' };
export const dynamic = 'force-dynamic';

type Row = { domain: string; citations: number; answers: number; is_owned: boolean };

export default async function CitationsPage() {
  const { supabase, brand } = await getContext(true);
  const { data, error } = await supabase.rpc('citation_domains', { target_brand: brand!.id, since: daysAgo(30) });
  const rows = (data || []) as Row[];
  const total = rows.reduce((a, r) => a + Number(r.citations), 0);
  const owned = rows.filter((r) => r.is_owned).reduce((a, r) => a + Number(r.citations), 0);

  return (
    <>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={card}><div style={{ fontSize: 13, color: '#5B6470' }}>인용 횟수 (30일)</div><div style={{ ...numeric, fontSize: 30 }}>{total}</div></div>
        <div style={card}><div style={{ fontSize: 13, color: '#5B6470' }}>자사 사이트 인용 비중</div><div style={{ ...numeric, fontSize: 30 }}>{pct(owned, total)}</div><div style={{ fontSize: 12, color: '#5B6470' }}>{owned}회</div></div>
        <div style={card}><div style={{ fontSize: 13, color: '#5B6470' }}>인용된 사이트 수</div><div style={{ ...numeric, fontSize: 30 }}>{rows.length}</div></div>
      </section>

      <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>인용 출처</h1>
        <p style={muted}>AI가 {brand!.name} 관련 질문에 답하면서 근거로 든 사이트입니다. 자사 사이트 비중이 낮으면 AI가 다른 곳의 설명을 대신 읽고 있다는 뜻입니다.</p>
        {error ? <p role="alert" style={{ ...muted, color: '#B42318' }}>인용 출처를 불러오지 못했습니다.</p> : null}
        {!error && rows.length === 0 ? <p style={muted}>아직 측정 결과가 없습니다. 개요 화면에서 측정을 먼저 실행해 주세요.</p> : null}
        {rows.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>사이트</th><th style={th}>구분</th><th style={{ ...th, textAlign: 'right' }}>인용 횟수</th><th style={{ ...th, textAlign: 'right' }}>인용한 답변</th><th style={{ ...th, textAlign: 'right' }}>비중</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.domain}>
                    <td style={{ ...td, fontWeight: r.is_owned ? 700 : 400, wordBreak: 'break-all' }}>{r.domain}</td>
                    <td style={td}><span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: r.is_owned ? '#EEF0FE' : '#F1F3F5', color: r.is_owned ? '#1B2AA8' : '#3B424C' }}>{r.is_owned ? '자사' : '외부'}</span></td>
                    <td style={{ ...td, textAlign: 'right' }}>{r.citations}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{r.answers}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{pct(Number(r.citations), total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </>
  );
}
