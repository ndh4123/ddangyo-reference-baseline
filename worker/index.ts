// Cloudflare Workers 진입점.
// - /api/consultation : 기존 Vercel Function(api/consultation.ts)을 수정 없이 그대로 불러 쓴다.
//   환경변수는 nodejs_compat 이 process.env 로 채워 준다(wrangler.jsonc 참고).
// - 영상 경로          : worker/media.ts (Workers Caching 이 Range 206 을 만든다).
// 이 Worker 는 Workers Caching(cache.enabled)을 쓰므로, 캐시되면 안 되는 응답에는 Cache-Control: no-store 를 붙인다.
// (POST 는 원래 캐시되지 않고, api/consultation.ts 의 응답에는 이미 no-store 가 있다.)
// - 그 밖의 모든 경로  : Workers Static Assets(dist)가 그대로 응답한다.
//   (wrangler.jsonc 의 run_worker_first 에 없는 경로는 이 Worker 를 거치지 않는다.)
import * as consultation from '../api/consultation';
import { isMediaPath, serveMedia, type Env } from './media';

type Handler = (request: Request) => Promise<Response> | Response;

const consultationHandlers = consultation as unknown as Record<string, Handler | undefined>;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/consultation') {
      const handler = consultationHandlers[request.method];
      // api/consultation.ts 가 내보내지 않은 메서드(HEAD, OPTIONS 등)는 기존 Vercel 과 같이 본문 없는 405.
      return handler ? handler(request) : new Response(null, { status: 405, headers: { 'Cache-Control': 'no-store' } });
    }

    if (pathname.startsWith('/api/')) {
      return new Response('The page could not be found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    if (isMediaPath(pathname)) return serveMedia(request, env);

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
