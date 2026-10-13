// #8 연락 화면과 카톡 전용 신청 폼(/form)이 함께 쓰는 양옆 꾸밈. PC(1101px 이상)에서만 보인다(styles.css ≤1100 에서 숨김).
export function ConsultationVisual() {
  return (
    <aside className="consultation__visual" aria-label="입점 상담을 돕는 매장 안내">
      <svg viewBox="0 0 240 360" role="img" aria-label="매장 상담을 준비하는 음식점 사장님 일러스트">
        <ellipse className="consultation__visual-ground" cx="120" cy="333" rx="103" ry="13" />
        <circle className="consultation__visual-backdrop" cx="120" cy="176" r="104" />
        <path className="consultation__visual-store" d="M42 148h156v128a18 18 0 0 1-18 18H60a18 18 0 0 1-18-18V148Z" />
        <path className="consultation__visual-roof" d="M30 126h180l-20-54H50l-20 54Z" />
        <rect className="consultation__visual-sign" x="77" y="88" width="86" height="24" rx="12" />
        <path className="consultation__visual-sign-mark" d="M99 100h42M108 94v12M132 94v12" />
        <path className="consultation__visual-awning" d="M30 126h180v24c0 13-10 23-23 23-12 0-22-9-23-21-2 12-11 21-23 21s-22-9-23-21c-2 12-11 21-23 21s-22-9-23-21c-2 12-11 21-23 21-13 0-23-10-23-23v-24Z" />
        <rect className="consultation__visual-window" x="126" y="194" width="50" height="58" rx="8" />
        <rect className="consultation__visual-door" x="62" y="190" width="42" height="104" rx="9" />
        <circle className="consultation__visual-head" cx="82" cy="250" r="24" />
        <path className="consultation__visual-hair" d="M59 246c1-17 10-27 24-27 12 0 21 7 24 19-8-1-15-5-20-11-6 9-15 15-28 19Z" />
        <path className="consultation__visual-face" d="M72 252h1M91 252h1M76 263c4 3 9 3 13 0" />
        <path className="consultation__visual-headset" d="M58 250c0-16 10-27 24-27s24 11 24 27v8h-9M58 250v10h8" />
        <path className="consultation__visual-body" d="M42 330c2-40 17-62 40-62s39 22 41 62H42Z" />
        <path className="consultation__visual-apron" d="M65 280h34l8 50H57l8-50Z" />
        <rect className="consultation__visual-note" x="102" y="246" width="72" height="86" rx="12" />
        <path className="consultation__visual-check" d="m119 277 11 11 25-29M119 306h36" />
        <path className="consultation__visual-bubble" d="M143 31h64a15 15 0 0 1 15 15v35a15 15 0 0 1-15 15h-24l-16 15 2-15h-26a15 15 0 0 1-15-15V46a15 15 0 0 1 15-15Z" />
        <path className="consultation__visual-bubble-check" d="m154 63 10 10 21-23" />
      </svg>
    </aside>
  );
}

export function ConsultationTrust() {
  return (
    <aside className="consultation__trust" aria-label="땡겨요 입점 상담 혜택">
      <div className="consultation__trust-card">
        <span className="consultation__trust-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32"><path d="M6 7h20v14H14l-6 5v-5H6V7Z" /><path d="m11 14 3 3 7-7" /></svg>
        </span>
        <strong>무료 상담</strong>
      </div>
      <div className="consultation__trust-card">
        <span className="consultation__trust-icon consultation__trust-icon--orange" aria-hidden="true">
          <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" /><text x="16" y="19">2%</text></svg>
        </span>
        <strong>주문수수료 2%</strong>
      </div>
      <div className="consultation__trust-card">
        <span className="consultation__trust-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32"><circle cx="16" cy="10" r="5" /><path d="M7 27c1-7 4-11 9-11s8 4 9 11M6 11v7h4M26 11v7h-4" /></svg>
        </span>
        <strong>전담 매니저 지원</strong>
      </div>
      <div className="consultation__trust-card consultation__trust-card--consulting">
        <span className="consultation__trust-icon consultation__trust-icon--orange" aria-hidden="true">
          <svg viewBox="0 0 32 32"><rect x="7" y="5" width="18" height="22" rx="3" /><path d="M12 21v-4M16 21v-7M20 21v-10M12 9h8" /></svg>
        </span>
        <strong>맞춤 컨설팅 제공</strong>
      </div>
    </aside>
  );
}
