import { getContext } from '../../lib/brand';
import { card, ghost } from '../../lib/ui';
import AppNav from '../../components/AppNav';
import { signOut } from './actions';
import { connectedEngines } from '../../lib/engines/real';
import { MOCK_MODEL } from '../../lib/measure';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, brand } = await getContext();
  const connected = connectedEngines();
  const { data: mock } = brand ? await supabase.from('answers').select('id').eq('workspace_id', brand.workspace_id).eq('model_version', MOCK_MODEL).limit(1) : { data: null };
  const { data: labels } = connected.length ? await supabase.from('engines').select('key,label').in('key', connected) : { data: null };
  const showMock = connected.length === 0 || !!mock?.length;
  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, background: '#F6F7F8', minHeight: '100vh' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: '#111418', textDecoration: 'none' }}>ANSRA<span style={{ color: '#2B3FE0' }}>.</span></a>
        <form action={signOut} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 14, color: '#3B424C' }}>
          <span>{user.email}</span><button style={ghost}>로그아웃</button>
        </form>
      </header>
      {brand ? <AppNav /> : null}
      {brand && showMock ? (
        <div style={{ ...card, background: '#FFF7E6', borderColor: '#F1D9A6', fontSize: 14, lineHeight: 1.6, color: '#6B4A00' }}>
          {connected.length === 0
            ? <>지금은 <strong>모의 엔진</strong>이 만든 가짜 답변으로 측정합니다. 화면의 수치는 저장·집계 과정이 동작하는지 보여 줄 뿐, 실제 AI 검색 노출과는 관계가 없습니다.</>
            : <>아직 <strong>모의 엔진</strong>의 가짜 답변이 남아 있어 수치에 섞여 있습니다. 측정을 한 번 실행하면 모의 데이터는 지워지고 실제 답변만 남습니다.</>}
        </div>
      ) : null}
      {brand && connected.length > 0 ? (
        <div style={{ ...card, background: '#EEF6F1', borderColor: '#BFDCCB', fontSize: 14, lineHeight: 1.6, color: '#0B4F2A' }}>
          실제 API로 측정하는 엔진: <strong>{(labels || []).map((l) => l.label).join(', ')}</strong>. 나머지 엔진은 아직 연결되지 않았습니다. API 답변은 각 서비스 앱에서 보는 답변과 다를 수 있고, 한 번에 핵심 질문 위주로 최대 4개만 측정합니다.
        </div>
      ) : null}
      {children}
    </main>
  );
}
