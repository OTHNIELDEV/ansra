# ANSRA (가칭) — 작업 안내

AI 검색 노출(GEO) 측정·귀속 플랫폼. onthe.ai 등 기존 서비스의 화면·문구를 복제하지 않고, 기능은 동등 이상으로 독자 설계한다.

## 현재 상태 (2026-11-23)

- 배포: Vercel 프로젝트 `ansra` (팀 othnieldevs), 도메인 ansra.xwise.net, `main` 푸시 시 자동 배포
- DB: Supabase 프로젝트 `ansra` (ref `sghkxxwjtxfxeufxzenn`, 서울). 스키마는 `supabase/migrations/`
- 완료: 랜딩(`/`), 예시 대시보드(`/dashboard`), 이메일·비밀번호 로그인(`/login`), 브랜드 등록·질문 관리·모의 측정(`/app`), 인용 출처(`/app/citations`), 노출 기회(`/app/opportunities`), 콘텐츠 검수(`/app/contents`)
- 테넌트 격리: `supabase/tests/isolation.sql` 통과 (2026-11-22, 0003 적용 후). 스키마·정책·함수를 바꾸면 다시 실행한다
- 콘텐츠 검수는 `lib/compliance.ts`의 문구 패턴 규칙(`general-ad-ko` 0.1.0)뿐이다. 업종별 규정과 법률 검토는 반영되지 않았다
- 측정: `lib/engines/real.ts`에 ChatGPT·Gemini·Claude 어댑터(각 사 웹 검색 도구 사용). 환경 변수 `OPENAI_API_KEY`·`GEMINI_API_KEY`·`ANTHROPIC_API_KEY`가 있는 엔진만 연결된다. 첫 실제 측정(2026-11-22, 미리보기): ChatGPT·Claude는 각 6회 성공, Gemini는 6회 모두 `http_429`(키 사용 한도 추정, 미해결)
- 키가 하나도 없으면 `lib/measure.ts`의 모의 엔진으로 동작. 키가 하나라도 있으면 모의 엔진은 실행하지 않고 첫 측정 때 모의 데이터를 지운다
- 수동 측정 1회 = 질문 최대 4개(핵심 우선) × 연결 엔진 × 표본 1회, 45초 예산·요청 60초 제한. 그 이상은 작업 큐가 필요하다
- `metrics_daily.cited_urls`는 자사 도메인(`is_owned`) 인용만 센다. 브랜드에 도메인이 없으면 0이다
- 실제 답변에서는 등록된 브랜드·경쟁사 이름만 언급으로 잡는다(미등록 이름 추출 없음). `cost_krw`는 비워 둔다

## 규칙

- 모든 테이블은 `workspace_id` + RLS. 서비스 롤 키를 쓰지 않는다(현재 코드는 공개 키 + 사용자 세션만 사용)
- 입력은 서버 액션에서 검증한다. 사용자 문구는 한국어 존댓말
- 모의·예시 데이터에는 화면에 반드시 그 사실을 표시한다. 실데이터 없이 성과 수치를 쓰지 않는다
- `LEADS_ENABLED`는 개인정보처리방침 게시 전까지 `false`
- `/app` 하위 화면은 `app/app/layout.tsx`(헤더·메뉴·모의 안내)와 `lib/brand.ts`의 `getContext()`, `lib/ui.ts` 스타일을 공유한다
- `components/Landing.jsx`, `components/Dashboard.jsx`는 디자인 목업에서 자동 변환한 파일이다. 손볼 때는 TSX로 다시 쓰는 편이 낫다

## 다음 작업

1. Gemini `http_429` 해결, SaaS·B2B 브랜드용 질문 템플릿(현재는 지역 업소형만), 주기 실행(작업 큐), 미등록 경쟁사 이름 추출, 호출 비용 기록
2. 콘텐츠 에이전트(초안 자동 작성), 업종별 규제 규칙팩, 발행 채널
3. `/dashboard`의 나머지 예시 화면(분석 에이전트, AI 봇 유입, 블로그 관리, 귀속)을 `/app`으로 옮기기
4. 결제·알림톡·귀속 연동

## 명령

```bash
npm run dev     # 로컬 실행 (.env.local 필요)
npm run build   # 타입 검사 포함 빌드
```
