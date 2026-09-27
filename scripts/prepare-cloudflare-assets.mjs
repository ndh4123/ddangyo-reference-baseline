// Cloudflare Workers 배포용 dist 후처리.
// `npm run build`(Vite) 결과물은 그대로 두고, 영상 파일에 대해서만 아래를 준비한다.
//   1) 영상마다 콘텐츠 해시(SHA-256) 기반 ETag 와 크기를 manifest 로 기록한다.
//      Workers Static Assets 는 Range 요청에 206 을 주지 않고 응답에 Content-Length 도 없어서,
//      Worker(worker/media.ts)가 이 manifest 를 보고 Range 를 직접 잘라 206 으로 응답한다.
//   2) 25 MiB(Static Assets 파일당 한도)를 넘는 영상은 조각으로 나눠 /_media/ 아래에 두고
//      원본은 dist 에서 뺀다. 브라우저는 기존 주소 그대로 요청하고 Worker 가 이어 붙인다.
//   3) 한도를 넘는 파일이 남아 있거나 파일 수가 한도를 넘으면 실패시켜 배포를 막는다.
// Vercel 빌드(`npm run build`)는 이 스크립트를 실행하지 않으므로 영향이 없다.
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, posix, relative, sep } from 'node:path';

const DIST = 'dist';
const MAX_ASSET_BYTES = 25 * 1024 * 1024; // Workers Static Assets 파일당 한도(25 MiB)
const PART_BYTES = 20 * 1024 * 1024; // 조각 크기. 한도보다 여유 있게 20 MiB
const MAX_FILES = 20_000; // Workers Free 플랜 버전당 정적 파일 수 한도
const MANIFEST_PATH = '/_media/manifest.json';

// worker/media.ts 의 MEDIA_PATH 와 같은 규칙이어야 한다.
const MEDIA_PATH = /^\/(videos\/[^/]+\.mp4|animations\/[^/]+\.webm|images\/benefits\/[^/]+\.mp4)$/;
const CONTENT_TYPES = { '.mp4': 'video/mp4', '.webm': 'video/webm' };

const toUrlPath = (file) => '/' + relative(DIST, file).split(sep).join('/');
const toFsPath = (urlPath) => join(DIST, ...urlPath.slice(1).split('/'));

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const files = await walk(DIST);
const manifest = { version: 1, generatedAt: new Date().toISOString(), files: {} };

for (const file of files) {
  const urlPath = toUrlPath(file);
  if (!MEDIA_PATH.test(urlPath)) continue;
  const content = await readFile(file);
  const etag = `"${createHash('sha256').update(content).digest('hex').slice(0, 32)}"`;
  const ext = posix.extname(urlPath);
  let parts = [{ path: urlPath, size: content.length }];

  if (content.length > MAX_ASSET_BYTES) {
    parts = [];
    for (let offset = 0, index = 1; offset < content.length; offset += PART_BYTES, index += 1) {
      const chunk = content.subarray(offset, offset + PART_BYTES);
      const partPath = `/_media${urlPath}.part${index}`;
      await mkdir(dirname(toFsPath(partPath)), { recursive: true });
      await writeFile(toFsPath(partPath), chunk);
      parts.push({ path: partPath, size: chunk.length });
    }
    await rm(file);
  }

  manifest.files[urlPath] = { size: content.length, etag, contentType: CONTENT_TYPES[ext], parts };
}

await mkdir(dirname(toFsPath(MANIFEST_PATH)), { recursive: true });
await writeFile(toFsPath(MANIFEST_PATH), JSON.stringify(manifest, null, 2) + '\n');

// 최종 검사: 한도를 넘는 파일이 하나라도 있으면 배포하지 않는다.
const finalFiles = await walk(DIST);
const tooLarge = [];
for (const file of finalFiles) {
  const { size } = await stat(file);
  if (size > MAX_ASSET_BYTES) tooLarge.push(`${toUrlPath(file)} (${(size / 1048576).toFixed(2)} MiB)`);
}
if (tooLarge.length) {
  console.error(`[cloudflare] 25 MiB 를 넘는 파일이 있어 중단합니다:\n  ${tooLarge.join('\n  ')}`);
  process.exit(1);
}
if (finalFiles.length > MAX_FILES) {
  console.error(`[cloudflare] 정적 파일 수 ${finalFiles.length} 개가 한도 ${MAX_FILES} 개를 넘어 중단합니다.`);
  process.exit(1);
}

const media = Object.entries(manifest.files);
console.log(`[cloudflare] 영상 ${media.length}개 manifest 작성 (${MANIFEST_PATH})`);
for (const [path, entry] of media) {
  const split = entry.parts.length > 1 ? ` → ${entry.parts.length}조각` : '';
  console.log(`  ${path}  ${(entry.size / 1048576).toFixed(2)} MiB  ETag ${entry.etag}${split}`);
}
console.log(`[cloudflare] 정적 파일 ${finalFiles.length}개, 25 MiB 초과 0개`);
