import { useState } from 'react';

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
