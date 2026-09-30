// 0% 마감 프로모션(상단 띠 배너 + 하단 고정 버튼 위 말풍선) 설정. 켜기/끄기·마감 시각·문구는 여기서만 바꾼다.
// 마감 시각이 지나면 띠와 말풍선 모두 자동으로 안 보인다(src/components/PromoBanner.tsx).
export const PROMO = {
  // 켜기/끄기 스위치. false 면 마감 전이어도 아무것도 안 보인다.
  enabled: true,
  // 마감 시각(한국시간).
  deadline: '2026-11-30T23:59:59+09:00',
  // 띠 고정 방식. 'fixed' = A안(헤더와 같이 항상 고정) / 'hideOnScroll' = B안(스크롤하면 띠만 사라지고 헤더는 고정).
  bannerMode: 'hideOnScroll' as 'fixed' | 'hideOnScroll',
  // 상단 띠 문구. 앞에 D-숫자 뱃지가 붙고 뒤에 › 가 붙는다.
  bannerText: '신규 입점 11/30까지 신청 시 연말까지 중개수수료 0%',
  // 하단 고정 「무료 입점 상담」 버튼 위 말풍선 문구. 앞에 D-숫자 뱃지가 붙는다.
  bubbleText: '신규 입점 중개수수료 0%',
};
