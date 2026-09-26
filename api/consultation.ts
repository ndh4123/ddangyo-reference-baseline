// #8 상담 신청 중간 API (Vercel Function).
// 브라우저 → /api/consultation → n8n Webhook.
// n8n 주소와 비밀키는 Vercel 환경변수에만 있고 프론트 번들에는 들어가지 않는다.
// 개인정보가 오가므로 요청 본문·입력값은 절대 로그로 남기지 않는다.

declare const process: { env: Record<string, string | undefined> };

const MAX_BODY_BYTES = 10_000;
const N8N_TIMEOUT_MS = 10_000;
const SOURCE = 'ddangyo.helpceo.kr';

// 화면 칩 이름 → n8n 으로 보내는 이름. '배민' 만 정식 명칭으로 바꾼다.
const deliveryAppNames: Record<string, string> = {
  배민: '배달의민족',
  배달의민족: '배달의민족',
  쿠팡이츠: '쿠팡이츠',
  요기요: '요기요',
  땡겨요: '땡겨요',
  '배달앱 미사용': '배달앱 미사용',
  기타: '기타',
};
const NO_DELIVERY_APP = '배달앱 미사용';

type ConsultationPayload = {
  storeName: string;
  phone: string;
  address: string;
  deliveryApps: string[];
  privacyConsent: true;
  submittedAt: string;
  source: string;
};

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

const text = (value: unknown, min: number, max: number) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length >= min && trimmed.length <= max ? trimmed : null;
};

// 휴대폰 번호는 숫자만 남겨 01012345678 형태로 통일한다.
const mobilePhone = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  return /^01[016789]\d{7,8}$/.test(digits) ? digits : null;
};

const deliveryApps = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0 || value.length > Object.keys(deliveryAppNames).length) return null;
  const names: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !(item in deliveryAppNames)) return null;
    const name = deliveryAppNames[item];
    if (!names.includes(name)) names.push(name);
  }
  // '배달앱 미사용' 은 다른 앱과 함께 올 수 없다(화면과 같은 규칙).
  if (names.includes(NO_DELIVERY_APP) && names.length > 1) return null;
  return names;
};

const validate = (input: Record<string, unknown>) => {
  const invalid: string[] = [];
  const storeName = text(input.storeName, 1, 100);
  const phone = mobilePhone(input.phone);
  const address = text(input.address, 2, 200);
  const apps = deliveryApps(input.deliveryApps);
  if (!storeName) invalid.push('storeName');
  if (!phone) invalid.push('phone');
  if (!address) invalid.push('address');
  if (!apps) invalid.push('deliveryApps');
  if (input.privacyConsent !== true) invalid.push('privacyConsent');
  if (invalid.length || !storeName || !phone || !address || !apps) return { invalid };
  return { payload: { storeName, phone, address, deliveryApps: apps, privacyConsent: true as const } };
};

export async function POST(request: Request): Promise<Response> {
  const webhookUrl = process.env.N8N_CONSULTATION_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_CONSULTATION_WEBHOOK_SECRET;
  if (!webhookUrl || !webhookSecret) {
    console.error('[consultation] webhook env missing');
    return json(500, { ok: false, error: 'server_misconfigured' });
  }

  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return json(415, { ok: false, error: 'unsupported_media_type' });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'payload_too_large' });

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return json(400, { ok: false, error: 'invalid_input', fields: [] });
  }

  const result = validate(input as Record<string, unknown>);
  if (!result.payload) {
    // 휴대폰 형식 오류는 화면이 따로 안내하므로 코드로 구분해 준다. 입력값은 응답에 담지 않는다.
    if (result.invalid.includes('phone')) return json(400, { ok: false, code: 'INVALID_PHONE' });
    return json(400, { ok: false, code: 'INVALID_INPUT', fields: result.invalid });
  }

  const payload: ConsultationPayload = {
    ...result.payload,
    submittedAt: new Date().toISOString(),
    source: SOURCE,
  };

  try {
    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': webhookSecret },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(N8N_TIMEOUT_MS),
    });
    // n8n 은 Google Sheets 저장이 끝난 뒤에만 { ok: true } 를 돌려준다.
    // 그 응답이 아니면(저장 실패·예전 즉시응답 등) 접수 성공으로 보지 않는다.
    const upstreamResult: unknown = await upstream.json().catch(() => null);
    const saved = upstream.ok && typeof upstreamResult === 'object' && upstreamResult !== null
      && (upstreamResult as { ok?: unknown }).ok === true;
    if (!saved) {
      console.error(`[consultation] n8n not saved (status ${upstream.status})`);
      return json(502, { ok: false, code: 'UPSTREAM_FAILED' });
    }
  } catch (error) {
    console.error(`[consultation] n8n request failed: ${error instanceof Error ? error.name : 'unknown'}`);
    return json(502, { ok: false, code: 'UPSTREAM_UNREACHABLE' });
  }

  return json(200, { ok: true });
}

const methodNotAllowed = () => json(405, { ok: false, error: 'method_not_allowed' }, { Allow: 'POST' });
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
