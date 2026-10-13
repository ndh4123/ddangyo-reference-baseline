import { SiteFooter } from '../components/SiteFooter';

// 개인정보 처리방침(/privacy). 「개인정보 보호법」 제30조·시행령 제31조 항목, 국외 이전은 법 제28조의8 제1항 제3호(처리방침 공개) 방식.
// 신청 폼(/form)과 이 페이지의 푸터 「개인정보처리방침」, 신청 폼 동의 「내용보기」가 여기로 온다(홈페이지 푸터에는 링크 없음).
// 내용을 고치면 신청 폼(src/form/FormPage.tsx)의 동의 「내용보기」 문구와 맞는지 같이 본다.

// 시행일 = 운영에 배포하는 날.
const EFFECTIVE_DATE = '2026년 10월 14일';

export function PrivacyPage() {
  return (
    <>
      {/* 머리글(땡겨요 로고) 없이 문서만 둔다(사용자 결정 2026-10-14). */}
      <main className="privacy">
        <article className="privacy__inner">
          <h1>개인정보 처리방침</h1>
          {/* 신청서 주소는 처리방침 어디에도 적지 않는다(카톡 상담에서만 안내). */}
          <p className="privacy__lead">
            <strong>더잘함M&amp;F</strong>(이하 "회사")는 카카오톡으로 땡겨요 입점 상담을 문의하신 사장님께 별도로 안내하는 상담 신청서를 통해 개인정보를 처리하며,
            「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 관련 고충을 신속하게 처리하기 위해 다음과 같이 개인정보 처리방침을 정하여 공개합니다.
            땡겨요 입점 안내 홈페이지(https://ddangyo.helpceo.kr)에서는 개인정보를 수집하지 않습니다.
          </p>

          <section>
            <h2>제1조 개인정보의 처리 목적</h2>
            <p>회사는 다음 목적을 위해서만 개인정보를 처리하며, 목적이 바뀌면 미리 동의를 받습니다.</p>
            <ol>
              <li>땡겨요 입점 상담 신청 접수 및 상담 연락</li>
              <li>담당 매니저 배정, 입점 절차 안내 및 입점 지원</li>
              <li>입점 후 매장 관리·사후관리 및 운영 컨설팅</li>
            </ol>
          </section>

          <section>
            <h2>제2조 처리하는 개인정보 항목</h2>
            <div className="privacy__table">
              <table>
                <thead><tr><th>구분</th><th>항목</th><th>수집 방법</th></tr></thead>
                <tbody>
                  <tr><td>필수</td><td>매장명(상호), 휴대폰 번호, 매장 주소, 현재 이용 중인 배달앱</td><td>상담 신청서(카카오톡 상담에서 안내받은 사장님만 이용)</td></tr>
                  <tr><td>자동 생성</td><td>접수 일시, 접수 경로 표시</td><td>신청 시 자동 기록</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>제3조 개인정보의 처리 및 보유 기간</h2>
            <ul>
              <li>상담, 입점 및 매장 관리가 끝날 때까지 보유하며, <strong>끝난 날부터 6개월이 지나면 파기</strong>합니다.</li>
              <li>입점하지 않은 상담도 상담이 끝난 날부터 6개월이 지나면 파기합니다.</li>
            </ul>
          </section>

          <section>
            <h2>제4조 개인정보의 제3자 제공</h2>
            <ul>
              <li>회사는 <strong>상담 단계에서 이용자의 개인정보를 제3자에게 제공하지 않습니다.</strong></li>
              <li>땡겨요에 입점하시는 경우, 입점에 필요한 개인정보 제공·이용 동의는 땡겨요 입점 계약서에서 별도로 받습니다.</li>
              <li>법률에 특별한 규정이 있는 경우에는 그에 따라 제공할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2>제5조 개인정보 처리의 위탁</h2>
            <p>회사는 원활한 상담 접수를 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
            <div className="privacy__table">
              <table>
                <thead><tr><th>수탁자</th><th>위탁 업무</th></tr></thead>
                <tbody>
                  <tr><td>Google LLC</td><td>상담 신청 내용 보관(Google Sheets), 접수 알림 메일 발송(Gmail)</td></tr>
                  <tr><td>n8n GmbH</td><td>상담 신청 접수 자동 처리(시트 저장·알림 연결)</td></tr>
                  <tr><td>Cloudflare, Inc.</td><td>웹사이트 운영 및 신청 내용 전송</td></tr>
                  <tr><td>주식회사 카카오</td><td>접수 알림 메시지 발송(카카오톡 「나에게 보내기」)</td></tr>
                </tbody>
              </table>
            </div>
            <p>위탁 시 개인정보가 안전하게 관리되도록 필요한 사항을 정하고, 수탁자가 바뀌면 이 방침으로 알립니다.</p>
          </section>

          <section>
            <h2>제6조 개인정보의 국외 이전</h2>
            <p>
              위 수탁자의 서버가 국외에 있어 다음과 같이 개인정보를 국외로 이전(처리위탁·보관)합니다. 이는 이용자가 요청한 상담을 처리하기 위해
              필요한 처리위탁·보관으로서, 이 방침에 공개하는 방식으로 이전합니다(「개인정보 보호법」 제28조의8 제1항 제3호).
            </p>
            <div className="privacy__table">
              <table>
                <thead><tr><th>이전받는 자(연락처)</th><th>이전 국가</th><th>이전 항목</th><th>이전 시기·방법</th><th>이용 목적·보유 기간</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Google LLC<br />1600 Amphitheatre Parkway, Mountain View, CA 94043, USA<br />googlekrsupport@google.com</td>
                    <td>미국 등 Google 데이터센터 소재국</td>
                    <td>제2조의 필수 항목, 접수 일시</td>
                    <td>신청 즉시 네트워크로 전송</td>
                    <td>신청 내용 보관·알림 메일 / 제3조 보유 기간까지</td>
                  </tr>
                  <tr>
                    <td>n8n GmbH<br />Novalisstr. 10, 10115 Berlin, Germany<br />privacy@n8n.io</td>
                    <td>독일(프랑크푸르트)</td>
                    <td>제2조의 필수 항목, 접수 일시</td>
                    <td>신청 즉시 네트워크로 전송</td>
                    <td>접수 자동 처리 / 처리 직후 삭제(처리 기록을 저장하지 않음)</td>
                  </tr>
                  <tr>
                    <td>Cloudflare, Inc.<br />101 Townsend St., San Francisco, CA 94107, USA<br />dpo@cloudflare.com</td>
                    <td>미국 및 Cloudflare 전 세계 네트워크</td>
                    <td>제2조의 필수 항목</td>
                    <td>신청 즉시 네트워크로 전송</td>
                    <td>웹사이트 운영·전송 / 신청 내용은 전송만 하고 저장하지 않음. 다만 Cloudflare는 서비스 보안·운영을 위해 접속 IP 등 접속 정보를 자체 정책에 따라 처리할 수 있음</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p><strong>국외 이전을 원하지 않으시면</strong> 신청서 대신 전화(1555-1984)로 상담을 신청하실 수 있습니다.</p>
          </section>

          <section>
            <h2>제7조 개인정보의 파기 절차 및 방법</h2>
            <ul>
              <li>보유 기간이 끝나거나 처리 목적을 달성한 개인정보는 지체 없이(5일 이내) 파기합니다.</li>
              <li>전자 파일(구글 시트 행, 알림 메일·메시지)은 복구할 수 없는 방법으로 삭제하고, 종이 문서는 분쇄하거나 소각합니다.</li>
            </ul>
          </section>

          <section>
            <h2>제8조 정보주체의 권리·의무 및 행사 방법</h2>
            <ol>
              <li>이용자는 언제든지 자신의 개인정보 열람, 정정·삭제, 처리정지, 동의 철회를 요구할 수 있습니다.</li>
              <li>이메일(ndh4123@naver.com) 또는 전화(1555-1984)로 요구하시면 지체 없이 조치합니다.</li>
              <li>법정대리인이나 위임을 받은 사람을 통해서도 요구할 수 있으며, 이 경우 위임장을 제출해야 합니다.</li>
              <li>다른 법령에서 수집 대상으로 정한 개인정보는 삭제를 요구할 수 없는 경우가 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2>제9조 개인정보의 안전성 확보 조치</h2>
            <ol>
              <li>신청 정보가 저장된 시트는 개인정보 보호책임자(대표) 1인만 열람합니다.</li>
              <li>신청 정보를 다루는 Google·n8n·Cloudflare 관리 계정에 2단계 인증을 사용합니다.</li>
              <li>신청 내용은 암호화된 통신(HTTPS)으로 전송하고, 접수 서버 사이에는 별도 인증 키를 사용합니다.</li>
              <li>접수 처리 과정의 기록(로그)에 개인정보를 남기지 않으며, IP 주소를 저장하지 않습니다.</li>
            </ol>
          </section>

          <section>
            <h2>제10조 개인정보 자동 수집 장치의 설치·운영 및 거부</h2>
            <ul>
              <li>회사는 쿠키를 사용하지 않습니다.</li>
              <li>홈페이지의 「카톡으로 상담하기」·「전화로 상담하기」 버튼을 누르면 누른 시각, 버튼 종류, 유입 경로(광고·블로그 등 표시), 이전 페이지 주소, 브라우저 종류를 기록합니다. <strong>이름·연락처·IP 주소 없이 기록하므로 개인을 알아볼 수 없는 정보입니다.</strong></li>
              <li>광고·블로그 등 어디서 들어왔는지 구분하기 위해 브라우저의 임시 저장 공간(세션 저장소)에 유입 경로 표시만 잠시 저장하며, 창을 닫으면 지워집니다. 이 정보로는 개인을 알아볼 수 없습니다.</li>
              <li>브라우저 설정에서 사이트 데이터 저장을 막을 수 있으며, 막아도 상담 이용에는 지장이 없습니다.</li>
            </ul>
          </section>

          <section>
            <h2>제11조 개인정보 보호책임자</h2>
            <div className="privacy__table">
              <table>
                <tbody>
                  <tr><th scope="row">개인정보 보호책임자</th><td>남도현(대표)</td></tr>
                  <tr><th scope="row">연락처</th><td>1555-1984 · ndh4123@naver.com</td></tr>
                </tbody>
              </table>
            </div>
            <p>개인정보 관련 문의·불만·피해 구제는 위 연락처로 하시면 지체 없이 답변·처리합니다.</p>
          </section>

          <section>
            <h2>제12조 권익침해 구제 방법</h2>
            <p>개인정보 침해에 대한 신고나 상담이 필요하시면 아래 기관에 문의하실 수 있습니다.</p>
            <ul>
              <li>개인정보침해 신고센터(한국인터넷진흥원): 국번 없이 118 · privacy.kisa.or.kr</li>
              <li>개인정보 분쟁조정위원회: 1833-6972 · www.kopico.go.kr</li>
              <li>대검찰청: 국번 없이 1301 · www.spo.go.kr</li>
              <li>경찰청: 국번 없이 182 · ecrm.police.go.kr</li>
            </ul>
          </section>

          <section>
            <h2>제13조 개인정보 처리방침의 변경</h2>
            <p>이 개인정보 처리방침은 <strong>{EFFECTIVE_DATE}</strong>부터 적용됩니다. 내용이 바뀌면 시행 7일 전부터 이 페이지에 알립니다.</p>
          </section>
        </article>
      </main>
      <SiteFooter privacyLink />
    </>
  );
}
