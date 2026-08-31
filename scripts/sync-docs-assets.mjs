#!/usr/bin/env node
// docs/ 는 별도 저장소가 아니라 이 프로젝트가 컴파일한 결과물의 GitHub Pages 미러다.
// 예전엔 dist/main.css·icons/*를 손으로 복사해 넣어서 리네임·토큰 변경 때마다 낡았다
// (2026-08-29 마지막 수동 복사 이후 --color-* 접두사 제거(ADR-018)·slate 램프 삭제(ADR-001)
// 등을 전혀 못 따라감). `npm run build` 뒤에 postbuild로 자동 실행돼 다시는 안 낡게 한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const COPIES = [
  ['dist/main.css', 'docs/assets/main.css'],
  ['icons/sprite.svg', 'docs/assets/icons/sprite.svg'],
  ['icons/logo/logo-brand.svg', 'docs/assets/logo/logo-brand.svg'],
  ['icons/logo/logo-light.svg', 'docs/assets/logo/logo-light.svg'],
  ['icons/logo/logo-dark.svg', 'docs/assets/logo/logo-dark.svg'],
];

let copied = 0;
for (const [src, dest] of COPIES) {
  const srcPath = path.join(ROOT, src);
  const destPath = path.join(ROOT, dest);
  if (!fs.existsSync(srcPath)) {
    console.error(`sync-docs-assets: 원본 없음 — ${src}`);
    process.exitCode = 1;
    continue;
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  copied++;
  console.log(`docs 동기화: ${src} -> ${dest}`);
}

if (copied === COPIES.length) {
  console.log(`docs/assets 동기화 완료 (${copied}개 파일)`);
}
