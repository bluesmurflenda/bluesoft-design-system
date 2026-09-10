// D1(check-nodes)·S4(check-tokens) 공용 — "컴포넌트가 색상 프리미티브를 직접 참조해도 되는" 예외.
// 근거: FIGMA.md 「토큰 계층」의 "프리미티브 직접 참조가 정상인 경우" 표 — 브랜드 자산·알파 토큰만
// 이름으로 고정 허용한다. '의미색'·'유채색 배경 위 글자'·'컴포넌트 고유 톤'은 이름만으로
// 기계적으로 구분할 수 없으므로 예외 컴포넌트 파일 목록 + 인라인 주석(S1과 동일한 방식)으로 처리한다.
// white/black은 일부러 넣지 않는다 — 과거 실제로 이 두 값이 다크모드 회귀의 원인이었다(D1 '나온 배경').
//
// ─────────────────────────────────────────────────────────────────
// 이 파일의 모든 목록은 사용량이 계측된다. 아래 「예외 사용량 계측」 참고.
// 항목을 추가할 때 예외를 적용하는 자리가 반드시 이 파일의 판정 함수를 거치게 해야 한다 —
// 배열을 직접 .includes() 로 쓰면 계측을 우회해서 그 항목이 죽어도 안 보인다.
// ─────────────────────────────────────────────────────────────────

// ── 예외 사용량 계측 ──────────────────────────────────────────────
// 왜 세나
//   예외 항목이 아무것과도 안 맞으면 지금은 아무도 모른다. 그리고 나중에 그 자리가 다시
//   생기면 옛 결정이 되살아나 조용히 통과시킨다. 실제로 이 원인으로 세 번 어긋났다 —
//     · ADR-033 리네임 때 Shape/button/* 예외 키가 안 맞아 풀려 있었다
//     · S4 가 찾던 이름이 ADR-018 이후 저장소에 없어서 빈손으로 통과했다
//     · Avatar 링 결정이 뒤집혔는데 예외가 남았다
//   0 이면 셋 중 하나다: 해결돼서 지울 것 / 이름이 바뀌어 못 맞추는 것 /
//   결정이 뒤집혔는데 안 지운 것. 어느 쪽인지는 검사가 판정할 수 없다 — 숫자만 내고 사람이 읽는다.
//
// 조회 횟수를 항목 적중과 따로 세는 이유
//   목록마다 쓰는 스크립트가 다르다. check-tokens 는 D1 목록을 아예 안 본다.
//   "조회 0회" 와 "조회했는데 안 맞음" 을 구분하지 않으면, 남의 목록을 죽은 것으로 보고해
//   경고가 늘 켜져 있게 되고 그러면 아무도 안 읽는다.
const listConsults = new Map(); // 목록 이름 -> 판정 함수가 호출된 횟수
const listHits = new Map(); // 목록 이름 -> Map(항목 키 -> 맞은 횟수)

function defineList(listName, keys) {
  const m = new Map();
  for (const k of keys) m.set(k, 0);
  listHits.set(listName, m);
  listConsults.set(listName, 0);
}
function consult(listName) {
  listConsults.set(listName, (listConsults.get(listName) ?? 0) + 1);
}
function hit(listName, key) {
  const m = listHits.get(listName);
  if (m && m.has(key)) m.set(key, m.get(key) + 1);
}

// 검사 둘이 같이 쓰는 목록. 한 검사에서 0 이어도 다른 검사에서 맞을 수 있어 그 실행만으로는
// 판정할 수 없다 — 그래서 조치 대상과 나눠서 낸다.
//   실제로 이 목록은 두 검사가 정확히 반씩 쓴다. 코드 쪽(S4)은 social/* 을 안 본다
//   (_social-button.scss 가 파일 단위로 먼저 빠지므로 도달하지 않는다). Figma 쪽(D1)은
//   effect/focus-ring 을 안 본다(이펙트 스타일이라 fill·stroke 스캔에 안 걸린다).
//   나누지 않으면 두 검사가 각각 절반을 영구히 0 으로 보고하고, 늘 켜진 경고는 읽히지 않는다.
//
// 여기 이름을 적어야 하는 건 이 파일에서 유일한 수동 메타데이터다. 틀리면 증상은
// "조치 대상에 0 이 계속 남는다" 로 드러난다 — 조용히 죽지는 않는다.
const SHARED_LISTS = new Set(['ALWAYS_ALLOWED_PRIMITIVES']);

// 예외 사용량 보고서. 검사 스크립트가 마지막에 불러서 출력한다.
//   consulted    — 이번 실행에서 판정 함수가 불린 목록
//   unused       — 단독 목록인데 한 번도 안 맞은 항목. 지금 판단할 수 있다
//   unusedShared — 공유 목록의 0건. 두 검사를 다 돌려야 판단할 수 있다
//   notLooked    — 이번 실행에서 아무도 조회하지 않은 목록. 다른 스크립트 소관이라 0 이 아니다
export function exceptionUsage() {
  const consulted = [];
  const unused = []; // 이 검사가 단독으로 쓰는 목록의 0건 — 지금 판단할 수 있다
  const unusedShared = []; // 공유 목록의 0건 — 두 검사를 다 돌려야 판단할 수 있다
  const notLooked = [];
  for (const [listName, entries] of listHits) {
    const calls = listConsults.get(listName) ?? 0;
    if (calls === 0) {
      // 항목이 없는 빈 목록은 낼 게 없다 — 조회되지 않아도 보고하지 않는다.
      if (entries.size) notLooked.push({ list: listName, entries: entries.size });
      continue;
    }
    consulted.push({ list: listName, calls, entries: entries.size });
    for (const [key, count] of entries) {
      if (count !== 0) continue;
      (SHARED_LISTS.has(listName) ? unusedShared : unused).push({ list: listName, key });
    }
  }
  return { consulted, unused, unusedShared, notLooked };
}

// 검사 스크립트가 그대로 출력할 보고 내용. 문구를 한 곳에 둬서 두 스크립트가 갈리지 않게 한다.
//
// WARN 으로 내는 이유 (FAIL 로 하지 않은 판단)
//   1. 0 건은 검사 대상 코드의 결함이 아니라 검사 설정의 결함이다. FAIL 로 만들면 지금 하는
//      작업과 무관한 정리가 모든 커밋을 막는다.
//   2. 더 중요한 이유 — FAIL 을 통과시키는 가장 싼 방법은 그 항목을 지우는 것이다. 그런데
//      지우는 게 맞는 경우는 세 가지 중 하나뿐이다. "이름이 바뀌어 못 맞추는" 경우에 지우면
//      결정이 영구히, 조용히 사라진다. 틀린 처방에 보상을 주는 게이트는 경고보다 나쁘다.
//   3. 0 이 정상인 실행이 있다. FIGMA_TOKEN 이 없으면 D1 이 SKIP 이라 D1 목록은 조회조차 안 된다.
//      그런 걸로 FAIL 이 나면 사람이 이 줄을 무시하게 되고, 그게 바로 지금 고치려는 실패 방식이다.
//   4. 저장소는 이미 "구조가 미심쩍지만 결과는 정상" 을 WARN 으로 쓴다(S3b·S5). 성격이 같다.
//
//   경고가 조용해지지 않도록 두 가지를 같이 한다 — 조회되지 않은 목록은 0 이 아니라 '판정 보류'로
//   따로 내고, 0 이 나온 항목마다 세 가지 원인을 함께 적어 지우는 게 기본 처방이 아님을 밝힌다.
export function unusedExceptionReport() {
  const { consulted, unused, unusedShared, notLooked } = exceptionUsage();
  const items = [];
  if (unused.length) {
    items.push('조치 대상 — 이 검사가 단독으로 쓰는 목록인데 한 번도 안 맞았다:');
    for (const u of unused) items.push(`  ${u.list}  ${u.key}`);
    items.push('');
    items.push('0 이 나오는 원인은 셋이다 — 어느 쪽인지는 사람이 판단한다.');
    items.push('  · 해결돼서 지울 것');
    items.push('  · 이름이 바뀌어 못 맞추는 것 (지우면 결정이 사라진다. 키를 고쳐야 한다)');
    items.push('  · 결정이 뒤집혔는데 안 지운 것 (안 지우면 회귀가 통과한다)');
  }
  if (unusedShared.length) {
    if (items.length) items.push('');
    items.push('판단 보류 — 다른 검사와 같이 쓰는 목록이라 이 실행만으로는 못 정한다:');
    for (const u of unusedShared) items.push(`  ${u.list}  ${u.key}`);
    items.push('  두 검사를 다 돌려(npm run check) 양쪽에서 0 이면 그때 죽은 것이다.');
  }
  if (notLooked.length) {
    if (items.length) items.push('');
    items.push('조회 안 됨 — 이번 실행에서 아무도 안 본 목록(다른 검사 소관):');
    for (const n of notLooked) items.push(`  ${n.list} (항목 ${n.entries}개)`);
  }
  const parts = [`조회 ${consulted.length}목록`];
  if (unusedShared.length) parts.push(`공유목록 보류 ${unusedShared.length}건`);
  if (notLooked.length) parts.push(`미조회 ${notLooked.length}목록`);
  // 행의 숫자는 "지금 판단할 수 있는 것" 만 센다 — 보류를 섞으면 숫자가 늘 0 이 아니라
  // 경고가 상시 켜지고, 그러면 아무도 안 읽는다.
  return { count: unused.length, note: parts.join(' · '), items };
}

export const ALWAYS_ALLOWED_PRIMITIVES = [
  'social/kakao',
  'social/naver',
  'social/apple',
  'effect/focus-ring',
];
defineList('ALWAYS_ALLOWED_PRIMITIVES', ALWAYS_ALLOWED_PRIMITIVES);

export function isAlwaysAllowedPrimitive(primitive) {
  consult('ALWAYS_ALLOWED_PRIMITIVES');
  const ok = ALWAYS_ALLOWED_PRIMITIVES.includes(primitive);
  if (ok) hit('ALWAYS_ALLOWED_PRIMITIVES', primitive);
  return ok;
}

// 파일명(basename)이 이 목록에 있으면 D1/S4 대상에서 제외한다 — 로고·소셜 버튼(브랜드 자산 전용 컴포넌트).
export const EXEMPT_COMPONENT_FILES = ['_logo.scss', '_social-button.scss'];
defineList('EXEMPT_COMPONENT_FILES', EXEMPT_COMPONENT_FILES);

export function isExemptFile(fileBasename) {
  consult('EXEMPT_COMPONENT_FILES');
  const ok = EXEMPT_COMPONENT_FILES.includes(fileBasename);
  if (ok) hit('EXEMPT_COMPONENT_FILES', fileBasename);
  return ok;
}

// S1과 동일한 인라인 예외 표기: 같은 줄에 이 주석이 있으면 그 줄의 직접 참조를 허용한다.
// 목록이 아니라 정규식이라 항목이 하나다 — 그래도 센다. 아무 줄에서도 안 쓰이면
// 그 표기 방식 자체가 죽은 것이고, 그건 알아야 한다.
export const EXEMPTION_COMMENT_RE = /\/\*\s*예외\s*:.*?\*\//;
defineList('EXEMPTION_COMMENT_RE', ['/* 예외: … */ 줄 표기']);

export function hasExemptionComment(lineText) {
  consult('EXEMPTION_COMMENT_RE');
  const ok = EXEMPTION_COMMENT_RE.test(lineText);
  if (ok) hit('EXEMPTION_COMMENT_RE', '/* 예외: … */ 줄 표기');
  return ok;
}

// D1 전용 — ADR-019. 특정 컴포넌트의 특정 자리에 한해서만 프리미티브 직접 참조를 허용한다.
// (component, primitive) 이름 쌍으로 좁힌다 — white 등을 전역으로 풀면 D1이 원래 잡으려던
// 회귀(체크박스·입력·페이지네이션·모달 배경이 white를 직접 물어 다크모드에서 흰 판이 된 사고,
// D1 '나온 배경')를 다시 놓친다. 같은 프리미티브라도 다른 컴포넌트에서 쓰면 여전히 FAIL이다.
// 2026-09-10 현재 항목이 없다. 기제는 남겨 둔다.
//   지웠던 항목: _Checkbox base × green/600 · green/700 · red/500 · red/600 (검증 테두리),
//   그리고 Avatar × white (Online 링). 앞의 넷은 Figma 가 choice/box/border-valid 계열
//   토큰을 만들면서, 뒤의 하나는 링이 surface/default 로 옮겨가면서 근거를 잃었다.
//   둘 다 D15 가 "한 번도 안 맞았다"로 잡아 준 것이다 — 안 지우면 그 자리가 다시 프리미티브로
//   돌아왔을 때 조용히 통과한다(SCSS.md 「결정을 뒤집을 때」).
export const D1_NODE_EXCEPTIONS = [];
const d1Key = (e) => `${e.component} × ${e.primitive}`;
defineList('D1_NODE_EXCEPTIONS', D1_NODE_EXCEPTIONS.map(d1Key));

export function isD1NodeExempt(component, primitive) {
  consult('D1_NODE_EXCEPTIONS');
  const found = D1_NODE_EXCEPTIONS.find((e) => e.component === component && e.primitive === primitive);
  if (found) hit('D1_NODE_EXCEPTIONS', d1Key(found));
  return Boolean(found);
}

// S2 전용 — ADR-015. Figma엔 있지만 코드에서 일부러 안 내보내는 토큰(누락으로 잡히면 안 된다).
// "컬렉션/이름" 문자열로 좁힌다 — 다른 토큰이 같은 이유로 빠지면 그때 항목을 추가한다.
export const S2_MISSING_EXEMPT = new Set([
  // ADR-033 으로 Figma 토큰 그룹이 button/* -> btn/* 으로 바뀌었다. 옛 이름으로 두면 매칭이 안 돼
  // 예외가 조용히 풀린다(2026-09-09 리네임 때 실제로 그 상태였다).
  'Shape/btn/radius-xs', // Button Size=xs 코드 제외(실사용 0건) — Figma 변형 자체는 유지
  'Shape/btn/padding-x/xs',
]);
defineList('S2_MISSING_EXEMPT', S2_MISSING_EXEMPT);

export function isS2MissingExempt(collection, name) {
  consult('S2_MISSING_EXEMPT');
  const key = `${collection}/${name}`;
  const ok = S2_MISSING_EXEMPT.has(key);
  if (ok) hit('S2_MISSING_EXEMPT', key);
  return ok;
}

// S2 전용 — ADR-026. 특정 모드에서만 코드가 Figma 를 따라가지 않는 것(누락이 아니라 불일치로 잡힌다).
// Wide 는 미디어쿼리를 만들지 않으므로 그 모드값을 조회하면 Desktop 값이 나온다. 모드까지 붙여
// 좁힌다 — 같은 토큰의 다른 모드는 여전히 대조 대상이다.
export const S2_MODE_EXEMPT = new Set([
  'Breakpoint/grid/margin/Wide', // container/width 와 뷰포트 폭에서 나오는 종속값. margin-inline:auto 가 만든다
  'Breakpoint/breakpoint/Wide', // 시안 프레임 폭 전용 — FIGMA.md 「모드와 프레임 폭은 다르다」
]);
defineList('S2_MODE_EXEMPT', S2_MODE_EXEMPT);

export function isS2ModeExempt(collection, name, mode) {
  consult('S2_MODE_EXEMPT');
  const key = `${collection}/${name}/${mode}`;
  const ok = S2_MODE_EXEMPT.has(key);
  if (ok) hit('S2_MODE_EXEMPT', key);
  return ok;
}

// S2 전용 — Figma 에 대응 토큰이 없는데 코드가 선언하는 커스텀 프로퍼티.
// 이름을 하나씩만 등록하고 범주(접두사·컴포넌트 단위)로 열지 않는다. ADR-019 가 white 를
// 전역으로 풀지 않고 (컴포넌트, 프리미티브) 쌍으로 좁힌 이유가 그대로 적용된다 —
// 범주로 열면 "Figma 에 없는 변수"가 조용히 늘어나도 S2 가 못 잡는다.
// 여기 있다는 것은 "지금 통과시킨다"는 뜻이고 "이대로 두기로 정했다"는 뜻이 아니다.
// 2026-09-10 현재 항목이 없다. 목록과 판정 함수는 남겨 둔다 — 다음에 같은 상황이 오면
// 이 자리에 이유와 함께 이름 하나를 올린다.
//   지웠던 항목: --bds-avatar-online-ring. "Figma 가 white 를 직접 바인드한다" 가 사유였는데,
//   링이 surface/default 로 옮겨가면서(Online 노드 15자리 전부) 그 사유가 거짓이 됐다.
//   코드도 중간 변수를 없애고 $surface-default 를 직접 쓰게 바꿨으므로 예외 자체가 필요 없다.
export const S2_CSS_ONLY_EXCEPTIONS = [];
defineList('S2_CSS_ONLY_EXCEPTIONS', S2_CSS_ONLY_EXCEPTIONS.map((e) => e.name));

export function isS2CssOnlyExempt(varName) {
  consult('S2_CSS_ONLY_EXCEPTIONS');
  const full = varName.startsWith('--') ? varName : '--' + varName;
  const found = S2_CSS_ONLY_EXCEPTIONS.find((e) => e.name === full);
  if (found) hit('S2_CSS_ONLY_EXCEPTIONS', found.name);
  return Boolean(found);
}
