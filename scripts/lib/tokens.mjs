// Figma 토큰 스냅샷(figma/tokens.*.json) 로드 + 별칭 해석 + 컴파일된 CSS 캐스케이드 파싱.
// check-tokens.mjs(S2)와 check-nodes.mjs(D1)가 공용으로 쓴다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const FIGMA_DIR = path.join(ROOT, 'figma');

const COLLECTION_FILES = {
  Primitive: 'tokens.primitive.json',
  Theme: 'tokens.theme.json',
  Shape: 'tokens.shape.json',
  Breakpoint: 'tokens.breakpoint.json',
};

export function figmaSnapshotExists() {
  return Object.values(COLLECTION_FILES).every((f) => fs.existsSync(path.join(FIGMA_DIR, f)));
}

export function loadFigmaCollections() {
  const collections = {};
  for (const [name, file] of Object.entries(COLLECTION_FILES)) {
    const full = path.join(FIGMA_DIR, file);
    const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
    const { _meta, _modes, ...data } = raw;
    collections[name] = { modes: _modes, meta: _meta, data };
  }
  return collections;
}

export function loadFigmaIds() {
  const full = path.join(FIGMA_DIR, 'tokens.ids.json');
  if (!fs.existsSync(full)) return null;
  const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
  const { _meta, ...byCollection } = raw;
  return byCollection; // { Primitive: {id: name}, Theme: {...}, ... }
}

// codeSyntax.WEB이 기계적 변환(슬래시→하이픈)과 실제로 다른, 의도된 리네임만 여기 올린다.
// 2026-08-30 use_figma로 553개 전수 대조해서 찾은 10건은 전부 Figma 쪽 문제였다 —
// text/danger(codeSyntax가 --text-error를 가리킴)·table/header-col/bg·fg(-col 누락)·
// con/white/* 6개(서로 뒤섞임)·effect/focus ring(변수명 자체에 공백). 전부 2026-08-31 Figma
// 세션에서 수정 완료돼 지금은 오버라이드가 필요 없다 — 기계적 변환과 codeSyntax가 다시 일치한다.
// 값은 접두사를 뗀 이름으로 적는다(cssVarName이 접두사를 붙인다).
const CODE_SYNTAX_OVERRIDES = {};

// ADR-033: 코드 쪽 CSS 변수에만 붙는 접두사다. Figma 변수 이름에는 붙지 않는다.
export const CSS_VAR_PREFIX = 'bds-';

// tokens/_theme.scss 가 담당하는 "일반 시맨틱" 그룹. 나머지 Theme 그룹은 컴포넌트 토큰이라
// 각 컴포넌트 파일이 선언한다. S2(미작성 컴포넌트 건너뛰기)와 generate-docs-tokens 가 같이 쓴다 —
// 두 곳에 각자 적어두면 한쪽만 고쳐져서 어긋난다.
export const THEME_GENERAL_PREFIXES = ['surface', 'text', 'border', 'icon', 'brand', 'accent'];

// Figma 쪽 이름(접두사 없음). 스냅샷 값에 들어 있는 별칭 문자열이 이 형태다 — 예: "var(--sky-25)".
// 스냅샷 내부를 해석할 때는 반드시 이걸 쓴다. cssVarName을 쓰면 키가 어긋나 별칭이 안 풀린다.
export function figmaVarName(tokenName) {
  return '--' + tokenName.replace(/\//g, '-');
}

// 코드 쪽 이름(접두사 있음). 컴파일된 CSS와 대조할 때 쓴다.
export function cssVarName(tokenName) {
  const base = CODE_SYNTAX_OVERRIDES[tokenName] ?? tokenName.replace(/\//g, '-');
  return '--' + CSS_VAR_PREFIX + base;
}

// figmaVarName(뒤에 -- 뗀 것) -> {collection, name} 역방향 맵. 스냅샷 안의 별칭(var(--x)) 해석에 쓴다.
// 접두사 붙은 이름으로 키를 만들면 안 된다 — 스냅샷 별칭은 Figma 이름을 그대로 담고 있다.
export function buildFigmaAliasMap(collections) {
  const map = new Map();
  for (const [colName, col] of Object.entries(collections)) {
    for (const name of Object.keys(col.data)) {
      map.set(figmaVarName(name).slice(2), { collection: colName, name });
    }
  }
  return map;
}

// Figma 스냅샷 값(별칭이면 var(--x) 문자열)을 재귀적으로 리터럴까지 해석한다.
// depth 6 초과(=프로젝트 규칙상 3단계 넘는 별칭 사슬은 이미 D8/네이밍 문제) 는 에러로 표시하고 멈춘다.
export function resolveFigmaValue(collections, aliasMap, collectionName, tokenName, modeName, depth = 0) {
  if (depth > 6) return { __error: 'alias-too-deep', collectionName, tokenName };
  const col = collections[collectionName];
  if (!col || !(tokenName in col.data)) return undefined;
  let raw = col.data[tokenName];
  if (col.modes.length > 1) raw = raw[modeName];
  if (typeof raw === 'string') {
    const m = raw.match(/^var\(--(.+)\)$/);
    if (m) {
      const target = aliasMap.get(m[1]);
      // 해석 불가. 조용히 raw("var(--x)" 문자열)를 돌려주면 값 비교가 전부 허위 불일치로 번진다 —
      // ADR-033 접두사 도입 때 이 맵을 접두사 붙은 이름으로 키잉하면 실제로 그렇게 됐다. 드러내고 멈춘다.
      if (!target) return { __error: 'alias-unresolved:--' + m[1], collectionName, tokenName };
      const targetModes = collections[target.collection].modes;
      const nextMode = targetModes.includes(modeName) ? modeName : targetModes[0];
      return resolveFigmaValue(collections, aliasMap, target.collection, target.name, nextMode, depth + 1);
    }
  }
  return raw;
}

// ── 컴파일된 CSS 캐스케이드 파싱 (S2 전용) ──────────────────────────────

function normSelector(sel) {
  return sel.trim().replace(/["']/g, '');
}

export function parseCascade(cssText) {
  const root = postcss.parse(cssText);
  const base = new Map();
  const dark = new Map();
  const shape = { square: new Map(), pill: new Map() };
  const media = [];

  function collectDecls(rule, into) {
    rule.walkDecls((decl) => {
      if (decl.prop.startsWith('--')) into.set(decl.prop.slice(2), decl.value.trim());
    });
  }

  root.walkAtRules('media', (atRule) => {
    const m = atRule.params.match(/min-width:\s*(\d+)px/);
    if (!m) return;
    const minWidth = Number(m[1]);
    const decls = new Map();
    atRule.walkRules((rule) => {
      if (normSelector(rule.selector) === ':root') collectDecls(rule, decls);
    });
    media.push({ minWidth, decls });
  });

  root.walkRules((rule) => {
    if (rule.parent && rule.parent.type === 'atrule') return; // media 안의 :root는 위에서 이미 처리
    const sel = normSelector(rule.selector);
    if (sel === ':root') collectDecls(rule, base);
    else if (sel === '[data-theme=dark]') collectDecls(rule, dark);
    else if (sel === '[data-shape=square]') collectDecls(rule, shape.square);
    else if (sel === '[data-shape=pill]') collectDecls(rule, shape.pill);
  });

  media.sort((a, b) => a.minWidth - b.minWidth);
  return { base, dark, shape, media };
}

// 모바일-퍼스트 캐스케이드: widthPx 이하의 min-width 미디어쿼리를 오름차순으로 적용한 최종값.
export function valueAtWidth(cascade, name, widthPx) {
  let v = cascade.base.get(name);
  for (const mq of cascade.media) {
    if (widthPx >= mq.minWidth && mq.decls.has(name)) v = mq.decls.get(name);
  }
  return v;
}

// 컴파일된 CSS 쪽 값도 var(--x) 사슬일 수 있다(예: --brand-500: var(--color-blue-500)).
// Figma 쪽은 이미 리터럴까지 해석하므로 CSS 쪽도 같은 깊이까지 풀어야 정당하게 비교된다.
export function resolveCascadeValue(getter, name, depth = 0) {
  if (depth > 6) return { __error: 'cascade-alias-too-deep', name };
  const v = getter(name);
  if (typeof v === 'string') {
    const m = v.match(/^var\(\s*--([a-z0-9-]+)\s*\)$/i);
    if (m) return resolveCascadeValue(getter, m[1], depth + 1);
  }
  return v;
}

export function normalizeForCompare(v) {
  if (v === undefined || v === null) return v;
  return String(v).trim().replace(/^['"]|['"]$/g, '').toLowerCase();
}

export function valuesEqual(a, b) {
  if (a === undefined || b === undefined) return false;
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (na === nb) return true;
  const numA = na.match(/^(-?\d+(?:\.\d+)?)(px|ms)?$/);
  const numB = nb.match(/^(-?\d+(?:\.\d+)?)(px|ms)?$/);
  if (numA && numB && Number(numA[1]) === Number(numB[1])) return true;
  return false;
}

export const BREAKPOINT_PX = { Wide: 1920, Desktop: 1440, Laptop: 1024, Tablet: 768, Mobile: 375 };
