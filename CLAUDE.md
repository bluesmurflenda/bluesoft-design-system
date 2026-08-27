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
scss/components/   button, icon-button, social-button, chip, tabs, table, board, calendar, modal, checkbox-radio, scrollbar
scss/utilities/    _reset, _typography
scss/_function.scss
scss/main.scss     진입점
icons/
docs/              GitHub Pages 시각화 페이지
```

LXP(`theme/coursemos/scss/coursemos`)의 `frame/`·`utilities/` 패턴을 참고하되, `frame`은 coursemos가 "페이지 종속적이지 않은 컴포넌트"를 가리키려 붙인 자체 명명이라 이 저장소엔 Moodle 전용 폴더(course/grade/mform 등)와 구분할 대상이 없어 `components/`로 바꿨다.

## 결정 사항

- 빌드 도구(Grunt 등)는 아직 안 붙임 — 필요해지면 그때 추가
- 시각화 웹페이지는 GitHub Pages(`/docs`)로 서빙 — repo를 public으로 둔다
- 위치는 SFTP 미러(`d:\ftp-blue`)와 무관한 순수 로컬 git 저장소
