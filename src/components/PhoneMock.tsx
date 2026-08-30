type PhoneMode = 'home' | 'review' | 'social' | 'recommend' | 'voucher';

type PhoneMockProps = {
  mode: PhoneMode;
  className?: string;
};

const labels: Record<PhoneMode, string> = {
  home: '우리 동네 홈',
  review: '맛있는 리뷰 피드',
  social: '맛스타 소셜 피드',
  recommend: '취향 추천',
  voucher: '간편 결제',
};

export function PhoneMock({ mode, className = '' }: PhoneMockProps) {
  const count = mode === 'social' ? 8 : mode === 'review' ? 3 : 4;

  return (
    <div className={`phone phone-${mode} ${className}`} aria-label={`${labels[mode]} 화면 placeholder`}>
      <div className="phone-speaker" />
      <div className="phone-screen">
        <div className="phone-status"><span>9:41</span><span>● ◔ ▰</span></div>
        <div className="phone-title"><span>‹</span><b>{labels[mode]}</b><span>⌕</span></div>
        {mode === 'home' && (
          <>
            <div className="address-row"><i /> 중구 명동 <span>⌄</span></div>
            <div className="search-bar">오늘은 무엇을 먹을까요?</div>
            <div className="category-row">
              {['한식', '치킨', '분식', '중식', '회'].map((item, index) => (
                <div key={item}><i style={{ '--tone': index } as React.CSSProperties} /><span>{item}</span></div>
              ))}
            </div>
            <p className="phone-copy"><b>사장님이 챙겨주는 할인</b><span>더보기 ›</span></p>
          </>
        )}
        {mode === 'social' && <div className="profile-row"><i /><span><b>오늘의 맛스타</b><small>202 게시물 · 2.6K 팔로워</small></span></div>}
        {mode === 'recommend' && <div className="hint-chip">지금 가장 땡기는 메뉴</div>}
        {mode === 'voucher' && <div className="pay-card"><span>결제수단</span><b>200,000원</b><small>지역사랑 상품권</small></div>}
        <div className={`mock-grid grid-${mode}`}>
          {Array.from({ length: count }, (_, index) => (
            <div className={`mock-card card-${index + 1}`} key={index}>
              <div className="food-art"><i /><i /><i /></div>
              {mode !== 'social' && <><b>{['오늘의 인기 메뉴', '단골 추천 한 끼', '리뷰가 좋은 집', '내 주변 발견'][index % 4]}</b><small>{mode === 'voucher' ? '할인 적용 완료' : '따뜻한 동네 한 그릇'}</small></>}
            </div>
          ))}
        </div>
        <div className="phone-nav"><span>⌂</span><span>⌕</span><b>✦</b><span>▤</span><span>♙</span></div>
      </div>
    </div>
  );
}
