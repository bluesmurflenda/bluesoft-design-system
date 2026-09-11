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

// ── 컴파일된 CSS 캐스케이드 파싱 (S2 전용) ──────────────────────────────

function normSelector(sel) {
  return sel.trim().replace(/["']/g, '');
}
