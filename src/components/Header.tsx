type HeaderProps = {
  dark: boolean;
};

export function Header({ dark }: HeaderProps) {
  return (
    <header className={`site-header ${dark ? 'is-dark' : ''}`}>
      <div className="header-inner">
        <a className="wordmark" href="#0" aria-label="첫 화면으로 이동">
          <span>땡겨요</span>
        </a>
        <nav className="header-actions" aria-label="주요 링크">
          <a className="owner-link" href="#3">땡겨요 사장님</a>
          <a className="pill pill-outline" href="#0">앱 다운로드</a>
          <a className="pill pill-primary" href="#8">땡겨요 기프트 쿠폰 신청</a>
        </nav>
      </div>
    </header>
  );
}
