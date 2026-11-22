'use client';
// Ported from the design mockup. Sample data lives in the logic class below.
import { Fragment } from 'react';
import { DCLogic, useDC, css } from '../lib/dc';
import { submitLead } from '../app/actions';
class Logic extends DCLogic {
constructor(p){super(p);this.state={i:0,tab:'all',step:0,yearly:false,open:0,sent:false,error:'',demo:false};}
componentDidMount(){this.t=setInterval(()=>this.setState({i:(this.state.i+1)%6}),2200);}
componentWillUnmount(){clearInterval(this.t);}
async send(e){e.preventDefault();this.setState({error:''});const r=await submitLead(new FormData(e.currentTarget));if(r.ok)this.setState({sent:true,demo:!!r.demo});else this.setState({error:r.message});}
renderVals(){
const s=this.state;
const engines=['ChatGPT','Gemini','Perplexity','Claude','네이버 AI 브리핑','구글 AI 개요'];
const D={all:{l:'전체',d:[9,10,12,13,15,16,17,18.4],b:'1,240',v:'312',q:'27'},gpt:{l:'ChatGPT',d:[11,12,14,15,17,19,20,21],b:'520',v:'148',q:'13'},nav:{l:'네이버 AI 브리핑',d:[3,4,5,6,7,8,9,9.6],b:'—',v:'96',q:'9'},ppx:{l:'Perplexity',d:[14,15,18,19,21,22,24,24.5],b:'310',v:'68',q:'5'}};
const cur=D[s.tab];const pts=cur.d.map((v,i)=>(i*80)+','+(140-v*5)).join(' ');
const pill=(on)=>'min-height:44px;padding:0 14px;border-radius:22px;font-size:14px;border:1px solid '+(on?'#111418':'#D5D9DF')+';background:'+(on?'#111418':'#fff')+';color:'+(on?'#fff':'#3B424C');
const ST=[['측정','측정: 같은 질문을 반복해서 묻습니다','고객이 실제로 할 법한 질문을 엔진마다 여러 번 물어, 우리 브랜드가 언급된 비율과 순서, 인용된 출처를 기록합니다. 한 번의 답이 아니라 비율로 봅니다.'],['실행','실행: 빈 곳을 찾아 초안을 만듭니다','노출이 낮은 질문과 경쟁사가 인용되는 출처를 찾아, 그 질문에 직접 답하는 글의 초안을 만듭니다. 제공받지 않은 사실은 지어내지 않습니다.'],['발행','발행: 검수를 통과한 글만 올립니다','업종별 광고 규칙으로 자동 검수한 뒤 담당자가 승인하면, AI 크롤러가 읽을 수 있는 자체 도메인에 발행합니다.'],['귀속','귀속: 문의까지 이어졌는지 봅니다','AI 봇 방문, AI에서 넘어온 방문, 전화·예약 클릭을 연결해 보여 줍니다. 측정할 수 없는 구간은 측정 불가로 표시합니다.']];
const P=[['Starter','직접 운영하는 소규모 사업자',29,'질문 50개 추적','콘텐츠 초안 8건','주간 리포트'],['Growth','성과를 숫자로 보고해야 하는 팀',79,'질문 200개 추적','콘텐츠 초안 24건','귀속 대시보드'],['Managed','운영을 맡기고 싶은 곳',129,'질문 200개 추적','콘텐츠 36건 + 사람 검수','전담 매니저'],['Agency','여러 고객사를 관리하는 대행사',199,'브랜드 10개 포함','화이트라벨 리포트','추가 브랜드 12만원']];
const F=[['효과가 나오기까지 얼마나 걸리나요?','엔진과 업종에 따라 다릅니다. 실제 고객 데이터가 쌓이면 구간별 수치로 안내할 예정이며, 지금은 기간을 약속하지 않습니다.'],['수치는 어떻게 검증하나요?','모든 수치에 표본 수와 측정 시각이 붙고, 원본 답변을 그대로 열어 볼 수 있습니다. 원자료는 CSV로 내려받을 수 있습니다.'],['기존 대행사와 함께 쓸 수 있나요?','가능합니다. 대행사가 직접 쓰는 화이트라벨 요금제도 있습니다.'],['자동 검수를 통과하면 광고 규제상 문제가 없나요?','아닙니다. 자동 검수는 위험 표현을 먼저 걸러 주는 도구이며 법률 자문을 대신하지 않습니다.']];
return {engine:engines[s.i],heroShare:cur.d[7],heroDelta:(cur.d[7]-cur.d[0]).toFixed(1),heroPts:pts,heroArea:'0,140 '+pts+' 560,140',heroBots:cur.b,heroVisits:cur.v,heroLeads:cur.q,
tabs:Object.keys(D).map(k=>({label:D[k].l,style:pill(s.tab===k),pick:()=>this.setState({tab:k})})),
steps:ST.map((x,i)=>({label:(i+1)+'. '+x[0],style:pill(s.step===i),pick:()=>this.setState({step:i})})),stepTitle:ST[s.step][1],stepBody:ST[s.step][2],
setMonthly:()=>this.setState({yearly:false}),setYearly:()=>this.setState({yearly:true}),monthlyStyle:pill(!s.yearly),yearlyStyle:pill(s.yearly),
plans:P.map((p,i)=>({name:p[0],who:p[1],price:s.yearly?Math.round(p[2]*10/12):p[2],f1:p[3],f2:p[4],f3:p[5],card:'border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:14px;background:#fff;border:'+(i===1?'2px solid #2B3FE0':'1px solid #E4E7EB')})),
faqs:F.map((f,i)=>({q:f[0],a:f[1],open:s.open===i,mark:s.open===i?'−':'+',toggle:()=>this.setState({open:s.open===i?-1:i})})),
sent:s.sent,notSent:!s.sent,send:(e)=>this.send(e),error:s.error,formNote:this.props.leadsEnabled?'입력하신 정보는 진단 상담 목적으로만 저장됩니다.':'데모 모드입니다. 입력한 내용은 저장되지 않습니다.',sentTitle:s.demo?'데모 모드: 저장되지 않았습니다':'신청이 접수되었습니다',sentBody:s.demo?'접수 기능이 꺼져 있어 입력 내용은 어디에도 저장되지 않았습니다.':'1영업일 안에 연락드리겠습니다.',reset:()=>this.setState({sent:false})};
}
}

export default function Landing(props) {
  const v = useDC(Logic, props);
  return (
    <div style={{"width":"100%","background":"#FBFBFA"}}>
      <header style={{"maxWidth":"1160px","margin":"0 auto","padding":"20px 24px","display":"flex","flexWrap":"wrap","gap":"16px","alignItems":"center","justifyContent":"space-between"}}>
        <div style={{"fontFamily":"'Space Grotesk',sans-serif","fontWeight":"700","fontSize":"22px","letterSpacing":"-0.02em"}}>
          {"ANSRA"}
          <span style={{"color":"#2B3FE0"}}>
            {"."}
          </span>
        </div>
        <nav style={{"display":"flex","flexWrap":"wrap","gap":"24px","alignItems":"center","fontSize":"15px"}}>
          <a href="#diff" style={{"color":"#3B424C","textDecoration":"none"}}>
            {"차별점"}
          </a>
          <a href="#how" style={{"color":"#3B424C","textDecoration":"none"}}>
            {"작동 방식"}
          </a>
          <a href="#price" style={{"color":"#3B424C","textDecoration":"none"}}>
            {"요금제"}
          </a>
          <a href="/dashboard" style={{"color":"#3B424C","textDecoration":"none"}}>
            {"대시보드 보기"}
          </a>
          <a href="#apply" style={{"background":"#111418","color":"#fff","textDecoration":"none","padding":"12px 18px","borderRadius":"10px","fontWeight":"500"}}>
            {"무료 진단 받기"}
          </a>
        </nav>
      </header>
      <section style={{"maxWidth":"1160px","margin":"0 auto","padding":"56px 24px 72px","display":"flex","flexWrap":"wrap","gap":"48px","alignItems":"center"}}>
        <div style={{"flex":"1 1 440px","display":"flex","flexDirection":"column","gap":"22px"}}>
          <div style={{"fontSize":"14px","color":"#3B424C","display":"flex","gap":"8px","alignItems":"center"}}>
            <span style={{"width":"8px","height":"8px","borderRadius":"50%","background":"#2B3FE0","display":"inline-block"}}></span>
            {"지금 측정 중인 엔진 · "}
            <strong style={{"color":"#111418"}}>
              {v.engine}
            </strong>
          </div>
          <h1 style={{"margin":"0","fontSize":"52px","lineHeight":"1.18","letterSpacing":"-0.03em","fontWeight":"700"}}>
            {"AI가 추천했는지에서"}
            <br />
            {"문의로 이어졌는지까지"}
          </h1>
          <p style={{"margin":"0","fontSize":"18px","lineHeight":"1.7","color":"#3B424C","maxWidth":"520px"}}>
            {"AI 검색 6곳에서 우리 브랜드가 얼마나 추천되는지 재고, 콘텐츠로 올리고, 그 추천이 실제 문의·예약이 됐는지 한 화면에서 확인합니다."}
          </p>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"12px"}}>
            <a href="#apply" style={{"background":"#2B3FE0","color":"#fff","textDecoration":"none","padding":"15px 24px","borderRadius":"10px","fontWeight":"500","fontSize":"16px"}}>
              {"무료 진단 받기"}
            </a>
            <a href="/dashboard" style={{"background":"#fff","color":"#111418","textDecoration":"none","padding":"15px 24px","borderRadius":"10px","fontWeight":"500","fontSize":"16px","border":"1px solid #D5D9DF"}}>
              {"대시보드 미리보기"}
            </a>
          </div>
          <div style={{"fontSize":"13px","color":"#5B6470"}}>
            {"도입비 없음 · 월 단위 해지 · 부가세 별도"}
          </div>
        </div>
        <div style={{"flex":"1 1 440px","background":"#fff","border":"1px solid #E4E7EB","borderRadius":"16px","padding":"24px","display":"flex","flexDirection":"column","gap":"18px","boxShadow":"0 1px 2px rgba(0,0,0,.05)"}}>
          <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
            <div style={{"fontWeight":"700"}}>
              {"노출 점유율"}
            </div>
            <div style={{"fontSize":"12px","color":"#5B6470","border":"1px solid #E4E7EB","borderRadius":"6px","padding":"4px 8px"}}>
              {"예시 화면"}
            </div>
          </div>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"8px"}}>
            {(v.tabs || []).map((t, $index) => (
              <Fragment key={$index}>
              <button onClick={t.pick} style={css(t.style)}>
                {t.label}
              </button>
              </Fragment>
            ))}
          </div>
          <div style={{"display":"flex","alignItems":"baseline","gap":"12px"}}>
            <div style={{"fontFamily":"'Space Grotesk',sans-serif","fontSize":"56px","fontWeight":"700","letterSpacing":"-0.03em"}}>
              {v.heroShare}{"%"}
            </div>
            <div style={{"color":"#0B7A53","fontWeight":"500"}}>
              {"▲ "}{v.heroDelta}{"%p · 30일"}
            </div>
          </div>
          <svg viewBox="0 0 560 150" role="img" aria-label="노출 점유율 30일 추이 예시" style={{"width":"100%","height":"auto"}}>
            <polygon points={v.heroArea} fill="#2B3FE0" opacity="0.08" />
            <polyline points={v.heroPts} fill="none" stroke="#2B3FE0" strokeWidth="3" strokeLinejoin="round" />
          </svg>
          <div style={{"display":"grid","gridTemplateColumns":"repeat(3,minmax(0,1fr))","gap":"12px"}}>
            <div style={{"background":"#F4F5F7","borderRadius":"10px","padding":"12px"}}>
              <div style={{"fontSize":"12px","color":"#5B6470"}}>
                {"AI 봇 방문"}
              </div>
              <div style={{"fontWeight":"700","fontSize":"18px"}}>
                {v.heroBots}
              </div>
            </div>
            <div style={{"background":"#F4F5F7","borderRadius":"10px","padding":"12px"}}>
              <div style={{"fontSize":"12px","color":"#5B6470"}}>
                {"AI 경유 방문"}
              </div>
              <div style={{"fontWeight":"700","fontSize":"18px"}}>
                {v.heroVisits}
              </div>
            </div>
            <div style={{"background":"#EEF0FE","borderRadius":"10px","padding":"12px"}}>
              <div style={{"fontSize":"12px","color":"#2B3FE0"}}>
                {"문의·예약"}
              </div>
              <div style={{"fontWeight":"700","fontSize":"18px","color":"#1B2AA8"}}>
                {v.heroLeads}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="diff" style={{"background":"#fff","borderTop":"1px solid #E4E7EB","borderBottom":"1px solid #E4E7EB"}}>
        <div style={{"maxWidth":"1160px","margin":"0 auto","padding":"72px 24px","display":"flex","flexDirection":"column","gap":"36px"}}>
          <h2 style={{"margin":"0","fontSize":"34px","letterSpacing":"-0.02em"}}>
            {"기존 GEO 서비스가 비워 둔 네 가지"}
          </h2>
          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(240px,1fr))","gap":"20px"}}>
            <div style={{"border":"1px solid #E4E7EB","borderRadius":"14px","padding":"24px","display":"flex","flexDirection":"column","gap":"10px"}}>
              <div style={{"fontFamily":"'Space Grotesk',sans-serif","color":"#2B3FE0","fontWeight":"700"}}>
                {"01"}
              </div>
              <h3 style={{"margin":"0","fontSize":"19px"}}>
                {"국내 검색까지 측정"}
              </h3>
              <p style={{"margin":"0","color":"#3B424C","lineHeight":"1.65","fontSize":"15px"}}>
                {"ChatGPT·Gemini·Perplexity·Claude에 네이버 AI 브리핑과 구글 AI 개요를 더해 봅니다."}
              </p>
            </div>
            <div style={{"border":"1px solid #E4E7EB","borderRadius":"14px","padding":"24px","display":"flex","flexDirection":"column","gap":"10px"}}>
              <div style={{"fontFamily":"'Space Grotesk',sans-serif","color":"#2B3FE0","fontWeight":"700"}}>
                {"02"}
              </div>
              <h3 style={{"margin":"0","fontSize":"19px"}}>
                {"문의·예약 귀속"}
              </h3>
              <p style={{"margin":"0","color":"#3B424C","lineHeight":"1.65","fontSize":"15px"}}>
                {"AI 봇 방문, AI 경유 방문, 전화·예약 클릭을 하나의 흐름으로 연결합니다."}
              </p>
            </div>
            <div style={{"border":"1px solid #E4E7EB","borderRadius":"14px","padding":"24px","display":"flex","flexDirection":"column","gap":"10px"}}>
              <div style={{"fontFamily":"'Space Grotesk',sans-serif","color":"#2B3FE0","fontWeight":"700"}}>
                {"03"}
              </div>
              <h3 style={{"margin":"0","fontSize":"19px"}}>
                {"원본 답변 공개"}
              </h3>
              <p style={{"margin":"0","color":"#3B424C","lineHeight":"1.65","fontSize":"15px"}}>
                {"모든 수치에 표본 수와 측정 시각, AI가 실제로 한 답변을 붙여 드립니다."}
              </p>
            </div>
            <div style={{"border":"1px solid #E4E7EB","borderRadius":"14px","padding":"24px","display":"flex","flexDirection":"column","gap":"10px"}}>
              <div style={{"fontFamily":"'Space Grotesk',sans-serif","color":"#2B3FE0","fontWeight":"700"}}>
                {"04"}
              </div>
              <h3 style={{"margin":"0","fontSize":"19px"}}>
                {"발행 전 규제 검수"}
              </h3>
              <p style={{"margin":"0","color":"#3B424C","lineHeight":"1.65","fontSize":"15px"}}>
                {"업종별 광고 규칙으로 먼저 걸러내고, 누가 무엇을 근거로 승인했는지 남깁니다."}
              </p>
            </div>
          </div>
        </div>
      </section>
      <section id="how" style={{"maxWidth":"1160px","margin":"0 auto","padding":"72px 24px","display":"flex","flexDirection":"column","gap":"28px"}}>
        <h2 style={{"margin":"0","fontSize":"34px","letterSpacing":"-0.02em"}}>
          {"네 단계로 돌아갑니다"}
        </h2>
        <div style={{"display":"flex","flexWrap":"wrap","gap":"10px"}}>
          {(v.steps || []).map((s, $index) => (
            <Fragment key={$index}>
            <button onClick={s.pick} style={css(s.style)}>
              {s.label}
            </button>
            </Fragment>
          ))}
        </div>
        <div style={{"background":"#fff","border":"1px solid #E4E7EB","borderRadius":"14px","padding":"28px","display":"flex","flexDirection":"column","gap":"10px","minHeight":"120px"}}>
          <h3 style={{"margin":"0","fontSize":"22px"}}>
            {v.stepTitle}
          </h3>
          <p style={{"margin":"0","color":"#3B424C","lineHeight":"1.7","fontSize":"16px","maxWidth":"760px"}}>
            {v.stepBody}
          </p>
        </div>
      </section>
      <section id="price" style={{"background":"#fff","borderTop":"1px solid #E4E7EB","borderBottom":"1px solid #E4E7EB"}}>
        <div style={{"maxWidth":"1160px","margin":"0 auto","padding":"72px 24px","display":"flex","flexDirection":"column","gap":"28px"}}>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"16px","justifyContent":"space-between","alignItems":"end"}}>
            <h2 style={{"margin":"0","fontSize":"34px","letterSpacing":"-0.02em"}}>
              {"요금제"}
            </h2>
            <div style={{"display":"flex","gap":"8px","alignItems":"center","fontSize":"14px","color":"#3B424C"}}>
              <button onClick={v.setMonthly} style={css(v.monthlyStyle)}>
                {"월 결제"}
              </button>
              <button onClick={v.setYearly} style={css(v.yearlyStyle)}>
                {"연 결제 (2개월 할인)"}
              </button>
            </div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(230px,1fr))","gap":"20px"}}>
            {(v.plans || []).map((p, $index) => (
              <Fragment key={$index}>
              <div style={css(p.card)}>
                <div style={{"fontWeight":"700","fontSize":"18px"}}>
                  {p.name}
                </div>
                <div style={{"fontSize":"14px","color":"#5B6470","minHeight":"42px","lineHeight":"1.5"}}>
                  {p.who}
                </div>
                <div style={{"display":"flex","alignItems":"baseline","gap":"6px"}}>
                  <span style={{"fontFamily":"'Space Grotesk',sans-serif","fontSize":"38px","fontWeight":"700","letterSpacing":"-0.03em"}}>
                    {p.price}
                  </span>
                  <span style={{"color":"#5B6470","fontSize":"14px"}}>
                    {"만원 / 월"}
                  </span>
                </div>
                <div style={{"fontSize":"14px","lineHeight":"1.9","color":"#3B424C"}}>
                  {p.f1}
                  <br />
                  {p.f2}
                  <br />
                  {p.f3}
                </div>
                <a href="#apply" style={{"marginTop":"auto","textAlign":"center","background":"#111418","color":"#fff","textDecoration":"none","padding":"13px","borderRadius":"10px","fontWeight":"500"}}>
                  {"시작하기"}
                </a>
              </div>
              </Fragment>
            ))}
          </div>
          <div style={{"fontSize":"13px","color":"#5B6470"}}>
            {"부가세 별도 · 도입비 없음 · 가격은 기획안 기준이며 확정 전입니다."}
          </div>
        </div>
      </section>
      <section style={{"maxWidth":"860px","margin":"0 auto","padding":"72px 24px","display":"flex","flexDirection":"column","gap":"20px"}}>
        <h2 style={{"margin":"0","fontSize":"34px","letterSpacing":"-0.02em"}}>
          {"자주 묻는 질문"}
        </h2>
        {(v.faqs || []).map((f, $index) => (
          <Fragment key={$index}>
          <div style={{"borderBottom":"1px solid #E4E7EB"}}>
            <button onClick={f.toggle} aria-expanded={f.open} style={{"width":"100%","background":"none","border":"0","padding":"18px 0","minHeight":"44px","display":"flex","justifyContent":"space-between","gap":"16px","textAlign":"left","fontSize":"17px","fontWeight":"500","color":"#111418"}}>
              <span>
                {f.q}
              </span>
              <span aria-hidden="true">
                {f.mark}
              </span>
            </button>
            {f.open ? (
              <>
              <p style={{"margin":"0 0 18px","color":"#3B424C","lineHeight":"1.7","fontSize":"15px"}}>
                {f.a}
              </p>
              </>
            ) : null}
          </div>
          </Fragment>
        ))}
      </section>
      <section id="apply" style={{"background":"#111418","color":"#fff"}}>
        <div style={{"maxWidth":"1160px","margin":"0 auto","padding":"72px 24px","display":"flex","flexWrap":"wrap","gap":"48px"}}>
          <div style={{"flex":"1 1 360px","display":"flex","flexDirection":"column","gap":"16px"}}>
            <h2 style={{"margin":"0","fontSize":"34px","letterSpacing":"-0.02em"}}>
              {"무료 진단 신청"}
            </h2>
            <p style={{"margin":"0","color":"#C9CED6","lineHeight":"1.7"}}>
              {"질문 20개를 엔진 4곳에 물어 현재 노출 점유율, 경쟁 브랜드 순위, AI가 인용한 출처를 정리해 드립니다."}
            </p>
          </div>
          <div style={{"flex":"1 1 400px","background":"#fff","color":"#111418","borderRadius":"16px","padding":"28px"}}>
            {v.notSent ? (
              <>
              <form onSubmit={v.send} style={{"display":"flex","flexDirection":"column","gap":"14px"}}>
                <label style={{"display":"flex","flexDirection":"column","gap":"6px","fontSize":"14px","fontWeight":"500"}}>
                  {"이름"}
                  <input type="text" name="name" required maxLength="80" style={{"padding":"13px","border":"1px solid #C5CAD2","borderRadius":"10px","fontSize":"15px"}} />
                </label>
                <label style={{"display":"flex","flexDirection":"column","gap":"6px","fontSize":"14px","fontWeight":"500"}}>
                  {"연락처"}
                  <input type="tel" name="phone" required minLength="7" maxLength="20" style={{"padding":"13px","border":"1px solid #C5CAD2","borderRadius":"10px","fontSize":"15px"}} />
                </label>
                <label style={{"display":"flex","flexDirection":"column","gap":"6px","fontSize":"14px","fontWeight":"500"}}>
                  {"상호"}
                  <input type="text" name="company" required maxLength="120" style={{"padding":"13px","border":"1px solid #C5CAD2","borderRadius":"10px","fontSize":"15px"}} />
                </label>
                <label style={{"display":"flex","flexDirection":"column","gap":"6px","fontSize":"14px","fontWeight":"500"}}>
                  {"역할"}
                  <select name="role" style={{"padding":"13px","border":"1px solid #C5CAD2","borderRadius":"10px","fontSize":"15px","background":"#fff"}}>
                    <option>
                      {"대표"}
                    </option>
                    <option>
                      {"마케팅 담당"}
                    </option>
                    <option>
                      {"마케팅 대행사"}
                    </option>
                    <option>
                      {"기타"}
                    </option>
                  </select>
                </label>
                <label style={{"display":"flex","gap":"10px","alignItems":"center","fontSize":"14px","minHeight":"44px"}}>
                  <input type="checkbox" name="consent" required style={{"width":"18px","height":"18px"}} />
                  {"개인정보 수집·이용에 동의합니다 (필수)"}
                </label>
                {v.error ? (
                  <>
                  <div role="alert" style={{"color":"#A61B1B","fontSize":"14px"}}>
                    {v.error}
                  </div>
                  </>
                ) : null}
                <button type="submit" style={{"background":"#2B3FE0","color":"#fff","border":"0","padding":"15px","borderRadius":"10px","fontSize":"16px","fontWeight":"500"}}>
                  {"무료 진단 신청하기"}
                </button>
                <div style={{"fontSize":"12px","color":"#5B6470"}}>
                  {v.formNote}
                </div>
              </form>
              </>
            ) : null}
            {v.sent ? (
              <>
              <div style={{"display":"flex","flexDirection":"column","gap":"12px","padding":"32px 0"}}>
                <div style={{"fontSize":"22px","fontWeight":"700"}}>
                  {v.sentTitle}
                </div>
                <p style={{"margin":"0","color":"#3B424C","lineHeight":"1.7"}}>
                  {v.sentBody}
                </p>
                <button onClick={v.reset} style={{"alignSelf":"flex-start","background":"#fff","border":"1px solid #C5CAD2","padding":"12px 16px","borderRadius":"10px","fontSize":"15px"}}>
                  {"다시 작성"}
                </button>
              </div>
              </>
            ) : null}
          </div>
        </div>
      </section>
      <footer style={{"maxWidth":"1160px","margin":"0 auto","padding":"28px 24px","fontSize":"13px","color":"#5B6470"}}>
        {"ANSRA는 가칭입니다 · [사업자 정보] · [이용약관] · [개인정보처리방침]"}
      </footer>
    </div>
  );
}
