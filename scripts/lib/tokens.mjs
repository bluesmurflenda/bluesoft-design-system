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
const CODE_SYNTAX_OVERRIDES = {};

export function cssVarName(tokenName) {
  if (CODE_SYNTAX_OVERRIDES[tokenName]) return '--' + CODE_SYNTAX_OVERRIDES[tokenName];
  return '--' + tokenName.replace(/\//g, '-');
}

// cssVarName(뒤에 -- 뗀 것) -> {collection, name} 역방향 맵. 별칭(var(--x)) 해석에 쓴다.
export function buildReverseCssVarMap(collections) {
  const map = new Map();
  for (const [colName, col] of Object.entries(collections)) {
    for (const name of Object.keys(col.data)) {
      map.set(cssVarName(name).slice(2), { collection: colName, name });
    }
  }
  return map;
}

// Figma 스냅샷 값(별칭이면 var(--x) 문자열)을 재귀적으로 리터럴까지 해석한다.
// depth 6 초과(=프로젝트 규칙상 3단계 넘는 별칭 사슬은 이미 D8/네이밍 문제) 는 에러로 표시하고 멈춘다.
export function resolveFigmaValue(collections, reverseMap, collectionName, tokenName, modeName, depth = 0) {
  if (depth > 6) return { __error: 'alias-too-deep', collectionName, tokenName };
  const col = collections[collectionName];
  if (!col || !(tokenName in col.data)) return undefined;
  let raw = col.data[tokenName];
  if (col.modes.length > 1) raw = raw[modeName];
  if (typeof raw === 'string') {
    const m = raw.match(/^var\(--(.+)\)$/);
    if (m) {
      const target = reverseMap.get(m[1]);
      if (!target) return raw; // 해석 불가 — 그대로 반환(발생하면 안 됨, 스냅샷이 전부 내부 일관되어야 함)
      const targetModes = collections[target.collection].modes;
      const nextMode = targetModes.includes(modeName) ? modeName : targetModes[0];
      return resolveFigmaValue(collections, reverseMap, target.collection, target.name, nextMode, depth + 1);
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
