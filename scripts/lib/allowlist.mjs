// D1(check-nodes)·S4(check-tokens) 공용 — "컴포넌트가 색상 프리미티브를 직접 참조해도 되는" 예외.
// 근거: FIGMA.md 「토큰 계층」의 "프리미티브 직접 참조가 정상인 경우" 표 — 브랜드 자산·알파 토큰만
// 이름으로 고정 허용한다. '의미색'·'유채색 배경 위 글자'·'컴포넌트 고유 톤'은 이름만으로
// 기계적으로 구분할 수 없으므로 예외 컴포넌트 파일 목록 + 인라인 주석(S1과 동일한 방식)으로 처리한다.
// white/black은 일부러 넣지 않는다 — 과거 실제로 이 두 값이 다크모드 회귀의 원인이었다(D1 '나온 배경').

export const ALWAYS_ALLOWED_PRIMITIVES = [
  'social/kakao',
  'social/naver',
  'social/apple',
  'effect/focus-ring',
];

// 파일명(basename)이 이 목록에 있으면 D1/S4 대상에서 제외한다 — 로고·소셜 버튼(브랜드 자산 전용 컴포넌트).
export const EXEMPT_COMPONENT_FILES = ['_logo.scss', '_social-button.scss'];

// S1과 동일한 인라인 예외 표기: 같은 줄에 이 주석이 있으면 그 줄의 직접 참조를 허용한다.
export const EXEMPTION_COMMENT_RE = /\/\*\s*예외\s*:.*?\*\//;

export function isExemptFile(fileBasename) {
  return EXEMPT_COMPONENT_FILES.includes(fileBasename);
}

// D1 전용 — ADR-019. 특정 컴포넌트의 특정 자리에 한해서만 프리미티브 직접 참조를 허용한다.
// (component, primitive) 이름 쌍으로 좁힌다 — white 등을 전역으로 풀면 D1이 원래 잡으려던
// 회귀(체크박스·입력·페이지네이션·모달 배경이 white를 직접 물어 다크모드에서 흰 판이 된 사고,
// D1 '나온 배경')를 다시 놓친다. 같은 프리미티브라도 다른 컴포넌트에서 쓰면 여전히 FAIL이다.
export const D1_NODE_EXCEPTIONS = [
  { component: '_Checkbox base', primitive: 'green/600' }, // validation=valid 링
  { component: '_Checkbox base', primitive: 'green/700' },
  { component: '_Checkbox base', primitive: 'red/500' }, // validation=invalid 링
  { component: '_Checkbox base', primitive: 'red/600' },
  { component: 'Avatar', primitive: 'white' }, // Online 표시 링
];

export function isD1NodeExempt(component, primitive) {
  return D1_NODE_EXCEPTIONS.some((e) => e.component === component && e.primitive === primitive);
}

// S2 전용 — ADR-015. Figma엔 있지만 코드에서 일부러 안 내보내는 토큰(누락으로 잡히면 안 된다).
// "컬렉션/이름" 문자열로 좁힌다 — 다른 토큰이 같은 이유로 빠지면 그때 항목을 추가한다.
export const S2_MISSING_EXEMPT = new Set([
  // ADR-033 으로 Figma 토큰 그룹이 button/* -> btn/* 으로 바뀌었다. 옛 이름으로 두면 매칭이 안 돼
  // 예외가 조용히 풀린다(2026-09-09 리네임 때 실제로 그 상태였다).
  'Shape/btn/radius-xs', // Button Size=xs 코드 제외(실사용 0건) — Figma 변형 자체는 유지
  'Shape/btn/padding-x/xs',
]);

export function isS2MissingExempt(collection, name) {
  return S2_MISSING_EXEMPT.has(`${collection}/${name}`);
}

// S2 전용 — ADR-026. 특정 모드에서만 코드가 Figma 를 따라가지 않는 것(누락이 아니라 불일치로 잡힌다).
// Wide 는 미디어쿼리를 만들지 않으므로 그 모드값을 조회하면 Desktop 값이 나온다. 모드까지 붙여
// 좁힌다 — 같은 토큰의 다른 모드는 여전히 대조 대상이다.
export const S2_MODE_EXEMPT = new Set([
  'Breakpoint/grid/margin/Wide', // container/width 와 뷰포트 폭에서 나오는 종속값. margin-inline:auto 가 만든다
  'Breakpoint/breakpoint/Wide', // 시안 프레임 폭 전용 — FIGMA.md 「모드와 프레임 폭은 다르다」
]);

export function isS2ModeExempt(collection, name, mode) {
  return S2_MODE_EXEMPT.has(`${collection}/${name}/${mode}`);
}

// S2 전용 — Figma 에 대응 토큰이 없는데 코드가 선언하는 커스텀 프로퍼티.
// 이름을 하나씩만 등록하고 범주(접두사·컴포넌트 단위)로 열지 않는다. ADR-019 가 white 를
// 전역으로 풀지 않고 (컴포넌트, 프리미티브) 쌍으로 좁힌 이유가 그대로 적용된다 —
// 범주로 열면 "Figma 에 없는 변수"가 조용히 늘어나도 S2 가 못 잡는다.
// 여기 있다는 것은 "지금 통과시킨다"는 뜻이고 "이대로 두기로 정했다"는 뜻이 아니다.
export const S2_CSS_ONLY_EXCEPTIONS = [
  {
    name: '--bds-avatar-online-ring',
    // Avatar 의 Online 표시 링. Figma 는 이 자리에 white 를 직접 바인드하고 있어서(ADR-019,
    // D1_NODE_EXCEPTIONS 의 Avatar/white 와 같은 자리) 대응하는 토큰 이름이 없다.
    // Figma 에 avatar/online-ring 토큰을 만들지는 미결 — STATUS.md 「사람이 해야 하는 것」에 있다.
    why: 'Figma 가 white 를 직접 바인드한다(ADR-019). 토큰 신설은 미결 — STATUS.md 「사람이 해야 하는 것」',
  },
];

export function isS2CssOnlyExempt(varName) {
  const full = varName.startsWith('--') ? varName : '--' + varName;
  return S2_CSS_ONLY_EXCEPTIONS.some((e) => e.name === full);
}
