# ANSRA (가칭) — AI 검색 노출·귀속 플랫폼

Next.js 14(App Router) + Supabase 기반의 초기 버전입니다. 화면은 동작하지만 **대시보드 수치는 예시 데이터**이며, 측정 엔진과 로그인은 아직 연결되지 않았습니다.

## 구성

| 경로 | 내용 |
|---|---|
| `app/page.tsx` | 랜딩 페이지 |
| `app/dashboard/page.tsx` | B2B 대시보드 (메뉴 13개, 예시 데이터) |
| `app/actions.ts` | 무료 진단 신청 서버 액션 (검증 후 Supabase `leads` 저장) |
| `components/` | 화면 컴포넌트 (디자인 목업에서 변환) |
| `lib/dc.js` | 화면 컴포넌트가 쓰는 작은 상태 헬퍼 |
| `supabase/migrations/0001_init.sql` | 멀티테넌트 스키마 17개 테이블 + RLS 정책 |

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

로그인·워크스페이스 생성, 측정 파이프라인, 대시보드의 실데이터 연결, 결제, 알림.
