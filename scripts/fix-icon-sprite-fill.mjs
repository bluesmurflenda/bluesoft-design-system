#!/usr/bin/env node
// icons/sprite.svg 는 Figma Icon Set 에서 수동으로 재추출·재조립되는 정적 파일이다(이 저장소에
// 조립 스크립트 없음, ADR-022). 재추출할 때마다 개별 아이콘의 fill 이 export 시점 리터럴 hex
// (#525252 — icon/primary 라이트값(neutral-600)과 우연히 일치)로 박혀 들어온다.
//
// .icon 컨테이너에 CSS color 를 걸어도 <use> 가 참조하는 <symbol> 내부 <path> 에 이미 자체
// fill 지정값이 있으면 상속으로 못 덮어쓴다(SVG/CSS 명세 — 요소 자신의 지정값이 조상의 상속값보다
// 우선). 그래서 소스 단계에서 currentColor 로 치환한다.
//
// icons/raw/base/*.svg(개별 원본)는 건드리지 않는다 — icons/sprite.svg(배포 산출물)만 고친다.
// 정확히 fill="#525252" 문자열만 치환한다 — 브랜드 로고(icon-base-social-google 의 #4285F4 등)와
// duotone 아이콘군(icon-duo-*, stroke 기반이라애초 대상 아님)은 안 건드린다.
//
// 아이콘을 Figma 에서 새로 받아 icons/sprite.svg 를 다시 커밋할 때마다 이 스크립트를 다시 돌린다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SPRITE = path.join(ROOT, 'icons/sprite.svg');

const BASE_ICON_FILL = '#525252'; // icon/primary 라이트 모드 값 — base 아이콘 전용, 브랜드 로고 아님

const src = fs.readFileSync(SPRITE, 'utf8');
const pattern = new RegExp(`fill="${BASE_ICON_FILL}"`, 'g');
const matches = src.match(pattern);

if (!matches) {
  console.log('fix-icon-sprite-fill: 치환 대상 없음 (이미 처리됐거나 sprite 구조가 바뀜 — 직접 확인 필요)');
  process.exit(0);
}

const out = src.replace(pattern, 'fill="currentColor"');
fs.writeFileSync(SPRITE, out);
console.log(`fix-icon-sprite-fill: fill="${BASE_ICON_FILL}" -> fill="currentColor" ${matches.length}건 치환 (icons/sprite.svg)`);
