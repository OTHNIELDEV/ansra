'use client';
// Ported from the design mockup. Sample data lives in the logic class below.
import { Fragment } from 'react';
import { DCLogic, useDC, css } from '../lib/dc';

class Logic extends DCLogic {
constructor(p){super(p);this.state={nav:'home',eng:'all',sel:0,cont:0,fixed:{},ok:{},credits:16,runs:[{t:'기존 글 리프레시',s:'완료',w:'4일 전'},{t:'단계 맞춤형 작성',s:'완료',w:'1주 전'}]};}
renderVals(){
const s=this.state,go=(k)=>()=>this.setState({nav:k});
const NAV=[['h','분석'],['share','노출 점유율'],['insight','분석 에이전트','2'],['prompts','질문 관리'],['cites','인용 출처'],['h','실행'],['agents','콘텐츠 에이전트'],['opps','노출 기회','5'],['h','발행'],['contents','콘텐츠 검수','3'],['bots','AI 봇 유입'],['blog','블로그 관리'],['h','귀속'],['attr','문의·예약 귀속'],['h','계정'],['brand','브랜드 관리'],['settings','설정']];
const nav=[{link:true,head:false,label:'홈',go:go('home'),badge:'',badgeStyle:'display:none',style:this.navStyle(s.nav==='home')}].concat(NAV.map(n=>n[0]==='h'?{head:true,link:false,label:n[1]}:{head:false,link:true,label:n[1],go:go(n[0]),badge:n[2]||'',badgeStyle:n[2]?'background:#111418;color:#fff;border-radius:10px;font-size:11px;padding:1px 7px':'display:none',style:this.navStyle(s.nav===n[0])}));
const E=[['all','전체',[9,10,12,13,15,16,17,18.4],3.2,14,27],['gpt','ChatGPT',[11,12,14,15,17,19,20,21],2.9,6,13],['gem','Gemini',[8,9,10,12,13,14,15,16.2],3.4,3,4],['ppx','Perplexity',[14,15,18,19,21,22,24,24.5],2.4,4,5],['cld','Claude',[7,8,9,10,12,13,14,14.8],3.8,1,1],['nav','네이버 AI 브리핑',[3,4,5,6,7,8,9,9.6],4.6,0,9],['aio','구글 AI 개요',[6,7,8,9,10,11,12,12.3],4.1,0,3]];
const e=E.find(x=>x[0]===s.eng),pts=e[2].map((v,i)=>(i*80)+','+(170-v*5.5)).join(' ');
const pill=(on)=>'min-height:44px;padding:0 14px;border-radius:22px;font-size:14px;border:1px solid '+(on?'#111418':'#D5D9DF')+';background:'+(on?'#111418':'#fff')+';color:'+(on?'#fff':'#3B424C');
const rank=[['경쟁 A',27.6],['경쟁 B',14.9],['경쟁 C',14.4],['경쟁 D',11.2],['경쟁 E',8.1],['우리 브랜드',e[2][7]]].sort((a,b)=>b[1]-a[1]).map((r,i)=>({no:i+1,name:r[0],share:r[1],style:'display:flex;justify-content:space-between;padding:10px 12px;border-radius:8px;font-size:14px;'+(r[0]==='우리 브랜드'?'background:#EEF0FE;color:#1B2AA8;font-weight:700':'')}));
const PR=[['지역 + 서비스 추천 질문','1위 경쟁 A','우리 2위',120,'여러 곳이 언급되며, 경쟁 A가 먼저 소개되고 우리 브랜드는 두 번째로 "상담 과정이 자세하다"는 설명과 함께 나옵니다.','경쟁 A 홈페이지, 지역 커뮤니티 글'],['가격·비용을 묻는 질문','1위 경쟁 B','우리 5위',120,'비용 범위를 설명한 뒤 가격을 공개한 곳 위주로 소개합니다. 우리 브랜드는 마지막에 이름만 언급됩니다.','경쟁 B 가격 안내 페이지'],['증상·상황을 설명하는 질문','1위 우리','우리 1위',90,'상황에 맞는 선택 기준을 설명하고, 우리 브랜드의 안내 글을 근거로 첫 번째로 추천합니다.','우리 블로그 글 1건'],['비교를 요청하는 질문','1위 경쟁 A','미노출',90,'세 곳을 표로 비교하지만 우리 브랜드는 포함되지 않습니다.','비교 리뷰 사이트']];
const p=PR[s.sel];
const AG=[['신규 콘텐츠 작성','대상 질문에 직접 답하는 글의 초안을 만듭니다.'],['단계 맞춤형 작성','경쟁 인용 글을 먼저 조사한 뒤 고객 여정 단계에 맞춰 작성합니다.'],['기존 글 리프레시','블로그 주소만 넣으면 AI가 읽기 쉬운 구조로 다시 짭니다. 사실은 추가하지 않습니다.'],['2차 채널 요약본','다른 채널용 요약과 원문 링크를 만듭니다. 전문 복제 발행은 하지 않습니다.'],['인용 상위 페이지 분석','가장 많이 인용된 페이지의 구조를 분석해 개선 과제를 제시합니다.']];
const CT=[['비용 안내 글','가격·비용을 묻는 질문','차단 · "부작용이 전혀 없습니다" → 단정 표현\n주의 · "지역 최고 수준" → 최상급 표현\n수정 제안: 근거가 있는 범위의 표현으로 바꿉니다.'],['선택 기준 안내 글','비교를 요청하는 질문','주의 · 타 업체와 직접 비교하는 문장 1건\n수정 제안: 비교 대신 자체 기준을 설명합니다.'],['상담 과정 소개 글','지역 + 서비스 추천 질문','차단 · 고객 후기 형태의 서술 1건\n수정 제안: 후기 대신 절차 설명으로 바꿉니다.']];
const c=CT[s.cont],fx=!!s.fixed[s.cont],ok=!!s.ok[s.cont];
const T={insight:['분석 에이전트','매주 변동을 분석해 알려 드립니다',['인사이트','유형','기간','권장 조치'],[['Perplexity 점유율 상승','점유율 변동','지난 7일','인용된 글의 구조를 다른 글에 적용'],['비교 질문에서 미노출 지속','노출 공백','지난 30일','비교 기준 글 신규 작성'],['경쟁 B 가격 페이지 인용 증가','인용 추세','지난 14일','비용 안내 글 보강']]],prompts:['질문 관리','고객이 AI에 실제로 묻는 질문 세트',['질문','의도','측정 주기','상태'],[['지역 + 서비스 추천 질문','추천','48시간','활성'],['가격·비용을 묻는 질문','가격','48시간','활성'],['증상·상황을 설명하는 질문','정보','주 1회','활성'],['비교를 요청하는 질문','비교','주 1회','활성'],['해외 고객 질문(영어)','추천','주 1회','일시 중지']]],cites:['인용 출처','AI가 답을 만들 때 참고한 사이트',['도메인','인용 횟수','소유','추이'],[['경쟁 A 홈페이지','212','경쟁사','▲ 증가'],['지역 커뮤니티','164','제3자','변동 없음'],['우리 블로그','96','자사','▲ 증가'],['비교 리뷰 사이트','71','제3자','▼ 감소']]],opps:['노출 기회','점유율이 낮아 먼저 손볼 질문',['질문','현재 점유율','1위 브랜드','권장 조치'],[['비교를 요청하는 질문','0%','경쟁 A','비교 기준 글 작성'],['가격·비용을 묻는 질문','6%','경쟁 B','비용 안내 글 리프레시'],['해외 고객 질문(영어)','측정 전','—','측정 시작'],['야간·주말 이용 질문','9%','경쟁 C','운영 정보 구조화'],['후속 관리 질문','11%','경쟁 A','FAQ 추가']]],bots:['AI 봇 유입','AI 크롤러가 우리 페이지를 읽은 기록',['크롤러','방문 수','가장 많이 읽은 글','최근 방문'],[['GPTBot','520','선택 기준 안내 글','오늘'],['PerplexityBot','310','비용 안내 글','오늘'],['ClaudeBot','240','상담 과정 소개 글','어제'],['Google-Extended','170','선택 기준 안내 글','어제']]],blog:['블로그 관리','자체 도메인에 발행된 글과 색인 상태',['글','발행일','색인','AI 인용'],[['선택 기준 안내 글','11/03','완료','41회'],['비용 안내 글','11/10','완료','28회'],['상담 과정 소개 글','11/17','요청됨','—']]],brand:['브랜드 관리','브랜드·별칭·경쟁사 설정',['브랜드','별칭','추적 질문','역할'],[['우리 브랜드','별칭 3개','200개','소유자'],['2호점(예시)','별칭 2개','80개','편집자'],['고객사 B(화이트라벨)','별칭 1개','50개','고객 열람']]],settings:['설정','멤버·알림·결제·연동',['항목','현재 값','상태','비고'],[['요금제','Growth','활성','월 79만원(기획안)'],['주간 리포트','월요일 09:00 카카오톡','켜짐','이메일 대체 발송'],['승인 방식','카카오톡 링크 승인','켜짐','72시간 만료'],['2단계 인증','소유자·관리자 필수','켜짐','—'],['데이터 내보내기','CSV · API','사용 가능','원본 답변 포함']]]};
const t=T[s.nav];
const TITLES={home:['홈','지금 할 일과 이번 주 자동화'],share:['노출 점유율','같은 질문을 반복해서 물었을 때 우리 브랜드가 언급된 비율'],agents:['콘텐츠 에이전트','초안은 참고용이며 발행 전 검수를 거칩니다'],contents:['콘텐츠 검수','검수를 통과한 글만 승인할 수 있습니다'],attr:['문의·예약 귀속','AI 추천이 문의로 이어진 흐름']};
const tt=t?[t[0],t[1]]:TITLES[s.nav];
return {nav,title:tt[0],desc:tt[1],isHome:s.nav==='home',isShare:s.nav==='share',isAgents:s.nav==='agents',isContents:s.nav==='contents',isAttr:s.nav==='attr',isTable:!!t,
cards:[['측정','노출 점유율','새 인사이트 2건이 있습니다.','점유율 보기','share'],['실행','콘텐츠 에이전트','손볼 질문 5개가 있습니다.','에이전트 열기','agents'],['발행','콘텐츠 검수','검수 대기 글이 3건 있습니다.','검수하기','contents'],['귀속','문의·예약','AI 경유 문의 27건이 기록됐습니다.','흐름 보기','attr']].map(x=>({k:x[0],t:x[1],todo:x[2],cta:x[3],go:go(x[4])})),
week:[['월','09:00 주간 리포트\n09:00 인용 추세 분석'],['화','측정(48시간 주기)'],['수','—'],['목','09:00 기존 글 리프레시\n측정'],['금','—'],['토','측정'],['일','—']].map(x=>({day:x[0],jobs:x[1]})),
engs:E.map(x=>({label:x[1],style:pill(s.eng===x[0]),pick:()=>this.setState({eng:x[0]})})),engLabel:e[1],pts,area:'0,170 '+pts+' 560,170',rank,
tiles:[['노출 점유율',e[2][7]+'%','▲ '+(e[2][7]-e[2][0]).toFixed(1)+'%p · 표본 420회'],['평균 언급 순위',e[3]+'위','낮을수록 좋음'],['인용된 자사 URL',e[4]+'개','원본 답변에서 확인 가능'],['AI 경유 문의',e[5]+'건','전화·예약·상담 클릭']].map(x=>({k:x[0],v:x[1],sub:x[2]})),
prompts:PR.map((x,i)=>({q:x[0],top:x[1],mine:x[2],n:x[3],pick:()=>this.setState({sel:i}),style:'display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:12px;min-height:48px;align-items:center;font-size:14px;padding:0 10px;border:0;border-top:1px solid #EEF0F2;color:#111418;background:'+(s.sel===i?'#EEF0FE':'#fff')})),
evMeta:e[1]+' · 표본 '+p[3]+'회 중 1건 · 11/20 측정',evText:p[4],evCite:p[5],
credits:s.credits,agents:AG.map(a=>({t:a[0],d:a[1],run:()=>this.setState({credits:Math.min(50,s.credits+1),runs:[{t:a[0],s:'완료',w:'방금'}].concat(s.runs).slice(0,6)})})),runs:s.runs,
contents:CT.map((x,i)=>{const f=!!s.fixed[i],o=!!s.ok[i];return {t:x[0],verdict:o?'승인됨':f?'통과':'수정 필요',pick:()=>this.setState({cont:i}),tag:'font-size:12px;padding:3px 8px;border-radius:6px;white-space:nowrap;'+(f||o?'background:#E3F4EC;color:#0B6B49':'background:#FCEBEA;color:#A61B1B'),style:'min-height:56px;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:0 16px;border-radius:12px;font-size:14px;color:#111418;background:#fff;border:'+(s.cont===i?'2px solid #2B3FE0':'1px solid #E4E7EB')};}),
cTitle:c[0],cPrompt:c[1],cFindings:fx?'통과 · 지적된 문장이 수정 제안대로 바뀌었습니다.\n검수자 확인 후 승인할 수 있습니다.':c[2],canFix:!fx,canApprove:fx&&!ok,approved:ok,
fix:()=>this.setState({fixed:Object.assign({},s.fixed,{[s.cont]:true})}),approve:()=>this.setState({ok:Object.assign({},s.ok,{[s.cont]:true})}),
funnel:[['노출 점유율(전체 엔진)','18.4%',100],['AI 봇 방문','1,240회',78],['AI 경유 방문','312회',42],['문의·예약','27건',14]].map(x=>({k:x[0],v:x[1],bar:'height:14px;border-radius:6px;background:#2B3FE0;width:'+x[2]+'%'})),
h1:t?t[2][0]:'',h2:t?t[2][1]:'',h3:t?t[2][2]:'',h4:t?t[2][3]:'',rows:t?t[3].map(r=>({a:r[0],b:r[1],c:r[2],d:r[3]})):[]};
}
navStyle(on){return 'width:100%;min-height:44px;display:flex;justify-content:space-between;align-items:center;padding:0 10px;border:0;border-radius:8px;font-size:14px;text-align:left;color:#111418;background:'+(on?'#EEF0F2':'transparent')+';font-weight:'+(on?'700':'400');}
}

export default function Dashboard(props) {
  const v = useDC(Logic, props);
  return (
    <div style={{"width":"100%","minHeight":"100vh","display":"flex","flexWrap":"wrap","background":"#F6F7F8"}}>
      <aside style={{"flex":"1 1 220px","maxWidth":"100%","background":"#fff","borderRight":"1px solid #E4E7EB","padding":"20px 14px","display":"flex","flexDirection":"column","gap":"4px","boxSizing":"border-box"}}>
        <a href="/" style={{"fontFamily":"'Space Grotesk',sans-serif","fontWeight":"700","fontSize":"20px","color":"#111418","textDecoration":"none","padding":"4px 10px 12px"}}>
          {"ANSRA"}
          <span style={{"color":"#2B3FE0"}}>
            {"."}
          </span>
        </a>
        <div style={{"border":"1px solid #E4E7EB","borderRadius":"10px","padding":"10px 12px","fontSize":"14px","fontWeight":"500","marginBottom":"8px"}}>
          {"우리 브랜드 "}
          <span style={{"color":"#5B6470","fontWeight":"400"}}>
            {"· 예시 워크스페이스"}
          </span>
        </div>
        {(v.nav || []).map((n, $index) => (
          <Fragment key={$index}>
          <div>
            {n.head ? (
              <>
              <div style={{"fontSize":"12px","color":"#5B6470","padding":"12px 10px 4px"}}>
                {n.label}
              </div>
              </>
            ) : null}
            {n.link ? (
              <>
              <button onClick={n.go} style={css(n.style)}>
                <span>
                  {n.label}
                </span>
                <span style={css(n.badgeStyle)}>
                  {n.badge}
                </span>
              </button>
              </>
            ) : null}
          </div>
          </Fragment>
        ))}
      </aside>
      <main style={{"flex":"999 1 560px","minWidth":"0","padding":"28px","boxSizing":"border-box","display":"flex","flexDirection":"column","gap":"20px"}}>
        <div style={{"display":"flex","flexWrap":"wrap","gap":"12px","justifyContent":"space-between","alignItems":"center"}}>
          <div>
            <h1 style={{"margin":"0","fontSize":"24px","letterSpacing":"-0.02em"}}>
              {v.title}
            </h1>
            <div style={{"fontSize":"14px","color":"#5B6470","marginTop":"4px"}}>
              {v.desc}
            </div>
          </div>
          <div style={{"fontSize":"12px","color":"#5B6470","border":"1px solid #D5D9DF","borderRadius":"6px","padding":"5px 9px","background":"#fff"}}>
            {"예시 데이터 · 최근 30일"}
          </div>
        </div>
        {v.isHome ? (
          <>
          <div style={{"display":"flex","flexDirection":"column","gap":"20px"}}>
            <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(210px,1fr))","gap":"16px"}}>
              {(v.cards || []).map((c, $index) => (
                <Fragment key={$index}>
                <div style={{"background":"#fff","border":"1px solid #E4E7EB","borderRadius":"14px","padding":"20px","display":"flex","flexDirection":"column","gap":"10px"}}>
                  <div style={{"fontSize":"13px","color":"#2B3FE0","fontWeight":"700"}}>
                    {c.k}
                  </div>
                  <div style={{"fontWeight":"700","fontSize":"17px"}}>
                    {c.t}
                  </div>
                  <div style={{"fontSize":"14px","color":"#3B424C","lineHeight":"1.6","minHeight":"44px"}}>
                    {c.todo}
                  </div>
                  <button onClick={c.go} style={{"marginTop":"auto","minHeight":"44px","background":"#111418","color":"#fff","border":"0","borderRadius":"10px","fontSize":"14px","fontWeight":"500"}}>
                    {c.cta}
                  </button>
                </div>
                </Fragment>
              ))}
            </div>
            <div style={{"background":"#fff","border":"1px solid #E4E7EB","borderRadius":"14px","padding":"20px","display":"flex","flexDirection":"column","gap":"14px"}}>
              <div style={{"fontWeight":"700"}}>
                {"이번 주 자동화"}
              </div>
              <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(120px,1fr))","gap":"10px"}}>
                {(v.week || []).map((d, $index) => (
                  <Fragment key={$index}>
                  <div style={{"border":"1px solid #E4E7EB","borderRadius":"10px","padding":"10px","minHeight":"92px","display":"flex","flexDirection":"column","gap":"6px"}}>
                    <div style={{"fontSize":"12px","color":"#5B6470"}}>
                      {d.day}
                    </div>
                    <div style={{"fontSize":"13px","lineHeight":"1.5","color":"#1B2AA8","whiteSpace":"pre-line"}}>
                      {d.jobs}
                    </div>
                  </div>
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
          </>
        ) : null}
        {v.isShare ? (
          <>
          <div style={{"display":"flex","flexDirection":"column","gap":"20px"}}>
            <div style={{"display":"flex","flexWrap":"wrap","gap":"8px"}}>
              {(v.engs || []).map((e, $index) => (
                <Fragment key={$index}>
                <button onClick={e.pick} style={css(e.style)}>
                  {e.label}
                </button>
                </Fragment>
              ))}
            </div>
            <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(180px,1fr))","gap":"16px"}}>
              {(v.tiles || []).map((t, $index) => (
                <Fragment key={$index}>
                <div style={{"background":"#fff","border":"1px solid #E4E7EB","borderRadius":"14px","padding":"18px"}}>
                  <div style={{"fontSize":"13px","color":"#5B6470"}}>
                    {t.k}
                  </div>
                  <div style={{"fontFamily":"'Space Grotesk',sans-serif","fontSize":"32px","fontWeight":"700","letterSpacing":"-0.02em"}}>
                    {t.v}
                  </div>
                  <div style={{"fontSize":"12px","color":"#5B6470"}}>
                    {t.sub}
                  </div>
                </div>
                </Fragment>
              ))}
            </div>
            <div style={{"display":"flex","flexWrap":"wrap","gap":"16px"}}>
              <div style={{"flex":"2 1 420px","minWidth":"0","background":"#fff","border":"1px solid #E4E7EB","borderRadius":"14px","padding":"20px"}}>
                <div style={{"fontWeight":"700","marginBottom":"12px"}}>
                  {"노출 점유율 추이 · "}{v.engLabel}
                </div>
                <svg viewBox="0 0 560 180" role="img" aria-label="노출 점유율 추이 예시" style={{"width":"100%","height":"auto"}}>
                  <line x1="0" y1="170" x2="560" y2="170" stroke="#E4E7EB" />
                  <polygon points={v.area} fill="#2B3FE0" opacity="0.08" />
                  <polyline points={v.pts} fill="none" stroke="#2B3FE0" strokeWidth="3" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{"flex":"1 1 260px","background":"#fff","border":"1px solid #E4E7EB","borderRadius":"14px","padding":"20px","display":"flex","flexDirection":"column","gap":"8px"}}>
                <div style={{"fontWeight":"700","marginBottom":"4px"}}>
                  {"업계 랭킹"}
                </div>
                {(v.rank || []).map((r, $index) => (
                  <Fragment key={$index}>
                  <div style={css(r.style)}>
                    <span>
                      {r.no}{". "}{r.name}
                    </span>
                    <span style={{"fontWeight":"700"}}>
                      {r.share}{"%"}
                    </span>
                  </div>
                  </Fragment>
                ))}
              </div>
            </div>
            <div style={{"display":"flex","flexWrap":"wrap","gap":"16px"}}>
              <div style={{"flex":"2 1 420px","minWidth":"0","background":"#fff","border":"1px solid #E4E7EB","borderRadius":"14px","padding":"20px"}}>
                <div style={{"fontWeight":"700","marginBottom":"10px"}}>
                  {"질문별 순위 "}
                  <span style={{"fontWeight":"400","color":"#5B6470","fontSize":"13px"}}>
                    {"· 행을 누르면 원본 답변이 열립니다"}
                  </span>
                </div>
                <div style={{"overflowX":"auto"}}>
                  <div style={{"minWidth":"520px","display":"flex","flexDirection":"column"}}>
                    {(v.prompts || []).map((p, $index) => (
                      <Fragment key={$index}>
                      <button onClick={p.pick} style={css(p.style)}>
                        <span style={{"textAlign":"left"}}>
                          {p.q}
                        </span>
                        <span>
                          {p.top}
                        </span>
                        <span>
                          {p.mine}
                        </span>
                        <span>
                          {"표본 "}{p.n}
                        </span>
                      </button>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{"flex":"1 1 260px","background":"#fff","border":"1px solid #2B3FE0","borderRadius":"14px","padding":"20px","display":"flex","flexDirection":"column","gap":"10px"}}>
                <div style={{"fontWeight":"700"}}>
                  {"원본 답변 "}
                  <span style={{"fontWeight":"400","color":"#5B6470","fontSize":"12px"}}>
                    {"· 예시"}
                  </span>
                </div>
                <div style={{"fontSize":"13px","color":"#5B6470"}}>
                  {v.evMeta}
                </div>
                <p style={{"margin":"0","fontSize":"14px","lineHeight":"1.7","color":"#3B424C"}}>
                  {v.evText}
                </p>
                <div style={{"fontSize":"13px","color":"#3B424C"}}>
                  {"인용 출처: "}{v.evCite}
                </div>
              </div>
            </div>
          </div>
          </>
        ) : null}
        {v.isAgents ? (
          <>
          <div style={{"display":"flex","flexDirection":"column","gap":"20px"}}>
            <div style={{"fontSize":"14px","color":"#3B424C"}}>
              {"이번 달 크레딧 "}
              <strong>
                {v.credits}{" / 50"}
              </strong>
              {" 사용"}
            </div>
            <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(250px,1fr))","gap":"16px"}}>
              {(v.agents || []).map((a, $index) => (
                <Fragment key={$index}>
                <div style={{"background":"#fff","border":"1px solid #E4E7EB","borderRadius":"14px","padding":"20px","display":"flex","flexDirection":"column","gap":"8px"}}>
                  <div style={{"fontWeight":"700"}}>
                    {a.t}
                  </div>
                  <div style={{"fontSize":"14px","color":"#3B424C","lineHeight":"1.6","minHeight":"66px"}}>
                    {a.d}
                  </div>
                  <button onClick={a.run} style={{"minHeight":"44px","background":"#fff","border":"1px solid #111418","borderRadius":"10px","fontSize":"14px","fontWeight":"500"}}>
                    {"실행"}
                  </button>
                </div>
                </Fragment>
              ))}
            </div>
            <div style={{"background":"#fff","border":"1px solid #E4E7EB","borderRadius":"14px","padding":"20px"}}>
              <div style={{"fontWeight":"700","marginBottom":"8px"}}>
                {"실행 기록"}
              </div>
              {(v.runs || []).map((r, $index) => (
                <Fragment key={$index}>
                <div style={{"display":"flex","justifyContent":"space-between","gap":"12px","padding":"11px 0","borderTop":"1px solid #EEF0F2","fontSize":"14px"}}>
                  <span>
                    {r.t}
                  </span>
                  <span style={{"color":"#0B7A53"}}>
                    {"● "}{r.s}
                  </span>
                  <span style={{"color":"#5B6470"}}>
                    {r.w}
                  </span>
                </div>
                </Fragment>
              ))}
            </div>
          </div>
          </>
        ) : null}
        {v.isContents ? (
          <>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"16px"}}>
            <div style={{"flex":"1 1 300px","display":"flex","flexDirection":"column","gap":"10px"}}>
              {(v.contents || []).map((c, $index) => (
                <Fragment key={$index}>
                <button onClick={c.pick} style={css(c.style)}>
                  <span style={{"fontWeight":"500","textAlign":"left"}}>
                    {c.t}
                  </span>
                  <span style={css(c.tag)}>
                    {c.verdict}
                  </span>
                </button>
                </Fragment>
              ))}
            </div>
            <div style={{"flex":"2 1 420px","minWidth":"0","background":"#fff","border":"1px solid #E4E7EB","borderRadius":"14px","padding":"22px","display":"flex","flexDirection":"column","gap":"12px"}}>
              <div style={{"fontWeight":"700","fontSize":"18px"}}>
                {v.cTitle}
              </div>
              <div style={{"fontSize":"13px","color":"#5B6470"}}>
                {"대상 질문: "}{v.cPrompt}
              </div>
              <div style={{"fontWeight":"700","fontSize":"14px","marginTop":"6px"}}>
                {"규제 검수 결과 "}
                <span style={{"fontWeight":"400","color":"#5B6470"}}>
                  {"· 규칙팩 초안 v0.1"}
                </span>
              </div>
              <div style={{"fontSize":"14px","lineHeight":"1.8","color":"#3B424C","whiteSpace":"pre-line","background":"#F6F7F8","borderRadius":"10px","padding":"14px"}}>
                {v.cFindings}
              </div>
              <div style={{"display":"flex","flexWrap":"wrap","gap":"10px"}}>
                {v.canFix ? (
                  <>
                  <button onClick={v.fix} style={{"minHeight":"44px","padding":"0 16px","background":"#fff","border":"1px solid #111418","borderRadius":"10px","fontSize":"14px","fontWeight":"500"}}>
                    {"수정 제안 적용"}
                  </button>
                  </>
                ) : null}
                {v.canApprove ? (
                  <>
                  <button onClick={v.approve} style={{"minHeight":"44px","padding":"0 16px","background":"#2B3FE0","color":"#fff","border":"0","borderRadius":"10px","fontSize":"14px","fontWeight":"500"}}>
                    {"승인하고 발행 예약"}
                  </button>
                  </>
                ) : null}
                {v.approved ? (
                  <>
                  <div style={{"minHeight":"44px","display":"flex","alignItems":"center","color":"#0B7A53","fontWeight":"500","fontSize":"14px"}}>
                    {"승인됨 · 감사 로그에 기록됨"}
                  </div>
                  </>
                ) : null}
              </div>
              <div style={{"fontSize":"12px","color":"#5B6470"}}>
                {"자동 검수는 법률 자문을 대신하지 않습니다."}
              </div>
            </div>
          </div>
          </>
        ) : null}
        {v.isAttr ? (
          <>
          <div style={{"background":"#fff","border":"1px solid #E4E7EB","borderRadius":"14px","padding":"24px","display":"flex","flexDirection":"column","gap":"16px"}}>
            {(v.funnel || []).map((f, $index) => (
              <Fragment key={$index}>
              <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                <div style={{"display":"flex","justifyContent":"space-between","fontSize":"14px"}}>
                  <span>
                    {f.k}
                  </span>
                  <strong>
                    {f.v}
                  </strong>
                </div>
                <div style={{"background":"#EEF0F2","borderRadius":"6px","height":"14px"}}>
                  <div style={css(f.bar)}></div>
                </div>
              </div>
              </Fragment>
            ))}
            <div style={{"fontSize":"13px","color":"#5B6470","lineHeight":"1.7"}}>
              {"AI 답변을 보고 바로 전화한 경우처럼 직접 측정할 수 없는 구간은 포함되지 않습니다. 이 수치는 상관관계이며 인과를 뜻하지 않습니다."}
            </div>
          </div>
          </>
        ) : null}
        {v.isTable ? (
          <>
          <div style={{"background":"#fff","border":"1px solid #E4E7EB","borderRadius":"14px","padding":"20px","overflowX":"auto"}}>
            <div style={{"minWidth":"560px"}}>
              <div style={{"display":"grid","gridTemplateColumns":"2fr 1fr 1fr 1fr","gap":"12px","fontSize":"12px","color":"#5B6470","paddingBottom":"10px"}}>
                <span>
                  {v.h1}
                </span>
                <span>
                  {v.h2}
                </span>
                <span>
                  {v.h3}
                </span>
                <span>
                  {v.h4}
                </span>
              </div>
              {(v.rows || []).map((r, $index) => (
                <Fragment key={$index}>
                <div style={{"display":"grid","gridTemplateColumns":"2fr 1fr 1fr 1fr","gap":"12px","fontSize":"14px","padding":"13px 0","borderTop":"1px solid #EEF0F2","lineHeight":"1.5"}}>
                  <span style={{"fontWeight":"500"}}>
                    {r.a}
                  </span>
                  <span>
                    {r.b}
                  </span>
                  <span>
                    {r.c}
                  </span>
                  <span style={{"color":"#3B424C"}}>
                    {r.d}
                  </span>
                </div>
                </Fragment>
              ))}
            </div>
          </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
