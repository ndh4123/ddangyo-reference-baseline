// #8 상담 신청의 "유입채널".
// 첫 방문 주소의 꼬리표(utm_*, 네이버 검색광고 n_*)를 읽고, 꼬리표가 없으면 들어온 곳(referrer)으로 판단한다.
// 같은 방문(탭) 동안은 sessionStorage 에 기억해 #8 로 이동하거나 새로고침해도 처음 값을 유지한다.
// 개인정보는 담지 않는다(광고·검색 꼬리표만).
const STORAGE_KEY = 'ddangyo-inflow';

// 주소에서 읽는 꼬리표. utm_* = 직접 붙인 꼬리표, n_* = 네이버 검색광고 자동 추적 파라미터.
const TAG_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'n_media', 'n_query', 'n_keyword', 'n_ad_group'] as const;

type Inflow = { source: string; detail: Partial<Record<(typeof TAG_KEYS)[number], string>> };

// 꼬리표가 없을 때: 카카오톡 앱 안 브라우저 → 들어온 사이트 → 없으면 direct.
const channelFromReferrer = (): string => {
  if (/KAKAOTALK/i.test(navigator.userAgent)) return 'kakao';
  let host = '';
  try {
    host = new URL(document.referrer).hostname;
  } catch {
    return 'direct';
  }
  if (host === window.location.hostname) return 'direct';
  if (/(^|\.)naver\.com$/.test(host)) return 'naver_search';
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return 'google_search';
  if (/(^|\.)daum\.net$/.test(host)) return 'daum_search';
  if (/(^|\.)kakao\.com$/.test(host)) return 'kakao';
  return 'referral';
};

const detectInflow = (): Inflow => {
  const params = new URLSearchParams(window.location.search);
  const detail: Inflow['detail'] = {};
  for (const key of TAG_KEYS) {
    const value = params.get(key);
    if (value) detail[key] = value;
  }
  const fromNaverAd = Boolean(detail.n_media || detail.n_query || detail.n_keyword || detail.n_ad_group);
  const source = detail.utm_source ?? (fromNaverAd ? 'naver_ad' : channelFromReferrer());
  return { source, detail };
};

// 페이지를 처음 불러올 때 한 번만 정한다.
const inflow: Inflow = (() => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as Inflow;
  } catch {
    // 저장소를 못 쓰는 브라우저면 이번 화면에서만 판단한다.
  }
  const detected = detectInflow();
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(detected));
  } catch {
    // 저장에 실패해도 이번 화면에서는 그대로 쓴다.
  }
  return detected;
})();

export const getInflow = () => inflow;
