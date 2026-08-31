// D1(check-nodes)·S4(check-tokens) 공용 — "컴포넌트가 색상 프리미티브를 직접 참조해도 되는" 예외.
// 근거: CLAUDE.md 1장 "프리미티브 직접 참조가 정상인 경우" 표 — 브랜드 자산·알파 토큰만
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
  'Shape/button/radius-xs', // Button Size=xs 코드 제외(실사용 0건) — Figma 변형 자체는 유지
  'Shape/button/padding-x/xs',
]);

export function isS2MissingExempt(collection, name) {
  return S2_MISSING_EXEMPT.has(`${collection}/${name}`);
}
