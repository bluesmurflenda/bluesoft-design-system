# bluesoft-design-system

BLUESOFT 디자인시스템(SCSS)을 SI 프로젝트마다 복붙해 쓸 master SCSS로 코드화하는 저장소.
LXP(coursemos)용이 아니다 — LXP는 Moodle+Grunt 종속이라 별개이며 `coursemos-publishing` 스킬 대상이 아니다.

## 참조

- Figma DS Master: fileKey `kJD5jv7RNKxLD1hP8oKtBG`
- Figma Icon Set: fileKey `T4yvRXEYW0GKecETo3CyYc`
- GitHub: https://github.com/bluesmurflenda/bluesoft-design-system.git
- DS 최신 상태(컴포넌트 스펙·토큰 체계): `~/.claude/ds/bluesoft-ds.md`

## 폴더 구조

```
scss/tokens/       _primitive, _semantic, _breakpoint, _shape
scss/components/   button, icon-button, social-button, chip, tabs, table, board, calendar, modal, checkbox-radio, scrollbar 외
scss/utilities/    _reset, _typography
scss/_function.scss
scss/_project-overrides.example.scss   SI 프로젝트 복붙 시 브랜드색 등을 오버라이드하는 템플릿(main.scss 미포함, 사용법은 파일 상단 주석 참조)
scss/main.scss     진입점
icons/
docs/              GitHub Pages 시각화 페이지
```

## 결정 사항

- 빌드 도구(Grunt 등)는 아직 안 붙임 — 필요해지면 그때 추가
- 시각화 웹페이지는 GitHub Pages(`/docs`)로 서빙 — repo를 public으로 둔다
- 위치는 SFTP 미러(`d:\ftp-blue`)와 무관한 순수 로컬 git 저장소
- **배포 방식은 복붙 고정**(2026-08-28): 회사 내부 사이트를 제외한 외부 상업 프로젝트는 프로젝트 성격이 저마다 달라 `scss/` 폴더를 그대로 복붙해 쓴다. git subtree·npm 패키지화 같은 자동 업데이트 전파 방식은 검토하지 않는다 — 프로젝트별 브랜드색 차이는 복붙한 뒤 `:root`에서 필요한 `--color-*`만 덮어쓰는 식으로 대응(코어 파일 수정 없이 가능, CSS 커스텀 프로퍼티 구조 덕분).
- **토큰은 CSS 커스텀 프로퍼티 기반**(2026-08-28, 다크모드 대비). `_primitive.scss`가 `:root`/`[data-theme='dark']`에 `--color-*` 등을 정의하고, 기존 `$color-*` SCSS 변수는 전부 `var(--color-*)`를 가리키는 별칭이다 — 컴포넌트 파일은 `$변수`를 그대로 쓰면 된다. `_semantic.scss`도 자체 `--accent-*`/`--brand-*` 등 한 겹을 더 두고 primitive의 `var()`를 참조한다(primitive→semantic→component 3단).
  **Figma Theme 컬렉션에 Dark 모드가 아직 없어서** `[data-theme='dark']` 블록은 구조만 두고 light와 완전히 같은 값을 임시로 넣어뒀다. Figma에 실제 다크 값이 생기면 `_primitive.scss`의 다크 블록 색상 항목만 교체하면 된다(컴포넌트 파일은 손댈 필요 없음).
