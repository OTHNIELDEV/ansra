# ANSRA (가칭) — AI 검색 노출·귀속 플랫폼

Next.js 14(App Router) + Supabase 기반의 초기 버전입니다. 로그인, 브랜드 등록, 질문 관리, 모의 엔진 측정까지 동작합니다. **실제 AI 엔진은 아직 연결되지 않았고**, `/dashboard`는 예시 데이터 화면입니다.

## 구성

| 경로 | 내용 |
|---|---|
| `app/page.tsx` | 랜딩 페이지 |
| `app/dashboard/page.tsx` | B2B 대시보드 (메뉴 13개, 예시 데이터) |
| `app/login`, `app/auth/callback` | 이메일·비밀번호 로그인 |
| `app/app` | 로그인 후 화면: 브랜드 등록, 질문 관리, 모의 측정, 집계 결과 |
| `lib/measure.ts` | 엔진 어댑터 인터페이스, 모의 엔진, 언급 추출 |
| `app/actions.ts` | 무료 진단 신청 서버 액션 (검증 후 Supabase `leads` 저장) |
| `components/` | 화면 컴포넌트 (디자인 목업에서 변환) |
| `lib/dc.js` | 화면 컴포넌트가 쓰는 작은 상태 헬퍼 |
| `supabase/migrations/` | 스키마 17개 테이블 + RLS, 워크스페이스 생성·집계 함수 |

## 실행

```bash
cp .env.example .env.local   # 값 채우기
npm install
npm run dev
```

## 환경 변수

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — 공개 가능한 값입니다.
- `LEADS_ENABLED` — `true`일 때만 신청 내용이 저장됩니다. 개인정보처리방침을 게시한 뒤 켜세요.

## 아직 없는 것

실제 엔진 어댑터, 주기 실행, 콘텐츠 에이전트·규제 검수, 결제, 알림, 귀속 연동.

## Supabase에서 직접 설정할 것

Authentication → URL Configuration에서 Site URL을 `https://ansra.xwise.net`으로, Redirect URLs에 `https://ansra.xwise.net/auth/callback`을 넣어야 가입 확인 메일의 링크가 사이트로 돌아옵니다.
