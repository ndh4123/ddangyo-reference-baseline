import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { PhoneMock } from './components/PhoneMock';

const sectionCount = 11;

const benefits = [
  ['고퀄리티 리뷰', 'review'],
  ['개인 맞춤추천', 'phone'],
  ['서울사랑상품권 할인', 'sale'],
  ['착한수수료', 'coin'],
  ['간편한 입점', 'store'],
  ['편리한 정산', 'receipt'],
] as const;

function FoodOrbit() {
  return (
    <div className="food-orbit" aria-hidden="true">
      <i className="orbit-ring ring-a" /><i className="orbit-ring ring-b" /><i className="orbit-ring ring-c" />
      <span className="food-token food-a"><i /><i /><i /></span>
      <span className="food-token food-b"><i /><i /><i /></span>
      <span className="food-token food-c"><i /><i /><i /></span>
    </div>
  );
}

function CopyBlock({ eyebrow, title, body, align = 'left' }: { eyebrow: string; title: string; body: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <div className={`feature-copy align-${align}`}>
      <h2><em>{eyebrow}</em><span>{title}</span></h2>
      <p>{body}</p>
    </div>
  );
}

function App() {
  const [active, setActive] = useState(() => {
    const parsed = Number(window.location.hash.replace('#', ''));
    return Number.isInteger(parsed) && parsed >= 0 && parsed < sectionCount ? parsed : 0;
  });
  const activeRef = useRef(active);
  const lockedRef = useRef(false);

  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>('[data-screen]')];
    const initial = Math.min(Math.max(activeRef.current, 0), sections.length - 1);
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    sections[initial]?.scrollIntoView({ behavior: 'auto', block: 'start' });
    requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = previousScrollBehavior; });

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = Number((visible.target as HTMLElement).dataset.screen);
      setActive(index);
      activeRef.current = index;
      if (window.location.hash !== `#${index}`) history.replaceState(null, '', `#${index}`);
    }, { threshold: [0.55, 0.72] });
    sections.forEach((section) => observer.observe(section));

    const go = (next: number) => {
      const index = Math.min(Math.max(next, 0), sections.length - 1);
      if (index === activeRef.current || lockedRef.current) return;
      lockedRef.current = true;
      activeRef.current = index;
      setActive(index);
      history.replaceState(null, '', `#${index}`);
      sections[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => { lockedRef.current = false; }, 820);
    };

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 18 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      go(activeRef.current + (event.deltaY > 0 ? 1 : -1));
    };
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); go(activeRef.current + 1); }
      if (['ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); go(activeRef.current - 1); }
      if (event.key === 'Home') { event.preventDefault(); go(0); }
      if (event.key === 'End') { event.preventDefault(); go(sectionCount - 1); }
    };
    const onHash = () => {
      const next = Number(window.location.hash.slice(1));
      if (Number.isInteger(next)) go(next);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onHash);
    return () => {
      observer.disconnect();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const darkHeader = [2, 4, 10].includes(active);

  return (
    <>
      <Header dark={darkHeader} />
      <main className="screens">
        <section className={`screen hero ${active === 0 ? 'is-active' : ''}`} data-screen="0">
          <FoodOrbit />
          <div className="hero-copy enter-up">
            <p>너도 살고 나도 사는 우리동네 배달앱</p>
            <h1>우리 동네 배달은<br />땡겨요 하기로 했다</h1>
            <a className="hero-cta" href="#1">앱 다운로드</a>
          </div>
          <PhoneMock mode="home" className="hero-phone enter-phone" />
        </section>

        <section className={`screen benefits ${active === 1 ? 'is-active' : ''}`} data-screen="1">
          <div className="section-inner benefits-inner">
            <div className="benefits-heading enter-up"><h2>왜 땡겨요?</h2><p>나도 살고, 너도 사니까</p></div>
            <div className="benefit-scroller" aria-label="서비스 혜택">
              <div className="benefit-grid">
                {benefits.map(([label, icon], index) => (
                  <article className={`benefit-card enter-card icon-${icon}`} style={{ '--delay': `${0.08 * index}s` } as React.CSSProperties} key={label}>
                    <h3>{label}</h3><div className="benefit-icon" aria-hidden="true"><i /><i /><i /></div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={`screen question ${active === 2 ? 'is-active' : ''}`} data-screen="2">
          <div className="question-inner">
            <div className="mascot mascot-a"><i /><i /></div>
            <p className="question-line line-a">그럴 때 있잖아요.<br />문득 궁금할때</p>
            <p className="question-line line-b">오늘 먹은 이 배달 음식,<br />사장님께는 얼마가 갈까?</p>
            <p className="question-line line-c">땡겨요는 사장님께<br />수익이 더 많이 가요.</p>
            <div className="mascot-stack"><div className="mascot mascot-b"><i /><i /></div><div className="mascot mascot-c"><i /><i /></div></div>
          </div>
        </section>

        <section className={`screen fair ${active === 3 ? 'is-active' : ''}`} data-screen="3">
          <div className="section-inner fair-inner">
            <div className="fair-title enter-up"><p>광고비없이</p><h2>2% 수수료로 주문받아요.</h2></div>
            <div className="fair-stage">
              <article className="fair-panel panel-owner"><span className="mini-app">동네</span><h3><em>사장님은</em>단골고객님께<br />보답해요</h3><p>고마운 고객님의 마음을<br />쿠폰으로 사로잡아요</p><div className="blob-person owner"><i /><i /><i /></div></article>
              <article className="fair-panel panel-customer"><span className="mini-app">쿠폰</span><h3><em>고객님은</em>단골혜택<br />기대해봐요</h3><p>단골고객님, 사장님의<br />쿠폰 선물을 받으세요</p><div className="blob-person customer"><i /><i /><i /></div></article>
            </div>
          </div>
        </section>

        <section className={`screen culture ${active === 4 ? 'is-active' : ''}`} data-screen="4">
          <div className="culture-scene" aria-hidden="true"><i className="shirt" /><i className="bag" /><i className="handle" /></div>
          <div className="culture-copy enter-up"><h2>사장님이 인심좋게<br />나눌 수 있는 배달</h2><p>너도 살고, 나도 사는<br />배달문화를 만들어 갑니다.</p></div>
        </section>

        <section className={`screen feature feature-review ${active === 5 ? 'is-active' : ''}`} data-screen="5">
          <div className="section-inner feature-inner">
            <CopyBlock eyebrow="잘 쓴 리뷰로" title="돈 버는 중." body={<>배달 일상 기록하고,<br />맛스타가 되어 포인트까지 벌어요.</>} />
            <PhoneMock mode="review" className="feature-phone" />
          </div>
        </section>

        <section className={`screen feature feature-social ${active === 6 ? 'is-active' : ''}`} data-screen="6">
          <div className="decor-dot dot-a" /><div className="decor-dot dot-b" /><div className="decor-dot dot-c">↘<small>375</small></div>
          <div className="section-inner feature-inner">
            <CopyBlock eyebrow="밥 때 되면" title="인스타 하듯." body={<>고퀄 리뷰 넘겨보고,<br />리뷰 통한 주문으로 리워드까지 얻어요.</>} />
            <PhoneMock mode="social" className="feature-phone" />
          </div>
        </section>

        <section className={`screen feature feature-recommend ${active === 7 ? 'is-active' : ''}`} data-screen="7">
          <div className="section-inner feature-inner reverse">
            <PhoneMock mode="recommend" className="feature-phone" />
            <CopyBlock eyebrow="메뉴 선택을" title="단숨에." body={<>광고없이, 취향에 맞게,<br />당신이 진짜 원하는 메뉴를 추천해요</>} />
          </div>
        </section>

        <section className={`screen feature feature-voucher ${active === 8 ? 'is-active' : ''}`} data-screen="8">
          <div className="section-inner feature-inner reverse">
            <PhoneMock mode="voucher" className="feature-phone" />
            <CopyBlock eyebrow="서울사랑상품권" title="사용/구입을 한번에." body={<>서울사랑상품권 사용은 물론 구입까지,<br />10% 할인을 매끄럽게 경험해요</>} />
          </div>
        </section>

        <section className={`screen nationwide ${active === 9 ? 'is-active' : ''}`} data-screen="9">
          <div className="nationwide-copy enter-up"><h2><em>땡겨요를</em><span>전국에서 만나요!</span></h2><p>이제는 전국 어디서든, 맛있는 음식을 땡겨요로 주문해요</p></div>
          <div className="map-placeholder" aria-label="전국 서비스 지역 지도 placeholder"><i /><i /><i /><i /><i /><i /><i /></div>
        </section>

        <section className={`screen closing ${active === 10 ? 'is-active' : ''}`} data-screen="10">
          <div className="closing-visual">
            <div className="courier" aria-hidden="true"><i className="courier-head" /><i className="courier-body" /><i className="courier-bag">LOCAL</i></div>
            <div className="closing-copy enter-up"><h2>너도 살고 나도 사는<br />우리동네 배달앱, 땡겨요</h2><p>일상의 땡기는 순간, 땡겨요와 함께 하세요.</p></div>
          </div>
          <footer className="footer">
            <div className="footer-inner"><div className="footer-logo">땡겨요</div><div className="footer-content"><ul><li>이용약관</li><li>땡겨요페이약관</li><li>땡겨요 위치기반 서비스 이용약관</li><li>전자금융거래약관</li><li><strong>개인정보처리방침</strong></li><li>신용정보활용체제</li><li>개인위치정보 처리방침</li></ul><button type="button">땡겨요 사업자정보⌄</button></div></div>
          </footer>
        </section>
      </main>
    </>
  );
}

export default App;
