#!/usr/bin/env node
// Figma 노드 검사 — scripts/README.md 의 N군(D1·D2·D10)만 다룬다.
// Variables REST API(Enterprise 전용, 401)를 못 쓰므로 GET /v1/files/{key} 노드 트리만 쓰고,
// boundVariables 의 id는 figma/tokens.ids.json 으로 이름 해석한다.
// D3~D9·D11~D13(변수 메타데이터가 필요한 검사)은 여기서 다루지 않는다 — Figma MCP 로 수동 실행.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { printReport, row } from './lib/report.mjs';
import { loadFigmaIds, loadFigmaCollections } from './lib/tokens.mjs';
import { ALWAYS_ALLOWED_PRIMITIVES, isD1NodeExempt } from './lib/allowlist.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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
  rows.push(row('D1', '컬러 프리미티브 직접 참조', 'SKIP', null, 'FIGMA_TOKEN 없음(.env) — REST 호출 불가'));
  rows.push(row('D2', '하드코딩 색상', 'SKIP', null, 'FIGMA_TOKEN 없음(.env) — REST 호출 불가'));
  rows.push(row('D10', '컴포넌트 세트 규격', 'SKIP', null, 'FIGMA_TOKEN 없음(.env) — REST 호출 불가'));
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

const hasFail = printReport('check-nodes.mjs — Figma 노드 검사', rows);
console.log(`\n(검사 대상 페이지 ${componentPages.length}개: ${componentPages.map((p) => p.name.trim()).join(', ')})`);
for (const d of details) {
  console.log(`\n-- ${d.id} ${d.title} (${d.items.length}건) --`);
  for (const item of d.items.slice(0, 30)) console.log('  ' + item);
  if (d.items.length > 30) console.log(`  ... 외 ${d.items.length - 30}건`);
}

process.exit(hasFail ? 1 : 0);
