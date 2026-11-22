import { getContext } from '../../lib/brand';
import { card, ghost } from '../../lib/ui';
import AppNav from '../../components/AppNav';
import { signOut } from './actions';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, brand } = await getContext();
  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, background: '#F6F7F8', minHeight: '100vh' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: '#111418', textDecoration: 'none' }}>ANSRA<span style={{ color: '#2B3FE0' }}>.</span></a>
        <form action={signOut} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 14, color: '#3B424C' }}>
          <span>{user.email}</span><button style={ghost}>로그아웃</button>
        </form>
      </header>
      {brand ? <AppNav /> : null}
      {brand ? (
        <div style={{ ...card, background: '#FFF7E6', borderColor: '#F1D9A6', fontSize: 14, lineHeight: 1.6, color: '#6B4A00' }}>
          지금은 <strong>모의 엔진</strong>이 만든 가짜 답변으로 측정합니다. 화면의 수치는 저장·집계 과정이 동작하는지 보여 줄 뿐, 실제 AI 검색 노출과는 관계가 없습니다.
        </div>
      ) : null}
      {children}
    </main>
  );
}
