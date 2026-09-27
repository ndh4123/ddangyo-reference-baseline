# Cloudflare Workers 배포 안내 (구조 C)

Vercel 과 같은 화면·동작을 Cloudflare Workers 에서 제공하기 위한 설정이다.
홈페이지 코드(`src/`), `vite.config.ts`, `api/consultation.ts` 는 Vercel 과 그대로 공유한다.

## 구성

| 경로 | 처리 |
| --- | --- |
| `/api/consultation` | `worker/index.ts` 가 `api/consultation.ts` 를 수정 없이 불러 실행 |
| `/videos/*.mp4`, `/animations/*.webm`, `/images/benefits/*.mp4` | `worker/media.ts` — 전체 파일을 한 번 제공하고 Range 206 은 Cloudflare 캐시(Workers Caching)가 만든다 |
| 그 밖의 모든 파일 | Workers Static Assets(`dist`)가 Worker 호출 없이 직접 제공 |

- Static Assets 는 파일당 25 MiB 한도가 있어 `scripts/prepare-cloudflare-assets.mjs` 가 큰 영상(현재 `hero-4scene-v2.mp4`)을
  `/_media/` 아래 조각으로 나누고, Worker 가 원래 주소로 이어 붙여 제공한다.
- 영상 ETag 는 파일 내용의 SHA-256 해시로 만든다(`/_media/manifest.json`).
- 캐시는 Worker 버전별로 나뉘므로 새로 배포하면 새 영상으로 시작한다.

## 명령

| 명령 | 내용 |
| --- | --- |
| `npm run build:cf` | Vite 빌드 + 영상 manifest·조각 준비 (Vercel 빌드 `npm run build` 에는 영향 없음) |
| `npm run dev:cf` | 로컬 실행 (`.dev.vars` 에 테스트용 값) |
| `npm run preview:cf` | Preview 버전 업로드(운영 트래픽에는 영향 없음) |
| `npm run typecheck:cf` | Worker 타입 검사 |

## 비밀값

`N8N_CONSULTATION_WEBHOOK_URL`, `N8N_CONSULTATION_WEBHOOK_SECRET` 은 코드·설정 파일에 적지 않는다.
Cloudflare 대시보드 → Workers → `ddangyo-site` → Settings → Variables and Secrets 에서 **Secret** 으로 넣는다.
로컬 테스트는 git 에 올라가지 않는 `.dev.vars` 에 테스트용 값만 넣는다.

## 알려진 차이 (기능 영향 없음)

- 캐시가 만든 206 응답에는 `Accept-Ranges` 헤더가 없다(RFC 상 선택 항목). `Content-Range`/`Content-Length` 는 Vercel 과 같다.
- 영상 `Cache-Control` 에 `s-maxage` 가 추가된다(브라우저는 기존처럼 매번 재검증, Cloudflare 캐시만 보관).
- 여러 구간 Range(`bytes=0-1,5-6`)에 Vercel 은 200 전체, Cloudflare 는 206 multipart 로 응답한다. 브라우저 영상 재생은 여러 구간을 쓰지 않는다.
