// 사이트 공통 푸터(운영자 표기 · 「본사·신한은행 직접 운영 아님」 안내).
// 홈페이지 #8, 카톡 전용 신청 폼(/form), 개인정보처리방침(/privacy)이 함께 쓴다.
// 「개인정보처리방침」 링크는 개인정보를 받는 신청 폼과 처리방침 페이지에만 둔다(홈페이지는 개인정보를 받지 않는다).
export function SiteFooter({ privacyLink = false }: { privacyLink?: boolean }) {
  return (
    <footer className="consultation-footer">
      <div className="consultation-footer__inner">
        <div className="consultation-footer__top">
          <div className="consultation-footer__brand">
            <p><span>운영자 더잘함M&amp;F</span><i aria-hidden="true">|</i><span>땡겨요 입점 상담 운영</span></p>
            <p><span>대표자 남도현</span><i aria-hidden="true">|</i><span>사업자등록번호 314-09-25617</span></p>
            <p><span>대전광역시 유성구 대학로 28</span><i aria-hidden="true">|</i><a href="mailto:ndh4123@naver.com">ndh4123@naver.com</a></p>
          </div>
          <div className="consultation-footer__links">
            {privacyLink && <a className="consultation-footer__privacy" href="/privacy">개인정보처리방침</a>}
            <a href="tel:1555-1984">입점 상담 <strong>1555-1984</strong></a>
          </div>
        </div>
        <div className="consultation-footer__bottom">
          <p>
            <span>본 사이트는 땡겨요 본사 또는 신한은행이 직접 운영하는 사이트가 아닙니다.</span>
            <span>땡겨요 총판 디와이파트너스를 통해 입점 상담을 제공합니다.</span>
          </p>
          <small>© 2026 더잘함M&amp;F. All rights reserved.</small>
        </div>
      </div>
    </footer>
  );
}
