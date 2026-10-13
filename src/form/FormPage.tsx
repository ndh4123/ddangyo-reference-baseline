import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { ConsultationTrust, ConsultationVisual } from '../components/ConsultationSide';
import { SiteFooter } from '../components/SiteFooter';

// 카톡 전용 상담 신청 폼(/form). 카톡으로 먼저 문의한 사장님에게만 상담 봇이 이 주소를 준다.
// 사이트 어디에도 이 페이지로 가는 링크를 두지 않고, 검색엔진에는 noindex(form.html · public/_headers)로 막는다.
// 접수 흐름은 예전 홈페이지 #8 폼과 같다: /api/consultation → n8n 「땡겨요 상담 접수」 → 시트 「상담내역」 + Gmail·카톡 알림.

// 접수 결과 안내(예전 #8 폼 문구 그대로). 성공 문구는 /api/consultation 이 ok:true 를 돌려줬을 때만 띄운다.
const successMessage = '상담 신청이 접수되었습니다. 담당 매니저 배정 후 연락드리겠습니다. 감사합니다.';
const errorMessage = '접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. 계속 문제가 발생하면 1555-1984로 연락해 주세요.';
const invalidPhoneMessage = '휴대폰 번호를 확인해 주세요.';
// 시트 「유입채널」 칸 값. 이 폼은 카톡 상담 봇이 준 링크로만 들어오므로 고정한다.
const FORM_SOURCE = 'kakao_form';
// 배달앱 칩(복수 선택). '배달앱 미사용'은 다른 앱과 함께 고를 수 없다. API 가 '배민' 을 '배달의민족' 으로 바꿔 보낸다.
const DELIVERY_APPS = ['배민', '쿠팡이츠', '요기요', '땡겨요', '배달앱 미사용', '기타'];
const NO_DELIVERY_APP = '배달앱 미사용';
// 동의 문구를 모바일에서는 「[필수] 개인정보」를 앞에 둔다(예전 #8 과 같은 기준).
const mobileQuery = '(max-width: 600px)';

// 동의 「내용보기」에 펼치는 항목. 개인정보 처리방침과 내용이 맞아야 한다.
const PRIVACY_DETAILS: [string, string][] = [
  ['[수집·이용 목적]', '땡겨요 입점 상담 신청 접수, 상담 연락, 담당 매니저 배정, 입점 지원, 입점 후 매장 관리·사후관리 및 운영 컨설팅'],
  ['[수집 항목]', '매장명(상호), 휴대폰 번호, 매장 주소, 현재 이용 중인 배달앱'],
  ['[보유·이용 기간]', '상담, 입점 및 관리가 종료될 때까지 보유하며, 종료일로부터 6개월 후 파기합니다. 입점하지 않은 상담도 상담 종료일로부터 6개월 후 파기합니다.'],
  ['[동의 거부 안내]', '개인정보 수집 및 이용에 동의하지 않을 권리가 있습니다. 다만 동의를 거부할 경우 무료 입점 상담 신청이 제한될 수 있습니다.'],
];

type ConsentRowProps = { id: string; name: string; mobile: boolean; rest: string; details: [string, string][] };

// 필수 동의 한 줄(체크박스 + 「내용보기」 펼침 + 처리방침 전문 링크). 상담 단계에서는 제3자 제공이 없어 수집·이용 동의 하나만 받는다
// (입점하는 사장님은 땡겨요 계약서에서 따로 동의한다).
function ConsentRow({ id, name, mobile, rest, details }: ConsentRowProps) {
  const [open, setOpen] = useState(false);
  const label: ReactNode = mobile
    ? <><span className="consultation-form__privacy-lead"><b>[필수]</b> 개인정보</span> {rest}</>
    : <>개인정보 {rest} <b>[필수]</b></>;
  return (
    <div className="consultation-form__privacy-row consultation-form__full">
      <label className="consultation-form__privacy" htmlFor={id}>
        <input id={id} name={name} type="checkbox" required />
        <span>{label}</span>
      </label>
      <button className="consultation-form__privacy-toggle" type="button" aria-expanded={open} onClick={() => setOpen((isOpen) => !isOpen)}>
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
        {open ? '내용닫기' : '내용보기'}
      </button>
      {open && (
        <dl className="consultation-form__privacy-details">
          {details.map(([title, text]) => (
            <div key={title}>
              <dt>{title}</dt>
              <dd>{text}</dd>
            </div>
          ))}
          {/* 새 창으로 열어 쓰던 신청서가 사라지지 않게 한다. */}
          <div>
            <dd><a className="consultation-form__privacy-link" href="/privacy" target="_blank" rel="noopener">개인정보 처리방침 전문 보기 ›</a></dd>
          </div>
        </dl>
      )}
    </div>
  );
}

export function FormPage() {
  const [mobile, setMobile] = useState(() => window.matchMedia(mobileQuery).matches);
  const [selectedDeliveryApps, setSelectedDeliveryApps] = useState<string[]>([]);
  const [deliveryAppsError, setDeliveryAppsError] = useState(false);
  const [deliveryAppsAlerting, setDeliveryAppsAlerting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    const query = window.matchMedia(mobileQuery);
    const onChange = () => setMobile(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedDeliveryApps.length === 0) {
      setDeliveryAppsError(true);
      setDeliveryAppsAlerting(false);
      window.requestAnimationFrame(() => setDeliveryAppsAlerting(true));
      return;
    }

    setDeliveryAppsError(false);
    // state 갱신은 다음 렌더에야 버튼에 반영되므로, 같은 순간의 연속 클릭은 ref 로 막는다.
    if (submittingRef.current) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const field = (name: string) => {
      const value = formData.get(name);
      return typeof value === 'string' ? value : '';
    };
    // 개인정보가 담기므로 로그·브라우저 저장소에 남기지 않고 요청 본문으로만 보낸다.
    const payload = {
      storeName: field('storeName'),
      phone: field('phone'),
      address: field('storeAddress'),
      deliveryApps: selectedDeliveryApps,
      privacyConsent: formData.get('privacyConsent') !== null,
      source: FORM_SOURCE,
      sourceDetail: {},
    };

    submittingRef.current = true;
    setSubmitting(true);
    let accepted = false;
    let invalidPhone = false;
    try {
      const response = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { ok?: unknown; code?: unknown } | null;
      accepted = response.ok && result?.ok === true;
      invalidPhone = response.status === 400 && result?.code === 'INVALID_PHONE';
    } catch {
      accepted = false;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }

    if (accepted) {
      window.alert(successMessage);
      form.reset();
      setSelectedDeliveryApps([]);
    } else {
      // 실패하면 입력값은 그대로 두고 다시 시도하게 한다.
      window.alert(invalidPhone ? invalidPhoneMessage : errorMessage);
    }
  };

  return (
    <>
      <header className="site-header is-dark">
        <div className="header-inner">
          <a className="wordmark" href="/" aria-label="땡겨요 입점 상담 홈페이지로 이동">
            <img src="/images/ddangyo-logo-orange-vector.svg" alt="땡겨요" />
          </a>
        </div>
      </header>
      <main className="screens">
        <section className="screen consultation is-active">
          <div className="consultation__inner">
            <header className="consultation__header">
              <h2><strong>땡겨요</strong> 상담 신청</h2>
              <p>간단한 정보만 남겨주시면 전담 매니저가 확인 후 연락드립니다.</p>
            </header>
            <div className="consultation__layout">
              <ConsultationVisual />

              <form className="consultation-form" onSubmit={handleSubmit}>
                <div className="consultation-form__fields">
                  <label className="consultation-form__field" htmlFor="consultation-store-name">
                    <span>매장명(상호)</span>
                    <input id="consultation-store-name" name="storeName" type="text" placeholder="매장명을 입력해주세요." autoComplete="organization" required />
                  </label>
                  <label className="consultation-form__field" htmlFor="consultation-phone">
                    <span>휴대폰 번호</span>
                    <input id="consultation-phone" name="phone" type="tel" inputMode="tel" placeholder="010-0000-0000" autoComplete="tel" required />
                  </label>
                  <label className="consultation-form__field" htmlFor="consultation-address">
                    <span>매장 주소</span>
                    <input id="consultation-address" name="storeAddress" type="text" placeholder="예: 서울특별시 중구 세종대로 67, 1층" autoComplete="street-address" required />
                  </label>
                </div>
                <div
                  className={`consultation-form__apps-wrap consultation-form__full ${deliveryAppsError ? 'is-error' : ''} ${deliveryAppsAlerting ? 'is-alerting' : ''}`}
                  onAnimationEnd={(event) => {
                    if (event.animationName === 'consultation-apps-error-pulse') setDeliveryAppsAlerting(false);
                  }}
                >
                  <fieldset
                    className="consultation-form__apps"
                    aria-invalid={deliveryAppsError}
                    aria-describedby={deliveryAppsError ? 'consultation-delivery-apps-error' : undefined}
                  >
                    <legend>현재 이용 중인 배달앱 <small>복수 선택 가능</small></legend>
                    <div className="consultation-form__chips">
                      {DELIVERY_APPS.map((appName) => (
                        <label key={appName}>
                          <input
                            type="checkbox"
                            name="deliveryApps"
                            value={appName}
                            checked={selectedDeliveryApps.includes(appName)}
                            onChange={() => {
                              setDeliveryAppsError(false);
                              setDeliveryAppsAlerting(false);
                              setSelectedDeliveryApps((selectedApps) => {
                                if (appName === NO_DELIVERY_APP) return selectedApps.includes(appName) ? [] : [appName];
                                const selectableApps = selectedApps.filter((selectedApp) => selectedApp !== NO_DELIVERY_APP);
                                return selectableApps.includes(appName)
                                  ? selectableApps.filter((selectedApp) => selectedApp !== appName)
                                  : [...selectableApps, appName];
                              });
                            }}
                          />
                          <span>{appName}</span>
                        </label>
                      ))}
                    </div>
                    {deliveryAppsError && (
                      <p id="consultation-delivery-apps-error" className="consultation-form__apps-error" role="alert">
                        현재 이용 중인 배달앱을 선택해주세요.
                      </p>
                    )}
                  </fieldset>
                </div>
                <ConsentRow id="consultation-privacy" name="privacyConsent" mobile={mobile} rest="수집 및 이용에 동의합니다." details={PRIVACY_DETAILS} />
                <button
                  className="consultation-form__submit consultation-form__full"
                  type="submit"
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitting ? '접수 중...' : '무료 입점 상담 신청'}
                </button>
                <p className="consultation-form__phone consultation-form__full">전화 상담이 편하신가요? <a href="tel:1555-1984">1555-1984</a></p>
              </form>

              <ConsultationTrust />
            </div>
          </div>
          <SiteFooter privacyLink />
        </section>
      </main>
    </>
  );
}
