#!/usr/bin/env node
// ADR-033 일괄 리네임 — CSS 변수 --bds-*, 컴포넌트 클래스 .bds-*, button->btn, chip->badge.
//
// 왜 스크립트인가
//   1,000건 규모의 기계적 변경이다. 손으로 하면 반드시 빠뜨리고, 빠뜨리면 문서 사이트가
//   스타일 없이 뜬다(중간 상태 = 깨진 상태). ADR-033 「한 번에 바꾼다」.
//
// 두 번 돌려도 안전하다
//   이미 bds- 로 시작하는 이름은 건너뛴다. 되돌릴 때는 --reverse 로 돈다(ADR-033 「뒤집으려면」).
//
// 무엇을 근거로 바꾸나
//   - CSS 변수: 규칙으로 바꾼다(전부 접두사). 스냅샷에 없는 코드 전용 변수도 있어서
//     목록 기반으로 하면 빠진다 — 예: --progress-bar-value(소비자가 인라인으로 채운다).
//   - 클래스: 목록으로 바꾼다. 컴파일된 CSS 의 셀렉터에서 뽑는다(= SCSS 가 실제로 내보내는
//     클래스 전수). 규칙으로 하면 <table> 태그나 doc-* 문서 클래스까지 건드린다.
//
// 문맥을 나누는 이유
//   docs 의 JS 가 클래스를 문자열로 조립하는데(예: 'btn btn-' + size), 같은 자리에
//   ID('btn-matrix')·아이콘 이름('alert-triangle')·파일 경로('components/chip.html')가
//   섞여 있다. 한 규칙으로 밀면 그것들까지 바뀐다.
//
// 바꾼 것은 전부 출력한다 — 조용히 바뀌면 검토할 수 없다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PREFIX = 'bds-';
const REVERSE = process.argv.includes('--reverse');
const DRY = process.argv.includes('--dry');

// ── 대상 파일 ────────────────────────────────────────────────────
// figma/*.json 은 기준이라 건드리지 않는다. dist/·docs/assets/main.css·docs/assets/icons/ 는
// 빌드 산출물이라 build 가 덮는다. DECISIONS.md 는 날짜 붙은 과거 기록이라 그 시점 이름이 정상이다.
const TARGET_DIRS = [
  { dir: 'scss', exts: ['.scss'] },
  { dir: 'docs', exts: ['.html', '.js', '.css'], skip: ['docs/assets/main.css', 'docs/assets/icons'] },
  { dir: 'scripts/lib/element-map', exts: ['.mjs'] },
];
const TARGET_FILES = ['scripts/build-icons.mjs'];

function walk(dir, exts, skip = []) {
  const out = [];
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const relPath = path.join(dir, e.name).replace(/\\/g, '/');
    if (skip.some((s) => relPath === s || relPath.startsWith(s + '/'))) continue;
    if (e.isDirectory()) out.push(...walk(relPath, exts, skip));
    else if (exts.includes(path.extname(e.name))) out.push(relPath);
  }
  return out;
}

const files = [
  ...TARGET_DIRS.flatMap((t) => walk(t.dir, t.exts, t.skip)),
  ...TARGET_FILES.filter((f) => fs.existsSync(path.join(ROOT, f))),
];

// ── 클래스 목록 = 컴파일된 CSS 의 셀렉터 전수 ─────────────────────
// 리네임 전 상태를 컴파일해서 뽑는다. --reverse 로 돌 때는 이미 접두사가 붙어 있으니
// 접두사를 뗀 이름으로 목록을 만든다.
const sass = createRequire(path.join(ROOT, 'package.json'))('sass');
const compiledCss = sass.compile(path.join(ROOT, 'scss', 'main.scss'), { style: 'expanded' }).css;
const CLASS_INVENTORY = new Set();
for (const m of compiledCss.matchAll(/\.(-?[a-zA-Z_][a-zA-Z0-9_-]*)/g)) {
  let name = m[1];
  if (name.startsWith(PREFIX)) name = name.slice(PREFIX.length);
  CLASS_INVENTORY.add(name);
}
// chip -> badge 로 이름이 바뀌므로 양쪽 이름을 모두 목록에 둔다(멱등·역방향 모두 걸리게).
for (const n of [...CLASS_INVENTORY]) {
  if (n === 'chip' || n.startsWith('chip-') || n.startsWith('chip_')) CLASS_INVENTORY.add('badge' + n.slice(4));
  if (n === 'badge' || n.startsWith('badge-') || n.startsWith('badge_')) CLASS_INVENTORY.add('chip' + n.slice(5));
}

// 문서 사이트 전용 클래스(docs.css 가 선언한 것). 리네임 대상이 아니지만, 라이브러리 클래스와
// 한 목록에 섞여 나오므로 공존을 허용해야 한다 — 아래 js string 게이트에서 쓴다.
const DOCS_CLASSES = new Set();
{
  const p = path.join(ROOT, 'docs/assets/docs.css');
  if (fs.existsSync(p)) {
    for (const m of fs.readFileSync(p, 'utf8').matchAll(/\.(-?[a-zA-Z_][a-zA-Z0-9_-]*)/g)) DOCS_CLASSES.add(m[1]);
  }
}

// ── 이름 변환 ────────────────────────────────────────────────────
function mapVar(name) {
  if (REVERSE) {
    if (!name.startsWith(PREFIX)) return name;
    const bare = name.slice(PREFIX.length);
    if (bare === 'btn' || bare.startsWith('btn-')) return 'button' + bare.slice(3);
    if (bare === 'badge' || bare.startsWith('badge-')) return 'chip' + bare.slice(5);
    return bare;
  }
  if (name.startsWith(PREFIX)) return name; // 멱등
  if (name === 'button' || name.startsWith('button-')) return PREFIX + 'btn' + name.slice(6);
  if (name === 'chip' || name.startsWith('chip-')) return PREFIX + 'badge' + name.slice(4);
  return PREFIX + name;
}

function mapClass(name) {
  if (REVERSE) {
    if (!name.startsWith(PREFIX)) return name;
    const bare = name.slice(PREFIX.length);
    if (bare === 'badge' || bare.startsWith('badge-') || bare.startsWith('badge_')) return 'chip' + bare.slice(5);
    return bare;
  }
  if (name.startsWith(PREFIX)) return name; // 멱등
  if (name === 'chip' || name.startsWith('chip-') || name.startsWith('chip_')) return PREFIX + 'badge' + name.slice(4);
  return PREFIX + name;
}

// 클래스 후보인가. 조립용 조각('btn-' 처럼 끝이 하이픈)도 받아준다.
function isClassLike(token) {
  if (!token) return false;
  if (token.startsWith(PREFIX)) return true; // 이미 바뀐 것 — 멱등 경로로 흘려보낸다
  if (CLASS_INVENTORY.has(token)) return true;
  if (token.endsWith('-')) {
    const stem = token.slice(0, -1);
    if (!stem) return false;
    if (CLASS_INVENTORY.has(stem)) return true;
    for (const c of CLASS_INVENTORY) if (c.startsWith(token)) return true;
  }
  return false;
}

// ── 치환 기록 ────────────────────────────────────────────────────
const log = new Map(); // `${context}\t${from} -> ${to}` -> 건수
const record = (ctx, from, to) => {
  if (from === to) return;
  const k = ctx + '\t' + from + ' -> ' + to;
  log.set(k, (log.get(k) || 0) + 1);
};
// 자동 판정을 보류한 맨 낱말들. 전부 출력해서 사람이 훑는다 — 이게 이 스크립트의 안전장치다.
const bareSkips = [];

// 규칙으로 판정할 수 없어 자리를 지정해 바꾸는 것들 — 낱말 하나뿐인 리터럴이 클래스인 경우.
// 늘어나면 규칙이 잘못됐다는 신호다. 목록을 키우기 전에 규칙을 다시 본다.
const EXPLICIT = [
  // 클래스 목록의 첫 항목. 'con-' + size 쪽은 하이픈이 있어 자동으로 바뀐다.
  { file: 'docs/components/con-chip.html', from: "['con', 'con-'", to: "['bds-con', 'bds-con-'" },
  { file: 'docs/components/logo.html', from: "var cls = 'logo' +", to: "var cls = 'bds-logo' +" },
  // 아래 둘은 혼합 인용부호(' 안에 ") 때문에 리터럴 경계 판정이 어긋나 자동 패스가 놓친다.
  { file: 'docs/components/pagination.html', from: "(cls || 'icon')", to: "(cls || 'bds-icon')" },
  { file: 'docs/components/upload.html', from: "iconSvg('icon', item.icon)", to: "iconSvg('bds-icon', item.icon)" },
];

// 확인하고 그대로 두기로 한 맨 낱말 — 클래스가 아니다. 매번 다시 보고되면 새 항목이 안 보인다.
// 여기 없는 보류가 나오면 그건 사람이 봐야 하는 새 자리다.
const BARE_OK = [
  { file: 'docs/assets/nav.js', token: 'input', why: "addEventListener('input') — DOM 이벤트 이름" },
  { file: 'docs/components/dropdown-select.html', token: 'calendar', why: 'iconSvg 2번째 인자 — 스프라이트 아이콘 이름' },
  { file: 'docs/components/side-nav-item.html', token: 'icon', why: 'TYPES 의 타입 구분자 — type === 로 비교만 한다' },
  { file: 'docs/components/social-button.html', token: 'icon', why: "TYPES 의 타입 구분자 — 'social-btn-' + type 으로 이어 붙는다" },
];
const isBareOk = (file, token) => BARE_OK.some((b) => b.file === file && b.token === token);

// (A) CSS 커스텀 프로퍼티 — 모든 파일. --x 앞이 단어문자면 클래스 수식어(.choice--invalid)라 제외한다.
//     HTML 주석 시작(<!--x)도 제외한다.
function passVars(text) {
  return text.replace(/(?<![\w-])--([a-z][a-z0-9-]*)/g, (all, name, offset, str) => {
    if (offset >= 2 && str.slice(offset - 2, offset) === '<!') return all;
    const to = mapVar(name);
    record('var', '--' + name, '--' + to);
    return '--' + to;
  });
}

// (B) 점 붙은 클래스 셀렉터 — .scss/.css.
//
// 앞 문자로 단어문자를 제외하면 안 된다. 붙여 쓴 선택자(.a.b)의 두 번째 클래스가 바로 그 형태다 —
// 처음에 제외했더니 .bds-social-btn-brand.social-btn-kakao 처럼 두 번째만 옛 이름으로 남아
// 그 규칙이 아무 요소에도 안 걸리게 됐다(컴파일된 CSS 에 접두사 없는 클래스가 남는 것으로 드러났다).
// map.get·mix.text·math.div 같은 네임스페이스 호출은 lookbehind 가 아니라 isClassLike 의
// 목록 게이트가 막는다 — get·text·div 는 클래스 목록에 없다. 숫자(1.5)는 [a-z] 가 막는다.
function passDotSelectors(text) {
  return text.replace(/(?<![$])\.([a-z][a-zA-Z0-9_-]*)/g, (all, name) => {
    if (!isClassLike(name)) return all;
    const to = mapClass(name);
    record('selector', '.' + name, '.' + to);
    return '.' + to;
  });
}

// (C1) class="..." 속성값 — 공백으로 쪼개 토큰마다 판정한다.
function passClassAttrs(text) {
  return text.replace(/\bclass=(["'])([^"']*)\1/g, (all, q, value) => {
    const mapped = value
      .split(/(\s+)/)
      .map((tok) => {
        if (!tok || /^\s+$/.test(tok)) return tok;
        if (!isClassLike(tok)) return tok;
        const to = mapClass(tok);
        record('class attr', tok, to);
        return to;
      })
      .join('');
    return 'class=' + q + mapped + q;
  });
}

// (C2) 인용 문자열 / <code> 안의 클래스 언급 — 마크업 조립과 문서 본문.
//      경로·앵커가 섞인 문자열은 건드리지 않는다(예: 'components/chip.html', '#icon-base-').
//
// '<' 바로 뒤는 태그 이름이라 제외한다. 이걸 빼먹으면 '<input class="…">' 의 input,
// '<textarea …>' 의 textarea 가 클래스로 잡혀 마크업이 깨진다(목록에 같은 이름의 클래스가 있다).
function mapClassListText(value, ctx, where) {
  if (value.includes('/') || value.includes('#')) return value;

  // 한 낱말짜리 이름(icon·input·select…)은 클래스일 수도, 타입 구분자일 수도 있다.
  // social-button.html 의 TYPES=['label','icon'] 은 'social-btn-' + type 으로 이어 붙는데
  // 여기서 icon 을 바꾸면 social-btn-bds-icon 이 되어 깨진다. 반대로 pagination.html 의
  // (cls || 'icon') 은 진짜 클래스라 바꿔야 한다 — 규칙으로는 구분이 안 된다.
  // 그래서 "리터럴 전체가 클래스 목록"일 때만 자동으로 바꾸고, 낱말 하나뿐인 리터럴은
  // 보류해서 출력한다(EXPLICIT 로 자리를 지정한다).
  if (ctx === 'js string') {
    const tokens = value.split(/\s+/).filter(Boolean);
    // 요소맵(scripts/lib/element-map)의 셀렉터는 '.alert-{color}' 처럼 자리표시자를 담는다.
    // 앞의 클래스 부분만 떼어 판정한다 — 통째로 보면 목록에 없어서 파일 전체를 건너뛴다(D14 가 깨졌다).
    const classPart = (t) => t.replace(/^\./, '').split('{')[0];
    // 라이브러리 클래스와 문서 전용 클래스가 한 목록에 섞인다 — 'icon icon-sm' 이 그렇다
    // (icon 은 라이브러리, icon-sm 은 docs.css 소유). 문서 클래스를 공존 허용하지 않으면
    // 그 리터럴 전체가 막혀서 icon 이 옛 이름으로 남는다.
    const ok = (t) => isClassLike(classPart(t)) || DOCS_CLASSES.has(classPart(t));
    const allClassLike = tokens.length > 0 && tokens.every(ok);
    if (!allClassLike) return value;
    const onlyBareWord = tokens.length === 1 && !tokens[0].includes('-') && !tokens[0].includes('_');
    if (onlyBareWord) {
      bareSkips.push({ where, token: tokens[0], line: value.slice(0, 60) });
      return value;
    }
  }

  return value.replace(/(?<![\w.$#/<-])(\.?)([a-z][a-zA-Z0-9_-]*-?)/g, (all, dot, token, offset, str) => {
    if (!isClassLike(token)) return all;
    // 엔티티로 쓴 태그 이름(&lt;input&gt;)은 클래스가 아니다. '<' 는 위 lookbehind 가 막지만
    // &lt; 는 세미콜론으로 끝나서 안 막힌다 — 문서 본문에 실제로 있다.
    const head = str.slice(Math.max(0, offset - 4), offset);
    if (head.endsWith('&lt;') || head.endsWith('&#60;')) return all;
    const to = mapClass(token);
    record(ctx, dot + token, dot + to);
    return dot + to;
  });
}

// 문자열 리터럴 안에서 끝까지 닫히지 않은 class="…" — 조립식 마크업의 흔한 형태다.
//   '<div class="alert alert-' + layout + ' alert-' + color + '">'
// 완결된 class="…" 는 (C1)이 이미 처리했고, 이건 리터럴 끝에서 잘린 쪽이다.
function passUnterminatedClassAttr(value, where) {
  return value.replace(/\bclass=(["'])([^"']*)$/, (all, q, tokens) => {
    const mapped = tokens
      .split(/(\s+)/)
      .map((tok) => {
        if (!tok || /^\s+$/.test(tok) || !isClassLike(tok)) return tok;
        const to = mapClass(tok);
        record('class attr(조립)', tok, to);
        return to;
      })
      .join('');
    return 'class=' + q + mapped;
  });
}

// 문자열 리터럴 경계는 정규식으로 잡을 수 없다. 왼쪽부터 상태를 추적해야 한다.
//
// 정규식으로 하면 다른 리터럴 안의 인용부호에서 새 리터럴을 시작한다. 실제로
//   '<svg class="' + (cls || 'side-nav-item__icon') + '">'
// 에서 `"' + (cls || '` 를 리터럴로 잡아, side-nav-item__icon 이 모든 리터럴 밖으로
// 밀려나 리네임에서 누락됐다 — 문서 사이트 왼쪽 메뉴가 그래서 깨졌다(2026-09-10).
// 같은 원인으로 docs/ 여러 페이지의 조립식 클래스가 옛 이름으로 남아 있었다.
// 조립식 class 목록의 꼬리.
//   '<button class="bds-btn bds-btn-' + size + ' btn-outline">Prev</button>'
// 앞 리터럴이 class=" 를 열고, 뒤 리터럴이 남은 클래스를 적은 뒤 " 로 닫는다.
// 리터럴 하나만 보면 그 앞이 class= 였는지 알 수 없으므로, 첫 " 앞이 전부 클래스 토큰일
// 때만 바꾼다 — 그게 아니면(예: ' style="width:100%">') 손대지 않는다.
function passClassAttrTail(value, where) {
  const q = value.indexOf('"');
  if (q <= 0) return value;
  const head = value.slice(0, q);
  if (/[<>=]/.test(head)) return value; // 마크업이 섞였으면 클래스 목록이 아니다
  const tokens = head.split(/\s+/).filter(Boolean);
  if (!tokens.length) return value;
  if (!tokens.every((t) => isClassLike(t) || DOCS_CLASSES.has(t))) return value;
  const mapped = head
    .split(/(\s+)/)
    .map((t) => {
      if (!t || /^\s+$/.test(t) || !isClassLike(t)) return t;
      const to = mapClass(t);
      record('class attr(꼬리)', t, to);
      return to;
    })
    .join('');
  return mapped + value.slice(q);
}

function scanJsLiterals(text, where) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c !== '"' && c !== "'") { out += c; i++; continue; }

    // 닫는 같은 인용부호를 찾는다. 줄바꿈을 먼저 만나면 리터럴이 아니다(주석 안 아포스트로피 등).
    let j = i + 1;
    let closed = false;
    while (j < text.length) {
      if (text[j] === '\\') { j += 2; continue; }
      if (text[j] === '\n') break;
      if (text[j] === c) { closed = true; break; }
      j++;
    }
    if (!closed) { out += c; i++; continue; }

    const value = text.slice(i + 1, j);
    let v = passUnterminatedClassAttr(value, where);
    v = passClassAttrTail(v, where);
    v = mapClassListText(v, 'js string', where);
    out += c + v + c;
    i = j + 1;
  }
  return out;
}

// .html 은 마크업과 스크립트가 섞여 있다. 스크립트 블록 안에서만 리터럴로 본다 —
// 마크업 본문의 아포스트로피까지 리터럴로 세면 엉뚱한 구간을 리터럴로 잡는다.
function passQuotedStrings(text, where, scriptOnly) {
  if (!scriptOnly) return scanJsLiterals(text, where);
  return text.replace(/(<script[^>]*>)([\s\S]*?)(<\/script>)/gi, (all, open, body, close) => open + scanJsLiterals(body, where) + close);
}

function passCodeTags(text, where) {
  return text.replace(/<code>([^<]*)<\/code>/g, (all, inner) => '<code>' + mapClassListText(inner, 'code tag', where) + '</code>');
}

// ── 실행 ────────────────────────────────────────────────────────
let changedFiles = 0;
for (const rel of files) {
  const abs = path.join(ROOT, rel);
  const original = fs.readFileSync(abs, 'utf8');
  let text = original;
  const ext = path.extname(rel);

  // 자리 지정 치환을 먼저 한다 — 뒤 패스들이 이미 접두사가 붙은 걸 보고 그냥 지나가게.
  for (const e of EXPLICIT) {
    if (e.file !== rel) continue;
    const from = REVERSE ? e.to : e.from;
    const to = REVERSE ? e.from : e.to;
    if (!text.includes(from)) {
      if (!text.includes(to)) console.error(`  경고 — 자리 지정 치환 대상을 못 찾음: ${rel} :: ${from}`);
      continue;
    }
    text = text.split(from).join(to);
    record('자리 지정', from, to);
  }

  text = passVars(text);
  if (ext === '.scss' || ext === '.css') text = passDotSelectors(text);
  // class="…" 는 .js 안에도 있다 — nav.js 가 문자열로 마크업을 만든다. .html 에만 돌리면 놓친다
  // (실제로 nav.js 의 class="logo" 를 놓쳤고, docs↔CSS 클래스 대조로 잡혔다).
  if (ext === '.html' || ext === '.js' || ext === '.mjs') text = passClassAttrs(text);
  if (ext === '.html') text = passCodeTags(text, rel);
  // .html 은 <script> 안만, .js/.mjs 는 파일 전체를 리터럴로 본다.
  if (ext === '.html') text = passQuotedStrings(text, rel, true);
  if (ext === '.js' || ext === '.mjs') text = passQuotedStrings(text, rel, false);

  if (text !== original) {
    changedFiles++;
    if (!DRY) fs.writeFileSync(abs, text);
  }
}

// ── 보고 ────────────────────────────────────────────────────────
const byCtx = new Map();
for (const [k, count] of log) {
  const [ctx, pair] = k.split('\t');
  if (!byCtx.has(ctx)) byCtx.set(ctx, []);
  byCtx.get(ctx).push({ pair, count });
}
console.log((REVERSE ? '역방향 ' : '') + '리네임' + (DRY ? '(모의 실행)' : '') + ` — 파일 ${changedFiles}/${files.length}개 변경`);
console.log(`클래스 목록: ${CLASS_INVENTORY.size}개 (컴파일된 CSS 셀렉터에서 추출)`);
for (const [ctx, items] of [...byCtx].sort()) {
  const total = items.reduce((a, b) => a + b.count, 0);
  console.log(`\n== ${ctx} — 고유 ${items.length}종 / ${total}건 ==`);
  for (const { pair, count } of items.sort((a, b) => a.pair.localeCompare(b.pair))) {
    console.log(`   ${pair}  x${count}`);
  }
}

// 보류한 맨 낱말. 확인 완료(BARE_OK)와 새로 나온 것을 나눠 낸다 — 섞어 내면 새 자리가 묻힌다.
const known = bareSkips.filter((s) => isBareOk(s.where, s.token));
const unknown = bareSkips.filter((s) => !isBareOk(s.where, s.token));
if (known.length) {
  console.log(`\n== 보류(확인 완료) — ${known.length}건 ==`);
  for (const b of BARE_OK) {
    const n = known.filter((s) => s.where === b.file && s.token === b.token).length;
    if (n) console.log(`   ${b.token}  x${n}  ${b.file} — ${b.why}`);
  }
}
if (unknown.length) {
  console.log(`\n== 보류(새로 나옴 — 사람이 봐야 한다) — ${unknown.length}건 ==`);
  for (const s of unknown) console.log(`   ${s.token}  ${s.where}  "${s.line}"`);
  console.log('   클래스라면 EXPLICIT 에, 클래스가 아니라면 BARE_OK 에 올린다.');
}
