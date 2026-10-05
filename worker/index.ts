// Cloudflare Workers 진입점.
// - /api/consultation : 기존 Vercel Function(api/consultation.ts)을 수정 없이 그대로 불러 쓴다.
//   환경변수는 nodejs_compat 이 process.env 로 채워 준다(wrangler.jsonc 참고).
// - 영상 경로          : worker/media.ts (Workers Caching 이 Range 206 을 만든다).
// - 검색엔진 소유확인  : 정적 파일 기본 설정은 `.html` 주소를 확장자 없는 주소로 307 넘김하므로,
//   네이버·구글 확인 파일 주소만 Worker 가 받아 넘김 없이 200 으로 돌려준다(내용은 public 원본 그대로).
// 이 Worker 는 Workers Caching(cache.enabled)을 쓰므로, 캐시되면 안 되는 응답에는 Cache-Control: no-store 를 붙인다.
// (POST 는 원래 캐시되지 않고, api/consultation.ts 의 응답에는 이미 no-store 가 있다.)
// - /kakao             : 오픈채팅으로 302 이동. 요청 1건을 별도 n8n 입구로 기록한다(실패해도 이동은 된다).
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

// 요청 1건을 기록하고 바로 오픈채팅으로 보낸다. 기록은 응답을 보낸 뒤 따로 처리돼(waitUntil) 이동을 늦추거나 막지 않는다.
// IP 는 기록하지 않는다. 봇의심 요청이거나 기록 주소(N8N_KAKAO_CLICK_WEBHOOK_URL)가 없으면 기록 없이 이동만 한다.
const kakaoRedirect = (request: Request, env: Env, ctx: ExecutionContext) => {
  const url = new URL(request.url);
  const vars = env as unknown as Record<string, string | undefined>;
  const userAgent = (request.headers.get('user-agent') ?? '').slice(0, 300);
  const record = {
    requestedAt: new Date().toISOString(),
    utm_source: tagValue(url.searchParams.get('utm_source')),
    utm_medium: tagValue(url.searchParams.get('utm_medium')),
    utm_campaign: tagValue(url.searchParams.get('utm_campaign')),
    referrerHost: hostOf(request.headers.get('referer')),
    userAgent,
    botSuspect: BOT_UA.test(userAgent) ? '봇의심' : '',
    test: url.searchParams.get('test') === '1' ? '시험' : '',
  };
  if (!record.botSuspect && vars.N8N_KAKAO_CLICK_WEBHOOK_URL && vars.N8N_CONSULTATION_WEBHOOK_SECRET) {
    ctx.waitUntil(fetch(vars.N8N_KAKAO_CLICK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': vars.N8N_CONSULTATION_WEBHOOK_SECRET },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(5000),
    }).catch(() => undefined));
  }
  return new Response(null, { status: 302, headers: { Location: OPEN_CHAT_URL, 'Cache-Control': 'no-store' } });
};

type Handler = (request: Request) => Promise<Response> | Response;

const consultationHandlers = consultation as unknown as Record<string, Handler | undefined>;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/kakao' || pathname === '/kakao/') return kakaoRedirect(request, env, ctx);

    if (pathname === '/api/consultation') {
      const handler = consultationHandlers[request.method];
      // api/consultation.ts 가 내보내지 않은 메서드(HEAD, OPTIONS 등)는 기존 Vercel 과 같이 본문 없는 405.
      return handler ? handler(request) : new Response(null, { status: 405, headers: { 'Cache-Control': 'no-store' } });
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
