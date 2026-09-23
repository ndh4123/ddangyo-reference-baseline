import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';

const sectionCount = 9;
const mobileHeroQuery = '(max-width: 600px)';
const lowLandscapeQuery = '(min-width: 1200px) and (max-width: 1300px) and (max-height: 850px) and (orientation: landscape)';
// 컴팩트 구간(태블릿 / 펼친 폴더블). styles.css 의 601~1100 컴팩트 블록과 같은 판정이어야 한다.
// 펼친 폴더블은 화면이 정사각형에 가까워 orientation 이 landscape 로 뒤집히므로 폭만 본다.
const tabletPortraitQuery = '(min-width: 601px) and (max-width: 1100px)';
const foldLandscapeQuery = '(min-width: 900px) and (max-width: 1100px) and (min-height: 950px) and (max-height: 1050px) and (orientation: landscape)';
// 단계형 터치 내비게이션(#1~#3 문구 단계)을 쓰는 화면군.
// 모바일(<=600)뿐 아니라 컴팩트(601~1100, 태블릿·펼친 폴더블)도 손가락으로 조작하므로 같이 묶는다.
// 폭이 601 을 넘었다는 이유만으로 터치 로직이 통째로 사라지면 펼친 폴더블에서 #1~#3 단계와
// #3 라이더가 영영 나오지 않는다.
const steppedTouchNavQuery = '(max-width: 1100px)';
// 모바일·폴더블·태블릿(휴대폰 손가락 조작 화면군)의 단일 판정.
// styles.css 의 "@media (max-width:1100px)" 하이브리드 레이어와 반드시 같은 숫자여야 한다.
// 이 판정이 true 면 JS 는 화면 이동에 일절 개입하지 않고, 브라우저 기본 스크롤 +
// CSS scroll-snap 만으로 #0~#8 을 움직인다.
const touchLayoutQuery = '(max-width: 1100px)';
const largeTabletPortraitQuery = '(min-width: 900px) and (max-width: 1100px) and (orientation: portrait)';
// #1~#3 스토리. 모바일/컴팩트에서는 한 문장이 곧 한 snap step 이고,
// 스와이프 한 번에 정확히 한 문장씩 정/역방향으로 움직인다.
// 모바일/컴팩트 #1~#3 확정 문구. 바깥 배열 = STEP, 안쪽 배열 = 그 STEP 안의 줄.
// 한 화면 안에서 STEP 만 바뀐다. STEP 당 화면(페이지)을 만들지 않는다.
const storyScreens: Record<number, readonly (readonly string[])[]> = {
  1: [
    ['그럴 때 있잖아요.', '정산서 열어볼 때.'],
    ['오늘 받은 이 주문,', '내 통장엔 얼마가 남을까?'],
    ['분명 바빴는데,', '통장엔 남는 게 없어요'],
  ],
  2: [
    ['그럴 때 있잖아요.', '일은 내가 했는데'],
    ['수수료에 광고비까지', '이것저것 떼고 나면'],
    ['돈은 안 남고', '한숨만 남아요.'],
  ],
  3: [
    ['그래서 생각했어요.'],
    ['사장님에겐 수익이 더 남고,'],
    ['손님에겐 혜택이 더 돌아가는'],
    ['이런 배달앱은 없을까?'],
  ],
};
// 각 섹션의 STEP 개수. 데스크톱 empathyStepCounts 와 같은 값이어야 한다.
const storyStepCounts: Record<number, number> = { 1: 3, 2: 3, 3: 4 };
// 마지막 STEP 문장 전체를 강조하는 섹션. PC 의 .pain__bridge-line--final 과 같은 역할이다.
const storyFinalHighlight = new Set<number>([3]);
// iOS/Safari 는 WebM 의 알파를 살리지 못해 라이더가 검은 사각형으로 보인다.
// 그쪽에서는 같은 그림을 투명 배경 애니메이션 WebP 로 대신 보여준다.
const isAppleWebKit = /iP(hone|ad|od)/.test(navigator.userAgent)
  || (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg|OPR/.test(navigator.userAgent));
const mobileOwnerBenefitVideoSrc = '/videos/mobile-free-explosion-v7.mp4';
const desktopOwnerBenefitVideoSrc = '/videos/pc-explosion-final.mp4';
// #4 효과음 음량 통일: 두 영상 파일의 실측 라우드니스(상위 10% 구간 RMS)가 달라
// mobile-free-explosion-v7 = 0.29826, pc-explosion-final = 0.09931 (PC 쪽이 9.55dB 더 작다).
// 현재 가장 작게 들리는 태블릿 세로(모바일영상 x 0.126)를 기준으로 나머지를 낮춘다.
const ownerBenefitMobileVideoVolume = 0.126;   // mobile-free-explosion-v7.mp4 (모바일 / 태블릿 세로 공용)
const ownerBenefitDesktopVideoVolume = 0.3784; // pc-explosion-final.mp4 (원본이 작아 계수는 크다)

const mobileOwnerBenefitSteps = Array.from(
  { length: 8 },
  (_, index) => `/images/free/steps/mobile/mobile-step${index}.png`,
);
const ownerBenefitStepImages = mobileOwnerBenefitSteps;
const ownerBenefitStepAlts = [
  '땡겨요 FREE 혜택 배경',
  '땡겨요는',
  '땡겨요는 주문수수료가',
  '땡겨요는 주문수수료가 2%',
  '땡겨요는 주문수수료가 2%, 캐릭터 등장',
  '땡겨요는 주문수수료가 2%, 광고비 없음',
  '땡겨요는 주문수수료가 2%, 광고비와 입점비 없음',
  '땡겨요 주문수수료 2%, 광고비 없음, 입점비 없음, 월이용료 없음',
] as const;
const ownerBenefitFinalStep = mobileOwnerBenefitSteps.length - 1;
const ownerBenefitAutoStepDuration = 650;
const desktopOwnerBenefitArtwork = '/images/free/animation/free-final-transparent.png.png';
const desktopOwnerBenefitAnimationDuration = 2600;
const ownerBenefitBurstEase = {
  swift: 'cubic-bezier(0.20, 0.90, 0.20, 1)',
  settle: 'cubic-bezier(0.25, 1, 0.50, 1)',
  up: 'cubic-bezier(0.20, 0.72, 0.36, 1)',
  down: 'cubic-bezier(0.60, 0, 0.88, 0.42)',
  expo: 'cubic-bezier(0.16, 1, 0.30, 1)',
  out: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  soft: 'cubic-bezier(0.33, 0, 0.20, 1)',
} as const;
const ownerBenefitBurstLand = [0.42, 0.60, 0.76, 0.89, 1] as const;
const ownerBenefitBurstDotColors = [
  '#e8410f', '#ffba08', '#7c3aed', '#e8410f', '#ffba08',
  '#ff7a45', '#7c3aed', '#ffba08', '#e8410f', '#ff7a45',
] as const;
const ownerBenefitBurstDots = Array.from({ length: 10 }, (_, index) => ({
  color: ownerBenefitBurstDotColors[index],
  size: index % 3 === 0 ? 12 : 9,
  borderRadius: index % 4 === 0 ? '3px' : '50%',
}));

const faqCategories = [
  {
    id: 'cost',
    label: '입점·비용',
    items: [
      { id: 1, question: '땡겨요 입점 비용은 얼마인가요?', answer: '땡겨요는 입점비, 광고비, 월 이용료가 없습니다. 땡겨요의 주문중개수수료는 2%입니다.' },
      { id: 26, question: '땡겨요 주문중개수수료 2% 외에 추가로 드는 비용이 있나요?', answer: '땡겨요는 입점비, 광고비, 월 이용료가 없으며 주문중개수수료는 2%입니다. 다만 고객의 결제수단에 따른 결제수수료와 매장의 배달 방식에 따른 배달비 등은 별도로 발생할 수 있습니다. 실제 적용되는 비용은 결제수단과 매장 운영 방식에 따라 달라질 수 있습니다.' },
      { id: 2, question: '땡겨요는 광고비가 정말 없나요?', answer: '네. 땡겨요는 별도의 광고비 없이 이용할 수 있습니다. 광고비 부담 없이 매장을 운영할 수 있다는 점이 땡겨요의 장점 중 하나입니다.' },
      { id: 3, question: '배달의민족·쿠팡이츠·요기요를 이용하고 있어도 땡겨요에 입점할 수 있나요?', answer: '네. 기존 배달앱을 이용하고 있어도 땡겨요에 추가로 입점할 수 있습니다. 여러 배달앱을 함께 운영하는 것도 가능합니다.' },
      { id: 4, question: '땡겨요는 어떤 음식점이 입점할 수 있나요?', answer: '일반 음식점을 비롯해 배달·포장 서비스를 운영하는 다양한 매장이 입점 상담을 받을 수 있습니다. 구체적인 입점 가능 여부는 매장 정보를 확인한 후 안내해드립니다.' },
      { id: 27, question: '땡겨요는 포장 주문만으로도 입점할 수 있나요?', answer: '네. 매장 운영 형태에 따라 배달뿐 아니라 포장 서비스를 선택해 입점할 수 있습니다. 매장 상황에 맞는 운영 방법은 상담 시 함께 안내해드립니다.' },
      { id: 28, question: '배달대행업체를 이용하지 않아도 땡겨요에 입점할 수 있나요?', answer: '네. 배달대행업체를 이용하지 않는 매장도 입점 상담을 받을 수 있습니다. 포장 주문으로 운영할 수 있으며, 일부 지역에서는 땡겨요 자체배달 서비스 등을 이용할 수 있습니다. 이용 가능한 배달 방식은 지역과 매장 상황에 따라 다르므로 상담 시 확인해드립니다.' },
      { id: 5, question: '땡겨요 입점 상담은 무료인가요?', answer: '네. 땡겨요 입점 상담은 무료입니다. 간단한 매장 정보만 남겨주시면 상담을 진행합니다.' },
      { id: 6, question: '상담을 신청하면 반드시 땡겨요에 입점해야 하나요?', answer: '아니요. 상담을 받은 후 매장 상황과 입점 조건을 확인하고 입점 여부를 결정하시면 됩니다.' },
    ],
  },
  {
    id: 'process',
    label: '입점 절차',
    items: [
      { id: 7, question: '땡겨요 입점 상담을 신청하면 어떻게 진행되나요?', answer: '상담 신청 후 전담 매니저 배치 → 입점 진행 → 주문접수 프로그램 설치 → 땡겨요 사용 방법 안내 및 컨설팅 순서로 진행됩니다.' },
      { id: 8, question: '전담 매니저는 어떤 도움을 주나요?', answer: '전담 매니저가 입점에 필요한 절차를 안내하고 원활하게 입점이 진행될 수 있도록 도와드립니다. 입점 이후에는 매장 운영에 필요한 사항을 안내하고, 필요한 경우 매출 활성화에 도움이 될 수 있는 컨설팅도 제공합니다.' },
      { id: 36, question: '전담 매니저가 입점을 도와주면 별도 비용을 내야 하나요?', answer: '아니요. 전담 매니저의 입점 상담과 입점 진행 지원에는 별도의 비용이 발생하지 않습니다. 사장님이 매니저에게 입점 대행비나 수수료를 따로 지급할 필요도 없습니다. 입점 절차와 필요한 사항을 안내받고 무료로 도움을 받을 수 있습니다.' },
      { id: 9, question: '땡겨요 입점에 필요한 서류는 무엇인가요?', answer: '기본적으로 사업자등록증, 영업신고증, 통장사본 등이 필요합니다. 법인은 추가 서류가 필요하며, 그 외 메뉴와 배달에 관한 기본 정보도 필요합니다.' },
      { id: 10, question: '땡겨요 입점까지 얼마나 걸리나요?', answer: '필요한 서류와 매장 정보를 전달한 후 입점 절차가 진행되며, 사장님의 전자계약서 서명 등의 과정이 필요합니다. 특별한 경우를 제외하면 대부분 1주일 이내에 입점이 완료됩니다.' },
      { id: 11, question: '땡겨요 메뉴 등록은 어떻게 하나요?', answer: '메뉴 등록은 정해진 본사 절차에 따라 진행됩니다. 타 플랫폼과 동일한 메뉴 정보를 기준으로 등록할 수 있으며, 메뉴판 이미지를 전달해 등록하는 것도 가능합니다. 단, 메뉴 이미지는 타 플랫폼에서 사용 중인 이미지를 그대로 사용할 수 없습니다.' },
      { id: 12, question: '전국 어디서나 땡겨요 입점 상담을 받을 수 있나요?', answer: '네. 전국 어디에서나 전담 매니저를 통해 땡겨요 입점 상담을 받을 수 있습니다.' },
      { id: 13, question: '땡겨요 주문은 어떻게 접수하나요? 휴대폰에서도 가능한가요?', answer: '입점 진행 과정에서 땡겨요 주문을 확인하고 접수할 수 있도록 주문접수 프로그램을 설치해 드리고 있습니다. 땡겨요 주문은 포스 또는 PC에 주문접수 프로그램을 설치해 사용하는 것을 권장합니다. 다만 포스나 PC가 없는 경우에는 휴대폰의 땡겨요 주문접수 앱을 통해 주문을 받을 수 있습니다. 포스 또는 PC의 주문접수 프로그램과 스마트폰의 주문접수 앱을 동시에 사용할 수도 있습니다.' },
      { id: 29, question: '기존에 이용 중인 배달대행업체나 POS를 그대로 사용할 수 있나요?', answer: '사용 중인 배달대행업체와 POS에 따라 연동할 수 있습니다. 입점 신청 시 현재 이용하고 있는 배달대행업체와 POS 정보를 확인하며, 연동 가능 여부와 필요한 설정 방법은 입점 과정에서 안내해드립니다.' },
      { id: 14, question: '새로 오픈한 음식점도 땡겨요에 입점할 수 있나요?', answer: '네. 신규 오픈 매장도 필요한 입점 조건을 갖추고 있다면 땡겨요에 입점할 수 있습니다. 매장 상황을 확인한 후 필요한 서류와 입점 절차를 안내해드립니다.' },
    ],
  },
  {
    id: 'operation',
    label: '운영',
    items: [
      { id: 15, question: '땡겨요 입점 후 매장 운영에 어려움이 생기면 어디에 문의하나요?', answer: '입점 이후에도 매장 운영 과정에서 궁금한 사항이나 도움이 필요한 경우 안내를 받을 수 있습니다. 필요한 경우 전담 매니저를 통해 운영 관련 안내를 받을 수 있습니다.' },
      { id: 34, question: '땡겨요 입점 신청 후 메뉴를 수정하려면 어떻게 하나요?', answer: '입점 후 메뉴명, 가격, 옵션 등 메뉴 정보는 땡겨요 사장님라운지에서 사장님이 직접 수정할 수 있습니다. 사용 방법이 어렵거나 도움이 필요한 경우에는 담당 매니저를 통해 메뉴 수정 방법과 필요한 절차를 안내받을 수 있습니다.' },
      { id: 37, question: '땡겨요는 샵인샵(가게 추가) 입점도 가능한가요?', answer: '네, 샵인샵 가게 추가도 가능합니다. 상담 신청하시면 담당 매니저가 안내해 드립니다.' },
      { id: 30, question: '배달지역, 최소주문금액, 배달비는 사장님이 설정할 수 있나요?', answer: '네. 매장 운영 상황에 맞게 배달지역과 최소주문금액, 기본 배달비 및 추가 배달비 등을 설정할 수 있습니다. 구체적인 설정 방법은 입점 과정에서 안내해드립니다.' },
      { id: 31, question: '땡겨요에 입점하면 바로 주문이 들어오나요?', answer: '입점했다고 모든 매장에 동일한 주문이 발생하는 것은 아닙니다. 주문량은 지역의 땡겨요 이용자 수, 메뉴와 가격, 매장 운영시간, 고객 혜택과 진행 중인 프로모션 등에 따라 달라질 수 있습니다. 입점 이후에는 매장 상황과 지역에서 활용할 수 있는 혜택을 확인해 주문 활성화에 도움이 되는 운영 방향을 함께 안내해드립니다.' },
      { id: 16, question: '땡겨요 입점 신청 전에 먼저 상담받을 수 있나요?', answer: '네. 바로 입점을 결정하지 않아도 먼저 상담을 받을 수 있습니다. 상담을 통해 수수료, 입점 절차, 필요한 서류, 현재 받을 수 있는 혜택 등을 확인한 후 입점 여부를 결정하시면 됩니다.' },
      { id: 24, question: '입점 후에도 상담을 받을 수 있나요?', answer: '네. 입점으로 끝나는 것이 아니라 입점 이후에도 매장 상황에 맞는 운영 안내와 컨설팅을 제공합니다. 필요한 경우 매출 활성화에 도움이 될 수 있는 방향도 함께 안내합니다.' },
    ],
  },
  {
    id: 'benefits',
    label: '혜택·정산',
    items: [
      { id: 17, question: '땡겨요에서 지역화폐를 사용할 수 있나요?', answer: '지역에 따라 땡겨요에서 지역화폐 혜택을 이용할 수 있습니다. 사용 가능한 지역과 혜택은 지역별 정책과 프로모션에 따라 달라질 수 있습니다.' },
      { id: 18, question: '온누리상품권도 땡겨요에서 사용할 수 있나요?', answer: '온누리상품권을 이용할 수 있는 매장과 지역이 있습니다. 실제 적용 여부는 매장 및 관련 조건에 따라 달라질 수 있습니다.' },
      { id: 19, question: '고객이 받을 수 있는 땡겨요 혜택도 있나요?', answer: '네. 땡겨요에서는 첫 주문 할인, 쿠폰팩, 브랜드 할인, 지역화폐 등 다양한 고객 혜택을 제공하고 있습니다. 구체적인 혜택과 제공 기간은 진행 중인 프로모션에 따라 달라질 수 있습니다.' },
      { id: 20, question: '땡겨요 입점 시 받을 수 있는 지자체 지원금 혜택이 있나요?', answer: '지역에 따라 땡겨요 입점 매장을 대상으로 할인쿠폰, 프로모션 비용 지원, 지역화폐 연계 혜택 등 지자체 지원사업이 운영되는 경우가 있습니다. 지원 여부와 금액, 적용 조건은 지자체와 시기별 정책에 따라 달라질 수 있으며, 상담 시 현재 적용 가능한 혜택을 확인해드립니다.' },
      { id: 32, question: '땡겨요 고객 할인쿠폰 비용은 사장님이 부담하나요?', answer: '땡겨요에는 땡겨요나 지자체 등이 지원하는 고객 할인쿠폰과 사장님이 선택해 운영하는 할인 혜택이 있습니다. 프로모션마다 비용 부담 방식과 적용 조건이 다를 수 있으므로, 진행 전 사장님 부담 여부를 확인할 수 있도록 안내해드립니다.' },
      { id: 33, question: '땡겨요 주문 금액은 언제 입금되나요?', answer: '땡겨요 정산은 결제수단에 따라 다르며, 영업일 기준 최대 주문일(D)+3일 이내에 정산대금이 입금됩니다. 카드결제는 D+3일 오전 10시 이내, 계좌이체는 주문 시간에 따라 당일 또는 D+1일에 입금됩니다. 카드결제는 즉시출금을 요청하면 D+1일에 정산받을 수 있습니다. 지역사랑상품권, 휴대폰 소액결제, 복합결제 등은 일반적으로 D+3일에 정산됩니다.' },
      { id: 21, question: '땡겨요 정산계좌는 꼭 신한은행 계좌여야 하나요?', answer: '아니요. 신한은행 계좌만 사용해야 하는 것은 아닙니다. 정산계좌는 사장님이 선택할 수 있습니다.' },
      { id: 22, question: '땡겨요 정산계좌를 신한은행으로 사용하면 어떤 혜택이 있나요?', answer: '현재 기준으로 땡겨요 정산계좌를 신한은행 계좌로 등록하면 고객이 다운로드해 사용할 수 있는 총 10만원 상당의 쿠폰을 제공해드립니다. 이를 통해 입점 초기 고객 유입과 주문 활성화에 도움을 받을 수 있습니다. 또한 신한은행에서 대출을 신청할 경우 우대 혜택을 적용받을 수 있습니다.' },
      { id: 23, question: '신한은행 정산계좌 등록 시 제공되는 10만원 쿠폰을 사장님이 받는 건가요?', answer: '아니요. 사장님에게 현금이나 쿠폰 10만원을 직접 지급하는 방식이 아닙니다. 고객이 다운로드해 해당 매장에서 사용할 수 있는 총 10만원 상당의 쿠폰이 제공되는 방식이며, 이를 통해 입점 초기 고객 유입과 주문 활성화에 도움을 받을 수 있습니다.' },
    ],
  },
] as const;

const commonFaqs = [
  { id: 25, question: '땡겨요 입점 신청은 어떻게 하면 되나요?', answer: '홈페이지의 무료 입점 상담 버튼을 눌러 간단한 매장 정보를 남겨주세요. 이후 전담 매니저가 확인하고 입점 상담을 진행합니다.' },
  { id: 35, question: '땡겨요 입점 상담은 어디로 전화하면 되나요?', answer: '땡겨요 입점 상담은 1555-1984로 전화해 주세요. 매장 상황을 확인한 후 입점에 필요한 절차와 준비사항을 안내해드립니다.' },
] as const;

type FaqCategoryId = (typeof faqCategories)[number]['id'];
type FaqItem = Readonly<{ id: number; question: string; answer: string }>;

function App() {
  const [active, setActive] = useState(() => {
    const parsed = Number(window.location.hash.replace('#', ''));
    return Number.isInteger(parsed) && parsed >= 0 && parsed < sectionCount ? parsed : 0;
  });
  const [heroMuted, setHeroMuted] = useState(true);
  const [useMobileHeroVideo, setUseMobileHeroVideo] = useState(() => window.matchMedia(mobileHeroQuery).matches);
  const [isTouchLayout, setIsTouchLayout] = useState(() => window.matchMedia(touchLayoutQuery).matches);
  const [isTabletPortrait, setIsTabletPortrait] = useState(() => window.matchMedia(tabletPortraitQuery).matches);
  // #8 이 화면에 한 픽셀이라도 들어와 있는가. active 판정과는 완전히 별개의 값이고
  // 모바일/컴팩트에서 고정 CTA 를 숨기는 데에만 쓴다.
  const [consultationInView, setConsultationInView] = useState(false);
  // #3 라이더가 걸리는 가로 조건. 렌더 중 matchMedia 를 직접 읽으면 화면이 바뀌어도
  // 리렌더가 일어나지 않아 라이더가 남거나 안 나타난다(stale). 그래서 state 로 둔다.
  const [isRiderLandscape, setIsRiderLandscape] = useState(() => window.matchMedia(lowLandscapeQuery).matches || window.matchMedia(foldLandscapeQuery).matches);
  const useMobileOwnerBenefitVideo = useMobileHeroVideo && Boolean(mobileOwnerBenefitVideoSrc);
  const [empathySteps, setEmpathySteps] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0 });
  const [ownerBenefitStep, setOwnerBenefitStep] = useState(0);
  const [faqCategory, setFaqCategory] = useState<FaqCategoryId>('cost');
  const [openFaqId, setOpenFaqId] = useState<number | null>(1);
  const [ctaPauseScreen, setCtaPauseScreen] = useState<number | null>(null);
  const [ctaScrollReacting, setCtaScrollReacting] = useState(false);
  const [privacyDetailsOpen, setPrivacyDetailsOpen] = useState(false);
  const [selectedDeliveryApps, setSelectedDeliveryApps] = useState<string[]>([]);
  const [deliveryAppsError, setDeliveryAppsError] = useState(false);
  const [deliveryAppsAlerting, setDeliveryAppsAlerting] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const heroRiderRef = useRef<HTMLVideoElement>(null);
  const mobileOwnerBenefitVideoRef = useRef<HTMLVideoElement>(null);
  const desktopOwnerBenefitVideoRef = useRef<HTMLVideoElement>(null);
  const mobileFreeVideoEndedRef = useRef(false);
  const desktopFreeVideoEndedRef = useRef(false);
  const activeRef = useRef(active);
  const heroMutedRef = useRef(heroMuted);
  const useMobileHeroVideoRef = useRef(useMobileHeroVideo);
  const steppedTouchNavRef = useRef(window.matchMedia(steppedTouchNavQuery).matches);
  const empathyStepsRef = useRef(empathySteps);
  const ownerBenefitStepRef = useRef(ownerBenefitStep);
  const ctaPauseScreenRef = useRef<number | null>(null);
  const screenLockedRef = useRef(false);
  const empathyLockedRef = useRef(false);
  const ctaPauseInputLockedRef = useRef(false);
  const screenLockTimerRef = useRef<number | null>(null);
  const empathyLockTimerRef = useRef<number | null>(null);
  const ctaPauseInputLockTimerRef = useRef<number | null>(null);
  const ctaScrollReactionTimerRef = useRef<number | null>(null);
  const ownerBenefitAutoPlayingRef = useRef(false);
  const ownerBenefitAutoTimerRef = useRef<number | null>(null);
  const ownerBenefitCtaTimerRef = useRef<number | null>(null);
  const ownerBenefitBurstWrapRef = useRef<HTMLDivElement>(null);
  const ownerBenefitBurstImageRef = useRef<HTMLImageElement>(null);
  const ownerBenefitBurstShadowRef = useRef<HTMLDivElement>(null);
  const ownerBenefitBurstFlashRef = useRef<HTMLDivElement>(null);
  const ownerBenefitBurstRingOneRef = useRef<HTMLDivElement>(null);
  const ownerBenefitBurstRingTwoRef = useRef<HTMLDivElement>(null);
  const ownerBenefitBurstDotRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const ownerBenefitBurstAnimationsRef = useRef<Animation[]>([]);
  const ownerBenefitAudioContextRef = useRef<AudioContext | null>(null);
  const ownerBenefitNoiseBufferRef = useRef<AudioBuffer | null>(null);
  const ownerBenefitBurstMasterGainRef = useRef<GainNode | null>(null);
  const ownerBenefitBurstAudioSourcesRef = useRef<AudioScheduledSourceNode[]>([]);
  const ownerBenefitBurstAudioGainsRef = useRef<GainNode[]>([]);
  const faqScrollRef = useRef<HTMLDivElement>(null);
  const consultationPageRef = useRef<HTMLElement>(null);
  const managerScrollRef = useRef<HTMLDivElement>(null);
  const screenNavigationRef = useRef<(screen: number, immediate?: boolean) => void>(() => undefined);
  const topTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  const playCtaScrollReaction = () => {
    if (activeRef.current === 8) return;
    setCtaScrollReacting(true);
    if (ctaScrollReactionTimerRef.current !== null) window.clearTimeout(ctaScrollReactionTimerRef.current);
    ctaScrollReactionTimerRef.current = window.setTimeout(() => {
      setCtaScrollReacting(false);
      ctaScrollReactionTimerRef.current = null;
    }, 260);
  };

  const setCtaPauseState = (screen: number | null) => {
    const enteringCtaPause = ctaPauseScreenRef.current === null && screen !== null;
    ctaPauseScreenRef.current = screen;
    setCtaPauseScreen(screen);
    if (enteringCtaPause) playCtaScrollReaction();
  };

  const getOwnerBenefitAudioContext = () => {
    let context = ownerBenefitAudioContextRef.current;
    if (!context) {
      const AudioContextClass = window.AudioContext
        || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      context = new AudioContextClass();
      ownerBenefitAudioContextRef.current = context;

      const noiseBuffer = context.createBuffer(1, context.sampleRate * 0.6, context.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let index = 0; index < noiseData.length; index += 1) {
        noiseData[index] = (Math.random() * 2 - 1) * (1 - index / noiseData.length);
      }
      ownerBenefitNoiseBufferRef.current = noiseBuffer;
    }
    if (context.state === 'suspended') void context.resume().catch(() => undefined);
    return context;
  };

  const stopOwnerBenefitBell = () => {
    const context = ownerBenefitAudioContextRef.current;
    const masterGain = ownerBenefitBurstMasterGainRef.current;
    const now = context?.currentTime ?? 0;

    if (masterGain) {
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(0, now);
    }
    ownerBenefitBurstAudioSourcesRef.current.forEach((source) => {
      try { source.stop(now); } catch { /* The source may already have ended. */ }
      source.disconnect();
    });
    ownerBenefitBurstAudioGainsRef.current.forEach((gain) => gain.disconnect());
    masterGain?.disconnect();

    ownerBenefitBurstAudioSourcesRef.current = [];
    ownerBenefitBurstAudioGainsRef.current = [];
    ownerBenefitBurstMasterGainRef.current = null;
  };

  const playOwnerBenefitBell = () => {
    const context = getOwnerBenefitAudioContext();
    if (!context) return;
    stopOwnerBenefitBell();
    const masterGain = context.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(context.destination);
    ownerBenefitBurstMasterGainRef.current = masterGain;
    const seconds = desktopOwnerBenefitAnimationDuration / 1000;
    const tone = (
      at: number,
      startFrequency: number,
      endFrequency: number,
      duration: number,
      peakGain: number,
      type: OscillatorType = 'sine',
    ) => {
      const startAt = context.currentTime + at;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(startFrequency, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), startAt + duration);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(gain);
      gain.connect(masterGain);
      ownerBenefitBurstAudioSourcesRef.current.push(oscillator);
      ownerBenefitBurstAudioGainsRef.current.push(gain);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.05);
    };

    tone(0.135 * seconds, 140, 52, 0.4 * seconds, 0.24);
    ([[660, 0.05], [990, 0.03], [1320, 0.018]] as const).forEach(([frequency, gain], index) => {
      tone((0.16 + index * 0.015) * seconds, frequency, frequency * 0.985, 1.25 * seconds, gain);
    });
    ([0.034, 0.026, 0.019, 0.013, 0.008] as const).forEach((gain, index) => {
      tone(ownerBenefitBurstLand[index] * seconds, 1320 + index * 120, 1320 + index * 120, 0.3 * seconds, gain);
      tone(ownerBenefitBurstLand[index] * seconds, 132 + index * 6, 60, 0.16 * seconds, gain * 1.6);
    });
  };

  const cancelOwnerBenefitBurst = () => {
    const elements = [
      ownerBenefitBurstImageRef.current,
      ownerBenefitBurstShadowRef.current,
      ownerBenefitBurstWrapRef.current,
      ownerBenefitBurstFlashRef.current,
      ownerBenefitBurstRingOneRef.current,
      ownerBenefitBurstRingTwoRef.current,
      ...ownerBenefitBurstDotRefs.current,
    ];
    elements.forEach((element) => element?.getAnimations().forEach((animation) => animation.cancel()));
    ownerBenefitBurstAnimationsRef.current.forEach((animation) => animation.cancel());
    ownerBenefitBurstAnimationsRef.current = [];
    [
      ownerBenefitBurstShadowRef.current,
      ownerBenefitBurstFlashRef.current,
      ownerBenefitBurstRingOneRef.current,
      ownerBenefitBurstRingTwoRef.current,
      ...ownerBenefitBurstDotRefs.current,
    ].forEach((element) => {
      if (element) element.style.opacity = '0';
    });
  };

  const playOwnerBenefitBurst = () => {
    cancelOwnerBenefitBurst();
    try { playOwnerBenefitBell(); } catch { /* Visual playback must not depend on audio. */ }

    const animate = (element: Element | null, frames: Keyframe[]) => {
      if (!element) return null;
      const animation = element.animate(frames, {
        duration: desktopOwnerBenefitAnimationDuration,
        fill: 'both',
        iterations: 1,
      });
      ownerBenefitBurstAnimationsRef.current.push(animation);
      return animation;
    };

    animate(ownerBenefitBurstImageRef.current, [
      { offset: 0, transform: 'translateY(0px) scale(0.35)', opacity: 0, filter: 'blur(10px)', easing: ownerBenefitBurstEase.swift },
      { offset: 0.06, opacity: 1, easing: ownerBenefitBurstEase.swift },
      { offset: 0.135, transform: 'translateY(0px) scale(1.07)', opacity: 1, filter: 'blur(0px)', easing: ownerBenefitBurstEase.settle },
      { offset: 0.21, transform: 'translateY(0px) scale(0.955)', easing: ownerBenefitBurstEase.up },
      { offset: 0.31, transform: 'translateY(-34px) scale(1.05)', easing: ownerBenefitBurstEase.down },
      { offset: 0.42, transform: 'translateY(0px) scale(0.975)', easing: ownerBenefitBurstEase.up },
      { offset: 0.51, transform: 'translateY(-19px) scale(1.03)', easing: ownerBenefitBurstEase.down },
      { offset: 0.60, transform: 'translateY(0px) scale(0.986)', easing: ownerBenefitBurstEase.up },
      { offset: 0.68, transform: 'translateY(-10px) scale(1.016)', easing: ownerBenefitBurstEase.down },
      { offset: 0.76, transform: 'translateY(0px) scale(0.993)', easing: ownerBenefitBurstEase.up },
      { offset: 0.83, transform: 'translateY(-5px) scale(1.008)', easing: ownerBenefitBurstEase.down },
      { offset: 0.89, transform: 'translateY(0px) scale(0.997)', easing: ownerBenefitBurstEase.up },
      { offset: 0.945, transform: 'translateY(-2px) scale(1.003)', easing: ownerBenefitBurstEase.down },
      { offset: 1, transform: 'translateY(0px) scale(1)', opacity: 1, filter: 'blur(0px)' },
    ]);
    animate(ownerBenefitBurstShadowRef.current, [
      { offset: 0, transform: 'translateX(-50%) scaleX(0.5)', opacity: 0 },
      { offset: 0.135, transform: 'translateX(-50%) scaleX(1.14)', opacity: 0.8, easing: ownerBenefitBurstEase.up },
      { offset: 0.31, transform: 'translateX(-50%) scaleX(0.74)', opacity: 0.22, easing: ownerBenefitBurstEase.down },
      { offset: 0.42, transform: 'translateX(-50%) scaleX(1.08)', opacity: 0.62, easing: ownerBenefitBurstEase.up },
      { offset: 0.51, transform: 'translateX(-50%) scaleX(0.82)', opacity: 0.3, easing: ownerBenefitBurstEase.down },
      { offset: 0.60, transform: 'translateX(-50%) scaleX(1.04)', opacity: 0.5, easing: ownerBenefitBurstEase.up },
      { offset: 0.68, transform: 'translateX(-50%) scaleX(0.9)', opacity: 0.3, easing: ownerBenefitBurstEase.down },
      { offset: 0.76, transform: 'translateX(-50%) scaleX(1.01)', opacity: 0.4, easing: ownerBenefitBurstEase.settle },
      { offset: 0.89, transform: 'translateX(-50%) scaleX(0.98)', opacity: 0.2 },
      { offset: 1, transform: 'translateX(-50%) scaleX(0.96)', opacity: 0 },
    ]);
    animate(ownerBenefitBurstWrapRef.current, [
      { offset: 0, transform: 'translate(0px, 0px)' },
      { offset: 0.135, transform: 'translate(0px, 0px)' },
      { offset: 0.165, transform: 'translate(5px, -4px)' },
      { offset: 0.195, transform: 'translate(-4px, 3px)' },
      { offset: 0.225, transform: 'translate(2px, -2px)' },
      { offset: 0.25, transform: 'translate(0px, 0px)' },
      { offset: 1, transform: 'translate(0px, 0px)' },
    ]);
    animate(ownerBenefitBurstFlashRef.current, [
      { offset: 0, opacity: 0 },
      { offset: 0.09, opacity: 0, easing: ownerBenefitBurstEase.soft },
      { offset: 0.145, opacity: 0.55, easing: ownerBenefitBurstEase.out },
      { offset: 0.3, opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);
    ([
      [ownerBenefitBurstRingOneRef.current, 1.6, 0.115],
      [ownerBenefitBurstRingTwoRef.current, 1.95, 0.15],
    ] as const).forEach(([ring, finalScale, startOffset]) => {
      animate(ring, [
        { offset: 0, transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0 },
        { offset: startOffset, transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0.8, easing: ownerBenefitBurstEase.expo },
        { offset: startOffset + 0.28, transform: `translate(-50%, -50%) scale(${finalScale})`, opacity: 0 },
        { offset: 1, transform: `translate(-50%, -50%) scale(${finalScale})`, opacity: 0 },
      ]);
    });
    ownerBenefitBurstDotRefs.current.forEach((dot, index, dots) => {
      const angle = (index / dots.length) * Math.PI * 2 - Math.PI / 2;
      const radius = 150 + (index % 4) * 36;
      const translateX = Math.cos(angle) * radius;
      const translateY = Math.sin(angle) * radius;
      const finalTransform = `translate(${translateX}px, ${translateY}px) scale(0.15)`;
      animate(dot, [
        { offset: 0, transform: 'translate(0px, 0px) scale(0.2)', opacity: 0 },
        { offset: 0.115, transform: 'translate(0px, 0px) scale(1.2)', opacity: 1, easing: ownerBenefitBurstEase.expo },
        { offset: 0.36, transform: finalTransform, opacity: 0 },
        { offset: 1, transform: finalTransform, opacity: 0 },
      ]);
    });
  };

  const enterOwnerBenefitCtaPause = () => {
    if (activeRef.current !== 4) return;
    ownerBenefitAutoPlayingRef.current = false;
    setCtaPauseState(4);
    ctaPauseInputLockedRef.current = true;
    if (ctaPauseInputLockTimerRef.current !== null) window.clearTimeout(ctaPauseInputLockTimerRef.current);
    ctaPauseInputLockTimerRef.current = window.setTimeout(() => {
      ctaPauseInputLockedRef.current = false;
      ctaPauseInputLockTimerRef.current = null;
    }, 320);
  };

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { heroMutedRef.current = heroMuted; }, [heroMuted]);
  useEffect(() => { useMobileHeroVideoRef.current = useMobileHeroVideo; }, [useMobileHeroVideo]);

  useEffect(() => {
    const mq = window.matchMedia(steppedTouchNavQuery);
    const sync = () => { steppedTouchNavRef.current = mq.matches; };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    // 모바일/컴팩트는 FAQ 가 페이지 흐름 안에 그대로 이어지므로 내부 스크롤도, 초기화도 없다.
    if (isTouchLayout || active !== 7) return;
    setFaqCategory('cost');
    setOpenFaqId(1);
    requestAnimationFrame(() => {
      if (faqScrollRef.current) faqScrollRef.current.scrollTop = 0;
    });
  }, [active, isTouchLayout]);
  useEffect(() => {
    if (isTouchLayout || active !== 8) return;
    requestAnimationFrame(() => {
      if (consultationPageRef.current) consultationPageRef.current.scrollTop = 0;
    });
  }, [active, useMobileHeroVideo, isTouchLayout]);
  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;
    const shouldMuteHero = heroMuted || active !== 0;
    video.muted = shouldMuteHero;
    if (!shouldMuteHero) void video.play().catch(() => undefined);
  }, [active, heroMuted]);
  useEffect(() => {
    // Hero 라이더(소리 없는 webm)는 탭이 가려지면 크롬이 멈추고, 돌아와도 안 살아나는 경우가 있다.
    // 보이는 상태에서 멈춰 있으면 다시 재생한다 (autoplay·loop·muted 는 그대로).
    const rider = heroRiderRef.current;
    if (!rider) return;
    const resumeRider = () => {
      if (document.visibilityState !== 'visible' || !rider.paused) return;
      void rider.play().catch(() => undefined);
    };
    resumeRider();
    rider.addEventListener('pause', resumeRider);
    document.addEventListener('visibilitychange', resumeRider);
    return () => {
      rider.removeEventListener('pause', resumeRider);
      document.removeEventListener('visibilitychange', resumeRider);
    };
  }, [active]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(mobileHeroQuery);
    const syncHeroVideo = (event: MediaQueryListEvent) => setUseMobileHeroVideo(event.matches);
    mediaQuery.addEventListener('change', syncHeroVideo);
    return () => mediaQuery.removeEventListener('change', syncHeroVideo);
  }, []);

  useEffect(() => {
    // 회전(portrait <-> landscape)과 창 크기 변경에서 판정이 남지 않도록 state 로 동기화한다.
    // 이 값이 바뀌면 아래 내비게이션 effect 가 통째로 다시 붙으므로 stale 핸들러가 생기지 않는다.
    const mediaQuery = window.matchMedia(touchLayoutQuery);
    const syncTouchLayout = (event: MediaQueryListEvent) => setIsTouchLayout(event.matches);
    setIsTouchLayout(mediaQuery.matches);
    mediaQuery.addEventListener('change', syncTouchLayout);
    return () => mediaQuery.removeEventListener('change', syncTouchLayout);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(tabletPortraitQuery);
    const syncTabletPortrait = (event: MediaQueryListEvent) => setIsTabletPortrait(event.matches);
    mediaQuery.addEventListener('change', syncTabletPortrait);
    return () => mediaQuery.removeEventListener('change', syncTabletPortrait);
  }, []);

  // [모바일 2026-09-23] 고정 CTA 가 #8 위에 오래 남던 문제.
  // active 판정은 rootMargin -50% 라 #8 이 화면 중앙선을 넘어야 8 이 되고, 그때까지
  // CTA 가 상담 화면 위에 그대로 떠 있었다(실측: #8 상단이 852 -> 382 로 올라오는
  // 470px 구간 내내 opacity 1). active 는 #1~#3 STEP · 섹션 전환과 엮여 있어 건드리면 안 되므로,
  // CTA 표시 여부만 이 observer 로 따로 뽑는다. threshold 0 · rootMargin 0 이라
  // #8 의 첫 픽셀이 들어오는 순간 true, 화면에서 완전히 빠지면 false 가 된다.
  useEffect(() => {
    if (!isTouchLayout) {
      setConsultationInView(false);
      return;
    }
    const target = document.querySelector('[data-screen="8"]');
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setConsultationInView(entry.isIntersecting),
      { threshold: 0, rootMargin: '0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [isTouchLayout]);

  useEffect(() => {
    const lowQuery = window.matchMedia(lowLandscapeQuery);
    const foldQuery = window.matchMedia(foldLandscapeQuery);
    const syncRiderLandscape = () => setIsRiderLandscape(lowQuery.matches || foldQuery.matches);
    lowQuery.addEventListener('change', syncRiderLandscape);
    foldQuery.addEventListener('change', syncRiderLandscape);
    return () => {
      lowQuery.removeEventListener('change', syncRiderLandscape);
      foldQuery.removeEventListener('change', syncRiderLandscape);
    };
  }, []);

  useEffect(() => {
    const preloadedImages = ownerBenefitStepImages.map((src) => {
      const image = new Image();
      image.src = src;
      if (typeof image.decode === 'function') void image.decode().catch(() => undefined);
      return image;
    });
    return () => preloadedImages.forEach((image) => { image.src = ''; });
  }, []);

  useEffect(() => {
    mobileFreeVideoEndedRef.current = false;
    const video = mobileOwnerBenefitVideoRef.current;
    if (!video) return;
    let cancelled = false;
    video.pause();
    if (useMobileOwnerBenefitVideo && active === 4) {
      video.volume = ownerBenefitMobileVideoVolume;
      video.currentTime = 0;
      video.muted = false;
      void video.play().catch((error: unknown) => {
        if (cancelled || activeRef.current !== 4) return;
        // Safari/Chrome can reject audible autoplay. Retry silently without new UI.
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          video.muted = true;
          void video.play().catch(() => undefined);
        }
      });
    }
    // Do not reset on ended: the native video retains its final frame.
    return () => { cancelled = true; video.pause(); };
  }, [active, useMobileOwnerBenefitVideo]);

  useEffect(() => {
    // Keep the legacy image sequence intact, but bypass it in mobile video mode.
    if (useMobileOwnerBenefitVideo || active !== 4) {
      ownerBenefitAutoPlayingRef.current = false;
      return;
    }

    ownerBenefitAutoPlayingRef.current = true;
    ownerBenefitStepRef.current = 0;
    setOwnerBenefitStep(0);
    ctaPauseScreenRef.current = null;
    setCtaPauseScreen(null);

    if (!useMobileHeroVideo && desktopOwnerBenefitVideoSrc) {
      const video = desktopOwnerBenefitVideoRef.current;
      let cancelled = false;
      desktopFreeVideoEndedRef.current = false;
      if (video) {
        video.volume = isTabletPortrait ? ownerBenefitMobileVideoVolume : ownerBenefitDesktopVideoVolume;
        video.currentTime = 0;
        video.muted = false;
        void video.play().catch((error: unknown) => {
          if (cancelled || activeRef.current !== 4) return;
          if (error instanceof DOMException && error.name === 'NotAllowedError') {
            video.muted = true;
            void video.play().catch(() => undefined);
          }
        });
      }
      return () => {
        cancelled = true;
        video?.pause();
        ownerBenefitAutoPlayingRef.current = false;
      };
    }

    if (!useMobileHeroVideo) {
      let cancelled = false;
      let decodeTimer: number | null = null;
      cancelOwnerBenefitBurst();

      const artwork = ownerBenefitBurstImageRef.current;
      const artworkReady = artwork && typeof artwork.decode === 'function'
        ? artwork.decode().catch(() => undefined)
        : Promise.resolve();
      const decodeTimeout = new Promise<void>((resolve) => {
        decodeTimer = window.setTimeout(resolve, 2500);
      });

      void Promise.race([artworkReady, decodeTimeout]).then(() => {
        if (decodeTimer !== null) window.clearTimeout(decodeTimer);
        decodeTimer = null;
        if (cancelled || activeRef.current !== 4) return;
        playOwnerBenefitBurst();
        ownerBenefitCtaTimerRef.current = window.setTimeout(() => {
          ownerBenefitAutoPlayingRef.current = false;
          ownerBenefitCtaTimerRef.current = null;
        }, desktopOwnerBenefitAnimationDuration);
      });

      return () => {
        cancelled = true;
        ownerBenefitAutoPlayingRef.current = false;
        if (decodeTimer !== null) window.clearTimeout(decodeTimer);
        if (ownerBenefitCtaTimerRef.current !== null) window.clearTimeout(ownerBenefitCtaTimerRef.current);
        decodeTimer = null;
        ownerBenefitCtaTimerRef.current = null;
        stopOwnerBenefitBell();
        cancelOwnerBenefitBurst();
      };
    }

    ownerBenefitAutoTimerRef.current = window.setInterval(() => {
      const nextStep = ownerBenefitStepRef.current + 1;
      ownerBenefitStepRef.current = nextStep;
      setOwnerBenefitStep(nextStep);

      if (nextStep < ownerBenefitFinalStep) return;
      if (ownerBenefitAutoTimerRef.current !== null) {
        window.clearInterval(ownerBenefitAutoTimerRef.current);
        ownerBenefitAutoTimerRef.current = null;
      }
      ownerBenefitCtaTimerRef.current = window.setTimeout(() => {
        enterOwnerBenefitCtaPause();
        ownerBenefitCtaTimerRef.current = null;
      }, ownerBenefitAutoStepDuration);
    }, ownerBenefitAutoStepDuration);

    return () => {
      ownerBenefitAutoPlayingRef.current = false;
      if (ownerBenefitAutoTimerRef.current !== null) window.clearInterval(ownerBenefitAutoTimerRef.current);
      if (ownerBenefitCtaTimerRef.current !== null) window.clearTimeout(ownerBenefitCtaTimerRef.current);
      ownerBenefitAutoTimerRef.current = null;
      ownerBenefitCtaTimerRef.current = null;
    };
  }, [active, useMobileHeroVideo, useMobileOwnerBenefitVideo, isTabletPortrait]);

  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>('[data-screen]')];

    if (isTouchLayout) {
      // ── 모바일 / 컴팩트: 브라우저 네이티브 스크롤 + CSS scroll-snap 전용 ──────────────
      // wheel / touchstart / touchmove / touchend / keydown 를 하나도 붙이지 않는다.
      // 화면 이동·문장 단계·역방향은 전부 styles.css 의 scroll-snap-align / scroll-snap-stop
      // 이 처리하므로, 여기서는 "지금 어느 섹션이 보이는가"만 읽어 헤더 색과 고정 CTA 를 맞춘다.
      const goTo = (screen: number) => {
        const index = Math.min(Math.max(screen, 0), sections.length - 1);
        const target = sections[index];
        if (!target) return;
        // 상담으로 가는 길은 지름길이다. 긴 페이지를 천천히 훑지 않고 즉시 도착시킨다.
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
        activeRef.current = index;
        setActive(index);
        history.replaceState(null, '', `#${index}`);
      };
      screenNavigationRef.current = (screen) => goTo(screen);

      const initialScreen = Math.min(Math.max(activeRef.current, 0), sections.length - 1);
      const previousScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      sections[initialScreen]?.scrollIntoView({ behavior: 'auto', block: 'start' });
      requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = previousScrollBehavior; });

      // 화면 세로 중앙선을 지나는 섹션 하나만 활성으로 본다.
      // 섹션 높이가 제각각(#1~#3 은 문장 수만큼 길고, #5~#7 은 내용만큼 길다)이어도
      // 비율 threshold 와 달리 항상 정확히 하나만 잡힌다.
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number((entry.target as HTMLElement).dataset.screen);
          if (!Number.isInteger(index)) return;
          activeRef.current = index;
          setActive(index);
          if (window.location.hash !== `#${index}`) history.replaceState(null, '', `#${index}`);
        });
      }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
      sections.forEach((section) => observer.observe(section));

      const onHash = () => {
        const next = Number(window.location.hash.slice(1));
        if (Number.isInteger(next)) goTo(next);
      };
      window.addEventListener('hashchange', onHash);

      // ── #1~#3 문장 STEP ────────────────────────────────────────────────
      // 이 세 섹션만 예외적으로 스와이프를 직접 읽는다. 나머지 화면은 예전 그대로
      // 브라우저 네이티브 스크롤 + scroll-snap 이 처리한다.
      // 섹션에 touch-action:pinch-zoom 을 걸어 세로 스크롤 자체가 일어나지 않게 하고,
      // 스와이프 한 번에 STEP 하나만 바꾼다. 양 끝(첫 STEP 에서 위 / 마지막 STEP 에서 아래)
      // 에서만 섹션을 옮긴다. STEP 이 바뀌는 동안 scrollTop 은 한 번도 움직이지 않는다.
      const setStoryStep = (screen: number, step: number) => {
        const next = { ...empathyStepsRef.current, [screen]: step };
        empathyStepsRef.current = next;
        setEmpathySteps(next);
      };

      // 섹션을 옮길 때, 뒤로 가는 경우에는 그 섹션의 마지막 STEP 부터 보여준다.
      const goToStoryNeighbour = (screen: number, backwards: boolean) => {
        const index = Math.min(Math.max(screen, 0), sections.length - 1);
        const target = sections[index];
        if (!target) return;
        const count = storyStepCounts[index];
        if (count) setStoryStep(index, backwards ? count - 1 : 0);
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        activeRef.current = index;
        setActive(index);
        if (window.location.hash !== `#${index}`) history.replaceState(null, '', `#${index}`);
      };

      // 문장이 남아 있으면 문장만 바꾸고, 없을 때만 섹션을 옮긴다. touch / wheel 공용.
      const advanceStory = (screen: number, direction: 1 | -1) => {
        const count = storyStepCounts[screen];
        if (!count) return;
        const step = empathyStepsRef.current[screen] ?? 0;
        const nextStep = step + direction;
        if (nextStep >= 0 && nextStep < count) {
          setStoryStep(screen, nextStep);
          return;
        }
        goToStoryNeighbour(screen + direction, direction < 0);
      };

      let storyTouch: { x: number; y: number; screen: number } | null = null;
      let storyLocked = false;
      let storyLockTimer: number | null = null;

      const onStoryTouchStart = (event: TouchEvent) => {
        if (event.touches.length !== 1 || !storyStepCounts[activeRef.current]) {
          storyTouch = null;
          return;
        }
        const touch = event.touches[0];
        storyTouch = { x: touch.clientX, y: touch.clientY, screen: activeRef.current };
      };

      const onStoryTouchEnd = (event: TouchEvent) => {
        const start = storyTouch;
        storyTouch = null;
        if (!start || storyLocked) return;
        if (activeRef.current !== start.screen) return;
        const touch = event.changedTouches[0];
        if (!touch) return;
        const dy = start.y - touch.clientY;           // 손가락 위로 = 양수 = 정방향
        const dx = Math.abs(touch.clientX - start.x);
        if (Math.abs(dy) < 40 || dx > Math.abs(dy)) return;  // 탭 · 가로 제스처는 무시

        storyLocked = true;
        if (storyLockTimer !== null) window.clearTimeout(storyLockTimer);
        storyLockTimer = window.setTimeout(() => { storyLocked = false; storyLockTimer = null; }, 260);

        advanceStory(start.screen, dy > 0 ? 1 : -1);
      };

      const onStoryTouchCancel = () => { storyTouch = null; };

      // ── wheel / 트랙패드 ───────────────────────────────────────────────
      // DevTools 기기 모드나 터치스크린 노트북에서는 손가락이 아니라 휠 이벤트가 들어온다.
      // touch-action 은 wheel 에 아무 영향이 없어서, 핸들러가 없으면 네이티브 scroll-snap
      // 이 그대로 동작해 문장을 건너뛰고 섹션이 통째로 넘어간다
      // (실사용 녹화에서 #1 STEP1 -> #2 STEP1 -> #3 STEP1 -> #4 로 확인).
      // 그래서 wheel 도 같은 STEP 엔진으로 보낸다.
      let wheelAccum = 0;
      let wheelLastAt = 0;        // 마지막 wheel 이벤트 시각

      let wheelGestureUsed = false;

      const onStoryWheel = (event: WheelEvent) => {
        if (!storyStepCounts[activeRef.current]) return;  // #1~#3 이 아니면 네이티브 그대로
        if (event.ctrlKey) return;                        // 핀치 줌은 건드리지 않는다
        // 처리 대상이면 네이티브 스크롤을 막는다. 이 줄이 빠지면 STEP 과 스냅이 같이 돈다.
        event.preventDefault();

        const now = Date.now();
        // 트랙패드를 한 번 튕기면 작은 delta 가 수십 개 이어서 들어온다
        // (실측: 이벤트 20개 · 간격 67ms · 전체 1268ms).
        // 고정 시간 잠금으로는 그 하나를 두 STEP 으로 세어버려서(실측 STEP1 -> STEP3),
        // "160ms 이상 끊기면 새 제스처" 로 보고 제스처당 한 번만 넘긴다.
        if (now - wheelLastAt > 160) {
          wheelAccum = 0;
          wheelGestureUsed = false;
        }
        wheelLastAt = now;

        // deltaMode 0=px, 1=line, 2=page
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
        wheelAccum += event.deltaY * unit;

        // 이미 한 번 넘긴 제스처가 계속 이어지는 경우를 시간으로 풀면 관성 길이에 휘둘린다.
        // 대신 거리로 푼다. 관성은 빠르게 잦아들어 240px 를 못 넘기고(실측 잔여 144px),
        // 휠을 계속 굴리는 사람은 두 칸이면 넘겨서 화면이 멈춘 느낌이 나지 않는다.
        if (Math.abs(wheelAccum) < (wheelGestureUsed ? 240 : 28)) return;

        const direction: 1 | -1 = wheelAccum > 0 ? 1 : -1;
        wheelAccum = 0;
        wheelGestureUsed = true;
        advanceStory(activeRef.current, direction);
      };

      // ── #4 FREE 영상: 재생 중에는 #5 방향만 막는다 ─────────────────────
      // 원래 확정돼 있던 동작인데, 모바일을 네이티브 스크롤 + scroll-snap 으로
      // 바꾸면서 이 입력 차단만 딸려오지 못했다(데스크톱 분기에만 남아 있었다).
      // 방향은 화면 위/아래가 아니라 섹션 번호로 판단한다.
      //   진행 = #4 -> #5 (손가락을 위로, deltaY > 0)  -> 재생 중이면 차단
      //   역방향 = #4 -> #3                            -> 언제나 그대로 통과
      // #4 가 아니거나 영상이 실제로 돌고 있지 않으면 아무것도 하지 않는다.
      const screen4 = sections.find((section) => section.dataset.screen === '4');
      // 600px 이하는 모바일 영상, 601~1100px 은 데스크톱 영상이 같은 자리에 들어간다.
      // 둘 다 같은 자리의 <video> 라서 엘리먼트 상태로 판단하면 분기가 필요 없고,
      // 재진입할 때 currentTime 을 0 으로 되돌리는 순간 ended 도 같이 풀려서
      // "다시 들어오면 다시 차단" 이 저절로 맞는다.
      const freeVideoIsPlaying = () => {
        if (activeRef.current !== 4) return false;
        const video = screen4?.querySelector('video');
        if (!video) return false;                       // 이미지 시퀀스 모드
        const endedRef = useMobileHeroVideoRef.current ? mobileFreeVideoEndedRef : desktopFreeVideoEndedRef;
        if (endedRef.current) return false;             // 기존 종료 플래그를 그대로 존중한다
        // 자동재생이 거부돼 멈춰 있는 경우까지 막으면 화면에 갇힌다. 실제로 돌 때만 막는다.
        return !video.paused && !video.ended;
      };

      let freeTouchStartY: number | null = null;
      const onFreeTouchStart = (event: TouchEvent) => {
        freeTouchStartY = event.touches.length === 1 && freeVideoIsPlaying()
          ? event.touches[0].clientY
          : null;
      };
      const onFreeTouchMove = (event: TouchEvent) => {
        if (freeTouchStartY === null || event.touches.length !== 1) return;
        if (!freeVideoIsPlaying()) { freeTouchStartY = null; return; }
        const delta = freeTouchStartY - event.touches[0].clientY;   // > 0 이면 #5 방향
        // 브라우저가 스크롤을 시작하는 슬롭(8px) 안쪽에서 방향을 정한다.
        // 여기서 섣불리 preventDefault 하면 역방향 스와이프까지 같이 죽는다.
        if (Math.abs(delta) < 6) return;
        if (delta < 0) { freeTouchStartY = null; return; }           // 역방향은 네이티브에 넘긴다
        if (event.cancelable) event.preventDefault();
      };
      const onFreeTouchEnd = () => { freeTouchStartY = null; };
      const onFreeWheel = (event: WheelEvent) => {
        if (event.ctrlKey || event.deltaY <= 0) return;              // 핀치 줌 · 역방향 제외
        if (!freeVideoIsPlaying()) return;
        if (event.cancelable) event.preventDefault();
      };

      document.addEventListener('touchstart', onFreeTouchStart, { passive: true });
      document.addEventListener('touchmove', onFreeTouchMove, { passive: false });
      document.addEventListener('touchend', onFreeTouchEnd, { passive: true });
      document.addEventListener('touchcancel', onFreeTouchEnd, { passive: true });
      window.addEventListener('wheel', onFreeWheel, { passive: false });

      document.addEventListener('touchstart', onStoryTouchStart, { passive: true });
      document.addEventListener('touchend', onStoryTouchEnd, { passive: true });
      document.addEventListener('touchcancel', onStoryTouchCancel, { passive: true });
      // preventDefault 를 하려면 passive:false 여야 한다.
      window.addEventListener('wheel', onStoryWheel, { passive: false });

      return () => {
        screenNavigationRef.current = () => undefined;
        observer.disconnect();
        window.removeEventListener('hashchange', onHash);
        document.removeEventListener('touchstart', onStoryTouchStart);
        document.removeEventListener('touchend', onStoryTouchEnd);
        document.removeEventListener('touchcancel', onStoryTouchCancel);
        window.removeEventListener('wheel', onStoryWheel);
        document.removeEventListener('touchstart', onFreeTouchStart);
        document.removeEventListener('touchmove', onFreeTouchMove);
        document.removeEventListener('touchend', onFreeTouchEnd);
        document.removeEventListener('touchcancel', onFreeTouchEnd);
        window.removeEventListener('wheel', onFreeWheel);
        if (storyLockTimer !== null) window.clearTimeout(storyLockTimer);
      };
    }

    // ── 데스크톱(>=1101px): 기존 단계형 내비게이션을 그대로 유지한다 ────────────────
    const empathyStepCounts: Record<number, number> = { 1: 3, 2: 3, 3: 4 };
    const initial = Math.min(Math.max(activeRef.current, 0), sections.length - 1);
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    sections[initial]?.scrollIntoView({ behavior: 'auto', block: 'start' });
    requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = previousScrollBehavior; });

    let immediateNavigationFrame: number | null = null;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = Number((visible.target as HTMLElement).dataset.screen);
      setActive(index);
      activeRef.current = index;
      if (window.location.hash !== `#${index}`) history.replaceState(null, '', `#${index}`);
    }, { threshold: [0.55, 0.72] });
    sections.forEach((section) => observer.observe(section));

    const setEmpathyStep = (screen: number, step: number) => {
      const nextSteps = { ...empathyStepsRef.current, [screen]: step };
      empathyStepsRef.current = nextSteps;
      setEmpathySteps(nextSteps);
    };

    const setOwnerBenefitStepValue = (step: number) => {
      ownerBenefitStepRef.current = step;
      setOwnerBenefitStep(step);
    };

    const holdScreenLock = () => {
      screenLockedRef.current = true;
      if (screenLockTimerRef.current !== null) window.clearTimeout(screenLockTimerRef.current);
      screenLockTimerRef.current = window.setTimeout(() => {
        screenLockedRef.current = false;
        screenLockTimerRef.current = null;
      }, 820);
    };

    const holdEmpathyLock = () => {
      empathyLockedRef.current = true;
      if (empathyLockTimerRef.current !== null) window.clearTimeout(empathyLockTimerRef.current);
      empathyLockTimerRef.current = window.setTimeout(() => {
        empathyLockedRef.current = false;
        empathyLockTimerRef.current = null;
      }, 320);
    };

    const holdCtaPauseInputLock = () => {
      ctaPauseInputLockedRef.current = true;
      if (ctaPauseInputLockTimerRef.current !== null) window.clearTimeout(ctaPauseInputLockTimerRef.current);
      ctaPauseInputLockTimerRef.current = window.setTimeout(() => {
        ctaPauseInputLockedRef.current = false;
        ctaPauseInputLockTimerRef.current = null;
      }, 320);
    };

    const go = (next: number, entryDirection = 0, forceNavigation = false, immediate = false) => {
      const index = Math.min(Math.max(next, 0), sections.length - 1);
      if (!forceNavigation && (index === activeRef.current || screenLockedRef.current)) return;
      if (immediateNavigationFrame !== null) {
        cancelAnimationFrame(immediateNavigationFrame);
        immediateNavigationFrame = null;
      }
      if (((activeRef.current === 8 && index !== 8) || (immediate && index === 8)) && consultationPageRef.current) {
        consultationPageRef.current.scrollTop = 0;
      }
      if (index === 4 && !useMobileHeroVideoRef.current && !desktopOwnerBenefitVideoSrc) {
        try { getOwnerBenefitAudioContext(); } catch { /* Audio must not affect navigation. */ }
      }
      const heroVideo = heroVideoRef.current;
      if (heroVideo) {
        heroVideo.muted = index !== 0 || heroMutedRef.current;
        if (index === 0 && !heroMutedRef.current) void heroVideo.play().catch(() => undefined);
      }
      setCtaPauseState(null);
      const targetStepCount = empathyStepCounts[index];
      if (targetStepCount) {
        setEmpathyStep(index, entryDirection < 0 ? targetStepCount - 1 : 0);
        holdEmpathyLock();
      } else if (index === 4) {
        setOwnerBenefitStepValue(entryDirection < 0 ? ownerBenefitFinalStep : 0);
        holdEmpathyLock();
      }
      holdScreenLock();
      activeRef.current = index;
      setActive(index);
      history.replaceState(null, '', `#${index}`);
      if (immediate) window.scrollTo({ top: window.scrollY, behavior: 'instant' });
      sections[index]?.scrollIntoView({ behavior: immediate ? 'instant' : 'smooth', block: 'start' });
      if (immediate) {
        immediateNavigationFrame = requestAnimationFrame(() => {
          immediateNavigationFrame = null;
          if (index === 8 && consultationPageRef.current) consultationPageRef.current.scrollTop = 0;
          sections[index]?.scrollIntoView({ behavior: 'instant', block: 'start' });
          if (index === 0) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        });
      }
    };
    screenNavigationRef.current = (screen, immediate = false) => go(screen, 0, true, immediate);

    const consumeEmpathyStep = (direction: -1 | 1) => {
      const screen = activeRef.current;
      const stepCount = empathyStepCounts[screen];
      if (!stepCount) return false;
      if (empathyLockedRef.current) {
        holdEmpathyLock();
        return true;
      }
      const currentStep = empathyStepsRef.current[screen] ?? 0;
      const nextStep = currentStep + direction;
      if (nextStep < 0 || nextStep >= stepCount) return false;
      setEmpathyStep(screen, nextStep);
      holdEmpathyLock();
      return true;
    };

    const consumeOwnerBenefitStep = (direction: -1 | 1) => {
      if (activeRef.current !== 4) return false;
      if (useMobileHeroVideoRef.current && mobileOwnerBenefitVideoSrc) return false;
      if (ownerBenefitAutoPlayingRef.current) return true;
      if (!useMobileHeroVideoRef.current) return false;
      if (empathyLockedRef.current) {
        holdEmpathyLock();
        return true;
      }
      const nextStep = ownerBenefitStepRef.current + direction;
      if (nextStep < 0 || nextStep > ownerBenefitFinalStep) return false;
      setOwnerBenefitStepValue(nextStep);
      holdEmpathyLock();
      return true;
    };

    const handleDirectionalInput = (direction: -1 | 1) => {
      if (direction > 0 && activeRef.current === 4 && useMobileHeroVideoRef.current
        && mobileOwnerBenefitVideoSrc && !mobileFreeVideoEndedRef.current) return;
      if (direction > 0 && activeRef.current === 4 && !useMobileHeroVideoRef.current
        && desktopOwnerBenefitVideoSrc && !desktopFreeVideoEndedRef.current) return;
      if (ctaPauseInputLockedRef.current) return;
      const screen = activeRef.current;
      if (direction < 0 && screen === 1) {
        go(0, direction);
        return;
      }
      if (direction < 0 && screen >= 2 && screen <= 4) {
        go(screen - 1, direction);
        return;
      }
      if (direction > 0 && screen === 4 && !useMobileHeroVideoRef.current
        && desktopOwnerBenefitVideoSrc && desktopFreeVideoEndedRef.current) {
        go(screen + 1, direction);
        return;
      }
      if (ctaPauseScreenRef.current === screen) {
        setCtaPauseState(null);
        holdCtaPauseInputLock();
        if (direction > 0) go(screen + 1, direction);
        return;
      }
      if (empathyStepCounts[screen] && consumeEmpathyStep(direction)) return;
      if (screen === 4 && consumeOwnerBenefitStep(direction)) return;
      if (screenLockedRef.current) return;
      if (direction > 0 && screen >= 1 && screen < sectionCount - 1) {
        setCtaPauseState(screen);
        holdCtaPauseInputLock();
        return;
      }
      go(screen + direction, direction);
    };

    let desktopFreeLastWheelAt = -Infinity;
    let desktopFreeWheelConsumed = false;
    let mobileFreeLastWheelAt = -Infinity;
    let mobileFreeWheelConsumed = false;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 1 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const direction = event.deltaY > 0 ? 1 : -1;
      if (direction > 0 && activeRef.current === 4 && !useMobileHeroVideoRef.current && desktopOwnerBenefitVideoSrc) {
        const now = performance.now();
        if (now - desktopFreeLastWheelAt > 320) desktopFreeWheelConsumed = false;
        desktopFreeLastWheelAt = now;
        if (!desktopFreeVideoEndedRef.current || desktopFreeWheelConsumed) {
          desktopFreeWheelConsumed = true;
          event.preventDefault();
          return;
        }
        desktopFreeWheelConsumed = true;
      }
      if (direction > 0 && activeRef.current === 4 && useMobileHeroVideoRef.current && mobileOwnerBenefitVideoSrc) {
        const now = performance.now();
        // Require a quiet gap equal to the existing 320ms input lock. No playback timer.
        if (now - mobileFreeLastWheelAt > 320) mobileFreeWheelConsumed = false;
        mobileFreeLastWheelAt = now;
        if (!mobileFreeVideoEndedRef.current || mobileFreeWheelConsumed) {
          mobileFreeWheelConsumed = true;
          event.preventDefault();
          return;
        }
        mobileFreeWheelConsumed = true;
      }
      const managerScroller = managerScrollRef.current;
      const managerTarget = event.target instanceof Node && managerScroller?.contains(event.target);
      if (activeRef.current === 6 && managerScroller && managerTarget) {
        const maxScrollTop = managerScroller.scrollHeight - managerScroller.clientHeight;
        const canScroll = direction > 0
          ? managerScroller.scrollTop < maxScrollTop - 1
          : managerScroller.scrollTop > 1;
        if (canScroll) {
          event.preventDefault();
          managerScroller.scrollTop += event.deltaY;
          return;
        }
      }
      const faqScroller = faqScrollRef.current;
      const faqTarget = event.target instanceof Node && faqScroller?.contains(event.target);
      if (activeRef.current === 7 && faqScroller && faqTarget) {
        const maxScrollTop = faqScroller.scrollHeight - faqScroller.clientHeight;
        const canScroll = direction > 0
          ? faqScroller.scrollTop < maxScrollTop - 1
          : faqScroller.scrollTop > 1;
        if (canScroll) {
          event.preventDefault();
          faqScroller.scrollTop += event.deltaY;
          return;
        }
      }
      const consultationScroller = consultationPageRef.current;
      const consultationTarget = event.target instanceof Node && consultationScroller?.contains(event.target);
      if (activeRef.current === 8 && consultationScroller && consultationTarget) {
        const maxScrollTop = consultationScroller.scrollHeight - consultationScroller.clientHeight;
        const canScroll = direction > 0
          ? consultationScroller.scrollTop < maxScrollTop - 1
          : consultationScroller.scrollTop > 1;
        if (canScroll) {
          event.preventDefault();
          consultationScroller.scrollTop += event.deltaY;
          return;
        }
      }
      event.preventDefault();
      handleDirectionalInput(direction);
    };
    let ownerBenefitTouchStartY: number | null = null;
    let ownerBenefitTouchStartedBeforeVideoEnd = false;
    let empathyTouchStart: { x: number; y: number; screen: number } | null = null;
    // #6/#7/#8 은 화면 안쪽이 스크롤된다. overscroll-behavior:contain 때문에 끝에 닿아도
    // 스크롤이 바깥으로 전달되지 않으므로, 경계에서만 섹션 이동을 직접 이어준다.
    let scrollerTouch: { x: number; y: number; screen: number; atTop: boolean; atBottom: boolean; scrollable: boolean } | null = null;
    const SCROLL_EDGE_EPSILON = 2;
    const scrollerFor = (screen: number): HTMLElement | null => {
      // 폭으로 막지 않는다. 내부 스크롤이 실제로 생겼는지는 canScrollInside 가 판단한다.
      if (screen === 6) return managerScrollRef.current;
      if (screen === 7) return faqScrollRef.current;
      if (screen === 8) return consultationPageRef.current;
      return null;
    };
    const canScrollInside = (el: HTMLElement) => el.scrollHeight > el.clientHeight + SCROLL_EDGE_EPSILON;
    const isAtTop = (el: HTMLElement) => el.scrollTop <= SCROLL_EDGE_EPSILON;
    const isAtBottom = (el: HTMLElement) => el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_EDGE_EPSILON;
    const onTouchStart = (event: TouchEvent) => {
      empathyTouchStart = null;
      if (steppedTouchNavRef.current && activeRef.current >= 1 && activeRef.current <= 3) {
        if (event.touches.length !== 1) return;
        if (event.target instanceof Element && event.target.closest('a, button, input, textarea, select')) return;
        empathyTouchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY, screen: activeRef.current };
        return;
      }
      scrollerTouch = null;
      const scroller = scrollerFor(activeRef.current);
      if (scroller && event.touches.length === 1) {
        const scrollable = canScrollInside(scroller);
        // #6 은 내부 스크롤이 실제로 생긴 낮은 화면에서만 이 경로를 쓴다(기존 동작 보존).
        if (activeRef.current !== 6 || scrollable) {
          scrollerTouch = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
            screen: activeRef.current,
            atTop: isAtTop(scroller),
            atBottom: isAtBottom(scroller),
            scrollable,
          };
          return;
        }
      }
      if (activeRef.current !== 4 || event.touches.length !== 1) return;
      ownerBenefitTouchStartY = event.touches[0].clientY;
      ownerBenefitTouchStartedBeforeVideoEnd = useMobileHeroVideoRef.current
        ? Boolean(mobileOwnerBenefitVideoSrc) && !mobileFreeVideoEndedRef.current
        : Boolean(desktopOwnerBenefitVideoSrc) && !desktopFreeVideoEndedRef.current;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (empathyTouchStart) {
        if (event.touches.length !== 1 || activeRef.current !== empathyTouchStart.screen) {
          empathyTouchStart = null;
          return;
        }
        event.preventDefault();
        return;
      }
      if (activeRef.current === 4 && ownerBenefitTouchStartY !== null) event.preventDefault();
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (empathyTouchStart) {
        const start = empathyTouchStart;
        empathyTouchStart = null;
        const end = event.changedTouches[0];
        if (!end || event.touches.length !== 0 || activeRef.current !== start.screen) return;
        const deltaY = start.y - end.clientY;
        if (Math.abs(deltaY) < 24 || Math.abs(deltaY) <= Math.abs(start.x - end.clientX)) return;
        event.preventDefault();
        if (steppedTouchNavRef.current && start.screen === 1 && deltaY < 0) {
          // A completed #1 reverse swipe is explicit Hero navigation, not a text step.
          go(0, -1, true);
          return;
        }
        if (steppedTouchNavRef.current && start.screen === 2 && deltaY < 0) {
          // A completed #2 reverse swipe returns to #1 without consuming text steps.
          go(1, -1, true);
          return;
        }
        handleDirectionalInput(deltaY > 0 ? 1 : -1);
        return;
      }
      if (scrollerTouch) {
        const start = scrollerTouch;
        scrollerTouch = null;
        const end = event.changedTouches[0];
        if (!end || activeRef.current !== start.screen) return;
        const deltaY = start.y - end.clientY;
        if (Math.abs(deltaY) < 24 || Math.abs(deltaY) <= Math.abs(start.x - end.clientX)) return;
        const direction: -1 | 1 = deltaY > 0 ? 1 : -1;
        const scroller = scrollerFor(start.screen);
        if (scroller && start.scrollable) {
          // 스와이프 시작과 끝 모두 경계에 있을 때만 섹션을 넘긴다. 중간이면 내부 스크롤로 둔다.
          const startedAtEdge = direction > 0 ? start.atBottom : start.atTop;
          const stillAtEdge = direction > 0 ? isAtBottom(scroller) : isAtTop(scroller);
          if (!startedAtEdge || !stillAtEdge) return;
        }
        handleDirectionalInput(direction);
        return;
      }
      if (activeRef.current !== 4 || ownerBenefitTouchStartY === null) return;
      const endY = event.changedTouches[0]?.clientY ?? ownerBenefitTouchStartY;
      const deltaY = ownerBenefitTouchStartY - endY;
      ownerBenefitTouchStartY = null;
      if (Math.abs(deltaY) < 24) return;
      event.preventDefault();
      if (deltaY > 0 && ownerBenefitTouchStartedBeforeVideoEnd) return;
      handleDirectionalInput(deltaY > 0 ? 1 : -1);
    };
    const onTouchCancel = () => { empathyTouchStart = null; scrollerTouch = null; };
    const onKey = (event: KeyboardEvent) => {
      if (
        activeRef.current === 8
        && !useMobileHeroVideoRef.current
        && event.target instanceof Element
        && event.target.closest('.consultation-form')
      ) return;
      if (event.key === 'End' && activeRef.current === 4 && !useMobileHeroVideoRef.current
        && desktopOwnerBenefitVideoSrc && !desktopFreeVideoEndedRef.current) {
        event.preventDefault();
        return;
      }
      const direction = ['ArrowDown', 'PageDown', ' '].includes(event.key)
        ? 1
        : ['ArrowUp', 'PageUp'].includes(event.key)
          ? -1
          : 0;
      if (direction) {
        event.preventDefault();
        if (direction > 0 && event.repeat && activeRef.current === 4
          && !useMobileHeroVideoRef.current && desktopOwnerBenefitVideoSrc) return;
        if (direction > 0 && event.repeat && activeRef.current === 4
          && useMobileHeroVideoRef.current && mobileOwnerBenefitVideoSrc) return;
        handleDirectionalInput(direction);
      }
      if (event.key === 'Home') { event.preventDefault(); go(0); }
      if (event.key === 'End') { event.preventDefault(); go(sectionCount - 1); }
    };
    const onHash = () => {
      const next = Number(window.location.hash.slice(1));
      if (Number.isInteger(next)) go(next);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
    window.addEventListener('touchcancel', onTouchCancel);
    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onHash);
    return () => {
      screenNavigationRef.current = () => undefined;
      if (immediateNavigationFrame !== null) cancelAnimationFrame(immediateNavigationFrame);
      observer.disconnect();
      if (screenLockTimerRef.current !== null) window.clearTimeout(screenLockTimerRef.current);
      if (empathyLockTimerRef.current !== null) window.clearTimeout(empathyLockTimerRef.current);
      if (ctaPauseInputLockTimerRef.current !== null) window.clearTimeout(ctaPauseInputLockTimerRef.current);
      if (ctaScrollReactionTimerRef.current !== null) window.clearTimeout(ctaScrollReactionTimerRef.current);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
    };
  }, [isTouchLayout]);

  // #8 은 어두운 전환 화면이라 헤더도 같은 계열로 넘어간다.
  const darkHeader = [1, 2, 3, 8].includes(active);
  const bridgeFinalActive = empathySteps[3] === 3
    || (useMobileHeroVideo && active === 3 && ctaPauseScreen === 3);
  const mobileFixedConsultCtaVisible = active >= 0 && active < sectionCount
    && !(active === 4 && !useMobileHeroVideo && ctaPauseScreen !== 4);
  // 모바일/컴팩트에서는 #0~#7 어디서나 항상 떠 있고, #8 이 화면에 들어오기 시작하는
  // 순간 사라진다(consultationInView). active !== 8 도 그대로 두어, 해시 이동처럼
  // observer 가 아직 반응하지 않은 경우에도 #8 에서는 확실히 숨는다.
  const showFixedConsultCta = isTouchLayout
    ? (active !== 8 && !consultationInView)
    : ((!useMobileHeroVideo || mobileFixedConsultCtaVisible) && active !== 8);
  const selectedFaqCategory = faqCategories.find((category) => category.id === faqCategory) ?? faqCategories[0];
  // FAQ 가 내부 스크롤 상자에 갇혀 있던 시절에는 모바일에서만 항목을 카테고리 사이로
  // 옮겨 담아 상자 높이를 맞췄다. 이제 모바일도 페이지 흐름 그대로 길어지므로
  // 전 해상도가 같은 구성을 쓴다. 질문·답변 내용 자체는 그대로다.
  const displayedFaqItems: readonly FaqItem[] = selectedFaqCategory.items;
  const handleConsultationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedDeliveryApps.length === 0) {
      setDeliveryAppsError(true);
      setDeliveryAppsAlerting(false);
      window.requestAnimationFrame(() => setDeliveryAppsAlerting(true));
      return;
    }

    setDeliveryAppsError(false);
    window.alert('현재 온라인 상담 접수가 연결되지 않아 신청이 접수되지 않았습니다. 1555-1984로 전화해 주세요.');
  };
  const renderFaqItem = (item: FaqItem) => {
    const opened = openFaqId === item.id;
    const questionId = `faq-question-${item.id}`;
    const answerId = `faq-answer-${item.id}`;
    return (
      <article className={`faq-accordion__item ${opened ? 'is-open' : ''}`} key={item.id}>
        <h3>
          <button
            id={questionId}
            className="faq-accordion__question"
            type="button"
            aria-expanded={opened}
            aria-controls={answerId}
            onClick={() => setOpenFaqId(opened ? null : item.id)}
          >
            <span><b aria-hidden="true">Q.</b><span className="faq-accordion__question-text">{item.question}</span></span>
            <i className="faq-accordion__icon" aria-hidden="true" />
          </button>
        </h3>
        <div
          id={answerId}
          className="faq-accordion__answer"
          role="region"
          aria-labelledby={questionId}
          aria-hidden={!opened}
        >
          <div className="faq-accordion__answer-inner"><b aria-hidden="true">A.</b><p>{item.answer}</p></div>
        </div>
      </article>
    );
  };
  // 모바일/컴팩트의 #1~#3. 문장 하나가 곧 한 화면이고 그 자체가 snap step 이다.
  // JS 단계 state 없이 CSS scroll-snap 만으로 정/역방향이 모두 네이티브하게 움직인다.
  // 모바일/컴팩트 #1~#3. 섹션은 한 화면으로 고정하고 STEP 만 겹쳐 두었다가 하나만 보여준다.
  // 스크롤 위치는 STEP 이 바뀔 때 전혀 움직이지 않는다(문장 전환 = opacity/translate 뿐).
  const renderStoryScreen = (screen: 1 | 2 | 3) => {
    const steps = storyScreens[screen];
    const currentStep = Math.min(empathySteps[screen] ?? 0, steps.length - 1);
    const highlightFinal = storyFinalHighlight.has(screen);
    return (
      <section
        id={screen === 1 ? 'pain' : undefined}
        className={`screen pain pain--story ${active === screen ? 'is-active' : ''}`}
        data-screen={screen}
      >
        <div className="story">
          {steps.map((lines, index) => {
            const isFinal = index === steps.length - 1;
            return (
              <div
                className={`story__step${index === currentStep ? ' is-active' : ''}${highlightFinal && isFinal ? ' story__step--final' : ''}`}
                // PC 와 같이 문장을 전부 보여주고 활성 문장만 강조한다. 숨기지 않으므로
                // aria-hidden 대신 데스크톱과 같은 aria-current 를 쓴다.
                aria-current={index === currentStep ? 'step' : undefined}
                key={lines.join('|')}
              >
                <p>
                  {/* 줄은 storyScreens 의 배열 그대로 나눈다. <br> 이나 공백으로 억지로 맞추지 않는다. */}
                  {lines.map((line) => (
                    <span className="story__line" key={line}>{line}</span>
                  ))}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    );
  };
  const toggleHeroSound = () => {
    const video = heroVideoRef.current;
    if (!video) return;
    const nextMuted = !heroMutedRef.current;
    heroMutedRef.current = nextMuted;
    video.muted = nextMuted || activeRef.current !== 0;
    setHeroMuted(nextMuted);
    if (!video.muted) void video.play().catch(() => undefined);
  };

  return (
    <>
      <Header dark={darkHeader} hero={active === 0} mobile={useMobileHeroVideo} onNavigate={(screen) => screenNavigationRef.current(screen)} />
      <a
        className={`fixed-consult-cta ${showFixedConsultCta ? 'is-visible' : ''} ${ctaPauseScreen === active ? 'is-paused' : ''} ${ctaScrollReacting ? 'is-scroll-reacting' : ''}${useMobileOwnerBenefitVideo && active === 4 ? ' fixed-consult-cta--mobile-free' : ''}`}
        href="#8"
        onClick={(event) => { event.preventDefault(); screenNavigationRef.current(8, useMobileHeroVideo); }}
        aria-hidden={!showFixedConsultCta}
        tabIndex={showFixedConsultCta ? 0 : -1}
      >
        무료 입점 상담
      </a>
      {!isTouchLayout && (
        <>
          <a
            className={`next-screen ${active < sectionCount - 1 ? 'is-visible' : ''}${active === 0 ? ' is-solo' : ''}`}
            href={`#${Math.min(active + 1, sectionCount - 1)}`}
            onClick={(event) => { event.preventDefault(); screenNavigationRef.current(Math.min(active + 1, sectionCount - 1)); }}
            aria-label="다음 페이지로 이동"
            aria-hidden={active === sectionCount - 1}
            tabIndex={active < sectionCount - 1 ? 0 : -1}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 10 6 6 6-6" />
            </svg>
          </a>
          <a
            className={`back-to-top ${active > 0 ? 'is-visible' : ''}`}
            href="#0"
            onClick={(event) => { event.preventDefault(); screenNavigationRef.current(0, isTabletPortrait || window.matchMedia(lowLandscapeQuery).matches || window.matchMedia(foldLandscapeQuery).matches); }}
            onTouchStart={(event) => {
              if (!isTabletPortrait && !window.matchMedia(lowLandscapeQuery).matches && !window.matchMedia(foldLandscapeQuery).matches) return;
              // Explicit TOP taps must not enter the FREE video's swipe lock.
              event.stopPropagation();
              const touch = event.touches[0];
              topTouchStartRef.current = event.touches.length === 1
                ? { x: touch.clientX, y: touch.clientY } : null;
            }}
            onTouchCancel={() => { topTouchStartRef.current = null; }}
            onTouchEnd={(event) => {
              const start = topTouchStartRef.current;
              topTouchStartRef.current = null;
              const touch = event.changedTouches[0];
              const useImmediateTopTap = isTabletPortrait || window.matchMedia(lowLandscapeQuery).matches || window.matchMedia(foldLandscapeQuery).matches;
              const maxTapTravel = window.matchMedia(largeTabletPortraitQuery).matches || window.matchMedia(lowLandscapeQuery).matches || window.matchMedia(foldLandscapeQuery).matches ? 24 : 12;
              if (!useImmediateTopTap || !start || !touch || event.touches.length !== 0
                || Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > maxTapTravel) return;
              event.preventDefault();
              event.stopPropagation();
              screenNavigationRef.current(0, true);
            }}
            aria-label="맨 위로 이동"
            aria-hidden={active === 0}
            tabIndex={active > 0 ? 0 : -1}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 14 6-6 6 6" />
            </svg>
          </a>
        </>
      )}
      <main className="screens">
        <section className={`screen hero ${active === 0 ? 'is-active' : ''}`} data-screen="0">
          <video
            ref={heroVideoRef}
            className="hero-video"
            // [모바일 2026-09-23] v7 은 그림 안에 검은 레터박스가 구워져 있어(위 110~114px ·
            // 아래 110~128px) 스크롤 전환 중 화면 한가운데에 검은 가로 띠가 보인다.
            // 그 바를 거울 반사+블러로 채운 hero-4scene-mobile-no-letterbox-final.mp4 을
            // 만들어 적용해 봤지만, 전환 중 띠는 사라지는 대신 정착 화면에서 상·하단이
            // 반사된 것처럼 보여 더 어색했다. 그래서 띠를 그대로 허용하고 v7 로 되돌린다.
            // no-letterbox-final 파일은 지우지 않고 남겨 둔다.
            src={useMobileHeroVideo ? '/videos/hero-4scene-mobile-v7.mp4' : '/videos/hero-4scene-v2.mp4'}
            autoPlay
            loop
            muted={heroMuted || active !== 0}
            playsInline
            preload="auto"
            aria-hidden="true"
          />
          <div className="hero-copy enter-up">
            <h1>
              <span className="hero-line hero-line-top">오늘은</span>
              <span className="hero-line hero-line-main">땡기는 날</span>
            </h1>
            <span className="hero-cta-space" aria-hidden="true" />
          </div>
          <video
            ref={heroRiderRef}
            className="hero-rider"
            src="/animations/bora-rider-in-place-fast-hd.webm"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
          <button
            className="hero-volume"
            type="button"
            aria-label={heroMuted ? '영상 소리 켜기' : '영상 소리 끄기'}
            aria-pressed={!heroMuted}
            onClick={toggleHeroSound}
          >
            <span aria-hidden="true">{heroMuted ? '🔇' : '🔊'}</span>
          </button>
        </section>

        {isTouchLayout ? renderStoryScreen(1) : (
        <section id="pain" className={`screen pain ${active === 1 ? 'is-active' : ''}`} data-screen="1">
          <div className="pain__layout">
            <div className="pain__copy pain__copy--settlement">
              <div className={`pain__item ${empathySteps[1] === 0 ? 'is-active' : ''}`} aria-current={empathySteps[1] === 0 ? 'step' : undefined}>
                <h2>그럴 때 있잖아요.<br />정산서 열어볼 때.</h2>
              </div>
              <div className={`pain__item ${empathySteps[1] === 1 ? 'is-active' : ''}`} aria-current={empathySteps[1] === 1 ? 'step' : undefined}>
                <p><span className="pain__settlement-question-default">오늘 받은 이 주문,<br />내 통장엔 얼마가 남을까?</span><span className="pain__settlement-question-small">오늘 받은 이 주문<br />내 통장엔<br />얼마가 남을까?</span></p>
              </div>
              <div className={`pain__item ${empathySteps[1] === 2 ? 'is-active' : ''}`} aria-current={empathySteps[1] === 2 ? 'step' : undefined}>
                <p>분명 바빴는데,<br />통장엔 남는 게 없어요.</p>
              </div>
            </div>
            <div className="empathy-visual empathy-visual--settlement" aria-hidden="true">
              <video
                className="empathy-visual__media"
                src="/animations/bora-settlement-comparison-transparent.webm"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              />
            </div>
          </div>
        </section>
        )}

        {isTouchLayout ? renderStoryScreen(2) : (
        <section className={`screen pain ${active === 2 ? 'is-active' : ''}`} data-screen="2">
          <div className="pain__layout">
            <div className="pain__copy pain__copy--fees">
              <div className={`pain__item ${empathySteps[2] === 0 ? 'is-active' : ''}`} aria-current={empathySteps[2] === 0 ? 'step' : undefined}>
                <h2>그럴 때 있잖아요.<br />일은 내가 했는데</h2>
              </div>
              <div className={`pain__item ${empathySteps[2] === 1 ? 'is-active' : ''}`} aria-current={empathySteps[2] === 1 ? 'step' : undefined}>
                <p>수수료에 광고비까지<br />이것저것 떼고 나면</p>
              </div>
              <div className={`pain__item ${empathySteps[2] === 2 ? 'is-active' : ''}`} aria-current={empathySteps[2] === 2 ? 'step' : undefined}>
                <p>돈은 안 남고<br />한숨만 남아요.</p>
              </div>
            </div>
            <div className="empathy-visual empathy-visual--fees" aria-hidden="true">
              <video
                className="empathy-visual__media"
                src="/animations/bora-chef-stew-transparent.webm"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              />
            </div>
          </div>
        </section>
        )}

        {isTouchLayout ? renderStoryScreen(3) : (
        <section className={`screen pain pain--bridge ${active === 3 ? 'is-active' : ''}`} data-screen="3">
          <div className="pain__bridge">
            <h2 className={`pain__bridge-step pain__bridge-heading ${empathySteps[3] === 0 ? 'is-active' : ''}`} aria-current={empathySteps[3] === 0 ? 'step' : undefined}>그래서 생각했어요.</h2>
            <p className={`pain__bridge-step pain__bridge-line ${empathySteps[3] === 1 ? 'is-active' : ''}`} aria-current={empathySteps[3] === 1 ? 'step' : undefined}>{useMobileHeroVideo ? <>사장님에겐<br />수익이 더 남고,</> : '사장님에겐 수익이 더 남고,'}</p>
            <p className={`pain__bridge-step pain__bridge-line ${empathySteps[3] === 2 ? 'is-active' : ''}`} aria-current={empathySteps[3] === 2 ? 'step' : undefined}>{useMobileHeroVideo ? <>손님에겐<br />혜택이 더 돌아가는</> : '손님에겐 혜택이 더 돌아가는'}</p>
            <p className={`pain__bridge-step pain__bridge-line pain__bridge-line--final ${bridgeFinalActive ? 'is-active' : ''}`} aria-current={bridgeFinalActive ? 'step' : undefined}>{useMobileHeroVideo ? <span>이런 배달앱은<br />없을까?</span> : '이런 배달앱은 없을까?'}</p>
          </div>
          {isRiderLandscape && bridgeFinalActive && (
            isAppleWebKit ? (
              <img className="pain__bridge-rider" src="/animations/bora-rider-in-place-fast-hd.webp" alt="" aria-hidden="true" draggable="false" />
            ) : (
              <video className="pain__bridge-rider" src="/animations/bora-rider-in-place-fast-hd.webm" autoPlay loop muted playsInline preload="metadata" aria-hidden="true" />
            )
          )}
        </section>
        )}

        <section className={`screen owner-benefits ${active === 4 ? 'is-active' : ''}`} data-screen="4">
          <div className="owner-benefits__inner" aria-label="땡겨요 주문수수료 2%, 광고비 없음, 입점비 없음, 월이용료 없음">
            <div className="owner-benefits__stage">
              <div className={`owner-benefits__step-stage${useMobileOwnerBenefitVideo || isTabletPortrait ? ' owner-benefits__step-stage--video' : ''}`}>
                {useMobileOwnerBenefitVideo ? (
                  <video
                    ref={mobileOwnerBenefitVideoRef}
                    className="owner-benefits__mobile-video"
                    src={mobileOwnerBenefitVideoSrc}
                    onEnded={() => {
                      if (activeRef.current === 4 && useMobileOwnerBenefitVideo) mobileFreeVideoEndedRef.current = true;
                    }}
                    playsInline
                    preload="auto"
                    controls={false}
                    loop={false}
                    disablePictureInPicture
                    disableRemotePlayback
                    controlsList="nodownload nofullscreen noremoteplayback"
                    aria-label="땡겨요 주문수수료 2%, 광고비 없음, 입점비 없음, 월 이용료 없음"
                  />
                ) : useMobileHeroVideo ? (
                  mobileOwnerBenefitSteps.map((src, index) => (
                    <img
                      className={index === ownerBenefitStep ? 'is-active' : ''}
                      src={src}
                      alt={ownerBenefitStepAlts[index]}
                      aria-hidden={index !== ownerBenefitStep}
                      draggable="false"
                      key={src}
                    />
                  ))
                ) : desktopOwnerBenefitVideoSrc ? (
                  <video
                    ref={desktopOwnerBenefitVideoRef}
                    className="owner-benefits__animation owner-benefits__desktop-video"
                    src={isTabletPortrait ? mobileOwnerBenefitVideoSrc : desktopOwnerBenefitVideoSrc}
                    onEnded={() => {
                      if (activeRef.current !== 4 || useMobileHeroVideoRef.current) return;
                      desktopFreeVideoEndedRef.current = true;
                      ownerBenefitAutoPlayingRef.current = false;
                    }}
                    playsInline
                    preload="auto"
                    controls={false}
                    loop={false}
                    disablePictureInPicture
                    disableRemotePlayback
                    controlsList="nodownload nofullscreen noremoteplayback"
                    aria-label="땡겨요 주문수수료 2%, 광고비 없음, 입점비 없음, 월 이용료 없음"
                  />
                ) : (
                  <div
                    className="owner-benefits__animation"
                    aria-hidden="true"
                  >
                    <div ref={ownerBenefitBurstWrapRef} className="owner-benefits__burst-wrap">
                      <div ref={ownerBenefitBurstFlashRef} className="owner-benefits__burst-flash" />
                      <div ref={ownerBenefitBurstRingOneRef} className="owner-benefits__burst-ring owner-benefits__burst-ring--one" />
                      <div ref={ownerBenefitBurstRingTwoRef} className="owner-benefits__burst-ring owner-benefits__burst-ring--two" />
                      <div ref={ownerBenefitBurstShadowRef} className="owner-benefits__burst-shadow" />
                      <img
                        ref={ownerBenefitBurstImageRef}
                        className="owner-benefits__burst-image"
                        src={desktopOwnerBenefitArtwork}
                        alt=""
                        draggable="false"
                      />
                      {ownerBenefitBurstDots.map((dot, index) => (
                        <span
                          key={`${dot.color}-${index}`}
                          ref={(element) => { ownerBenefitBurstDotRefs.current[index] = element; }}
                          className="owner-benefits__burst-dot"
                          style={{
                            width: `${dot.size}px`,
                            height: `${dot.size}px`,
                            borderRadius: dot.borderRadius,
                            background: dot.color,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={`screen customer-benefits ${active === 5 ? 'is-active' : ''}`} data-screen="5">
          <div className="section5-benefits" aria-label="소상공인을 위한 상생 배달앱 혜택">
              <header className="section5-benefits__copy">
                <h2><span>소상공인을 위한</span> 상생 배달앱</h2>
                <p>더 좋은 혜택으로 사장님의 오늘이, 더 나은 내일이 됩니다.</p>
              </header>

              {/* DOM 순서 = 모바일/컴팩트 카드 피드의 정보 위계 순서.
                  1 대표 이미지 · 2 브랜드 영상 · 3 지역화폐 · 4 온누리 · 5 쿠폰팩.
                  데스크톱은 grid-column / absolute 로 자리를 직접 지정하므로 순서에 영향받지 않는다. */}
              <div className="section5-benefits__visuals">
              <article className="section5-phone section5-phone--asset section5-phone--national section5-phone--static" aria-label="국민 배달앱 땡겨요">
                <div className="section5-phone__screen">
                  <img src="/images/benefits/01-national-delivery-app.png" alt="누구나 혜택받는 국민 배달앱 땡겨요" draggable="false" />
                </div>
              </article>

              <article className="section5-phone section5-phone--brand" aria-label="오늘 땡길만한 브랜드 할인">
                <div className="section5-phone__brand-stage">
                  <div className="section5-phone__screen section5-phone__screen--brand">
                    <video
                      src="/images/benefits/06-brand-discount.mp4"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                  </div>
                  <img
                    className="section5-phone__brand-frame"
                    src="/images/benefits/06-brand-discount-phone-frame.png.png"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                  />
                </div>
              </article>

              <article className="section5-phone section5-phone--asset section5-phone--local section5-phone--static" aria-label="우리동네 지역화폐 혜택">
                <div className="section5-phone__screen">
                  <img src="/images/benefits/02-local-currency-map.png" alt="착한배달앱 땡겨요와 함께하는 우리 지역 지도" draggable="false" />
                </div>
              </article>

              <article className="section5-phone section5-phone--asset section5-phone--onnuri section5-phone--static" aria-label="온누리상품권 혜택">
                <div className="section5-phone__screen">
                  <img src="/images/benefits/04-onnuri-benefit.png" alt="모바일 온누리상품권 구매 할인 혜택" draggable="false" />
                </div>
              </article>

              <article className="section5-phone section5-phone--asset section5-phone--coupon section5-phone--static" aria-label="총 16000원 쿠폰팩">
                <div className="section5-phone__screen">
                  <img src="/images/benefits/05-coupon-pack.png" alt="첫주문과 재주문을 위한 총 16000원 쿠폰팩" draggable="false" />
                </div>
              </article>
              </div>
          </div>
        </section>

        <section className={`screen customer-benefits manager-support ${active === 6 ? 'is-active' : ''}`} data-screen="6">
          <div className="manager-support__inner" ref={isTouchLayout ? undefined : managerScrollRef}>
              <header className="manager-support__header">
                <h2>사장님은 <strong>장사에만</strong> 집중하세요.</h2>
                <p>복잡한 입점 절차부터 장사가 더 잘되도록 돕는 맞춤 컨설팅까지 지원합니다.</p>
              </header>
              <ol className="manager-support__steps" aria-label="입점 및 운영 지원 절차">
                <li className="manager-support__card">
                  <span className="manager-support__number">01</span>
                  <span className="manager-support__illustration" aria-hidden="true">
                    <svg className="manager-support__illustration-desktop" viewBox="0 0 120 96">
                      <path className="illustration__soft" d="M74 14h27a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8h-7l-8 7v-7H74a8 8 0 0 1-8-8V22a8 8 0 0 1 8-8Z" />
                      <rect className="illustration__paper" x="18" y="5" width="67" height="86" rx="12" />
                      <path className="illustration__ink" d="M39 14h25M29 28h44M29 44h44M29 60h27" />
                      <circle className="illustration__main-soft" cx="33" cy="76" r="8" />
                      <path className="illustration__main" d="m29 76 3 3 6-7M45 76h19" />
                      <circle className="illustration__main-fill" cx="91" cy="66" r="14" />
                      <path className="illustration__light" d="M84 66h13m-5-5 5 5-5 5" />
                    </svg>
                    <svg className="manager-support__illustration-original" style={{ display: 'none' }} viewBox="0 0 64 64">
                      <path className="illustration__paper" d="M13 5h30l8 8v43H13Z" />
                      <path className="illustration__ink" d="M43 5v10h8M21 23h21M21 31h14" />
                      <path className="illustration__main" d="m20 43 5 5 10-12" />
                      <path className="illustration__main-soft" d="m39 42 11-11 5 5-11 11-8 3Z" />
                      <path className="illustration__ink" d="m50 31 5 5" />
                    </svg>
                    <svg className="manager-support__illustration-mobile" viewBox="0 0 64 64">
                      <ellipse cx="32" cy="57" rx="25" ry="4" fill="#B97036" opacity=".18" />
                      <rect x="10" y="7" width="36" height="49" rx="5" fill="#DFA657" />
                      <path d="M9 5h25l10 10v38H9a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" fill="#FFFBEA" />
                      <path d="M34 5v10h10" fill="#F8D978" />
                      <rect x="12" y="19" width="23" height="5" rx="2" fill="#F6B745" />
                      <path d="M13 30h18M13 37h12" stroke="#B9A080" strokeWidth="3" strokeLinecap="round" />
                      <path d="m28 48 4-13 19-23 9 8-20 23Z" fill="#CA4A21" />
                      <path d="m28 48 4-13 8 8Z" fill="#FFE2AD" />
                      <path d="m28 48 2-7 4 4Z" fill="#5B362D" />
                      <path d="m32 35 19-23 6 5-19 23Z" fill="#F15A24" />
                      <path d="m36 34 15-18" stroke="#FFB55D" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="m49 14 4-5q2-2 4 0l3 3q2 2 0 4l-3 4Z" fill="#F9B43F" />
                    </svg>
                  </span>
                  <h3>입점 상담 신청</h3><p>간단한 매장 정보만 남겨주시면 끝!</p>
                </li>
                <li className="manager-support__card">
                  <span className="manager-support__number">02</span>
                  <span className="manager-support__illustration" aria-hidden="true">
                    <svg className="manager-support__illustration-desktop" viewBox="0 0 120 96">
                      <path className="illustration__soft" d="M10 20h100v66H10z" />
                      <circle className="illustration__paper" cx="37" cy="35" r="13" />
                      <path className="illustration__paper" d="M14 80c3-20 11-30 23-30s20 10 23 30Z" />
                      <circle className="illustration__paper" cx="83" cy="31" r="15" />
                      <path className="illustration__paper" d="M58 80c4-22 12-34 25-34s22 12 25 34Z" />
                      <path className="illustration__main" d="M50 39c8-8 15-9 23-6M68 28l5 5-6 4" />
                      <rect className="illustration__main-soft" x="73" y="59" width="20" height="13" rx="4" />
                      <path className="illustration__ink" d="M78 65h10" />
                      <circle className="illustration__main-fill" cx="103" cy="21" r="12" />
                      <path className="illustration__light" d="m97 21 4 4 8-9" />
                    </svg>
                    <svg className="manager-support__illustration-original" style={{ display: 'none' }} viewBox="0 0 64 64">
                      <circle className="illustration__paper" cx="32" cy="21" r="10" />
                      <path className="illustration__paper" d="M14 57c2-14 8-21 18-21s16 7 18 21Z" />
                      <path className="illustration__main" d="M16 27c0-10 7-18 16-18s16 8 16 18v12c0 6-4 10-10 10h-4" />
                      <path className="illustration__main-soft" d="M14 27h7v13h-7zM43 27h7v13h-7z" />
                      <path className="illustration__ink" d="M27 49h8" />
                    </svg>
                    <svg className="manager-support__illustration-mobile" viewBox="0 0 64 64">
                      <ellipse cx="32" cy="58" rx="26" ry="4" fill="#B97036" opacity=".18" />
                      <path d="M7 58v-8c0-10 11-17 25-17s25 7 25 17v8Z" fill="#F15A24" />
                      <path d="M38 35c12 2 19 8 19 15v8H41Z" fill="#D14B22" />
                      <path d="m24 35 8 8 8-8-3 20H27Z" fill="#FFF8DE" />
                      <path d="M26 29h12v10l-6 5-6-5Z" fill="#F1B681" />
                      <path d="M17 19C17 6 23 3 33 3c11 0 16 7 15 20l-5 12H20Z" fill="#633B2B" />
                      <ellipse cx="32" cy="23" rx="12" ry="15" fill="#FFDBA9" />
                      <path d="M20 19c3-1 8-5 10-10 4 7 9 8 15 9-1-10-7-13-13-13-8 0-13 6-12 14Z" fill="#74462E" />
                      <path d="M16 26v-7C16 8 23 4 32 4s17 6 17 17v9" fill="none" stroke="#F8B83E" strokeWidth="5" />
                      <rect x="12" y="21" width="8" height="14" rx="4" fill="#F15A24" />
                      <rect x="44" y="21" width="8" height="14" rx="4" fill="#F15A24" />
                      <path d="M48 33c0 7-6 8-13 8" fill="none" stroke="#633B2B" strokeWidth="3" />
                      <rect x="30" y="38" width="9" height="5" rx="2.5" fill="#633B2B" />
                      <path d="M27 24h1m8 0h1" stroke="#633B2B" strokeWidth="2" strokeLinecap="round" />
                      <path d="M15 48v7" stroke="#FFAD65" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </span>
                  <h3>전담 매니저 배치</h3><p>상담 내용을 바탕으로 전담 매니저가 배정됩니다.</p>
                </li>
                <li className="manager-support__card">
                  <span className="manager-support__number">03</span>
                  <span className="manager-support__illustration" aria-hidden="true">
                    <svg className="manager-support__illustration-desktop" viewBox="0 0 120 96">
                      <path className="illustration__paper" d="M23 4h59l15 15v58H23Z" />
                      <path className="illustration__soft" d="M82 4v16h15" />
                      <circle className="illustration__main-fill" cx="39" cy="31" r="8" />
                      <path className="illustration__light" d="m35 31 3 3 5-6" />
                      <path className="illustration__ink" d="M53 31h30" />
                      <circle className="illustration__main-fill" cx="39" cy="51" r="8" />
                      <path className="illustration__light" d="m35 51 3 3 5-6" />
                      <path className="illustration__ink" d="M53 51h30" />
                      <circle className="illustration__main-soft" cx="39" cy="69" r="8" />
                      <path className="illustration__ink" d="M53 69h22" />
                      <circle className="illustration__main-soft" cx="29" cy="87" r="8" />
                      <circle className="illustration__main-soft" cx="60" cy="87" r="8" />
                      <circle className="illustration__main-fill" cx="91" cy="87" r="8" />
                      <path className="illustration__ink" d="M37 87h15M68 87h15M27 84v6M57 84h5l-5 6M88 84h6l-6 6h6" />
                    </svg>
                    <svg className="manager-support__illustration-original" style={{ display: 'none' }} viewBox="0 0 64 64">
                      <path className="illustration__paper" d="M10 5h34l8 8v43H10Z" />
                      <path className="illustration__ink" d="M44 5v10h8M25 23h15M25 34h15M25 45h10" />
                      <circle className="illustration__main-soft" cx="18" cy="23" r="6" />
                      <circle className="illustration__main-soft" cx="18" cy="34" r="6" />
                      <path className="illustration__main" d="m15 23 3 3 5-6m-8 14 3 3 5-6m-8 14 3 3 5-6M39 48h16m-6-6 6 6-6 6" />
                    </svg>
                    <svg className="manager-support__illustration-mobile" viewBox="0 0 64 64">
                      <ellipse cx="32" cy="58" rx="26" ry="4" fill="#B97036" opacity=".18" />
                      <rect x="8" y="7" width="39" height="49" rx="5" fill="#DFA657" />
                      <rect x="5" y="5" width="38" height="48" rx="5" fill="#FFFBEA" />
                      <rect x="14" y="3" width="20" height="9" rx="4" fill="#F6B745" />
                      <rect x="12" y="18" width="6" height="6" rx="2" fill="#F6B745" />
                      <rect x="12" y="30" width="6" height="6" rx="2" fill="#F6B745" />
                      <path d="M23 21h12M23 33h9M12 43h13" stroke="#BAA080" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="43" cy="42" r="18" fill="#CD491F" />
                      <circle cx="42" cy="39" r="18" fill="#F15A24" />
                      <path d="M29 33a14 14 0 0 1 17-7" fill="none" stroke="#FFAF58" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="m31 39 8 8 15-17" fill="none" stroke="#FFFBEA" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h3>입점 진행</h3><p>필요한 절차를 안내하고 입점 과정을 함께 진행합니다.</p>
                </li>
                <li className="manager-support__card">
                  <span className="manager-support__number">04</span>
                  <span className="manager-support__illustration" aria-hidden="true">
                    <svg className="manager-support__illustration-desktop" viewBox="0 0 120 96">
                      <path className="illustration__soft" d="m11 42 12-27h60l12 27" />
                      <path className="illustration__main-fill" d="M8 42h90v14H8z" />
                      <path className="illustration__paper" d="M18 56h70v35H18z" />
                      <path className="illustration__ink" d="M31 91V69h18v22M61 75h14" />
                      <path className="illustration__main-soft" d="m76 12 28 5-4 22-28-5z" />
                      <circle className="illustration__main-fill" cx="81" cy="22" r="3" />
                      <path className="illustration__ink" d="M88 24h9" />
                      <path className="illustration__main" d="M65 70c13-3 22-11 31-24M89 47l7-1-1 7" />
                    </svg>
                    <svg className="manager-support__illustration-original" style={{ display: 'none' }} viewBox="0 0 64 64">
                      <path className="illustration__paper" d="M9 29h36v27H9Z" />
                      <path className="illustration__main-soft" d="m7 29 6-14h29l6 14Z" />
                      <path className="illustration__main" d="M7 29h41v8H7zM34 24l8-8 6 5 8-11m-6 0h6v6" />
                      <path className="illustration__ink" d="M15 56V42h10v14M32 44h8" />
                      <circle className="illustration__main-fill" cx="34" cy="24" r="3" />
                    </svg>
                    <svg className="manager-support__illustration-mobile" viewBox="0 0 64 64">
                      <ellipse cx="32" cy="58" rx="27" ry="4" fill="#B97036" opacity=".18" />
                      <rect x="7" y="28" width="43" height="29" rx="3" fill="#DDA357" />
                      <rect x="6" y="27" width="39" height="28" rx="2" fill="#FFFBEA" />
                      <path d="m4 26 6-13h31l7 13v6H4Z" fill="#F15A24" />
                      <path d="m14 13-3 13v6h8v-6l1-13m9 0 1 13v6h8v-6l-3-13" fill="#FFD16C" />
                      <path d="M4 27h44v5H4Z" fill="#C64B24" opacity=".25" />
                      <rect x="12" y="36" width="11" height="19" rx="1" fill="#B67845" />
                      <rect x="27" y="36" width="13" height="11" rx="2" fill="#F8D978" />
                      <path d="M29 38h8" stroke="#FFFBEA" strokeWidth="2" strokeLinecap="round" />
                      <path d="m32 31 10-11 7 4L59 8M47 8h12v12" fill="none" stroke="#FFF5D8" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="m32 31 10-11 7 4L59 8M47 8h12v12" fill="none" stroke="#F15A24" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h3>성장 컨설팅</h3><p>오픈 이후 매장 상황에 맞는 프로모션과 매출 활성화 방향을 제안합니다.</p>
                </li>
              </ol>
              <p className="manager-support__closing"><span className="manager-support__closing-orange">상담부터 입점 이후까지</span> <span className="manager-support__closing-blue">전담 매니저</span><span className="manager-support__closing-charcoal">가 함께합니다.</span></p>
              <img className="section6-mascot section6-mascot--left" src="/images/section6/mascot-left-consulting.png.png" alt="입점 상담을 안내하는 땡겨요 마스코트" draggable="false" />
              <img className="section6-mascot section6-mascot--right" src="/images/section6/mascot-right-growth.png.png" alt="성장 컨설팅을 안내하는 땡겨요 마스코트" draggable="false" />
          </div>
        </section>

        <section className={`screen faq ${active === 7 ? 'is-active' : ''}`} data-screen="7" aria-labelledby="faq-heading">
          <div className="faq__inner">
            <header className="faq__header">
              <h2 id="faq-heading"><span className="faq__heading-orange">수수료는?</span> <span className="faq__heading-blue">정산은?</span> <span className="faq__heading-charcoal">주문은?</span></h2>
              <p>사장님이 입점 전에 가장 궁금해하는 내용을 모았습니다.</p>
            </header>
            <div className="faq__tabs" role="tablist" aria-label="FAQ 카테고리">
              {faqCategories.map((category) => {
                const selected = category.id === faqCategory;
                return (
                  <button
                    id={`faq-tab-${category.id}`}
                    className={`faq__tab ${selected ? 'is-selected' : ''}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="faq-panel"
                    tabIndex={selected ? 0 : -1}
                    key={category.id}
                    onClick={() => {
                      setFaqCategory(category.id);
                      setOpenFaqId(category.items[0]?.id ?? null);
                      faqScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
            <div className="faq__scroll-region" ref={isTouchLayout ? undefined : faqScrollRef}>
              <div
                id="faq-panel"
                className="faq__panel"
                role="tabpanel"
                aria-labelledby={`faq-tab-${selectedFaqCategory.id}`}
              >
                <div className="faq-accordion">
                  {displayedFaqItems.map(renderFaqItem)}
                </div>
              </div>
              <div className="faq__common" aria-label="공통 입점 상담 FAQ">
                <div className="faq-accordion">
                  {commonFaqs.map(renderFaqItem)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section ref={consultationPageRef} className={`screen consultation ${active === 8 ? 'is-active' : ''}`} data-screen="8">
          <>
            <div className="consultation__inner">
              <header className="consultation__header">
                <h2>이제, <strong>사장님 매장</strong> 이야기를 들려주세요.</h2>
                <p>간단한 정보만 남겨주시면 전담 매니저가 확인 후 연락드립니다.</p>
              </header>
              <div className="consultation__layout">
                <aside className="consultation__visual" aria-label="입점 상담을 돕는 매장 안내">
                  <svg viewBox="0 0 240 360" role="img" aria-label="매장 상담을 준비하는 음식점 사장님 일러스트">
                    <ellipse className="consultation__visual-ground" cx="120" cy="333" rx="103" ry="13" />
                    <circle className="consultation__visual-backdrop" cx="120" cy="176" r="104" />
                    <path className="consultation__visual-store" d="M42 148h156v128a18 18 0 0 1-18 18H60a18 18 0 0 1-18-18V148Z" />
                    <path className="consultation__visual-roof" d="M30 126h180l-20-54H50l-20 54Z" />
                    <rect className="consultation__visual-sign" x="77" y="88" width="86" height="24" rx="12" />
                    <path className="consultation__visual-sign-mark" d="M99 100h42M108 94v12M132 94v12" />
                    <path className="consultation__visual-awning" d="M30 126h180v24c0 13-10 23-23 23-12 0-22-9-23-21-2 12-11 21-23 21s-22-9-23-21c-2 12-11 21-23 21s-22-9-23-21c-2 12-11 21-23 21-13 0-23-10-23-23v-24Z" />
                    <rect className="consultation__visual-window" x="126" y="194" width="50" height="58" rx="8" />
                    <rect className="consultation__visual-door" x="62" y="190" width="42" height="104" rx="9" />
                    <circle className="consultation__visual-head" cx="82" cy="250" r="24" />
                    <path className="consultation__visual-hair" d="M59 246c1-17 10-27 24-27 12 0 21 7 24 19-8-1-15-5-20-11-6 9-15 15-28 19Z" />
                    <path className="consultation__visual-face" d="M72 252h1M91 252h1M76 263c4 3 9 3 13 0" />
                    <path className="consultation__visual-headset" d="M58 250c0-16 10-27 24-27s24 11 24 27v8h-9M58 250v10h8" />
                    <path className="consultation__visual-body" d="M42 330c2-40 17-62 40-62s39 22 41 62H42Z" />
                    <path className="consultation__visual-apron" d="M65 280h34l8 50H57l8-50Z" />
                    <rect className="consultation__visual-note" x="102" y="246" width="72" height="86" rx="12" />
                    <path className="consultation__visual-check" d="m119 277 11 11 25-29M119 306h36" />
                    <path className="consultation__visual-bubble" d="M143 31h64a15 15 0 0 1 15 15v35a15 15 0 0 1-15 15h-24l-16 15 2-15h-26a15 15 0 0 1-15-15V46a15 15 0 0 1 15-15Z" />
                    <path className="consultation__visual-bubble-check" d="m154 63 10 10 21-23" />
                  </svg>
                </aside>

                <form
                  className="consultation-form"
                  onSubmit={handleConsultationSubmit}
                >
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
                    <input id="consultation-address" name="storeAddress" type="text" placeholder="예: 서울특별시 중구 세종대로 67" autoComplete="street-address" required />
                  </label>
                </div>
                <div
                  className={`consultation-form__apps-wrap consultation-form__full ${deliveryAppsError ? 'is-error' : ''} ${deliveryAppsAlerting ? 'is-alerting' : ''}`}
                  onAnimationEnd={(event) => {
                    if (event.animationName === 'consultation-apps-error-pulse') {
                      setDeliveryAppsAlerting(false);
                    }
                  }}
                >
                <fieldset
                  className="consultation-form__apps"
                  aria-invalid={deliveryAppsError}
                  aria-describedby={deliveryAppsError ? 'consultation-delivery-apps-error' : undefined}
                >
                  <legend>현재 이용 중인 배달앱 <small>복수 선택 가능</small></legend>
                  <div className="consultation-form__chips">
                    {['배민', '쿠팡이츠', '요기요', '땡겨요', '배달앱 미사용', '기타'].map((appName) => (
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
                              if (appName === '배달앱 미사용') {
                                return selectedApps.includes(appName) ? [] : [appName];
                              }

                              const selectableApps = selectedApps.filter((selectedApp) => selectedApp !== '배달앱 미사용');
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
                <div className="consultation-form__privacy-row consultation-form__full">
                  <label className="consultation-form__privacy" htmlFor="consultation-privacy">
                    <input id="consultation-privacy" name="privacyConsent" type="checkbox" required />
                    <span>{useMobileHeroVideo ? <><span className="consultation-form__privacy-lead"><b>[필수]</b> 개인정보</span> 수집 및 이용에 동의합니다.</> : <>개인정보 수집 및 이용에 동의합니다. <b>[필수]</b></>}</span>
                  </label>
                  <button
                    className="consultation-form__privacy-toggle"
                    type="button"
                    aria-expanded={privacyDetailsOpen}
                    onClick={() => setPrivacyDetailsOpen((isOpen) => !isOpen)}
                  >
                    <span aria-hidden="true">{privacyDetailsOpen ? '▾' : '▸'}</span>
                    {privacyDetailsOpen ? '내용닫기' : '내용보기'}
                  </button>
                  {privacyDetailsOpen && (
                    <dl className="consultation-form__privacy-details">
                      <div>
                        <dt>[수집·이용 목적]</dt>
                        <dd>땡겨요 입점 상담 신청 접수, 상담 연락, 담당 매니저 배정, 입점 지원, 입점 후 매장 관리·사후관리 및 운영 컨설팅</dd>
                      </div>
                      <div>
                        <dt>[수집 항목]</dt>
                        <dd>매장명(상호), 휴대폰 번호, 매장 주소, 현재 이용 중인 배달앱</dd>
                      </div>
                      <div>
                        <dt>[보유·이용 기간]</dt>
                        <dd>상담, 입점 및 관리가 종료될 때까지 보유하며, 종료일로부터 6개월 후 파기합니다.</dd>
                      </div>
                      <div>
                        <dt>[동의 거부 안내]</dt>
                        <dd>개인정보 수집 및 이용에 동의하지 않을 권리가 있습니다. 다만 동의를 거부할 경우 무료 입점 상담 신청이 제한될 수 있습니다.</dd>
                      </div>
                    </dl>
                  )}
                </div>
                <button className="consultation-form__submit consultation-form__full" type="submit">무료 입점 상담 신청</button>
                <p className="consultation-form__phone consultation-form__full">전화 상담이 편하신가요? <a href="tel:1555-1984">1555-1984</a></p>
                </form>

                <aside className="consultation__trust" aria-label="땡겨요 입점 상담 혜택">
                  <div className="consultation__trust-card">
                    <span className="consultation__trust-icon" aria-hidden="true">
                      <svg viewBox="0 0 32 32"><path d="M6 7h20v14H14l-6 5v-5H6V7Z" /><path d="m11 14 3 3 7-7" /></svg>
                    </span>
                    <strong>무료 상담</strong>
                  </div>
                  <div className="consultation__trust-card">
                    <span className="consultation__trust-icon consultation__trust-icon--orange" aria-hidden="true">
                      <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" /><text x="16" y="19">2%</text></svg>
                    </span>
                    <strong>주문수수료 2%</strong>
                  </div>
                  <div className="consultation__trust-card">
                    <span className="consultation__trust-icon" aria-hidden="true">
                      <svg viewBox="0 0 32 32"><circle cx="16" cy="10" r="5" /><path d="M7 27c1-7 4-11 9-11s8 4 9 11M6 11v7h4M26 11v7h-4" /></svg>
                    </span>
                    <strong>전담 매니저 지원</strong>
                  </div>
                  <div className="consultation__trust-card consultation__trust-card--consulting">
                    <span className="consultation__trust-icon consultation__trust-icon--orange" aria-hidden="true">
                      <svg viewBox="0 0 32 32"><rect x="7" y="5" width="18" height="22" rx="3" /><path d="M12 21v-4M16 21v-7M20 21v-10M12 9h8" /></svg>
                    </span>
                    <strong>맞춤 컨설팅 제공</strong>
                  </div>
                </aside>
              </div>
            </div>
            <footer className="consultation-footer">
              <div className="consultation-footer__inner">
                <div className="consultation-footer__top">
                  <div className="consultation-footer__brand">
                    <p><span>운영자 더잘함M&amp;F</span><i aria-hidden="true">|</i><span>땡겨요 입점 상담 운영</span></p>
                    <p><span>대표자 남도현</span><i aria-hidden="true">|</i><span>사업자등록번호 314-09-25617</span></p>
                    <p><span>대전광역시 유성구 대학로 28</span><i aria-hidden="true">|</i><a href="mailto:ndh4123@naver.com">ndh4123@naver.com</a></p>
                  </div>
                  <div className="consultation-footer__links">
                    <button type="button" aria-label="개인정보처리방침 준비 중">개인정보처리방침</button>
                    <a href="tel:1555-1984">입점 상담 <strong>1555-1984</strong></a>
                  </div>
                </div>
                <div className="consultation-footer__bottom">
                  <p>
                    <span>본 사이트는 땡겨요 본사 또는 신한은행이 직접 운영하는 사이트가 아닙니다.</span>
                    <span>땡겨요 총판 디와이파트너스를 통해 입점 상담을 제공합니다.</span>
                  </p>
                  <small>© 2026 더잘함M&amp;F. All rights reserved.</small>
                </div>
              </div>
            </footer>
          </>
        </section>

      </main>
    </>
  );
}

export default App;
