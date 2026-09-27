// 홈페이지 영상 제공.
// Workers Static Assets 는 Range 요청에도 전체 200 을 돌려주고 Content-Length 도 없다.
// iPhone Safari 는 206 을 받지 못하면 영상을 재생하지 않을 수 있으므로 영상 경로만 이 Worker 가 받는다.
//
// 기본 동작(Workers Caching 사용, wrangler.jsonc 의 cache.enabled):
//   Worker 는 영상 전체를 200 으로 한 번만 돌려주고, Cloudflare 캐시가 그 응답을 저장한 뒤
//   브라우저의 Range 요청을 잘라 206 으로 응답한다. 캐시 적중 시 Worker 는 실행되지 않는다(CPU 0).
//   Worker 는 바이트를 JS 로 만지지 않고 정적 파일 스트림을 그대로 이어 붙이기만 한다(pipeTo).
//   → PoC 에서 JS 로 구간을 잘랐을 때 요청당 CPU 가 수백 ms 나와 무료 플랜 한도(10ms)를 넘었다.
// 예비 동작: 캐시가 꺼져 Range 가 Worker 까지 오면 직접 잘라 206 으로 응답한다(느리지만 정상 동작).
//
// 크기·콘텐츠 해시 ETag·조각 목록은 scripts/prepare-cloudflare-assets.mjs 가 만든 manifest 를 쓴다.
// 주소는 기존과 같다(/videos, /animations, /images/benefits).

export interface Env {
  ASSETS: Fetcher;
}

interface MediaPart {
  path: string;
  size: number;
}

interface MediaEntry {
  size: number;
  etag: string;
  contentType: string;
  parts: MediaPart[];
}

interface MediaManifest {
  version: 1;
  generatedAt: string;
  files: Record<string, MediaEntry>;
}

// scripts/prepare-cloudflare-assets.mjs 의 MEDIA_PATH 와 같은 규칙이어야 한다.
const MEDIA_PATH = /^\/(videos\/[^/]+\.mp4|animations\/[^/]+\.webm|images\/benefits\/[^/]+\.mp4)$/;
const MANIFEST_PATH = '/_media/manifest.json';
// 브라우저에는 기존 Vercel 과 같이 매번 재검증(max-age=0, must-revalidate)을 요구하고,
// Cloudflare 캐시(공유 캐시)만 s-maxage 동안 보관한다. 캐시는 Worker 버전별로 나뉘므로
// 새로 배포하면 새 영상으로 시작해 오래된 영상이 남지 않는다.
const CACHE_CONTROL = 'public, max-age=0, s-maxage=31536000, must-revalidate';

export const isMediaPath = (pathname: string) => MEDIA_PATH.test(pathname);

let manifestPromise: Promise<MediaManifest> | null = null;

const loadManifest = (env: Env, origin: string) => {
  manifestPromise ??= env.ASSETS.fetch(new Request(origin + MANIFEST_PATH))
    .then((response) => {
      if (!response.ok) throw new Error(`media manifest ${response.status}`);
      return response.json() as Promise<MediaManifest>;
    })
    .catch((error: unknown) => {
      manifestPromise = null; // 다음 요청에서 다시 시도한다.
      throw error;
    });
  return manifestPromise;
};

type ByteRange = { start: number; end: number };

// 단일 구간만 지원한다. 문법이 틀리거나 여러 구간이면 Range 를 무시하고 전체를 준다(RFC 9110 허용).
const parseRange = (header: string, size: number): ByteRange | 'unsatisfiable' | null => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return null;
  if (match[1] === '') {
    const suffix = Number(match[2]);
    if (suffix === 0) return 'unsatisfiable';
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(match[1]);
  const end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (match[2] !== '' && Number(match[2]) < start) return null;
  if (start >= size) return 'unsatisfiable';
  return { start, end };
};

const etagMatches = (header: string | null, etag: string) =>
  header !== null && header.split(',').some((tag) => {
    const value = tag.trim().replace(/^W\//, '');
    return value === '*' || value === etag;
  });

const fetchPart = async (env: Env, origin: string, part: MediaPart) => {
  const response = await env.ASSETS.fetch(new Request(origin + part.path));
  if (!response.ok || !response.body) throw new Error(`media part ${response.status}`);
  return response.body;
};

// 전체 파일: 조각들을 JS 가공 없이 차례로 이어 붙인다(pipeTo 는 런타임 안에서 처리된다).
const wholeStream = (env: Env, origin: string, entry: MediaEntry) => {
  const { readable, writable } = new FixedLengthStream(entry.size);
  const pump = async () => {
    try {
      for (const part of entry.parts) {
        await (await fetchPart(env, origin, part)).pipeTo(writable, { preventClose: true });
      }
      await writable.close();
    } catch (error) {
      await writable.abort(error).catch(() => undefined);
    }
  };
  void pump();
  return readable;
};

// 예비 경로: 요청 구간만 잘라 보낸다(캐시가 꺼졌을 때만 쓰인다).
const rangeStream = (env: Env, origin: string, entry: MediaEntry, start: number, end: number) => {
  const { readable, writable } = new FixedLengthStream(end - start + 1);
  const pump = async () => {
    const writer = writable.getWriter();
    try {
      let offset = 0;
      for (const part of entry.parts) {
        const partStart = offset;
        const partEnd = offset + part.size - 1;
        offset += part.size;
        if (partEnd < start || partStart > end) continue;
        const reader = (await fetchPart(env, origin, part)).getReader();
        let position = partStart;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStart = position;
          const chunkEnd = position + value.length - 1;
          position += value.length;
          if (chunkEnd < start) continue;
          if (chunkStart > end) {
            await reader.cancel();
            break;
          }
          await writer.write(value.subarray(Math.max(start, chunkStart) - chunkStart, Math.min(end, chunkEnd) - chunkStart + 1));
          if (chunkEnd >= end) {
            await reader.cancel();
            break;
          }
        }
      }
      await writer.close();
    } catch (error) {
      await writer.abort(error).catch(() => undefined);
    }
  };
  void pump();
  return readable;
};

export async function serveMedia(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } });
  }

  const manifest = await loadManifest(env, url.origin);
  const entry = manifest.files[decodeURIComponent(url.pathname)];
  if (!entry) return env.ASSETS.fetch(request); // manifest 에 없는 파일은 정적 파일 처리 그대로

  const headers = new Headers({
    'Content-Type': entry.contentType,
    'Accept-Ranges': 'bytes',
    ETag: entry.etag,
    'Last-Modified': new Date(manifest.generatedAt).toUTCString(),
    'Cache-Control': CACHE_CONTROL,
  });

  if (etagMatches(request.headers.get('If-None-Match'), entry.etag)) {
    return new Response(null, { status: 304, headers });
  }

  let range: ByteRange | null = null;
  const rangeHeader = request.headers.get('Range');
  // If-Range 가 현재 파일과 다르면(파일이 바뀐 경우) Range 를 무시하고 전체를 새로 준다.
  const ifRange = request.headers.get('If-Range');
  const rangeAllowed = ifRange === null || ifRange === entry.etag || ifRange === headers.get('Last-Modified');
  if (rangeHeader && rangeAllowed) {
    const parsed = parseRange(rangeHeader, entry.size);
    if (parsed === 'unsatisfiable') {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${entry.size}`, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' } });
    }
    range = parsed;
  }

  if (range) {
    const length = range.end - range.start + 1;
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${entry.size}`);
    headers.set('Content-Length', String(length));
    const body = request.method === 'HEAD' ? null : rangeStream(env, url.origin, entry, range.start, range.end);
    return new Response(body, { status: 206, headers });
  }

  headers.set('Content-Length', String(entry.size));
  const body = request.method === 'HEAD' ? null : wholeStream(env, url.origin, entry);
  return new Response(body, { status: 200, headers });
}
