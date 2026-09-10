#!/usr/bin/env node
// SCSS 검사 — scripts/README.md 의 S1~S8. 로컬 파일만 본다(Figma 스냅샷은 읽지만 REST/MCP 호출 없음).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

import { printReport, row } from './lib/report.mjs';
// 예외는 반드시 아래 판정 함수로 거친다 — 배열을 직접 .includes() 로 쓰면 사용량 계측을
// 우회해서 그 항목이 죽어도 S9 가 못 잡는다.
import {
  hasExemptionComment,
  isExemptFile,
  isAlwaysAllowedPrimitive,
  isS2MissingExempt,
  isS2ModeExempt,
  isS2CssOnlyExempt,
  unusedExceptionReport,
} from './lib/allowlist.mjs';
import {
  figmaSnapshotExists,
  loadFigmaCollections,
  buildFigmaAliasMap,
  resolveFigmaValue,
  cssVarName,
  parseCascade,
  valueAtWidth,
  resolveCascadeValue,
  valuesEqual,
  BREAKPOINT_PX,
  CSS_VAR_PREFIX,
  THEME_GENERAL_PREFIXES,
} from './lib/tokens.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCSS_ROOT = path.join(ROOT, 'scss');
const BOOTSTRAP = process.argv.includes('--bootstrap');

function walkScss(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkScss(full));
    else if (entry.name.endsWith('.scss')) out.push(full);
  }
  return out;
}

const ALL_SCSS_FILES = walkScss(SCSS_ROOT);
const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');

const rows = [];
const details = [];

function addDetail(id, title, items) {
  if (items.length) details.push({ id, title, items });
}

// ── S1. hex 하드코딩 ──────────────────────────────────────────────
{
  const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
  const stripLineComment = (line) => line.replace(/\/\/.*$/, ''); // 주석 안 예시 코드는 대상 아님
  const violations = [];
  for (const file of ALL_SCSS_FILES) {
    if (rel(file) === 'scss/tokens/_primitive.scss') continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((rawLine, i) => {
      if (hasExemptionComment(rawLine)) return;
      const line = stripLineComment(rawLine);
      const matches = line.match(HEX_RE);
      if (matches) violations.push({ file: rel(file), line: i + 1, text: rawLine.trim(), matches });
    });
  }
  const byFile = new Map();
  for (const v of violations) byFile.set(v.file, (byFile.get(v.file) || 0) + 1);
  const byFileSorted = [...byFile.entries()].sort((a, b) => b[1] - a[1]);
  rows.push(
    row('S1', 'hex 하드코딩', violations.length ? 'FAIL' : 'PASS', violations.length,
      violations[0] ? `예: ${violations[0].file}:${violations[0].line}` : '')
  );
  addDetail('S1', 'hex 하드코딩', violations.map((v) => `${v.file}:${v.line}  ${v.text}`));
  addDetail('S1-byfile', 'hex 하드코딩 — 파일별 건수', byFileSorted.map(([f, c]) => `${c}\t${f}`));
}

// ── S2. Figma ↔ CSS 토큰 대조 ─────────────────────────────────────
{
  if (!figmaSnapshotExists()) {
    rows.push(row('S2', 'Figma↔CSS 대조', BOOTSTRAP ? 'SKIP' : 'FAIL', null,
      'figma/tokens.*.json 없음 — check:tokens --bootstrap 으로만 건너뛸 수 있다'));
  } else {
    const collections = loadFigmaCollections();
    const aliasMap = buildFigmaAliasMap(collections);
    const compiled = sass.compile(path.join(SCSS_ROOT, 'main.scss'), { style: 'expanded' });
    const cascade = parseCascade(compiled.css);

    // 아직 안 만든 컴포넌트의 토큰은 누락으로 세지 않는다(ADR-033 세션 결정, 2026-09-09).
    // Theme의 컴포넌트 토큰은 각 컴포넌트 파일이 :root에 선언한다(SCSS.md 「클래스·변형 설계」 3번)
    // — 그래서 "그 그룹을 선언하는 컴포넌트 파일이 하나도 없다"가 곧 "그 컴포넌트가 없다"다.
    // 예외 목록을 만들지 않는 이유가 이것이다: 컴포넌트 파일이 그 그룹을 한 줄이라도 선언하는
    // 순간 대조가 저절로 켜진다. 대신 건너뛴 그룹은 아래에서 반드시 출력한다 — 조용히 사라지면
    // 다음 사람이 "왜 통과하는지" 알 수 없다.
    const componentGroupsDeclared = new Set();
    for (const file of ALL_SCSS_FILES) {
      if (!rel(file).startsWith('scss/components/')) continue;
      const text = fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .map((l) => l.replace(/\/\/.*$/, ''))
        .join('\n');
      for (const m of text.matchAll(/--([a-z0-9-]+)\s*:/gi)) {
        componentGroupsDeclared.add(m[1].toLowerCase().replace(new RegExp('^' + CSS_VAR_PREFIX), '').split('-')[0]);
      }
    }
    // 컴포넌트 파일이 아니라 tokens/_theme.scss 가 담당하는 일반 시맨틱 — 컴포넌트 존재 여부와 무관하다.
    const isComponentOwned = (colName, name) =>
      colName === 'Theme' && !THEME_GENERAL_PREFIXES.includes(name.split('/')[0]);

    const missing = [];
    const mismatch = [];
    const skippedGroups = new Map(); // 'Theme/accordion' -> 건너뛴 토큰 수

    function compiledValueFor(colName, mode, varName) {
      if (colName === 'Primitive') return cascade.base.get(varName);
      if (colName === 'Theme') {
        return mode === 'Dark' ? (cascade.dark.get(varName) ?? cascade.base.get(varName)) : cascade.base.get(varName);
      }
      if (colName === 'Shape') {
        if (mode === 'Rounded') return cascade.base.get(varName);
        const shapeKey = mode.toLowerCase();
        return cascade.shape[shapeKey]?.get(varName) ?? cascade.base.get(varName);
      }
      if (colName === 'Breakpoint') return valueAtWidth(cascade, varName, BREAKPOINT_PX[mode]);
      return undefined;
    }

    for (const [colName, col] of Object.entries(collections)) {
      for (const name of Object.keys(col.data)) {
        const varName = cssVarName(name).slice(2);
        for (const mode of col.modes) {
          if (isS2ModeExempt(colName, name, mode)) continue;
          const expected = resolveFigmaValue(collections, aliasMap, colName, name, mode);
          if (expected && typeof expected === 'object' && expected.__error) {
            mismatch.push({ colName, name, mode, expected: `[${expected.__error}]`, compiled: '-' });
            continue;
          }
          const rawCompiled = compiledValueFor(colName, mode, varName);
          if (rawCompiled === undefined) {
            if (isS2MissingExempt(colName, name)) continue;
            const group = name.split('/')[0];
            if (isComponentOwned(colName, name) && !componentGroupsDeclared.has(group)) {
              const key = `${colName}/${group}`;
              skippedGroups.set(key, (skippedGroups.get(key) || 0) + 1);
              continue;
            }
            missing.push({ colName, name, mode, cssVar: '--' + varName });
            continue;
          }
          // 컴파일된 값도 var(--x) 사슬일 수 있다 — 같은 모드 컨텍스트로 리터럴까지 더 풀어본다.
          const compiledVal = resolveCascadeValue((n) => compiledValueFor(colName, mode, n), varName);
          if (compiledVal && typeof compiledVal === 'object' && compiledVal.__error) {
            mismatch.push({ colName, name, mode, expected, compiled: `[${compiledVal.__error}]` });
          } else if (!valuesEqual(expected, compiledVal)) {
            mismatch.push({ colName, name, mode, expected, compiled: compiledVal });
          }
        }
      }
    }

    // CSS에만 있음: 컴파일 결과에 선언됐지만 Figma 토큰 어디에도 없는 커스텀 프로퍼티.
    const knownVarNames = new Set(
      Object.values(collections).flatMap((col) => Object.keys(col.data).map((n) => cssVarName(n).slice(2)))
    );
    const declaredAnywhere = new Set([
      ...cascade.base.keys(),
      ...cascade.dark.keys(),
      ...cascade.shape.square.keys(),
      ...cascade.shape.pill.keys(),
      ...cascade.media.flatMap((m) => [...m.decls.keys()]),
    ]);
    // Figma 에 대응 토큰이 없는데 코드가 선언하는 것 중, 이름을 하나씩 등록해둔 것은 뺀다.
    const onlyInCss = [...declaredAnywhere].filter((n) => !knownVarNames.has(n) && !isS2CssOnlyExempt(n));

    const total = missing.length + mismatch.length + onlyInCss.length;
    const skippedTotal = [...skippedGroups.values()].reduce((a, b) => a + b, 0);
    const skipNote = skippedGroups.size ? `·미작성컴포넌트 건너뜀 ${skippedGroups.size}종(${skippedTotal})` : '';
    rows.push(row('S2', 'Figma↔CSS 대조', total ? 'FAIL' : 'PASS', total,
      `누락 ${missing.length}·CSS전용 ${onlyInCss.length}·불일치 ${mismatch.length}${skipNote}`));
    addDetail('S2-missing', 'Figma 에만 있음(CSS 누락)', missing.map((m) => `${m.colName}/${m.name} [${m.mode}] → ${m.cssVar} 없음`));
    addDetail('S2-onlyincss', `CSS 에만 있음(Figma ${knownVarNames.size}개 토큰에 없음)`, onlyInCss.sort().map((n) => '--' + n));
    addDetail('S2-mismatch', '값 불일치', mismatch.map((m) => `${m.colName}/${m.name} [${m.mode}] Figma=${JSON.stringify(m.expected)} CSS=${JSON.stringify(m.compiled)}`));
    addDetail('S2-skipped', '컴포넌트 미작성으로 대조 건너뜀(그 그룹을 선언하는 scss/components/ 파일이 없다)',
      [...skippedGroups].sort().map(([g, c]) => `${g}/* — ${c}건`));
  }
}

// ── S3. 미정의 변수 + 파일 간 암묵 의존 ────────────────────────────
{
  const declared = new Set(); // 전역 존재 여부(미정의 판정용)
  const declaredIn = new Map(); // name -> Set<file>  (소유권 판정용)
  const used = []; // {file, line, name}
  const DECL_RE = /--([a-z0-9-]+)\s*:/gi;
  // 캡처 그룹 2 = 폴백(,...) 유무. 폴백이 있으면 "런타임/인라인 style로 외부에서 채워질 수 있음"을
  // 스스로 표시한 것이라 미정의를 허용한다(예: progress-bar의 var(--progress-bar-value, 0%)).
  const USE_RE = /var\(\s*(--[a-z0-9-]+)\s*(,[^)]*)?\)/gi;
  const stripLineComment = (line) => line.replace(/\/\/.*$/, '');
  // 어디서 선언하든 "전역 토큰층"으로 취급하는 파일 — 모든 컴포넌트가 암묵적으로 의존해도 된다.
  const CANONICAL_FILES = new Set([
    'scss/tokens/_primitive.scss',
    'scss/tokens/_theme.scss',
    'scss/tokens/_shape.scss',
    'scss/tokens/_breakpoint.scss',
  ]);
  for (const file of ALL_SCSS_FILES) {
    const r = rel(file);
    const text = fs.readFileSync(file, 'utf8').split('\n').map(stripLineComment).join('\n');
    let m;
    while ((m = DECL_RE.exec(text))) {
      const name = m[1].toLowerCase();
      declared.add(name);
      if (!declaredIn.has(name)) declaredIn.set(name, new Set());
      declaredIn.get(name).add(r);
    }
  }
  for (const file of ALL_SCSS_FILES) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((rawLine, i) => {
      const line = stripLineComment(rawLine);
      if (line.includes('#{')) return; // 동적 보간 이름은 정적으로 검증 불가 — 건너뜀
      let m;
      const re = new RegExp(USE_RE.source, 'gi');
      while ((m = re.exec(line))) {
        if (m[2]) continue; // 폴백이 있는 var() — 외부에서 채워질 수 있어 미정의 허용
        used.push({ file: rel(file), line: i + 1, name: m[1] });
      }
    });
  }
  const undefinedUses = used.filter((u) => !declared.has(u.name.slice(2).toLowerCase()));
  rows.push(row('S3', '미정의 변수', undefinedUses.length ? 'FAIL' : 'PASS', undefinedUses.length,
    undefinedUses[0] ? `예: ${undefinedUses[0].file}:${undefinedUses[0].line} ${undefinedUses[0].name}` : ''));
  addDetail('S3', '미정의 변수', undefinedUses.map((u) => `${u.file}:${u.line}  ${u.name}`));

  // 선언은 있지만(S3는 통과) 이 파일 자신도, 전역 토큰층(tokens/*)도 아닌 "다른 컴포넌트 파일"만
  // 선언한 변수를 참조하는 경우 — dropdown.scss가 --field-bg를 선언 없이 참조하다가 select.scss가
  // 먼저 선언해서 우연히 동작했던 패턴(2026-08-31). 컴파일 결과는 문제없지만(:root는 파일 순서와
  // 무관하게 전역 병합) 소유권이 불분명해 나중에 선언 쪽을 지우면 조용히 깨진다 — 실패 아니라 경고.
  const crossFile = [];
  const seenPair = new Set();
  for (const u of used) {
    if (u.file.startsWith('scss/tokens/')) continue; // 토큰층 자기 자신은 대상 아님
    const name = u.name.slice(2).toLowerCase();
    const owners = declaredIn.get(name);
    if (!owners) continue; // 미정의는 위 S3가 이미 처리
    if (owners.has(u.file)) continue; // 자기 파일이 선언
    const hasCanonicalOwner = [...owners].some((f) => CANONICAL_FILES.has(f));
    if (hasCanonicalOwner) continue; // 전역 토큰층 소유 — 정상
    const key = `${u.file} ${name}`;
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    crossFile.push({ file: u.file, line: u.line, name: u.name, owners: [...owners].sort() });
  }
  rows.push(row('S3b', '파일 간 암묵 의존', 'WARN', crossFile.length,
    crossFile[0] ? `예: ${crossFile[0].file} → ${crossFile[0].name}(${crossFile[0].owners.join(',')})` : ''));
  addDetail('S3b', '파일 간 암묵 의존(선언 없이 참조 — 다른 컴포넌트 파일이 선언)',
    crossFile.map((c) => `${c.file}:${c.line}  ${c.name}  ← ${c.owners.join(', ')}`));
}

// ── S4. 컴포넌트의 색 프리미티브 직접 참조 ─────────────────────────
// 근거: SCSS.md 「클래스·변형 설계」 규칙 3 — 색은 파일 맨 위 :root/[data-theme='dark'] 에서만
// 프리미티브로 받는다. 여백·반경 같은 치수 프리미티브는 선택자에서 직접 써도 된다.
//
// 왜 다시 썼나
//   원래 찾던 이름은 $color-* 였다. ADR-018 이 그 접두사를 없앤 뒤로 저장소에 그 모양이
//   한 건도 없어서, 이 검사는 계속 빈손으로 PASS 를 냈다. 아무것도 안 보면서 통과를 내는
//   검사는 없는 것보다 나쁘다.
//
// 무엇을 색으로 보나
//   스냅샷 Primitive 에서 값이 hex 인 것. check-nodes.mjs 의 isColorPrimitive 와 같은
//   기준이다 — 색의 정의를 두 곳에 두지 않는다. 치수·굵기·시간 토큰은 값이 hex 가 아니라
//   자동으로 빠진다(따로 이름 목록을 만들지 않는 이유다).
//
// 어디까지 보나
//   scss/components/ 만 본다. 규칙 3 이 컴포넌트 설계 규칙이고, 범위를 넓히면 tokens 층·
//   base 층까지 끌려 들어온다.
//   :root/[data-theme='dark'] 블록 안은 규칙이 허용하는 자리라 뺀다. 그 밖은 전부 대상이다 —
//   선택자뿐 아니라 $맵 선언도 포함한다. 맵 값이 그대로 선택자로 흘러가므로 구조가 같다.
{
  const COMPONENTS_DIR = path.join(SCSS_ROOT, 'components');
  const componentFiles = fs.existsSync(COMPONENTS_DIR) ? walkScss(COMPONENTS_DIR) : [];

  // 색 프리미티브 이름 -> 참조 형태 두 가지($별칭, var())
  const colorByScssVar = new Map();
  const colorByCssVar = new Map();
  if (figmaSnapshotExists()) {
    const prim = loadFigmaCollections().Primitive.data;
    for (const [name, v] of Object.entries(prim)) {
      if (typeof v !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(v)) continue;
      colorByScssVar.set(name.replace(/\//g, '-'), name);
      colorByCssVar.set(cssVarName(name).toLowerCase(), name);
    }
  }

  // 주석을 지운다. 줄 주석을 먼저 지워야 한다 — "// … button/* …" 처럼 줄 주석 안에 든 /* 를
  // 블록주석 시작으로 잡으면 그 뒤 :root 블록까지 통째로 주석으로 먹힌다(_button.scss 가 그렇다).
  const blankComments = (text) =>
    text
      .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

  // 규칙이 색 프리미티브를 허용하는 자리 = 최상위 :root · [data-theme='dark'] 블록.
  // 중괄호 균형만 세는 경량 스캐너 — S5/S6 와 같은 방식이다.
  function allowedRanges(text) {
    const ranges = [];
    const re = /^(:root|\[data-theme=['"]dark['"]\])\s*\{/gm;
    let m;
    while ((m = re.exec(text))) {
      let i = re.lastIndex;
      let depth = 1;
      while (i < text.length && depth > 0) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') depth--;
        i++;
      }
      ranges.push([m.index, i]);
    }
    return ranges;
  }

  const violations = [];
  for (const file of componentFiles) {
    if (isExemptFile(path.basename(file))) continue;
    const raw = fs.readFileSync(file, 'utf8');
    const text = blankComments(raw);
    const ranges = allowedRanges(text);
    const rawLines = raw.split('\n');

    const hit = (pos, form, primitive) => {
      if (ranges.some(([a, b]) => pos >= a && pos < b)) return; // 규칙이 허용하는 자리
      if (isAlwaysAllowedPrimitive(primitive)) return;
      const lineNo = raw.slice(0, pos).split('\n').length;
      const lineText = rawLines[lineNo - 1] || '';
      if (hasExemptionComment(lineText)) return; // S1 과 같은 줄 단위 예외 표기
      violations.push({ file: rel(file), line: lineNo, form, primitive, text: lineText.trim() });
    };

    for (const m of text.matchAll(/\$([a-zA-Z][a-zA-Z0-9-]*)/g)) {
      const p = colorByScssVar.get(m[1].toLowerCase());
      if (p) hit(m.index, '$' + m[1], p);
    }
    for (const m of text.matchAll(/var\(\s*(--bds-[a-zA-Z0-9-]+)/g)) {
      const p = colorByCssVar.get(m[1].toLowerCase());
      if (p) hit(m.index, 'var(' + m[1] + ')', p);
    }
  }

  violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  const status = colorByScssVar.size ? (violations.length ? 'FAIL' : 'PASS') : 'SKIP';
  rows.push(row('S4', '컴포넌트 색 프리미티브 직접 참조', status, violations.length,
    colorByScssVar.size
      ? (violations[0] ? `예: ${violations[0].file}:${violations[0].line} ${violations[0].form}` : `색 프리미티브 ${colorByScssVar.size}개 기준`)
      : 'figma/tokens.*.json 없음 — 색 프리미티브 목록을 만들 수 없다'));
  addDetail('S4', '컴포넌트 색 프리미티브 직접 참조(:root·[data-theme] 밖)',
    violations.map((v) => `${v.file}:${v.line}  ${v.form} -> ${v.primitive}\n        ${v.text.slice(0, 100)}`));
}

// ── S5. 중복 오버라이드 ───────────────────────────────────────────
{
  const warnings = [];
  for (const file of ALL_SCSS_FILES) {
    const text = fs.readFileSync(file, 'utf8');
    const blocks = extractTopLevelBlocks(text);
    const base = blocks.get(':root');
    if (!base) continue;
    for (const [sel, body] of blocks) {
      if (sel === ':root') continue;
      for (const [name, value] of body) {
        if (base.has(name) && base.get(name).trim() === value.trim()) {
          warnings.push({ file: rel(file), selector: sel, name, value: value.trim() });
        }
      }
    }
  }
  rows.push(row('S5', '중복 오버라이드', 'WARN', warnings.length,
    warnings[0] ? `예: ${warnings[0].file} ${warnings[0].selector} --${warnings[0].name}` : ''));
  addDetail('S5', '중복 오버라이드', warnings.map((w) => `${w.file}  ${w.selector}  --${w.name}: ${w.value}`));
}

// 파일 소스에서 ':root { ... }' 류의 top-level 블록(중첩 없는 것만)을 이름→(prop→value) 로 추출.
// 정확한 SCSS 파서가 아니라 중괄호 균형만 세는 경량 스캐너 — S5 목적(같은 파일 안의 :root/[data-*] 오버라이드 비교)에는 충분하다.
function extractTopLevelBlocks(text) {
  const blocks = new Map();
  const re = /^(:root|\[data-theme=['"]dark['"]\]|\[data-shape=['"](?:square|pill)['"]\])\s*\{/gm;
  let m;
  while ((m = re.exec(text))) {
    const start = re.lastIndex;
    let depth = 1;
    let i = start;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    const body = text.slice(start, i - 1);
    const props = new Map();
    const declRe = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;
    let d;
    while ((d = declRe.exec(body))) props.set(d[1].toLowerCase(), d[2]);
    blocks.set(m[1].replace(/['"]/g, ''), props);
  }
  return blocks;
}

// ── S6. 중첩 깊이 — 직접 구현(ADR-020: stylelint 미도입, SCSS 소스를 직접 스캔한다) ──
// 정확한 SCSS 파서가 아니라 중괄호 균형만 세는 경량 스캐너다(S5의 extractTopLevelBlocks와
// 같은 방식 — 이 프로젝트 규모에는 충분하다). 전역 「중첩은 3단계 이하」 규칙대로 의사 클래스·의사 요소·
// 속성 셀렉터(&:hover, &::after, &[aria-disabled='true'])만 깊이에서 제외하고, 요소(&__x)·
// 수식어(&-x, &--x) 중첩은 전부 센다 — "금지" 예시(.board{&__list{&-item{&--active{}}}})가
// 4단계로 걸리는 것과 같은 기준.
{
  const MAX_DEPTH = 3;
  const nestingWarnings = [];

  function looksLikeSelectorStart(t) {
    if (!t || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return false;
    if (t.startsWith('@')) return false; // @media·@each·@include·@if 등 — 구조상 깊이에 안 넣는다
    if (/^\$[\w-]+\s*:/.test(t)) return false; // SCSS 변수 선언
    if (/^--[\w-]+\s*:/.test(t)) return false; // 커스텀 프로퍼티 선언
    if (/^[a-z-]+\s*:/i.test(t) && !t.includes('{')) return false; // 일반 프로퍼티 선언
    return /^[.&%\[]|^[a-zA-Z]/.test(t);
  }

  function isPseudoOnlyGroup(text) {
    const parts = text.replace(/\{$/, '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return false;
    return parts.every((p) => {
      if (!p.startsWith('&')) return false;
      const restPart = p.slice(1);
      return restPart.length > 0 && /^(:{1,2}[a-zA-Z-]+(\([^)]*\))?|\[[^\]]*\])+$/.test(restPart);
    });
  }

  function applyOpen(file, lineNo, text, stack, depthRef) {
    const bumps = !isPseudoOnlyGroup(text);
    if (bumps) {
      depthRef.value++;
      if (depthRef.value > MAX_DEPTH) {
        nestingWarnings.push({ file, line: lineNo, text: text.replace(/\s+/g, ' ').slice(0, 100) });
      }
    }
    stack.push(bumps);
  }

  for (const file of ALL_SCSS_FILES) {
    const lines = fs.readFileSync(file, 'utf8').split('\n').map((l) => l.replace(/\/\/.*$/, ''));
    const depthRef = { value: 0 };
    const stack = [];
    let pending = null; // 콤마로 이어지는 다중 셀렉터 누적: {text, startLine}

    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) continue;

      if (pending) {
        pending.text += ' ' + t;
        if (t.endsWith(',')) continue;
        if (t.endsWith('{')) {
          applyOpen(rel(file), pending.startLine, pending.text, stack, depthRef);
        } else {
          stack.push(false); // 셀렉터로 확정 못 지음 — 안전하게 깊이에 안 넣는다
        }
        pending = null;
      } else if (looksLikeSelectorStart(t) && t.endsWith(',')) {
        pending = { text: t, startLine: i + 1 };
        continue;
      } else if (looksLikeSelectorStart(t) && t.endsWith('{')) {
        applyOpen(rel(file), i + 1, t, stack, depthRef);
      } else {
        const opens = (t.match(/\{/g) || []).length;
        for (let k = 0; k < opens; k++) stack.push(false);
      }

      const closes = (t.match(/\}/g) || []).length;
      for (let k = 0; k < closes; k++) {
        if (stack.pop()) depthRef.value--;
      }
    }
  }

  rows.push(row('S6', '중첩 깊이', nestingWarnings.length ? 'FAIL' : 'PASS', nestingWarnings.length,
    nestingWarnings[0] ? `예: ${nestingWarnings[0].file}:${nestingWarnings[0].line}` : ''));
  addDetail('S6', '중첩 깊이', nestingWarnings.map((w) => `${w.file}:${w.line}  ${w.text}`));
}

// ── S7. BEM 요소 체이닝 · ID 셀렉터 — 컴파일된 CSS 기준(postcss로 파싱) ──────────
{
  const chainWarnings = [];
  const idWarnings = [];
  // 요소 체이닝(.block__el1__el2)은 컴파일된 CSS의 실제 셀렉터를 봐야 한다(소스는 &__ 중첩이라
  // 체이닝 여부가 컴파일 전엔 안 보인다). ID 셀렉터도 같은 파싱 결과를 재사용한다.
  const compiled = sass.compile(path.join(SCSS_ROOT, 'main.scss'), { style: 'expanded' });
  const postcssMod = (await import('postcss')).default;
  const root = postcssMod.parse(compiled.css);
  const seenClasses = new Set();
  const seenSelectors = new Set();
  root.walkRules((rule) => {
    for (const sel of rule.selector.split(',')) {
      const trimmedSel = sel.trim();

      const classes = trimmedSel.match(/\.[a-zA-Z0-9_-]+/g) || [];
      for (const c of classes) {
        const name = c.slice(1);
        if (seenClasses.has(name)) continue;
        seenClasses.add(name);
        const elementSeparators = (name.match(/__/g) || []).length;
        if (elementSeparators >= 2) chainWarnings.push({ selector: name });
      }

      if (/#[a-zA-Z][\w-]*/.test(trimmedSel) && !seenSelectors.has(trimmedSel)) {
        seenSelectors.add(trimmedSel);
        idWarnings.push({ selector: trimmedSel });
      }
    }
  });
  rows.push(row('S7a', 'BEM 요소 체이닝', chainWarnings.length ? 'FAIL' : 'PASS', chainWarnings.length,
    chainWarnings[0] ? `예: .${chainWarnings[0].selector}` : ''));
  addDetail('S7a', 'BEM 요소 체이닝', chainWarnings.map((w) => `.${w.selector}`));
  rows.push(row('S7b', 'ID 셀렉터', idWarnings.length ? 'FAIL' : 'PASS', idWarnings.length,
    idWarnings[0] ? `예: ${idWarnings[0].selector}` : ''));
  addDetail('S7b', 'ID 셀렉터', idWarnings.map((w) => w.selector));
}

// ── S8. 문서 내 수치 하드코딩 ─────────────────────────────────────
// 근거: ADR-013. 현재 상태를 서술하는 문서만 본다.
//  - DECISIONS.md 는 날짜가 붙은 과거 기록이라 그 시점의 실측값을 담는 게 정상이다
//  - scripts/README.md 는 검사 패턴·임계값 자체가 내용이다
//  - 코드 블록(``` 펜스 · 4칸 이상 들여쓰기)은 예시 코드라 대상이 아니다
{
  const SCANNED = ['CLAUDE.md', 'FIGMA.md', 'SCSS.md', 'STATUS.md'];
  const NUM_RE = /\d+\s*(?:px|rem)\b|\d{2,}\s*(?:개|건|줄|번)/g;
  // 한 자리 개수("4개 파일")는 구조 설명이라 통과시킨다. 낡는 것은 실측 개수다.
  const violations = [];
  for (const name of SCANNED) {
    const full = path.join(ROOT, name);
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, 'utf8').split('\n');
    let inFence = false;
    lines.forEach((rawLine, i) => {
      if (/^\s*```/.test(rawLine)) { inFence = !inFence; return; }
      if (inFence) return;
      if (/^ {4,}|^\t/.test(rawLine)) return;            // 들여쓴 코드 블록
      if (/<!--\s*예외:/.test(rawLine)) return;           // 줄 단위 예외
      const matches = rawLine.match(NUM_RE);
      if (matches) violations.push({ file: name, line: i + 1, text: rawLine.trim(), matches });
    });
  }
  rows.push(row('S8', '문서 내 수치', violations.length ? 'FAIL' : 'PASS', violations.length,
    violations[0] ? `예: ${violations[0].file}:${violations[0].line}` : ''));
  addDetail('S8', '문서 내 수치', violations.map((v) => `${v.file}:${v.line}  ${v.matches.join(' ')}  ${v.text.slice(0, 80)}`));
}

// ── S9. 쓰이지 않는 예외 ──────────────────────────────────────────
// 예외 목록의 항목마다 이번 실행에서 몇 번 맞았는지 세고, 0 인 것을 낸다.
// 근거와 WARN 으로 낸 판단은 lib/allowlist.mjs 「예외 사용량 계측」에 있다.
// 이 검사는 반드시 다른 검사들이 다 끝난 뒤에 와야 한다 — 그전에는 적중 수가 덜 세어졌다.
{
  const ex = unusedExceptionReport();
  rows.push(row('S9', '쓰이지 않는 예외', 'WARN', ex.count, ex.note));
  addDetail('S9', '쓰이지 않는 예외 — 이번 실행에서 한 번도 맞지 않은 항목', ex.items);
  if (ex.ciWarning && process.env.GITHUB_ACTIONS) console.log(ex.ciWarning);
}
// ── 출력 ──────────────────────────────────────────────────────────
const hasFail = printReport('check-tokens.mjs — SCSS 검사', rows);
for (const d of details) {
  const cap = d.id.endsWith('-byfile') ? Infinity : 30;
  console.log(`\n-- ${d.id} ${d.title} (${d.items.length}건) --`);
  for (const item of d.items.slice(0, cap)) console.log('  ' + item);
  if (d.items.length > cap) console.log(`  ... 외 ${d.items.length - cap}건 (전체 개수는 위 표 참조)`);
}

process.exit(hasFail ? 1 : 0);
