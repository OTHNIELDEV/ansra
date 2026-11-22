# ANSRA (가칭) — 작업 안내

AI 검색 노출(GEO) 측정·귀속 플랫폼. onthe.ai 등 기존 서비스의 화면·문구를 복제하지 않고, 기능은 동등 이상으로 독자 설계한다.

## 현재 상태 (2026-11-22)

- 배포: Vercel 프로젝트 `ansra` (팀 othnieldevs), 도메인 ansra.xwise.net, `main` 푸시 시 자동 배포
- DB: Supabase 프로젝트 `ansra` (ref `sghkxxwjtxfxeufxzenn`, 서울). 스키마는 `supabase/migrations/`
- 완료: 랜딩(`/`), 예시 대시보드(`/dashboard`), 이메일·비밀번호 로그인(`/login`), 브랜드 등록·질문 관리·모의 측정(`/app`)
- 측정은 `lib/measure.ts`의 **모의 엔진**만 연결됨. 실제 엔진 어댑터는 API 키가 준비된 뒤 같은 인터페이스(`EngineAdapter`)로 추가

## 규칙

- 모든 테이블은 `workspace_id` + RLS. 서비스 롤 키를 쓰지 않는다(현재 코드는 공개 키 + 사용자 세션만 사용)
- 입력은 서버 액션에서 검증한다. 사용자 문구는 한국어 존댓말
- 모의·예시 데이터에는 화면에 반드시 그 사실을 표시한다. 실데이터 없이 성과 수치를 쓰지 않는다
- `LEADS_ENABLED`는 개인정보처리방침 게시 전까지 `false`
- `components/Landing.jsx`, `components/Dashboard.jsx`는 디자인 목업에서 자동 변환한 파일이다. 손볼 때는 TSX로 다시 쓰는 편이 낫다

## 다음 작업

1. `supabase/tests/isolation.sql` 실행해 테넌트 격리 확인 (아직 실행 못 함)
2. `/dashboard` 화면들을 `/app`의 실데이터에 연결 (인용 출처, 노출 기회, 콘텐츠 검수)
3. 실제 엔진 어댑터, 주기 실행(작업 큐), 콘텐츠 에이전트, 규제 검수
4. 결제·알림톡·귀속 연동

## 명령

```bash
npm run dev     # 로컬 실행 (.env.local 필요)
npm run build   # 타입 검사 포함 빌드
```
