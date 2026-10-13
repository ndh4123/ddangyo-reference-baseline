// Cloudflare Workers 진입점.
// - /api/consultation : Vercel Function(api/consultation.ts)을 그대로 불러 쓴다(카톡 전용 신청 폼 /form 이 보낸다).
//   운영 주소가 아닌 곳(미리보기)에서 온 신청은 매장명에 「[시험] 」을 붙인다(markPreviewSubmission).
//   환경변수는 nodejs_compat 이 process.env 로 채워 준다(wrangler.jsonc 참고).
// - 영상 경로          : worker/media.ts (Workers Caching 이 Range 206 을 만든다).
// - 검색엔진 소유확인  : 정적 파일 기본 설정은 `.html` 주소를 확장자 없는 주소로 307 넘김하므로,
//   네이버·구글 확인 파일 주소만 Worker 가 받아 넘김 없이 200 으로 돌려준다(내용은 public 원본 그대로).
// 이 Worker 는 Workers Caching(cache.enabled)을 쓰므로, 캐시되면 안 되는 응답에는 Cache-Control: no-store 를 붙인다.
// (POST 는 원래 캐시되지 않고, api/consultation.ts 의 응답에는 이미 no-store 가 있다.)
// - /kakao             : 오픈채팅으로 302 이동. 요청 1건을 별도 n8n 입구로 기록한다(실패해도 이동은 된다).
// - /api/call-click    : #8 「전화로 상담하기」 클릭 1건 기록(화면이 sendBeacon 으로 보낸다). 전화 연결은 화면의 tel: 링크가 한다.
// - 그 밖의 모든 경로  : Workers Static Assets(dist)가 그대로 응답한다.
//   (wrangler.jsonc 의 run_worker_first 에 없는 경로는 이 Worker 를 거치지 않는다.)
import * as consultation from '../api/consultation';
import { isMediaPath, serveMedia, type Env } from './media';

// 검색엔진 소유확인 파일 (확인 후에도 지우면 안 된다). wrangler.jsonc 의 run_worker_first 에도 같은 주소가 있어야 한다.
const SITE_VERIFICATION_PATHS = [
  '/naver8a7f4a9705bc207c9207d5b8aa925ad6.html', // 네이버 서치어드바이저
  '/google68732f90b25cb2d2.html', // 구글 서치콘솔
];

// /kakao 가 보내는 곳(오픈채팅 주소는 이 한 곳에서만 관리한다. 홈피 헤더 버튼도 /kakao 를 거친다).
const OPEN_CHAT_URL = 'https://open.kakao.com/o/gjZOi0Pi';
// 링크 미리보기·검색 로봇으로 보이는 user-agent. 이동은 똑같이 하되 기록(n8n)은 보내지 않는다(n8n 월 실행 한도 절약).
// 사람 브라우저가 잘못 걸리지 않게 로봇 이름만 넣는다(예: 카카오 미리보기 kakaotalk-scrap, 네이버 Yeti, 다음 Daumoa).
const BOT_UA = /bot|crawl|spider|slurp|scrap|preview|facebookexternalhit|yeti|daumoa|whatsapp|curl|wget|python|headless/i;
// 꼬리표 값 정리: 공백은 _ 로, 영문·숫자·한글·_·- 만 남기고 100자로 자른다(api/consultation.ts 와 같은 규칙).
const tagValue = (value: string | null) => (value ?? '').trim().replace(/\s+/g, '_').replace(/[^0-9A-Za-z가-힣_-]/g, '').slice(0, 100);
const hostOf = (value: string | null) => { try { return value ? new URL(value).hostname : ''; } catch { return ''; } };

// 운영 주소. 미리보기(workers.dev) 등 다른 주소에서 들어온 클릭은 「시험」으로 기록한다.
const PRODUCTION_HOST = 'ddangyo.helpceo.kr';

// 클릭 1건을 기록한다. 기록은 응답을 보낸 뒤 따로 처리돼(waitUntil) 이동·전화 연결을 늦추거나 막지 않는다.
// 꼬리표(utm_*)는 주소에서 읽는다. IP·이름 등 개인정보는 기록하지 않는다.
// 봇의심 요청이거나 기록 주소(webhookVar)가 없으면 기록하지 않는다.
const recordClick = (request: Request, env: Env, ctx: ExecutionContext, kind: '카톡' | '전화', webhookVar: string) => {
  const url = new URL(request.url);
  const vars = env as unknown as Record<string, string | undefined>;
  const userAgent = (request.headers.get('user-agent') ?? '').slice(0, 300);
  const record = {
    requestedAt: new Date().toISOString(),
    kind,
    utm_source: tagValue(url.searchParams.get('utm_source')),
    utm_medium: tagValue(url.searchParams.get('utm_medium')),
    utm_campaign: tagValue(url.searchParams.get('utm_campaign')),
    referrerHost: hostOf(request.headers.get('referer')),
    userAgent,
    botSuspect: BOT_UA.test(userAgent) ? '봇의심' : '',
    test: url.searchParams.get('test') === '1' || url.hostname !== PRODUCTION_HOST ? '시험' : '',
  };
  const webhookUrl = vars[webhookVar];
  if (!record.botSuspect && webhookUrl && vars.N8N_CONSULTATION_WEBHOOK_SECRET) {
    ctx.waitUntil(fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': vars.N8N_CONSULTATION_WEBHOOK_SECRET },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(5000),
    }).catch(() => undefined));
  }
};

// 요청 1건을 기록하고 바로 오픈채팅으로 보낸다(기록 주소 = N8N_KAKAO_CLICK_WEBHOOK_URL).
const kakaoRedirect = (request: Request, env: Env, ctx: ExecutionContext) => {
  recordClick(request, env, ctx, '카톡', 'N8N_KAKAO_CLICK_WEBHOOK_URL');
  return new Response(null, { status: 302, headers: { Location: OPEN_CHAT_URL, 'Cache-Control': 'no-store' } });
};

// #8 전화 버튼 클릭 기록(기록 주소 = N8N_CALL_CLICK_WEBHOOK_URL, 없으면 기록 생략). 본문은 읽지 않는다.
const callClick = (request: Request, env: Env, ctx: ExecutionContext) => {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { 'Cache-Control': 'no-store' } });
  recordClick(request, env, ctx, '전화', 'N8N_CALL_CLICK_WEBHOOK_URL');
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
};

// 미리보기(workers.dev) 등 운영 주소가 아닌 곳에서 보낸 상담 신청은 매장명 앞에 「[시험] 」을 붙여
// 시트·메일·카톡 알림에서 바로 구분되게 한다. 운영 주소의 신청과 JSON 이 아닌 본문은 그대로 넘긴다(검증은 api/consultation.ts).
const markPreviewSubmission = async (request: Request) => {
  if (request.method !== 'POST' || new URL(request.url).hostname === PRODUCTION_HOST) return request;
  const raw = await request.text();
  let body = raw;
  try {
    const input: unknown = JSON.parse(raw);
    if (input && typeof input === 'object' && !Array.isArray(input) && typeof (input as { storeName?: unknown }).storeName === 'string') {
      body = JSON.stringify({ ...input, storeName: `[시험] ${(input as { storeName: string }).storeName}` });
    }
  } catch { /* JSON 이 아니면 그대로 넘겨 API 가 400 으로 답하게 한다 */ }
  return new Request(request.url, { method: 'POST', headers: request.headers, body });
};

type Handler = (request: Request) => Promise<Response> | Response;

const consultationHandlers = consultation as unknown as Record<string, Handler | undefined>;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/kakao' || pathname === '/kakao/') return kakaoRedirect(request, env, ctx);

    if (pathname === '/api/call-click') return callClick(request, env, ctx);

    if (pathname === '/api/consultation') {
      const handler = consultationHandlers[request.method];
      // api/consultation.ts 가 내보내지 않은 메서드(HEAD, OPTIONS 등)는 기존 Vercel 과 같이 본문 없는 405.
      return handler ? handler(await markPreviewSubmission(request)) : new Response(null, { status: 405, headers: { 'Cache-Control': 'no-store' } });
    }

    if (pathname.startsWith('/api/')) {
      return new Response('The page could not be found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    if (SITE_VERIFICATION_PATHS.includes(pathname)) {
      return env.ASSETS.fetch(new URL(pathname.slice(0, -'.html'.length), request.url));
    }

    if (isMediaPath(pathname)) return serveMedia(request, env);

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
