#!/usr/bin/env node
// Figma 노드 검사 — scripts/README.md 의 N군(D1·D2·D10)만 다룬다.
// Variables REST API(Enterprise 전용, 401)를 못 쓰므로 GET /v1/files/{key} 노드 트리만 쓰고,
// boundVariables 의 id는 figma/tokens.ids.json 으로 이름 해석한다.
// D3~D9·D11~D13(변수 메타데이터가 필요한 검사)은 여기서 다루지 않는다 — Figma MCP 로 수동 실행.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import postcss from 'postcss';
import { printReport, row } from './lib/report.mjs';
import { loadFigmaIds, loadFigmaCollections, cssVarName } from './lib/tokens.mjs';
import { ALWAYS_ALLOWED_PRIMITIVES, isD1NodeExempt } from './lib/allowlist.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --dump <componentSetName> — D1/D2/D10 리포트 대신 그 세트의 모든 변형에 대해
// path → 바인딩된 토큰을 JSON으로 전부 덤프한다(위반 필터링 없음). D14 매핑 작성·검증용.
const argv = process.argv.slice(2);
const dumpArgIdx = argv.indexOf('--dump');
const dumpTarget = dumpArgIdx !== -1 ? argv[dumpArgIdx + 1] : null;
if (dumpArgIdx !== -1 && !dumpTarget) {
  console.error('check-nodes.mjs --dump: 컴포넌트 세트 이름이 필요하다. 예: node scripts/check-nodes.mjs --dump Alert');
  process.exit(1);
}

try {
  process.loadEnvFile(path.join(ROOT, '.env'));
} catch {
  /* .env 없으면 무시 — 아래에서 토큰 유무로 SKIP 처리 */
}

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY;

const rows = [];
const details = [];
function addDetail(id, title, items) {
  if (items.length) details.push({ id, title, items });
}

if (!FIGMA_TOKEN) {
  if (dumpTarget) {
    console.error('check-nodes.mjs --dump: FIGMA_TOKEN 없음(.env) — REST 호출 불가');
    process.exit(1);
  }
  rows.push(row('D1', '컬러 프리미티브 직접 참조', 'SKIP', null, 'FIGMA_TOKEN 없음(.env) — REST 호출 불가'));
  rows.push(row('D2', '하드코딩 색상', 'SKIP', null, 'FIGMA_TOKEN 없음(.env) — REST 호출 불가'));
  rows.push(row('D10', '컴포넌트 세트 규격', 'SKIP', null, 'FIGMA_TOKEN 없음(.env) — REST 호출 불가'));
  rows.push(row('D14', '요소별 토큰 매핑 대조', 'SKIP', null, 'FIGMA_TOKEN 없음(.env) — REST 호출 불가'));
  printReport('check-nodes.mjs — Figma 노드 검사', rows);
  process.exit(0); // 토큰 부재는 실패가 아니다 — scripts/README.md
}

async function figmaGet(pathname) {
  const res = await fetch(`https://api.figma.com/v1${pathname}`, {
    headers: { 'X-Figma-Token': FIGMA_TOKEN },
  });
  if (!res.ok) {
    throw new Error(`Figma REST ${pathname} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// 1) COMPONENTS 섹션의 페이지 id 목록을 구한다('❖ COMPONENTS' 다음부터 다음 '❖' 전까지).
const topLevel = await figmaGet(`/files/${FIGMA_FILE_KEY}?depth=1`);
const pages = topLevel.document.children;
const startIdx = pages.findIndex((p) => p.name.trim() === '❖ COMPONENTS');
const componentPages = [];
if (startIdx !== -1) {
  for (let i = startIdx + 1; i < pages.length; i++) {
    const name = pages[i].name.trim();
    if (name.startsWith('❖') || /^[–-]{3,}$/.test(name)) break;
    componentPages.push(pages[i]);
  }
}

// 2) 각 페이지의 전체 서브트리를 한 번에 받는다(ids 콤마 구분 다중 지정 지원).
const idsParam = componentPages.map((p) => p.id).join(',');
const nodesRes = idsParam ? await figmaGet(`/files/${FIGMA_FILE_KEY}/nodes?ids=${encodeURIComponent(idsParam)}`) : { nodes: {} };

// 3) id → {name, collection} 해석 맵 (Primitive만 D1에 필요하지만 전부 로드).
const idMaps = loadFigmaIds(); // { Primitive: {id:name}, Theme: {...}, ... }
const figmaCollections = idMaps ? loadFigmaCollections() : null;
function resolveVarId(variableId) {
  if (!idMaps) return null;
  const id = variableId.replace('VariableID:', '');
  for (const [collection, map] of Object.entries(idMaps)) {
    if (id in map) return { collection, name: map[id] };
  }
  return null;
}
function isColorPrimitive(name) {
  if (!figmaCollections) return false;
  const v = figmaCollections.Primitive.data[name];
  return typeof v === 'string' && /^#[0-9a-f]{6,8}$/i.test(v);
}

// ── --dump / D14 공용: 노드 트리 → {layerPath, type, token} 전부 덤프(위반 필터링 없음) ──
// D1의 walk()와 같은 규칙(인스턴스 내부는 안 내려간다)을 쓰지만, 위반만 거르는 게 아니라
// 바인딩된 것 전부를 낸다 — element-map 작성·검증, D14 대조의 공통 원본.
function dumpPaint(paint, i, type, layerPath, out) {
  if (paint.visible === false) return;
  if (paint.type !== 'SOLID') return;
  const boundId = paint.boundVariables?.color?.id;
  if (!boundId) return; // 덤프는 토큰 바인딩된 것만 낸다 — 하드코딩(D2 대상)은 별개
  const resolved = resolveVarId(boundId);
  out.push({
    path: layerPath,
    type,
    slot: i,
    token: resolved ? `${resolved.collection}/${resolved.name}` : null,
  });
}

// D1/D2의 walk()와 달리 INSTANCE 경계에서 멈추지 않는다 — 그 규칙은 "같은 위반을 파일
// 전체에서 중복 집계하지 않기" 위한 것이라 위반 카운트에는 맞지만, D14는 위반 집계가 아니라
// "이 자리에 실제로 어떤 색이 적용됐는가"를 봐야 한다. REST는 INSTANCE 노드도 오버라이드가
// 반영된 children을 그대로 반환한다(실측: Alert의 Icon 인스턴스 자체 fills는 빈 배열이고,
// 색은 그 안의 'Icon > Vector'에 있었다 — 2026-09-01, 라이브 데이터로 확인).
function walkForDump(node, layerPath, out) {
  (node.fills || []).forEach((p, i) => dumpPaint(p, i, 'fill', layerPath, out));
  (node.strokes || []).forEach((p, i) => dumpPaint(p, i, 'stroke', layerPath, out));
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const childPath = layerPath ? `${layerPath}/${child.name}` : child.name;
      walkForDump(child, childPath, out);
    }
  }
}

function parseVariantProps(variantName) {
  const props = {};
  for (const part of variantName.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    props[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return props;
}

// setNode: REST로 받은 COMPONENT_SET(또는 단일 COMPONENT) 노드. 변형(COMPONENT 자식)마다
// {name, props, elements} 를 낸다. elements 의 path='' 는 변형 루트 자신의 fills/strokes다.
function dumpComponentSet(setNode) {
  const variantNodes = setNode.type === 'COMPONENT_SET' ? (setNode.children || []) : [setNode];
  return variantNodes
    .filter((v) => v.type === 'COMPONENT')
    .map((v) => {
      const elements = [];
      walkForDump(v, '', elements);
      return { name: v.name, props: parseVariantProps(v.name), elements };
    });
}

function findComponentSetByName(name) {
  for (const page of componentPages) {
    const doc = nodesRes.nodes[page.id]?.document;
    if (!doc) continue;
    const found = (doc.children || []).find(
      (n) => (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') && n.name.trim() === name
    );
    if (found) return { page: page.name.trim(), node: found };
  }
  return null;
}

if (dumpTarget) {
  const found = findComponentSetByName(dumpTarget);
  if (!found) {
    console.error(`check-nodes.mjs --dump: "${dumpTarget}" 를 ${componentPages.length}개 페이지에서 못 찾음`);
    process.exit(1);
  }
  const variants = dumpComponentSet(found.node);
  console.log(JSON.stringify({ set: dumpTarget, page: found.page, variantCount: variants.length, variants }, null, 2));
  process.exit(0);
}

const d1 = []; // 컬러 프리미티브 직접 참조
const d2 = []; // 하드코딩 색상(변수·스타일 바인딩 없음)
const d10 = []; // 컴포넌트 세트 규격

function checkPaints(paints, styleId, ctx) {
  if (!Array.isArray(paints)) return;
  paints.forEach((paint, i) => {
    if (paint.visible === false) return;
    if (paint.type !== 'SOLID') return;
    const boundId = paint.boundVariables?.color?.id;
    if (boundId) {
      const resolved = resolveVarId(boundId);
      if (resolved && resolved.collection === 'Primitive' && isColorPrimitive(resolved.name)) {
        const okByAllowlist = ALWAYS_ALLOWED_PRIMITIVES.includes(resolved.name);
        const okByNodeException = isD1NodeExempt(ctx.component, resolved.name);
        if (!okByAllowlist && !okByNodeException && !ctx.exempt) {
          d1.push({ page: ctx.page, path: ctx.path, type: ctx.type, slot: i, primitive: resolved.name });
        }
      }
      return; // 변수 바인딩 있음 — D2 대상 아님
    }
    if (styleId) return; // 스타일 참조 있음 — D2 대상 아님
    d2.push({ page: ctx.page, path: ctx.path, type: ctx.type, slot: i, color: paint.color });
  });
}

function walk(node, ctx) {
  const path = ctx.path ? `${ctx.path}/${node.name}` : node.name;
  const nextCtx = { ...ctx, path };

  let skipOwnStroke = false;
  if (node.type === 'COMPONENT_SET') {
    // D10: 세트 프레임 자체 규격
    const dashed = Array.isArray(node.strokeDashes) && node.strokeDashes.length > 0;
    const fillBoundId = node.fills?.[0]?.boundVariables?.color?.id;
    const resolved = fillBoundId ? resolveVarId(fillBoundId) : null;
    const bgOk = resolved && resolved.name === 'surface/default';
    if (!dashed || !bgOk) {
      d10.push({ page: ctx.page, path, dashed, bg: resolved ? `${resolved.collection}/${resolved.name}` : '(바인딩 없음/다른 변수)' });
    }
    // 세트 프레임 자체의 점선 테두리 stroke는 ADR-011이 요구하는 고정 문서 표시(항상 미바인딩)라
    // D2(하드코딩 색상) 대상에서 뺀다 — D10이 dashed 여부는 이미 별도로 검증한다.
    skipOwnStroke = true;
  }

  checkPaints(node.fills, node.styles?.fill, { ...nextCtx, type: 'fill' });
  if (!skipOwnStroke) checkPaints(node.strokes, node.styles?.stroke, { ...nextCtx, type: 'stroke' });

  if (node.type === 'INSTANCE') return; // 인스턴스 내부는 마스터 소유 — 내려가지 않는다
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, nextCtx);
  }
}

// D1 예외 컴포넌트(로고·소셜 버튼)는 페이지가 아니라 컴포넌트(세트) 자체 이름으로 판정한다 —
// 'Social Button'은 'Buttons' 페이지 안에 다른 컴포넌트와 나란히 있다.
const EXEMPT_COMPONENT_NAMES = ['Social Button', 'Logo'];

for (const page of componentPages) {
  const doc = nodesRes.nodes[page.id]?.document;
  if (!doc) continue;
  // 검사 대상은 COMPONENT_SET·COMPONENT뿐이다 — 같은 페이지에 나란히 놓인 _Doc/* 주석 프레임,
  // 미리보기용 INSTANCE(예: 'Checkbox' 타입 INSTANCE)는 대상이 아니다.
  const topLevelTargets = (doc.children || []).filter(
    (n) => n.type === 'COMPONENT_SET' || n.type === 'COMPONENT'
  );
  for (const top of topLevelTargets) {
    const exempt = EXEMPT_COMPONENT_NAMES.some((n) => top.name.includes(n));
    walk(top, { page: page.name, path: '', exempt, component: top.name });
  }
}

rows.push(row('D1', '컬러 프리미티브 직접 참조', d1.length ? 'FAIL' : 'PASS', d1.length,
  d1[0] ? `예: ${d1[0].page}/${d1[0].path} → ${d1[0].primitive}` : `자체 레이어 기준, ${componentPages.length}개 페이지`));
addDetail('D1', '컬러 프리미티브 직접 참조', d1.map((v) => `${v.page} :: ${v.path} [${v.type}${v.slot}] → ${v.primitive}`));

rows.push(row('D2', '하드코딩 색상', d2.length ? 'FAIL' : 'PASS', d2.length,
  d2[0] ? `예: ${d2[0].page}/${d2[0].path}` : ''));
addDetail('D2', '하드코딩 색상', d2.map((v) => `${v.page} :: ${v.path} [${v.type}${v.slot}] rgba(${Math.round(v.color.r*255)},${Math.round(v.color.g*255)},${Math.round(v.color.b*255)},${v.color.a ?? 1})`));

rows.push(row('D10', '컴포넌트 세트 규격', d10.length ? 'FAIL' : 'PASS', d10.length,
  d10[0] ? `예: ${d10[0].page}/${d10[0].path}` : `점검한 세트 프레임 기준`));
addDetail('D10', '컴포넌트 세트 규격', d10.map((v) => `${v.page} :: ${v.path}  dashed=${v.dashed}  bg=${v.bg}`));

// ── D14: element-map 기반 요소별 토큰 매핑 대조 (ADR-023) ──────────────────────
// scripts/lib/element-map/*.mjs 에 매핑이 있는 컴포넌트만 검사한다 — 매핑 없는 컴포넌트는
// 자동검사 대상에서 자연히 빠지고 지금처럼 프롬프트 기준표로 진행한다.
// 한계: 셀렉터가 토큰을 참조하는지만 본다. 여러 클래스가 동시에 걸렸을 때 캐스케이드로
// 실제 이기는 값은 시뮬레이션하지 않는다(Alert banner 테두리 버그가 그 예 — ADR-023 참조).
function expandTemplate(str, values) {
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in values ? values[k] : `{${k}}`));
}
function templateAxes(...strs) {
  const set = new Set();
  for (const s of strs) {
    const re = /\{(\w+)\}/g;
    let m;
    while ((m = re.exec(s))) set.add(m[1]);
  }
  return set;
}
function getVariantProp(props, axisNameLower) {
  const key = Object.keys(props).find((k) => k.toLowerCase() === axisNameLower.toLowerCase());
  return key ? props[key] : undefined;
}
function defaultAxisValue(axisName, variantAxis, except) {
  const excluded = except?.[axisName] || [];
  return variantAxis[axisName].find((v) => !excluded.includes(v)) ?? variantAxis[axisName][0];
}
function cartesianProduct(axisNames, variantAxis) {
  let combos = [{}];
  for (const name of axisNames) {
    const next = [];
    for (const combo of combos) {
      for (const val of variantAxis[name]) next.push({ ...combo, [name]: val });
    }
    combos = next;
  }
  return combos;
}
function findVariant(variants, axisValues) {
  return variants.find((v) =>
    Object.entries(axisValues).every(([ax, val]) => getVariantProp(v.props, ax) === val));
}
function findDumpToken(elements, figmaPath, figmaType) {
  const hit = elements.find((e) => e.path === figmaPath && e.type === figmaType);
  if (!hit) return { found: false, token: null };
  return { found: true, token: hit.token }; // token이 null이면 id는 있는데 ids.json에서 이름 해석 실패
}
function findCssDeclarationValue(cssRoot, selector, property) {
  let found;
  cssRoot.walkRules((rule) => {
    if (found !== undefined) return;
    const selList = rule.selector.split(',').map((s) => s.trim());
    if (!selList.includes(selector)) return;
    rule.walkDecls(property, (decl) => {
      if (found === undefined) found = decl.value;
    });
  });
  return found; // undefined = 그 셀렉터에 그 프로퍼티 선언 자체가 없음
}
async function loadElementMaps() {
  const dir = path.join(ROOT, 'scripts/lib/element-map');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort();
  const maps = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(dir, f)).href);
    if (mod.default) maps.push(mod.default);
  }
  return maps;
}

const elementMaps = await loadElementMaps();
const d14 = []; // {set, variant, element, kind:'figma'|'scss', expected, actual}
const distCssPath = path.join(ROOT, 'dist/main.css');
const distCssText = fs.existsSync(distCssPath) ? fs.readFileSync(distCssPath, 'utf8') : null;
const distCssRoot = distCssText ? postcss.parse(distCssText) : null;

for (const map of elementMaps) {
  const found = findComponentSetByName(map.set);
  if (!found) {
    d14.push({ set: map.set, variant: '(전체)', element: '(세트)', kind: 'figma',
      expected: `Figma에 "${map.set}" 세트 존재`, actual: `${componentPages.length}개 페이지에서 못 찾음` });
    continue;
  }
  const variants = dumpComponentSet(found.node);

  for (const el of map.elements) {
    const refAxes = [...templateAxes(el.token, el.cssSelector)];
    const unrefAxes = Object.keys(map.variantAxis).filter((a) => !refAxes.includes(a));
    const defaults = {};
    for (const a of unrefAxes) defaults[a] = defaultAxisValue(a, map.variantAxis, el.except);

    const combos = refAxes.length ? cartesianProduct(refAxes, map.variantAxis) : [{}];
    for (const combo of combos) {
      const excepted = Object.entries(el.except || {}).some(
        ([ax, vals]) => refAxes.includes(ax) && vals.includes(combo[ax]));
      if (excepted) continue;

      const axisValues = { ...defaults, ...combo };
      const variant = findVariant(variants, axisValues);
      const variantLabel = Object.entries(axisValues).map(([k, v]) => `${k}=${v}`).join(', ');
      if (!variant) {
        d14.push({ set: map.set, variant: variantLabel, element: el.element, kind: 'figma',
          expected: '(해당 축 조합의 변형)', actual: 'Figma에서 못 찾음' });
        continue;
      }

      const expectedToken = expandTemplate(el.token, axisValues);
      const figmaType = el.figmaType || 'fill';
      const dumpHit = findDumpToken(variant.elements, el.figmaPath, figmaType);
      const actualTokenName = dumpHit.found && dumpHit.token
        ? dumpHit.token.slice(dumpHit.token.indexOf('/') + 1) : null;
      if (actualTokenName !== expectedToken) {
        const actualDesc = !dumpHit.found ? '(바인딩 없음)'
          : dumpHit.token ? dumpHit.token : '(id 해석 실패 — tokens.ids.json 갱신 필요)';
        d14.push({ set: map.set, variant: variantLabel, element: el.element, kind: 'figma',
          expected: expectedToken, actual: actualDesc });
      }

      if (distCssRoot) {
        const cssSelector = expandTemplate(el.cssSelector, axisValues);
        const expectedVar = cssVarName(expectedToken);
        const declValue = findCssDeclarationValue(distCssRoot, cssSelector, el.cssProperty);
        if (declValue === undefined) {
          d14.push({ set: map.set, variant: variantLabel, element: el.element, kind: 'scss',
            expected: `${cssSelector} { ${el.cssProperty}: var(${expectedVar}) }`,
            actual: '해당 셀렉터·프로퍼티 선언 없음' });
        } else if (!declValue.includes(`var(${expectedVar})`)) {
          d14.push({ set: map.set, variant: variantLabel, element: el.element, kind: 'scss',
            expected: `var(${expectedVar})`, actual: declValue });
        }
      }
    }
  }
}

rows.push(row('D14', '요소별 토큰 매핑 대조',
  d14.length ? 'FAIL' : (elementMaps.length ? 'PASS' : 'SKIP'), d14.length,
  elementMaps.length
    ? (d14[0] ? `예: ${d14[0].set}[${d14[0].variant}] ${d14[0].element} → ${d14[0].kind === 'figma' ? 'Figma' : 'SCSS'} 불일치`
      : `매핑 ${elementMaps.length}개(${elementMaps.map((m) => m.set).join(', ')})`)
    : 'scripts/lib/element-map/ 에 매핑 없음 — SKIP'));
addDetail('D14', '요소별 토큰 매핑 대조', d14.map((v) =>
  `${v.set}[${v.variant}] ${v.element} (${v.kind === 'figma' ? 'Figma 불일치' : 'SCSS 불일치'}) — 기대: ${v.expected} / 실제: ${v.actual}`));

const hasFail = printReport('check-nodes.mjs — Figma 노드 검사', rows);
console.log(`\n(검사 대상 페이지 ${componentPages.length}개: ${componentPages.map((p) => p.name.trim()).join(', ')})`);
for (const d of details) {
  console.log(`\n-- ${d.id} ${d.title} (${d.items.length}건) --`);
  for (const item of d.items.slice(0, 30)) console.log('  ' + item);
  if (d.items.length > 30) console.log(`  ... 외 ${d.items.length - 30}건`);
}

process.exit(hasFail ? 1 : 0);
