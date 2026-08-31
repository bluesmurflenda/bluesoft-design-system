// Alert 요소↔토큰 매핑 — 기준표(2026-08-31, Figma MCP 실측) + node 761:51/761:44/761:52/765:141
// get_metadata·get_variable_defs 재확인을 구조화한 것. D14(check-nodes.mjs)가 소비한다.
// ADR-023 참조.
//
// cssSelector 는 "이 property 가 실제로(컴파일된 CSS 기준) 선언된 셀렉터"다 — Figma 레이어
// 이름이 아니다. Icon·Close 는 .alert__icon·.alert__close 자체엔 color 선언이 없고 조상
// .alert-{color}의 color 를 상속받는다(dist/main.css 확인) — 그래서 조상 셀렉터를 가리킨다.
// D14는 셀렉터 매칭이지 캐스케이드 시뮬레이션이 아니므로, "진짜 색이 적용되는 지점"을
// 가리켜야 검사가 의미 있다. via 필드에 그 이유를 남긴다.
export default {
  set: 'Alert',
  variantAxis: {
    color: ['brand', 'neutral', 'success', 'warning', 'error', 'info'],
    layout: ['inline', 'banner', 'toast'],
  },
  elements: [
    {
      figmaPath: '',
      element: '루트 배경',
      figmaType: 'fill',
      cssSelector: '.alert-{color}',
      cssProperty: 'background-color',
      token: 'alert/{color}/bg',
    },
    {
      figmaPath: '',
      element: '루트 테두리',
      figmaType: 'stroke',
      cssSelector: '.alert-{color}',
      cssProperty: 'border',
      token: 'alert/{color}/border',
      // 실측(node 761:44): banner는 stroke 자체가 없다 — border 변수가 안 붙는다.
      // .alert-banner가 border:none으로 덮어써서 캐스케이드로도 없어지지만, 그건 D14가
      // 검사하지 않는 별개 사실이다(위 파일 헤더 "한계" 참조).
      except: { layout: ['banner'] },
    },
    {
      // 실측(2026-09-01, 라이브 REST): 'Icon' 인스턴스 자체의 fills는 빈 배열이다 — 색은
      // 그 안의 중첩 벡터(이름도 'Icon')에 있다. REST가 INSTANCE의 children도 오버라이드
      // 반영된 채 그대로 반환한다는 걸 이번에 처음 확인했다(check-nodes.mjs의 walkForDump가
      // D1/D2의 walk()와 달리 인스턴스 경계에서 멈추지 않도록 고친 이유).
      figmaPath: 'Icon/Icon',
      element: 'Icon',
      figmaType: 'fill',
      cssSelector: '.alert-{color}',
      cssProperty: 'color',
      token: 'alert/{color}/fg',
      via: '상속 — .alert__icon 자체엔 color 선언 없음(dist/main.css: width/height/flex-shrink뿐), 조상 .alert-{color}의 color를 따라간다',
    },
    {
      figmaPath: 'Close/Icon', // 실측: Close 인스턴스 내부 벡터도 이름이 'Icon'이다(공용 아이콘 스왑 슬롯)
      element: 'Close',
      figmaType: 'fill',
      cssSelector: '.alert-{color}',
      cssProperty: 'color',
      token: 'alert/{color}/fg',
      via: '상속 — .alert__close도 Icon과 동일하게 자체 color 선언 없음',
    },
    {
      figmaPath: 'Body/Title',
      element: 'Title',
      figmaType: 'fill',
      cssSelector: '.alert-{color} .alert__title',
      cssProperty: 'color',
      token: 'alert/{color}/fg',
    },
    {
      figmaPath: 'Body/Supporting text',
      element: 'Supporting text',
      figmaType: 'fill',
      cssSelector: '.alert__text',
      cssProperty: 'color',
      token: 'alert/fg-supporting', // 색상 축과 무관 — 플레이스홀더 없음, 공용 톤
    },
  ],
};
