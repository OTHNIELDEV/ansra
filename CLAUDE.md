# ANSRA (가칭) — 작업 안내

AI 검색 노출(GEO) 측정·귀속 플랫폼. onthe.ai 등 기존 서비스의 화면·문구를 복제하지 않고, 기능은 동등 이상으로 독자 설계한다.

## 현재 상태 (2026-11-23)

- 배포: Vercel 프로젝트 `ansra` (팀 othnieldevs), 도메인 ansra.xwise.net, `main` 푸시 시 자동 배포
- DB: Supabase 프로젝트 `ansra` (ref `sghkxxwjtxfxeufxzenn`, 서울). 스키마는 `supabase/migrations/`
- 완료: 랜딩(`/`), 예시 대시보드(`/dashboard`), 이메일·비밀번호 로그인(`/login`), 브랜드 등록·질문 관리·모의 측정(`/app`), 인용 출처(`/app/citations`), 노출 기회(`/app/opportunities`), 콘텐츠 검수(`/app/contents`)
- 테넌트 격리: `supabase/tests/isolation.sql` 통과 (2026-11-22, 0003 적용 후). **0004 적용 후에는 아직 실행하지 못했다**(대기열 함수 검사 줄 추가됨). 스키마·정책·함수를 바꾸면 다시 실행한다
- 콘텐츠 검수는 `lib/compliance.ts`의 문구 패턴 규칙(`general-ad-ko` 0.1.0)뿐이다. 업종별 규정과 법률 검토는 반영되지 않았다
- 측정: `lib/engines/real.ts`에 ChatGPT·Gemini·Claude 어댑터(각 사 웹 검색 도구 사용). 환경 변수 `OPENAI_API_KEY`·`GEMINI_API_KEY`·`ANTHROPIC_API_KEY`가 있는 엔진만 연결된다. 첫 실제 측정(2026-11-22, 미리보기): ChatGPT·Claude는 각 6회 성공, Gemini는 6회 모두 `http_429`(키 사용 한도 추정, 미해결)
- 키가 하나도 없으면 `lib/measure.ts`의 모의 엔진으로 동작. 키가 하나라도 있으면 모의 엔진은 실행하지 않고 첫 측정 때 모의 데이터를 지운다
- 측정 대기열(0004): `runs.status='queued'`가 대기열이다. `lib/queue.ts`의 `drain()`이 `claim_run`→엔진 호출→`complete_run`을 반복한다. "측정 실행"은 질문 최대 20개 × 연결 엔진을 대기열에 넣고 18초 동안만 새 호출을 시작한다(엔진 호출 40초·요청 60초 제한). 남은 것은 다시 누르면 이어진다
- 자동 측정: `/api/worker`(비밀값은 DB 함수가 검사, 서비스 롤 키 없음)와 `brands.schedule`까지 만들었으나 **아직 꺼져 있다**. 켜려면 `supabase/ops/activate_scheduler.sql`을 한 번 실행한다(pg_cron·pg_net, 매분 대기열 처리 + 매일 06:00 KST 등록). 실제로 켜서 돌려 본 적은 없다
- `metrics_daily.cited_urls`는 자사 도메인(`is_owned`) 인용만 센다. 브랜드에 도메인이 없으면 0이다
- 시작 질문은 `lib/prompts.ts`가 사업 유형(지역 매장·업소 / 온라인 서비스·B2B)별로 만든다. 유형은 저장하지 않고 등록·추천 질문 추가 때 입력으로만 받는다. 경쟁 브랜드는 `/app`에서 추가·삭제(최대 10개)
- 실제 답변에서는 등록된 브랜드·경쟁사 이름만 언급으로 잡는다(미등록 이름 추출 없음). `cost_krw`는 비워 둔다

## 규칙

- 모든 테이블은 `workspace_id` + RLS. 서비스 롤 키를 쓰지 않는다(현재 코드는 공개 키 + 사용자 세션만 사용)
- 입력은 서버 액션에서 검증한다. 사용자 문구는 한국어 존댓말
- 모의·예시 데이터에는 화면에 반드시 그 사실을 표시한다. 실데이터 없이 성과 수치를 쓰지 않는다
- `LEADS_ENABLED`는 개인정보처리방침 게시 전까지 `false`
- `/app` 하위 화면은 `app/app/layout.tsx`(헤더·메뉴·모의 안내)와 `lib/brand.ts`의 `getContext()`, `lib/ui.ts` 스타일을 공유한다
- `components/Landing.jsx`, `components/Dashboard.jsx`는 디자인 목업에서 자동 변환한 파일이다. 손볼 때는 TSX로 다시 쓰는 편이 낫다

## 다음 작업

1. 0004 격리 테스트 실행, 대기열 실측 확인 후 자동 측정 켜기, Gemini `http_429` 해결, 미등록 경쟁사 이름 추출, 호출 비용 기록
2. 콘텐츠 에이전트(초안 자동 작성), 업종별 규제 규칙팩, 발행 채널
3. `/dashboard`의 나머지 예시 화면(분석 에이전트, AI 봇 유입, 블로그 관리, 귀속)을 `/app`으로 옮기기
4. 결제·알림톡·귀속 연동

## 명령

```bash
npm run dev     # 로컬 실행 (.env.local 필요)
npm run build   # 타입 검사 포함 빌드
```
