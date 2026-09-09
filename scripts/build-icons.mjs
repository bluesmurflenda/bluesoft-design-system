#!/usr/bin/env node
// 아이콘 빌드 — icons/raw/ (Figma 내보내기) → icons/svg/ (배포용)
//
// 왜 이 스크립트가 있나
//   Figma 내보내기는 색을 리터럴로 박아서 나온다. 그대로 배포하면 모드를 못 따라가고,
//   다크 배경에서 아이콘이 안 보인다. 그래서 내보낸 파일을 그대로 쓰지 않고 여기서 변환한다.
//   icons/raw/ 는 손대지 않는다 — 다시 내보내면 덮이는 파일이다.
//
// 왜 루트 속성에 의존하지 않나
//   원본 루트에는 fill="none" 이 있는데, sprite 로 묶는 과정에서 그게 빠져
//   838개 아이콘이 검은 덩어리로 그려진 적이 있다. 소비자가 자기 도구로 묶으면
//   같은 일이 또 난다. 그래서 각 path 가 스스로 색을 갖게 만든다.
//
// 색 규칙은 이름 목록이 아니라 값으로 판정한다. 우리 두 색만 바꾸고 나머지는 남기므로,
// 브랜드 로고가 새로 들어와도 목록을 고칠 일이 없다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'icons', 'raw');
const OUT = path.join(ROOT, 'icons', 'svg');

// 우리 토큰으로 옮길 색. 이 목록에 없는 색은 브랜드 자산이므로 그대로 둔다.
const MAIN = /^#(171717|525252)$/i; // 본체 — duo stroke · base fill
const ACCENT = /^#0EA5E9$/i; // 강조
const ACCENT_VAR = 'var(--bds-icon-accent, currentColor)';

const norm = (name) =>
  name
    .replace(/\.svg$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.svg';

function convert(svg) {
  const m = svg.match(/^([\s\S]*?<svg[^>]*>)([\s\S]*)$/);
  if (!m) throw new Error('svg 루트를 찾지 못했다');
  let [, root, body] = m;

  // 루트 — 크기는 쓰는 쪽이 정한다. viewBox 는 남긴다.
  root = root.replace(/\s+(width|height)="[^"]*"/g, '');
  if (!/\bfill="none"/.test(root)) root = root.replace(/<svg/, '<svg fill="none"');

  const stat = { main: 0, accent: 0, brand: 0, fillNone: 0 };

  // 색 치환 — 값으로 판정한다
  body = body.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,8})"/g, (all, prop, hex) => {
    if (MAIN.test(hex)) {
      stat.main++;
      return `${prop}="currentColor"`;
    }
    if (ACCENT.test(hex)) {
      stat.accent++;
      return `${prop}="${ACCENT_VAR}"`;
    }
    stat.brand++;
    return all; // 브랜드 색 — 그대로
  });

  // fill 선언이 없는 도형에 fill="none" 을 명시한다.
  // 원본 루트가 이미 fill="none" 이라고 선언하고 있으므로 의미를 바꾸지 않고 각 도형으로 내리는 것이다.
  body = body.replace(/<(path|rect|circle|ellipse|polygon|polyline|line)\b([^>]*?)(\/?)>/g, (all, tag, attrs, close) => {
    if (/\bfill=/.test(attrs)) return all;
    stat.fillNone++;
    return `<${tag} fill="none"${attrs}${close}>`;
  });

  return { svg: root + body, stat };
}

// ── 실행 ──
const total = { files: 0, main: 0, accent: 0, brand: 0, fillNone: 0, renamed: [] };
for (const set of fs.readdirSync(SRC, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const inDir = path.join(SRC, set.name);
  const outDir = path.join(OUT, set.name);
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of fs.readdirSync(inDir).filter((f) => f.toLowerCase().endsWith('.svg'))) {
    const { svg, stat } = convert(fs.readFileSync(path.join(inDir, file), 'utf8'));
    const out = norm(file);
    if (out !== file.toLowerCase()) total.renamed.push(`${set.name}/${file} → ${out}`);
    fs.writeFileSync(path.join(outDir, out), svg);
    total.files++;
    total.main += stat.main;
    total.accent += stat.accent;
    total.brand += stat.brand;
    total.fillNone += stat.fillNone;
  }
}

console.log(`아이콘 ${total.files}개 변환`);
console.log(`  본체 → currentColor            ${total.main}`);
console.log(`  강조 → var(--bds-icon-accent, …)   ${total.accent}`);
console.log(`  브랜드 색 그대로 유지           ${total.brand}`);
console.log(`  fill="none" 명시 추가          ${total.fillNone}`);
if (total.renamed.length) {
  console.log(`\n이름 정규화 ${total.renamed.length}건`);
  for (const r of total.renamed) console.log('  ' + r);
}
