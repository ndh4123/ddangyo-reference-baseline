import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // CSS 최소화 단계가 기본값에서는 @media (min-width:601px) 를
    // @media (width>=601px) 같은 범위 문법으로 바꿔 출력한다.
    // 이 문법은 Safari 16.4부터 읽을 수 있어서 Safari 15.4(iPhone SE 2022 등)에서는
    // 해당 @media 블록이 통째로 무시되고 반응형 규칙이 하나도 적용되지 않는다.
    // 하한을 Safari 15.4 로 낮추면 기존 min-width/max-width 형태로 그대로 출력된다.
    // JS 번들 target(build.target)은 건드리지 않는다. CSS 출력 문법에만 영향을 준다.
    cssTarget: ['safari15.4', 'chrome100', 'edge100', 'firefox100'],
  },
});
