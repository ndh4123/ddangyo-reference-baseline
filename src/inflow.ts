// #8 상담 신청의 "유입채널".
// 첫 방문 주소의 꼬리표(utm_*, 네이버 검색광고 n_*)를 읽고, 꼬리표가 없으면 들어온 곳(referrer)으로 판단한다.
// 같은 방문(탭) 동안은 sessionStorage 에 기억해 #8 로 이동하거나 새로고침해도 처음 값을 유지한다.
// 개인정보는 담지 않는다(광고·검색 꼬리표만).
const STORAGE_KEY = 'ddangyo-inflow';

// 주소에서 읽는 꼬리표. utm_* = 직접 붙인 꼬리표, n_* = 네이버 검색광고 자동 추적 파라미터.
const TAG_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'n_media', 'n_query', 'n_keyword', 'n_ad_group'] as const;

type Inflow = { source: string; detail: Partial<Record<(typeof TAG_KEYS)[number], string>> };

// 들어온 사이트(referrer 주소) → 채널. 위에서부터 먼저 맞는 것을 쓴다(네이버 블로그·카페를 네이버 검색보다 먼저).
const REFERRER_CHANNELS: [RegExp, string][] = [
  [/(^|\.)blog\.naver\.com$/, 'naver_blog'],
  [/(^|\.)cafe\.naver\.com$/, 'naver_cafe'],
  [/(^|\.)naver\.com$/, 'naver_search'],
  [/(^|\.)google\.[a-z.]+$/, 'google_search'],
  [/(^|\.)daum\.net$/, 'daum_search'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(facebook\.com|fb\.me)$/, 'facebook'],
  [/(^|\.)threads\.(net|com)$/, 'threads'],
  [/(^|\.)band\.us$/, 'band'],
  [/(^|\.)kakao\.com$/, 'kakao'],
];

// 앱 안 브라우저 → 채널. 앱이 브라우저 식별 문구(User-Agent)에 붙이는 표시로 판단한다.
// 이런 앱은 들어온 곳 정보를 안 넘겨주는 경우가 많아서 따로 본다.
const IN_APP_CHANNELS: [RegExp, string][] = [
  [/KAKAOTALK/i, 'kakao'],
  [/Instagram/i, 'instagram'],
  [/FBAN|FBAV|FB_IAB/, 'facebook'],
  [/NAVER\(inapp/i, 'naver_app'],
  [/BAND\//, 'band'],
];

// 꼬리표가 없을 때: 들어온 사이트 → 앱 안 브라우저 → 그 밖의 다른 사이트면 referral → 아무것도 없으면 direct.
const channelWithoutTags = (): string => {
  let host = '';
  try {
    host = new URL(document.referrer).hostname;
  } catch {
    // 들어온 곳 정보가 없다.
  }
  if (host === window.location.hostname) host = '';
  const byReferrer = REFERRER_CHANNELS.find(([pattern]) => pattern.test(host));
  if (host && byReferrer) return byReferrer[1];
  const byApp = IN_APP_CHANNELS.find(([pattern]) => pattern.test(navigator.userAgent));
  if (byApp) return byApp[1];
  return host ? 'referral' : 'direct';
};

const detectInflow = (): Inflow => {
  const params = new URLSearchParams(window.location.search);
  const detail: Inflow['detail'] = {};
  for (const key of TAG_KEYS) {
    const value = params.get(key);
    if (value) detail[key] = value;
  }
  const fromNaverAd = Boolean(detail.n_media || detail.n_query || detail.n_keyword || detail.n_ad_group);
  const source = detail.utm_source ?? (fromNaverAd ? 'naver_ad' : channelWithoutTags());
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
