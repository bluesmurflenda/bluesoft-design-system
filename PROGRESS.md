# 진행 상태

**커서가 갱신한다.** 한 단계를 끝낼 때마다 여기에 적는다.
세션이 끊겨도 이 문서를 읽으면 어디서 재개할지 알 수 있다.

작업 순서는 `CLAUDE.md` 11장에 있다.

---

## 현재 단계

```
3단계 완료 — 4단계(입력 계열) 진행 대기
```

---

## 단계별 상태

| 순서 | 대상 | 상태 | 완료일 | 비고 |
|---|---|---|---|---|
| 0-a | `figma/tokens.*.json` · `tokens.ids.json` 추출 | 완료 | 2026-08-30 | MCP(`use_figma`)로 4개 컬렉션(553개 변수) + id→이름 맵 추출. 각 파일 `count` 필드와 실제 개수 일치 확인 |
| 0-b | `scripts/` 검사 스크립트 | 완료 | 2026-08-30 | 아래 "0단계 완료 메모" 참조 — 스크립트는 정상 동작하지만 `check:tokens`·`check:nodes` 자체는 아직 그린이 아니다(기존 코드의 실제 문제를 찾아냈기 때문 — 의도된 결과) |
| 1 | `tokens/` 4개 파일 | 완료 | 2026-08-30 | 아래 "1단계 완료 메모" 참조. `check:tokens` 자체는 아직 전체 그린이 아니다 — 남은 실패는 대부분 컴포넌트 파일 소관(3~7단계) |
| 2 | `abstracts/` + `base/_typography.scss` | 완료 | 2026-08-30 | 아래 "2단계 완료 메모" 참조 |
| 3 | 버튼 계열 | 완료 | 2026-08-30 | 아래 "3단계 완료 메모" 참조 |
| 4 | 입력 계열 | 대기 | | |
| 5 | 상태 표시 | 대기 | | |
| 6 | 테이블 · 보드 | 대기 | | |
| 7 | 내비게이션 · 표시 | 대기 | | |

상태: `대기` → `진행` → `검사통과` → `완료`

**`검사통과` 는 `npm run check:nodes` · `check:tokens` · `build` 셋 다 통과한 상태다.**

---

## 컴포넌트별 상태

단계 안에서 컴포넌트 단위로 기록한다. 시작할 때 행을 추가한다.

| 단계 | 컴포넌트 | 상태 | 비고 |
|---|---|---|---|
| | | | |

---

## 발견한 불일치

**문서와 Figma 라이브가 다르면 여기에 적는다.** 라이브가 이긴다.
Claude 앱이 확인해 문서를 고치거나 Figma 를 고친다.

| 날짜 | 대상 | 문서(코드) | 라이브(Figma) | 처리 |
|---|---|---|---|---|
| 2026-08-30 | `tokens/_primitive.scss` 색상 변수 전체 | `--color-blue-500` 등 `color-` 접두사 | 접두사 없음(`--blue-500`) | **처리 완료(ADR-018)** — 1단계에서 전면 리네임, `$color-*`/`--color-*` 참조하던 16개 파일도 함께 정리 |
| 2026-08-30 | `tokens/_primitive.scss`의 `slate` 램프(50~950) | 존재했음 | 삭제됨(ADR-001, `neutral`로 통합) | **처리 완료** — `_primitive.scss`를 `figma/tokens.primitive.json`에서 재생성해 자연히 제거(Figma에 slate가 없음). `_modal.scss`·`_side-nav-item.scss`·`_tabs.scss`가 쓰던 `$color-slate-*`는 같은 단계 `neutral`로 리매핑 |
| 2026-08-30 | `tokens/_primitive.scss` | `--font-leading-prose-md` 등 신규 프리미티브 없음 | 존재 | **처리 완료** — 재생성으로 194개 전부 포함 |
| 2026-08-30 | 다수 컴포넌트의 `neutral` 계열 하드코딩 hex가 실제로는 옛 `slate` 값 | `#f1f5f9`·`#e2e8f0`·`#0f172a` 등(slate 계열 값) | `neutral` 계열 값으로 대체됨 | **아직 남음 — 3~7단계 소관.** `button/tertiary/*`·`tabs/track/bg`·`tabs/border`·`tabs/segmented/fg-active`·`chip/neutral/*`·`table/border`·`table/row/bg-hover`·`con/*`·`tooltip/*` 등 컴포넌트별 인라인 hex가 대상(`check:tokens` S2 불일치 49건) |
| 2026-08-30 | `_Checkbox base` validation 링(valid/invalid) | Figma에서 `green/*`·`red/*` 프리미티브 직접 바인딩 | (Figma 라이브 상태 그 자체가 원인) | **결정됨(ADR-019)** — 의도된 것, `D1_NODE_EXCEPTIONS`에 등록 |
| 2026-08-30 | `Avatar`의 `Online` 표시 링 | Figma에서 `white` 프리미티브 직접 바인딩 | (Figma 라이브 상태 그 자체가 원인) | **결정됨(ADR-019)** — 의도된 것, `D1_NODE_EXCEPTIONS`에 등록(전역 허용 아님 — `Avatar`에서만) |
| 2026-08-30 | `_header.scss`의 nav 전환 breakpoint | `$css-breakpoint-lg: 1280px`(컴파일타임 상수, `_header.scss` 자체 실측 근거) | `_breakpoint.scss` 신규 토큰 미디어쿼리는 Figma Desktop 기준폭(1440) 사용 | **7단계로 미룸(막힌 게 아니다)** — 1280~1440px 구간에서 헤더 레이아웃 전환과 디자인 토큰 값 전환이 어긋난다. 7단계(내비게이션) `_header.scss` 재실측 때 1280을 1440으로 맞출지 결정 |

---

## 0단계 완료 메모 — `check:tokens`·`check:nodes` 실행 결과 요약(1단계 시작 전 스냅샷)

| 검사 | 상태 | 건수 |
|---|---|---|
| S1 hex 하드코딩 | FAIL | 439 |
| S2 Figma↔CSS 대조 | FAIL | 704(누락 491·CSS전용 157·불일치 56) |
| S3 미정의 변수 | FAIL | 10 |
| S4 컴포넌트 프리미티브 직접 참조 | FAIL | 57 |
| S5 중복 오버라이드 | WARN | 144 |
| D1 컬러 프리미티브 직접 참조 | FAIL | 23 |
| D2·D10 | PASS | 0 |

`check:nodes`는 D1 예외 처리(ADR-019) 후 전부 PASS — 아래는 그 이후, 1단계 완료 시점 재측정.

---

## 1단계 완료 메모 — `tokens/` 4개 파일 재작성 결과

**작업**: `_primitive.scss`·`_theme.scss`(구 `_semantic.scss`, ADR-018에 따라 개명)·`_shape.scss`·
`_breakpoint.scss`를 각각 `figma/tokens.*.json` 스냅샷에서 **기계적으로 생성**했다(스크립트로 생성 후
Read로 검토 — 194·44·35·34개 항목을 손으로 옮겨 적지 않음). 파일 쓸 때마다 `npm run check:tokens`로
S2 감소를 확인하며 순서대로 진행했다.

| 시점 | S1 | S2(누락·전용·불일치) | S3 | S4 | S5 |
|---|---|---|---|---|---|
| 0단계 종료 | 439 | 704 (491·157·56) | 10 | 57 | 144 |
| `_primitive.scss` + `_theme.scss` 후 | 370 | 432 (355·23·54) | 10 | **0** | 6 |
| `_shape.scss` 후 | 370 | 361 (286·23·52) | 10 | 0 | 3 |
| `_breakpoint.scss` 후 | 350\* | 261 (190·22·49) | 10 | 0 | 3 |

\*S1이 370→350으로 준 건 `_breakpoint.scss` 때문이 아니라, 같은 타이밍에 고친 S1 자체의 오탐(주석
안 예시 코드 스캔) 제거분이다.

**함께 처리한 것**:
- `--color-*`/`$color-*` 전면 리네임 — 컴포넌트 16개 파일 + `utilities/_reset.scss` +
  `_project-overrides.example.scss`(주석 포함). `slate` 잔존 4곳(`_modal.scss` 2·`_side-nav-item.scss`·
  `_tabs.scss`)은 `neutral`로 리매핑(ADR-001 반영).
- `_semantic.scss` → `_theme.scss` 개명, `@use` 참조 8곳(`main.scss` 포함) 갱신, 원본 삭제.
- `_theme.scss` 스코프는 **일반 시맨틱만**(accent·brand·border·surface·text·icon, 44개) — 컴포넌트별
  시맨틱(button/chip/tabs 등 244개)은 여전히 각 컴포넌트 SCSS 소관(기존 아키텍처 유지, 3~7단계에서 정리).
  `icon/*` 6개는 ADR-004에서 결정만 되고 한 번도 코드에 반영된 적 없던 그룹 — 이번에 처음 추가됨.
- `abstracts/_maps.scss`·`components/_header.scss`가 쓰는 `$css-breakpoint-sm/md/lg`(768/1024/**1280**)는
  `var()`로 못 바꾸는 컴파일타임 상수라 값 그대로 보존했다 — Figma의 Desktop 기준폭(1440)과 다르다.
  `_breakpoint.scss`의 새 토큰값 미디어쿼리는 Figma 기준폭(768/1024/**1440**/1920)을 그대로 쓰므로,
  "헤더 nav 전환은 1280에서, 디자인 토큰 값 전환은 1440에서" 라는 어긋남이 생긴다 — 의도적으로 건드리지
  않았다(7단계 내비게이션 작업 범위). **확인 필요 — 막힌 것 참조.**
- `scripts/lib/tokens.mjs`의 `cssVarName()`이 공백을 안 치환해 `effect/focus ring`(Figma 쪽 네이밍에
  공백이 섞인 버그)을 오탐하던 것을 수정.

**S1 350건 — 왜 안 없어졌는지**: 전부 **컴포넌트 파일이 `--x-bg` 같은 커스텀 프로퍼티 값에 hex를
직접 쓴 것**이지 `tokens/`의 문제가 아니다. `tokens/_theme.scss`가 컴포넌트별 시맨틱을 담당하지
않기로 한 것과 같은 이유(위 항목) — 그 컴포넌트들을 손대는 3~7단계에서 자연히 정리된다.

| 건수 | 파일 |
|---|---|
| 46 | `_button.scss` |
| 38 | `_alert.scss` |
| 34 | `_con.scss` |
| 28 | `_calendar.scss` |
| 28 | `_tabs.scss` |
| 26 | `_checkbox-radio.scss` |
| 24 | `_chip.scss` |
| 16 | `_icon-button.scss` |
| 16 | `_select.scss` |
| 16 | `_table.scss` |
| 14 | `_header.scss` |
| 12 | `_card.scss` |
| 12 | `_dropdown.scss` |
| 12 | `_pagination.scss` |
| 12 | `_tooltip.scss` |
| 8 | `_side-nav-item.scss` |
| 4 | `_avatar-group.scss` |
| 4 | `_scrollbar.scss` |

**S2 남은 261건도 같은 이유** — `onlyincss`(22건)는 컴포넌트가 Figma 이름과 다르게 줄여 쓴 CSS 변수명
(`--pagination-border` vs Figma `pagination/group/border` 등), `mismatch`(49건)는 전부 `button/tertiary/*`·
`tabs/*`·`chip/neutral/*`·`table/*`·`con/*`·`tooltip/*`의 인라인 hex가 옛 slate 값으로 남은 것. `missing`
(190건)은 대부분 컴포넌트별 시맨틱 244개 중 아직 코드에 없는 것들.

**D3~D9·D11~D13(변수 메타데이터 검사)은 스크립트 대상이 아니다** — Figma Variables REST API가
Enterprise 전용이라 401. 필요할 때 Figma MCP로 대화 중 수동 실행한다(`scripts/README.md` 참조).

---

## 2단계 완료 메모 — `abstracts/` + `base/_typography.scss`

**작업**: `_maps.scss`·`_mixins.scss`·`_functions.scss`·`base/_typography.scss`(구
`utilities/_typography.scss`). 파일마다 `check:tokens` 확인 — 이 단계는 값이 아니라 참조 구조를
바꾸는 것이라 S1~S7 건수는 그대로다(261/350 등 1단계 종료 시점과 동일, 회귀 없음만 확인).

- `$type-scale`(`_maps.scss`): size/lh가 primitive 고정값을 직접 참조하던 걸 고쳤다. display
  6종 + body-lg/xl/2xl(9종)은 `tokens/_breakpoint.scss`가 1단계에서 만든 뷰포트별 `--type-*`를,
  나머지 body-2xs/xs/sm/md(Figma에 반응형 값 없음)는 `--font-size-body-*`를 그대로 쓴다 — 어느
  쪽도 px 리터럴을 맵에 넣지 않는다.
- `text()`(`_mixins.scss`): `$weight` 기본값을 `regular`→`null`로. 굵기 없이 부르면 `font-weight`
  선언 자체를 안 낸다. 기존 호출 39곳 전부 굵기를 명시적으로 넘기고 있어 회귀 없음(grep으로 확인).
- `space()`/`radius()`(`_functions.scss`): 이미 CSS 변수 반환·Map은 키 검증용이라는 요구사항과
  일치해서 손대지 않았다.
- `base/_typography.scss`: 로직은 그대로(이미 굵기 미포함), `utilities/` → `base/`로 이동
  (`_reset.scss`도 같이) — CLAUDE.md 11장 문서 구조와 실제 코드가 달랐던 것을 맞췄다. `main.scss`
  `@use` 경로 갱신.

---

## 3단계 완료 메모 — 버튼 계열(Button·Icon Button·Social Button)

**작업**: Figma MCP로 세 컴포넌트를 각각 다시 조회했다(`get_variable_defs` — 라이브 인스턴스가
실제로 바인딩한 변수를 이름·값으로 확인하는 방식, node id는 Button 182:45·Icon Button
390:5196·Social Button 422:6313). 조회 결과를 `figma/tokens.theme.json`의 `button/*`(40개)와
대조해 재작성했다.

| 시점 | S1 | S2(누락·전용·불일치) |
|---|---|---|
| 2단계 종료 | 350 | 261 (190·22·49) |
| `_button.scss` 후 | 304 | 217 (156·22·39) |
| `_icon-button.scss` 후 | 288 | 183 (130·14·39) |
| `_social-button.scss` 후 | 288 | 183 (변화 없음 — 값 정확성 수정이라 카운트에는 안 잡힘) |

**발견한 것**:
- `_button.scss`가 `button/*` 시맨틱을 커스텀 프로퍼티로 노출하지 않고 프리미티브·하드코딩
  hex를 직접 썼다. 그 값 자체도 낡아서(예: `tertiary bg`↔`bg-hover`가 라이트/다크 뒤바뀌어
  있었고, `disabled-bg/fg/border`가 옛 slate 값) 실제 렌더링이 Figma와 달랐다.
- `_icon-button.scss`의 `--icon-btn-ghost-*` 커스텀 프로퍼티는 Figma에 대응하는 이름이 없었다
  — `get_variable_defs`로 실제 이름이 `button/ghost-inverse`·`button/ghost-brand`·
  `button/ghost-white`(Icon Button 전용이 아니라 button 네임스페이스 공유)임을 확인, 이름을
  맞췄다.
- `_social-button.scss`의 outline/google 배경·테두리·글자색이 `$neutral-300`/`$neutral-700`/
  `$white` 프리미티브 직접 참조라 다크모드에서 안 바뀌었다. `get_variable_defs`로 실제 바인딩을
  확인해 `var(--button-outline-border)`/`var(--button-outline-fg)`/`var(--surface-default)`로
  교체 — 이 중 배경은 `button/outline/bg`가 아니라 `surface/default`에 바인딩돼 있어(라이트는
  같은 값, 다크는 neutral-900 vs -950로 다름) 그대로 구분해서 반영했다.

**방법**: 라이트·다크 별칭 대상 이름이 같은 토큰(예: `ghost/fg`→`text/secondary`)은 다크
블록에 재선언하지 않는다 — 별칭 체인이 알아서 다크값을 물어온다. 이름은 같아도 **최종
resolve된 색이 같은지**가 아니라 **별칭이 가리키는 대상 이름이 같은지**로 판단해야 한다
(처음에 반대로 접근해서 25개 오버라이드가 나왔다가, 대상 이름 기준으로 다시 계산해 14개로
정정 — `primary/bg`는 라이트에서 `brand/600`을 가리키고 다크에서 `blue/600`을 직접 가리켜서
**최종값은 같아도**(`#2563eb`) 대상이 달라 오버라이드가 필요했던 반면, `ghost/fg`는 라이트·
다크 둘 다 `text/secondary`를 가리켜서 그 토큰 자신의 다크 처리에 맡기면 된다).

**알파 토큰**(`button/ghost/bg`·`scrim-dark/*`·`scrim-light/*`·`ghost-inverse/bg*`·
`ghost-brand/bg`·`ghost-white/bg`, 총 11개)은 Figma 원본이 별칭이 아니라 리터럴이라 S1 예외
주석(`/* 예외: 알파 */`)을 달고 그대로 뒀다 — 이게 S1 288건에서 tokens/ 관련으로 남아있는
합법적 예외다.

---

## 막힌 것

**`DECISIONS.md` 에 없는 판단이 필요해 멈춘 지점.**
사람이 결정하면 ADR 로 옮기고 여기서 지운다.

| 날짜 | 단계 | 내용 |
|---|---|---|
| 2026-08-30 | 1단계(`figma/tokens.primitive.json`) | Figma `effect/focus ring` 변수명에 공백이 있다(`effect/focus-ring`이어야 함 — 코드 쪽 문제 아니라 Figma 쪽 네이밍 버그). 코드 작업 세션은 Figma 쓰기 API를 안 쓰므로 여기서 멈추고 보고만 한다. **지금은** `scripts/lib/tokens.mjs`의 `cssVarName()`이 공백을 하이픈으로 치환해 임시로 우회하고 있다 — Figma 쪽 이름이 고쳐지면(`effect/focus-ring`) 이 우회는 지워도 된다 |
| 2026-08-30 | 2단계(`abstracts/_mixins.scss`) | `container()`/`section()` 레이아웃 믹스인이 없다. 이전엔 "근거가 될 CSS 변수가 없어서" 보류였는데, 1단계로 그 변수(`--container-*`/`--section-*`)가 이미 생겨서 그 이유는 더 이상 유효하지 않다. 이번 2단계 지시 범위에 없어서 추가 안 함 — 만들지, 만든다면 시그니처를 어떻게 할지 확인 필요 |

---

## 검사 실패 이력

같은 항목이 반복 실패하면 검사 규칙이나 방침에 문제가 있다는 신호다.

| 날짜 | 항목 | 내용 | 원인 |
|---|---|---|---|
| | | | |
