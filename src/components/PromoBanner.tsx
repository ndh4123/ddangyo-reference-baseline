import { useEffect, useRef, useState } from 'react';
import { PROMO } from '../promo';

const DAY_MS = 24 * 60 * 60 * 1000;

// 한국시간 기준 날짜 문자열(YYYY-MM-DD).
const kstDate = (ms: number) => new Date(ms + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

// 지금 보여야 하면 D-숫자 표시값을, 꺼져 있거나 마감이 지났으면 null 을 돌려준다.
const readPromo = () => {
  const now = Date.now();
  const deadline = Date.parse(PROMO.deadline);
  if (!PROMO.enabled || !(now <= deadline)) return null;
  const daysLeft = Math.round((Date.parse(kstDate(deadline)) - Date.parse(kstDate(now))) / DAY_MS);
  return { dLabel: daysLeft <= 0 ? 'D-DAY' : `D-${daysLeft}` };
};

// 페이지를 켜 둔 채 마감 시각이 지나도 사라지도록 1분마다 다시 계산한다.
const usePromo = () => {
  const [promo, setPromo] = useState(readPromo);
  useEffect(() => {
    const timer = window.setInterval(() => setPromo(readPromo()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  return promo;
};

type PromoProps = {
  onNavigate: (screen: number) => void;
};

// 상단 띠 배너. 누르면 상담 신청 화면(#8)으로 이동한다.
export function PromoBanner({ onNavigate }: PromoProps) {
  const promo = usePromo();
  const [collapsed, setCollapsed] = useState(false);
  const bannerRef = useRef<HTMLAnchorElement>(null);
  const active = promo !== null;

  // B안: 조금이라도 스크롤하면 띠만 위로 사라지고 헤더는 맨 위에 붙는다.
  useEffect(() => {
    if (!active || PROMO.bannerMode !== 'hideOnScroll') return;
    const onScroll = () => setCollapsed(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [active]);

  // 헤더를 띠 높이만큼 내린다(styles.css 의 html.has-promo 규칙). 띠가 줄바꿈되면 높이를 다시 잰다.
  useEffect(() => {
    const root = document.documentElement;
    const banner = bannerRef.current;
    if (!active || !banner) {
      root.classList.remove('has-promo');
      root.style.removeProperty('--promo-offset');
      return;
    }
    const update = () => root.style.setProperty('--promo-offset', `${collapsed ? 0 : banner.offsetHeight}px`);
    root.classList.add('has-promo');
    update();
    const observer = new ResizeObserver(update);
    observer.observe(banner);
    return () => observer.disconnect();
  }, [active, collapsed]);

  if (!promo) return null;

  return (
    <a
      ref={bannerRef}
      className={`promo-banner${collapsed ? ' is-collapsed' : ''}`}
      href="#8"
      onClick={(event) => { event.preventDefault(); onNavigate(8); }}
    >
      <span className="promo-banner__badge">{promo.dLabel}</span>
      <span className="promo-banner__text">{PROMO.bannerText}</span>
      <span className="promo-banner__arrow" aria-hidden="true">›</span>
    </a>
  );
}

// 하단 고정 「무료 입점 상담」 버튼 위의 말풍선. App.tsx 에서 그 버튼 바로 뒤에 두어야
// styles.css 의 `.fixed-consult-cta.is-visible + .promo-bubble` 규칙으로 버튼이 보일 때만 같이 보인다.
export function PromoBubble({ onNavigate }: PromoProps) {
  const promo = usePromo();
  if (!promo) return null;
  return (
    <a
      className="promo-bubble"
      href="#8"
      onClick={(event) => { event.preventDefault(); onNavigate(8); }}
    >
      <span className="promo-banner__badge">{promo.dLabel}</span>
      <span>{PROMO.bubbleText}</span>
    </a>
  );
}
