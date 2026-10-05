import { useState } from 'react';
import { getInflow } from '../inflow';

// 헤더 카카오톡 상담 버튼 링크. /kakao(worker/index.ts)가 요청 1건을 기록하고 오픈채팅으로 보낸다.
// 오픈채팅 주소는 worker/index.ts 의 OPEN_CHAT_URL 한 곳에서만 관리한다.
// utm_campaign = 이 방문자가 처음 들어온 유입채널(src/inflow.ts, 예: naver_search · direct).
const KAKAO_CONSULT_URL = `/kakao?utm_source=homepage&utm_medium=header_button&utm_campaign=${encodeURIComponent(getInflow().source)}`;

type HeaderProps = {
  dark: boolean;
  hero: boolean;
  mobile: boolean;
  onNavigate: (screen: number) => void;
};

export function Header({ dark, hero, onNavigate }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className={`site-header${hero ? ' is-hero' : ''}${dark ? ' is-dark' : ''}`}>
      <div className="header-inner">
        <a className="wordmark" href="#0" aria-label="땡겨요 첫 화면으로 이동">
          <img src="/images/ddangyo-logo-orange-vector.svg" alt="땡겨요" />
        </a>
        <nav className="site-nav" aria-label="주요 메뉴">
          <a href="#4" onClick={(event) => { event.preventDefault(); onNavigate(4); }}>서비스 소개</a>
          <a href="#5" onClick={(event) => { event.preventDefault(); onNavigate(5); }}>혜택</a>
          <a href="#6" onClick={(event) => { event.preventDefault(); onNavigate(6); }}>입점안내</a>
          <a href="#7" onClick={(event) => { event.preventDefault(); onNavigate(7); }}>고객지원</a>
          <a href="#8" onClick={(event) => { event.preventDefault(); onNavigate(8); }}>입점 상담</a>
        </nav>
        <a className="kakao-consult" href={KAKAO_CONSULT_URL} target="_blank" rel="noopener" aria-label="카카오톡 상담">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 3.6c-5.1 0-9.2 3.2-9.2 7.2 0 2.6 1.7 4.8 4.3 6.1l-.9 3.3c-.1.4.3.7.6.5l3.9-2.6c.4 0 .8.1 1.3.1 5.1 0 9.2-3.2 9.2-7.2S17.1 3.6 12 3.6z" />
          </svg>
          <span aria-hidden="true">카톡상담</span>
        </a>
        <button
          className="mobile-menu-toggle"
          type="button"
          aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">{mobileMenuOpen ? '×' : '☰'}</span>
        </button>
        <nav
          id="mobile-navigation"
          className={`mobile-nav${mobileMenuOpen ? ' is-open' : ''}`}
          aria-label="모바일 주요 메뉴"
        >
          <a href="#4" onClick={(event) => { event.preventDefault(); closeMobileMenu(); onNavigate(4); }}>서비스 소개</a>
          <a href="#5" onClick={(event) => { event.preventDefault(); closeMobileMenu(); onNavigate(5); }}>혜택</a>
          <a href="#6" onClick={(event) => { event.preventDefault(); closeMobileMenu(); onNavigate(6); }}>입점안내</a>
          <a href="#7" onClick={(event) => { event.preventDefault(); closeMobileMenu(); onNavigate(7); }}>고객지원</a>
          <a href="#8" onClick={(event) => { event.preventDefault(); closeMobileMenu(); onNavigate(8); }}>입점 상담</a>
        </nav>
      </div>
    </header>
  );
}
