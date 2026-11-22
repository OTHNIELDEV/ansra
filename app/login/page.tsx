import type { Metadata } from 'next';
import { signIn, signUp } from './actions';

export const metadata: Metadata = { title: 'ANSRA 로그인' };

const field = { padding: 13, border: '1px solid #C5CAD2', borderRadius: 10, fontSize: 15 } as const;
const label = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 500 } as const;

export default function LoginPage({ searchParams }: { searchParams: { m?: string } }) {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form style={{ width: '100%', maxWidth: 400, background: '#fff', border: '1px solid #E4E7EB', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <a href="/" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: '#111418', textDecoration: 'none' }}>
          ANSRA<span style={{ color: '#2B3FE0' }}>.</span>
        </a>
        <h1 style={{ margin: 0, fontSize: 22 }}>로그인</h1>
        {searchParams.m ? <div role="status" style={{ fontSize: 14, lineHeight: 1.6, background: '#EEF0FE', color: '#1B2AA8', borderRadius: 10, padding: 12 }}>{searchParams.m}</div> : null}
        <label style={label}>이메일<input name="email" type="email" required autoComplete="email" style={field} /></label>
        <label style={label}>비밀번호 (10자 이상)<input name="password" type="password" required minLength={10} autoComplete="current-password" style={field} /></label>
        <button formAction={signIn} style={{ minHeight: 48, background: '#2B3FE0', color: '#fff', border: 0, borderRadius: 10, fontSize: 16, fontWeight: 500 }}>로그인</button>
        <button formAction={signUp} style={{ minHeight: 48, background: '#fff', color: '#111418', border: '1px solid #C5CAD2', borderRadius: 10, fontSize: 16, fontWeight: 500 }}>처음이면 가입하기</button>
      </form>
    </main>
  );
}
