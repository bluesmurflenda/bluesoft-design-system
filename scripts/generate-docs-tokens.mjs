#!/usr/bin/env node
// docs/tokens/colors.html의 색상 목록을 figma/tokens.primitive.json · tokens.theme.json에서
// 생성한다. 손으로 색 패밀리·스텝을 적으면 Figma가 램프를 추가/삭제할 때마다 낡는다
// (실제로 slate 램프 삭제(ADR-001) 후에도 한참 안 지워져 있었다) — 매 build마다(postbuild)
// 다시 뽑아서 항상 현재 스냅샷과 일치하게 한다.
//
// 대상은 두 가지뿐이다: Primitive 전체(색 램프 + social 브랜드색 + white/black/effect-focus-ring
// 같은 단독 hex 값), Theme의 "일반 시맨틱" 44개(accent·brand·border·surface·text·icon —
// tokens/_theme.scss가 담당하는 범위와 동일).
// 나머지 246개 컴포넌트별 Theme 토큰(button/chip/tabs 등)은 각 컴포넌트 문서 페이지 소관이라
// 여기서 다루지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 이름 변환은 lib/tokens.mjs 한 곳에서만 만든다(ADR-033 접두사). 여기서 또 문자열을 조립하면
// 접두사 규칙이 두 군데로 갈린다.
import { cssVarName, figmaVarName, CSS_VAR_PREFIX, THEME_GENERAL_PREFIXES } from './lib/tokens.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadCollection(relPath) {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
  const { _meta, _modes, ...data } = raw;
  return data;
}

const primitive = loadCollection('figma/tokens.primitive.json');
const theme = loadCollection('figma/tokens.theme.json');

// ── Primitive: 색 램프(family/step = hex) + social(브랜드색) + 그 외 단독 hex 값 자동 발견 ──
// "그 외"는 이름을 나열하지 않는다 — white/black처럼 지금 있는 것만 하드코딩하면 나중에
// 새 단독 hex 프리미티브(예: 새 effect 토큰)가 추가돼도 조용히 안 나온다. 램프·social
// 패턴에 안 맞는 hex 값은 전부 여기로 떨어지게 해서 자동으로 잡히게 한다.
const ramps = new Map(); // family -> [{step, hex}]
const social = [];
const others = []; // 램프도 social도 아닌 단독 hex 값 (white, black, effect/focus-ring 등)
for (const [key, value] of Object.entries(primitive)) {
  if (typeof value !== 'string' || !value.startsWith('#')) continue;
  const parts = key.split('/');
  if (parts.length === 2 && /^\d+$/.test(parts[1])) {
    const family = parts[0];
    if (!ramps.has(family)) ramps.set(family, []);
    ramps.get(family).push({ step: Number(parts[1]), hex: value });
  } else if (parts[0] === 'social' && parts.length === 2) {
    social.push({ name: parts[1], hex: value });
  } else {
    others.push({ name: cssVarName(key).slice(2), hex: value });
  }
}
for (const steps of ramps.values()) steps.sort((a, b) => a.step - b.step);
const familyNames = [...ramps.keys()].sort();
others.sort((a, b) => a.name.localeCompare(b.name));

// ── Theme: cssVarName -> {Default, Dark} 역방향 맵(별칭 체인 해석용) ────────────────
// 스냅샷 값에 든 별칭은 "var(--sky-25)"처럼 접두사가 없는 Figma 이름이다 — 여기에 접두사를
// 붙이면 키가 어긋나 별칭이 하나도 안 풀리고 전부 #000000으로 떨어진다.
const themeByFigmaName = new Map();
for (const [key, value] of Object.entries(theme)) {
  themeByFigmaName.set(figmaVarName(key).slice(2), value);
}

// var(--x) 문자열을 리터럴 hex까지 재귀 해석한다. Theme 토큰끼리도 서로 별칭할 수 있어서
// (예: icon/brand -> brand-600 -> blue-600) Primitive에서 못 찾으면 Theme도 뒤진다.
function resolveHex(value, mode, seen = new Set()) {
  if (typeof value !== 'string') return '#000000';
  if (value.startsWith('#')) return value;
  const m = /^var\(--(.+)\)$/.exec(value);
  if (!m) return '#000000';
  const cssName = m[1];
  const seenKey = cssName + '|' + mode;
  if (seen.has(seenKey)) return '#000000';
  seen.add(seenKey);

  const segs = cssName.split('-');
  const candidates = [cssName];
  if (segs.length >= 2 && /^\d+$/.test(segs[segs.length - 1])) {
    candidates.push(segs.slice(0, -1).join('-') + '/' + segs[segs.length - 1]);
  }
  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(primitive, key)) {
      const v = primitive[key];
      return typeof v === 'string' && v.startsWith('#') ? v : resolveHex(v, mode, seen);
    }
  }
  if (themeByFigmaName.has(cssName)) {
    const entry = themeByFigmaName.get(cssName);
    return resolveHex(entry[mode] ?? entry.Default, mode, seen);
  }
  return '#000000';
}

// var(--x) -> 'x' (사람이 읽는 별칭 이름, 한 단계만 — 완전히 풀지 않는다. "surface/default -> white"처럼
// 바로 다음 대상만 보여줘야 "왜 이 색인지" 설명이 된다. 다 풀어버리면 전부 primitive 색 이름으로 수렴돼 의미가 없다).
function aliasLabel(value) {
  const m = /^var\(--(.+)\)$/.exec(value);
  // 스냅샷은 Figma 이름을 담고 있지만, 문서는 코드에 쓰는 이름을 보여줘야 복사해 쓸 수 있다.
  return m ? CSS_VAR_PREFIX + m[1] : value;
}

function familyLabel(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function primitiveSwatch(label, hex) {
  return `      <div class="doc-swatch">
        <div class="doc-swatch__chip" style="background-color:${hex};"></div>
        <div class="doc-swatch__label">${label}</div>
      </div>`;
}

function themeSwatch(name, entry) {
  const defaultHex = resolveHex(entry.Default, 'Default');
  const darkHex = resolveHex(entry.Dark, 'Dark');
  const defaultLabel = aliasLabel(entry.Default);
  const darkLabel = aliasLabel(entry.Dark);
  const aliasText = defaultLabel === darkLabel ? defaultLabel : `${defaultLabel} | ${darkLabel}`;
  return `      <div class="doc-swatch">
        <div style="display:flex;gap:4px;">
          <div class="doc-swatch__chip" style="flex:1;background-color:${defaultHex};" title="Default"></div>
          <div class="doc-swatch__chip" style="flex:1;background-color:${darkHex};" title="Dark"></div>
        </div>
        <div class="doc-swatch__label">${name}</div>
        <div class="doc-swatch__label" style="opacity:.6;">${aliasText}</div>
      </div>`;
}

// ── Primitive 섹션 HTML ────────────────────────────────────────────────────────
const primitiveHtml = [];
for (const family of familyNames) {
  primitiveHtml.push(`    <div class="doc-subhead">${familyLabel(family)}</div>`);
  primitiveHtml.push('    <div class="doc-grid">');
  for (const { step, hex } of ramps.get(family)) {
    primitiveHtml.push(primitiveSwatch(cssVarName(`${family}/${step}`).slice(2), hex));
  }
  primitiveHtml.push('    </div>');
}
if (others.length) {
  primitiveHtml.push('    <div class="doc-subhead">Base</div>');
  primitiveHtml.push('    <div class="doc-row">');
  for (const { name, hex } of others) {
    primitiveHtml.push(
      `      <div class="doc-swatch"><div class="doc-swatch__chip" style="width:120px;background-color:${hex};"></div><div class="doc-swatch__label">${name}</div></div>`
    );
  }
  primitiveHtml.push('    </div>');
}
if (social.length) {
  primitiveHtml.push('    <div class="doc-subhead">Social</div>');
  primitiveHtml.push('    <div class="doc-row">');
  for (const { name, hex } of social) {
    primitiveHtml.push(
      `      <div class="doc-swatch"><div class="doc-swatch__chip" style="width:120px;background-color:${hex};"></div><div class="doc-swatch__label">${cssVarName(`social/${name}`).slice(2)}</div></div>`
    );
  }
  primitiveHtml.push('    </div>');
}

// ── Theme 일반 시맨틱 섹션 HTML(FIGMA.md 「토큰 계층」의 순서: surface·text·border·icon·brand·accent) ──
const GENERAL_PREFIXES = THEME_GENERAL_PREFIXES;
const themeHtml = [];
let themeCount = 0;
for (const prefix of GENERAL_PREFIXES) {
  const entries = Object.entries(theme).filter(([key]) => {
    const parts = key.split('/');
    return parts[0] === prefix && parts.length === 2;
  });
  if (!entries.length) continue;
  themeHtml.push(`    <div class="doc-subhead">${familyLabel(prefix)}</div>`);
  themeHtml.push('    <div class="doc-grid">');
  for (const [key, entry] of entries) {
    themeHtml.push(themeSwatch(cssVarName(key).slice(2), entry));
    themeCount++;
  }
  themeHtml.push('    </div>');
}

// ── docs/tokens/colors.html의 마커 사이만 교체 ──────────────────────────────────
function replaceBetweenMarkers(html, markerName, innerHtml) {
  const start = `<!-- GENERATED:${markerName}:START -->`;
  const end = `<!-- GENERATED:${markerName}:END -->`;
  const startIdx = html.indexOf(start);
  const endIdx = html.indexOf(end);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`generate-docs-tokens: ${markerName} 마커를 colors.html에서 못 찾음`);
  }
  return html.slice(0, startIdx + start.length) + '\n' + innerHtml + '\n    ' + html.slice(endIdx);
}

const colorsPath = path.join(ROOT, 'docs/tokens/colors.html');
let colorsHtml = fs.readFileSync(colorsPath, 'utf8');
colorsHtml = replaceBetweenMarkers(colorsHtml, 'PRIMITIVE', primitiveHtml.join('\n'));
colorsHtml = replaceBetweenMarkers(colorsHtml, 'THEME', themeHtml.join('\n'));
fs.writeFileSync(colorsPath, colorsHtml, 'utf8');

console.log(
  `generate-docs-tokens: Primitive ${familyNames.length}개 램프(${familyNames.join(', ')}) + base ${others.length}개(${others.map((o) => o.name).join(', ')}) + social ${social.length}개, ` +
    `Theme 일반 시맨틱 ${themeCount}개 -> docs/tokens/colors.html`
);
// 이 경고의 목적은 "이 생성기의 범위가 tokens/_theme.scss 와 갈라졌는지"를 잡는 것이다.
// 기대 개수를 숫자로 박아두면 토큰이 늘 때마다 낡는다(실제로 44 로 박혀 있다가 brand/25·
// border/control 이 들어오면서 틀렸다) — 그 파일에서 직접 센다.
const themeScss = fs.readFileSync(path.join(ROOT, 'scss/tokens/_theme.scss'), 'utf8');
const rootBlock = themeScss.slice(themeScss.indexOf('{', themeScss.indexOf(':root')), themeScss.indexOf('\n}'));
const declaredGeneral = new Set(
  [...rootBlock.matchAll(/--bds-([a-z0-9-]+)\s*:/g)]
    .map((m) => m[1])
    .filter((n) => GENERAL_PREFIXES.includes(n.split('-')[0]))
);
if (themeCount !== declaredGeneral.size) {
  console.warn(
    `generate-docs-tokens: 경고 — 스냅샷의 일반 시맨틱 ${themeCount}개와 tokens/_theme.scss 가 선언한 ${declaredGeneral.size}개가 다르다. 한쪽이 밀렸다.`
  );
}
