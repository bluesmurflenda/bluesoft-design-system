# 진행 상태

**커서가 갱신한다.** 한 단계를 끝낼 때마다 여기에 적는다.
세션이 끊겨도 이 문서를 읽으면 어디서 재개할지 알 수 있다.

작업 순서는 `CLAUDE.md` 11장에 있다.

---

## 현재 단계

```
7단계 완료 — 11장에 정의된 7단계 전부 완료. 남은 건 7단계 후 일괄 처리하기로 미뤄둔
Figma 수정 3건(아래 "막힌 것") 뿐이다.
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
| 4 | 입력 계열 | 완료 | 2026-08-31 | 아래 "4단계 완료 메모" 참조 |
| 5 | 상태 표시 | 완료 | 2026-08-31 | 아래 "5단계 완료 메모" 참조 |
| 6 | 테이블 · 보드 | 완료 | 2026-08-31 | 아래 "6단계 완료 메모" 참조 |
| 7 | 내비게이션 · 표시 | 완료 | 2026-08-31 | 아래 "7단계 완료 메모" 참조 |

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
| 2026-08-30 | `_header.scss`의 nav 전환 breakpoint | `$css-breakpoint-lg: 1280px`(컴파일타임 상수, `_header.scss` 자체 실측 근거) | `_breakpoint.scss` 신규 토큰 미디어쿼리는 Figma Desktop 기준폭(1440) 사용 | **처리 완료(7단계)** — 1280→1440으로 정정. 근거는 아래 "7단계 완료 메모"의 "브레이크포인트 결정" 참조 |

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

## 4단계 완료 메모 1/2 — codeSyntax 전수 대조(553개)에서 발견한 것

`text/danger`의 실제 codeSyntax가 `--text-error`임을 확인하는 김에(4단계에서 `choice/label/
fg-invalid`가 이 토큰을 가리켜서 발견) **전체 변수의 codeSyntax.WEB을 기계적 변환(슬래시→하이픈)과
전수 대조**했다(`use_figma`). 10건 불일치 — 이미 아는 것(`effect/focus ring` 공백) 제외하면:

- **`text/danger` → `--text-error`**: 의도된 리네임으로 보고 반영(`_theme.scss`, ADR 없이 처리
  — 단순 이름 정합화). `scripts/lib/tokens.mjs`에 `CODE_SYNTAX_OVERRIDES` 로 등록해 S2가 계속
  맞게 비교하게 함.
- **`table/header-col/bg`·`/fg` → codeSyntax가 `--table-header-bg`/`-fg`**(`-col` 없음, 반면
  `table/header-row/*`는 정상적으로 `-row`가 붙어있다): 두 다른 토큰이 겹치는 이름을 가리키는
  게 아니라 `header-col` 쪽 codeSyntax가 갱신 안 된 것으로 보인다. **6단계(테이블) 소관 —
  그때 Figma에서 실측 확인 필요.**
- **`con/white/*` 6개(`bg-hover`·`fg-hover`·`border-hover`·`fg-selected`·`bg-selected`·
  `border-selected`)**: codeSyntax가 서로 뒤섞여 있다(`fg-selected`가 `--con-bg-selected`를,
  `bg-selected`가 `--con-fg-selected`를 가리키는 식) — 이건 의도된 리네임이 아니라 **Figma
  쪽 데이터 오류로 보인다.** 코드에 반영하지 않았다 — **5단계(con) 진행 시 Figma에서 재확인
  필요, 코드 작업 세션에서 고칠 수 없다(쓰기 API 안 씀).**

---

## 4단계 완료 메모 2/2 — 입력 계열(Input·Textarea·Select·Dropdown·_List/*·Checkbox·Radio·Toggle·Upload)

**작업**: `get_variable_defs`로 Input(293:855)·Textarea(344:381)·Select(316:644)·
Checkbox(308:306)·Radio(309:923)·Toggle(719:281)·Upload Dropzone/Item(1366:17664·17718)을
다시 조회하고, `field/*`·`list/*`·`choice/*`·`toggle/*` Theme 그룹과 대조해 재작성했다.

| 시점 | S1 | S2(누락·전용·불일치) |
|---|---|---|
| 3단계 종료 | 288 | 183 (130·14·39) |
| codeSyntax 정리 후 | 288 | 181 (130·14·37) |
| `_input.scss` 후 | 260 | 173 (124·14·35) |
| `_dropdown.scss`+`_select.scss` 정리 후 | 260 | 173 (변화 없음 — 중복 제거·참조 정리라 카운트엔 안 잡힘) |
| `_textarea.scss` 후 | 260 | 173 (원래 hex 0건이라 변화 없음) |
| `_checkbox-radio.scss` 후 | 234 | 163 (114·14·35) |
| `_upload.scss` 후 | 234 | 163 (변화 없음 — 값 정정이라 카운트엔 안 잡힘) |

**지시받은 것 확인**:
- Input의 `_*base`(Size)+`wrapper`(State·Validation) 2단 구조 — 코드는 이미 `.input`에
  `.input-{size}`·`.input-{validation}` 클래스를 조합하는 방식이라 그대로 두었다.
- `filled`==`normal` — `$input-validation-colors`·`$select-validation-colors` 둘 다 이미
  `filled` 키가 없어서 손댈 것 없었다.
- invalid/valid 포커스 링이 이름은 "30%"지만 실제 alpha 1.0 — `get_variable_defs`로 재확인,
  기존 코드가 이미 solid `$red-200`/`$green-100`을 쓰고 있어 맞았다.
- 유효성 색(red/green) 프리미티브 직접 참조 — 그대로 유지, 시맨틱으로 바꾸지 않았다.
- `_List/Item` `height`+`align-items:center` — 기존 코드가 이미 이렇게 돼 있었다.
- `_List/Item` focus 링 — Figma에 없어서 `dropdown.scss`에 새로 추가(`:focus-visible`,
  다른 곳과 같은 컨벤션의 2px ring).

**발견해서 고친 것**:
- `field/*`(bg·border·border-hover·border-focus·border-disabled·fg·fg-placeholder·label/fg·
  hint/fg)가 **`select.scss`·`dropdown.scss`·`input.scss` 세 곳에 흩어져 하드코딩 hex로
  중복 선언**돼 있었다(다행히 값은 서로 일치). `input.scss`를 소유자로 정해 하나로 모으고,
  나머지는 `var(--field-*)` 참조만 남겼다. `dropdown.scss`는 `--field-bg`를 선언한 적도
  없이 참조만 하고 있었다(select.scss가 어쩌다 먼저 선언해 우연히 동작한 것) — 이것도 정리.
- `.input__control`의 색이 `$neutral-700`(#404040)으로 하드코딩돼 있었는데 실제 바인딩은
  `field/fg`=`text/primary`=neutral-800(#262626)이었다 — 다크모드 대응도 없었다(파일 자체에
  `[data-theme=dark]` 블록이 아예 없었음).
- `_checkbox-radio.scss`의 `selected-bg`가 `$blue-500`이었는데 실제는 `$blue-600`(#2563eb) —
  `get_variable_defs`로 확인한 값 자체가 틀렸던 경우.
- `dropdown.scss`·`select.scss`의 셰브론/아이콘 색(`$neutral-600` 고정값)이 실제로는
  `icon/primary`였다 — 1단계에서 icon/* 시맨틱을 추가하기 전에 쓰인 코드라 그때는 대응
  변수가 없어서 고정값을 썼던 것(주석에 그렇게 적혀 있었다), 이제는 `var(--icon-primary)`로
  다크 대응이 생겼다.
- `upload.scss`의 dropzone 테두리 — 파일 자체 주석은 "field/border가 맞다"고 했지만
  `get_variable_defs` 재조회 결과는 `border/default`였다. 라이브가 이겨서 되돌렸다
  (PROGRESS.md 발견한 불일치에 기록 안 함 — 같은 파일 안의 자기모순이라 여기만 기록).

**확인 안 되는 채로 둔 것**: ~~Upload Item의 파일 아이콘 색~~ — **해결(2026-08-31)**. 사용자가
Upload/Item 전체 바인딩을 확인해줬다: Featured icon 배경=`surface/brand-subtle`(이미 맞았음),
파일 아이콘=`icon/primary`(brand/600 아님 — 그건 progress-bar의 Fill이었다), progress-bar
Track=`surface/brand-subtle`·Fill=`brand/600`(이미 맞았음), 액션 버튼 아이콘=`button/ghost/fg`·
done 체크=`choice/box/fg-selected`(둘 다 공유 컴포넌트를 통해 이미 맞음). `$upload-icon-fg`만
`var(--icon-primary)`로 수정.

---

## 5단계 완료 메모 — 상태 표시(Chip·Chip/dot·Con·Alert·Card·Tooltip·Help icon·Featured icon)

**작업**: `figma/tokens.theme.json`(1단계에 커밋된 스냅샷, 재추출 안 함 — 7단계까지 기준값 고정)에서
`chip/*`·`con/*`·`alert/*`·`card/*`·`tooltip/*` 그룹을 그대로 옮겨 `:root`/`[data-theme='dark']`를
재작성했다. 오버라이드는 "라이트·다크 별칭 대상 이름이 다른 것만" 원칙으로 판단했다.

| 시점 | S1 | S2(누락·전용·불일치) | S3 | S5 |
|---|---|---|---|---|
| 4단계 종료 | 234 | 163 | 0 | 3 |
| `_con.scss` 후 | 200 | 159 | 0 | 2 |
| `_chip.scss` 후 | 176 | 155 | 0 | 2 |
| `_alert.scss`+`_card.scss`+`_tooltip.scss` 후 | 114 | 144 | 10 | 0 |
| `_modal.scss` 참조 수정 후 | 114 | 144 | 0 | 0 |

**지시받은 것 확인**:
- con의 gray 기본 배경은 `con/gray/bg` 토큰이 없어 `con/white/bg`를 참조한다 — 직접 재확인(17개
  `con/*` 변수 전수 열거)해 토큰 자체가 없다는 기존 주석이 맞았다. `$con-themes`의 `gray: (bg: var(--con-white-bg), ...)` 그대로 유지.
- con·card의 disabled는 opacity로 처리 — 둘 다 이미 그렇게 돼 있어 손댈 것 없었다.
- card hover 시 테두리 추가로 인한 레이아웃 시프트 방지(`border: 1px solid transparent` 선점) —
  `-default`·`-tinted` 둘 다 이미 그렇게 돼 있었다.
- tooltip 배경은 루트가 아니라 `.tooltip__content`에 — 이미 그렇게 구조돼 있었다.
- `tooltip/*`·`con/white/*-selected`는 다크에서 반전하지 않음 — 아래 "발견해서 고친 것" 참조,
  기존 코드는 이 규칙을 절반만(혹은 반대로) 지키고 있었다.
- featured-icon은 `chip/*` 재사용, info 색 없음(5종) — 이미 그렇게 구현돼 있어 손댈 것 없었다.

**발견해서 고친 것**:
- `_con.scss`: `con/white/fg-selected`·`border-selected`가 다크에서 반전되고 있었다(검정/밝은
  파랑으로 바뀌어 대비 붕괴). 실측 결과 `fg-selected`는 라이트·다크 별칭 대상이 둘 다 `white`라
  오버라이드가 필요 없고(그런데도 다크 블록에 재선언돼 있었다), `bg-selected`·`border-selected`는
  라이트에서 `brand-600`(다크에서 반전되는 램프)을 참조하므로 다크 블록에서 `blue-600`으로
  고정해야 반전을 막을 수 있다 — 이전 코드는 `bg-selected`만 고쳐져 있고 `border-selected`는
  그대로 반전되고 있었다.
- `_chip.scss`: `chip-neutral-bg`/`fg`가 슬레이트 계열 하드코딩(`#f8fafc`/`#475569`, ADR-001로
  폐기된 램프)이었다 — `var(--surface-subtle)`/`var(--text-tertiary)`로 교체.
- `_alert.scss`: `neutral` 그룹이 같은 슬레이트 드리프트(`#f8fafc`·`#e2e8f0`·`#334155`)였다 —
  `var(--surface-subtle)`·`var(--border-default)`·`var(--text-secondary)`로 교체. success·
  warning·error·info(border·fg만) 다크 오버라이드는 이전에 아예 없었다(라이트값이 다크에도
  그대로 적용되고 있었음) — 실측대로 추가.
- `_card.scss`: 전체가 하드코딩 hex였다. `card/fg`는 컴포넌트 설명상 "글자색"이지만 실측 별칭
  대상은 `icon/strong`이다 — 라이브가 이겨서 그대로 옮겼다(문서보다 실측 우선).
- `_tooltip.scss`: **반대로 구현돼 있었다.** 기존 코드는 `light`가 다크에서 반전(`#ffffff`→
  `#0a0a0a` 등)되고 `dark`는 `bg`·`fg`까지 불필요하게 재선언(S5 중복 오버라이드로 잡힘)돼
  있었다. 실측은 `dark`·`light` 둘 다 배경·주 텍스트가 고정이고, `dark`의 `fg-supporting`만
  실제로 갈린다(`white`→`neutral-300`, 대비 확보 목적) — 그 한 줄만 오버라이드로 남기고
  나머지는 전부 제거했다.
- `_modal.scss`: `$modal-icon-colors`가 `--featured-icon-brand-bg` 등 존재하지 않는 커스텀
  프로퍼티를 참조하고 있었다(S3 FAIL 10건, 신규 발견). `_featured-icon.scss`가 이전 단계에서
  자체 `--featured-icon-*`를 제거하고 `--chip-*`를 직접 참조하도록 리팩터됐는데, `modal.scss`
  쪽 참조는 그때 안 고쳐진 채 남아 있었다 — `--chip-*`로 맞춰 수리했다. modal 자체는 7단계
  대상이지만 이건 5단계 작업(featured-icon)이 깨뜨린 참조라 여기서 함께 고쳤다.
- `help-icon.scss`: 이미 `var(--text-tertiary)` 기반이라 손댈 것 없었다.

**S3b(WARN)**: `_featured-icon.scss`·`_modal.scss`가 `--chip-*`를 선언 없이 참조하는 10+10건이
새로 잡혔다 — 의도된 공유(둘 다 "chip과 완전히 같은 색상 맵" 재사용)라 WARN 그대로 둔다.

**5단계 종료 후 막힌 것 2건 해결**:
- Upload Item 파일 아이콘 — 재확인 결과 `_upload.scss`에 이미 정확히 반영돼 있었다(위 4단계
  메모 참조). Featured icon 배경(`$upload-icon-badge-bg: $surface-brand-subtle`)·액션 버튼
  아이콘(`.icon-btn-ghost`가 `button.scss`의 공유 `ghost` 변형을 재사용해 `var(--button-ghost-fg)`)도
  grep으로 다시 확인해 전부 일치를 확인했다 — 코드 변경 없음.
- `container()`/`section()` 레이아웃 믹스인 — `abstracts/_mixins.scss`에 사용자가 지정한
  시그니처 그대로 추가했다. `--container-max-width`는 ADR-006으로 Figma에서 삭제된 토큰이라
  CSS 폴백 `1200px`을 하드값으로 두고 그 줄에 ADR-006을 주석으로 남겼다.

---

## 6단계 완료 메모 — 테이블 · 보드(Table/Cell·Table·Table/Row·Table/Header·board-row·board-cell·board-header·board-card·board-list)

**작업**: Table/Cell(1046:96)·Table/Header(1046:1073)·Table/Row(1046:1036)·Table(1046:9840)·
board-row(1028:5850)·board-header(1030:37)·board-card(1031:9664)·board-cell(1038:889)·
board-list(1040:830)를 `get_variable_defs`+`get_metadata`로 다시 조회해 `table/*` Theme 그룹·
`table/cell/*`·`board/col/*` Shape 그룹과 대조·재작성했다.

| 시점 | S1 | S2(누락·전용·불일치) |
|---|---|---|
| 5단계 종료 | 114 | 144 |
| `_table.scss`+`_board.scss` 후 | 98 | 129 |

**지시받은 것 확인**:
- Table/Cell 높이는 `min-height`, padding-y 0 + `align-items:center`로 여백 — 이미 그렇게
  돼 있었다(손댈 것 없음, 이번엔 사이즈별 `height`/`padding-x`를 `_shape.scss`의 CSS 변수로
  바꾸는 김에 주석만 보강).
- Align 축이 `text-align`만이 아니라 셀 `justify-content` + Text block `align-items`가 함께
  바뀐다 — 기존 코드는 `justify-content`만 바꾸고 있었다. `.table-cell__text`에
  `display:flex;flex-direction:column;align-items`를 추가해 Align=left일 때 Text/Supporting
  스택 전체가 왼쪽 정렬되도록 고쳤다(Figma 메타데이터로 Text/Supporting 사이 gap이 0임도 확인).
- 슬롯은 이름이 아니라 사이징으로 — `__leading`(FIXED)·`__text`(HUG/FILL) 이미 그렇게
  구현돼 있어 주석만 명시.
- 컬럼 폭이 다른 테이블은 Table/Row 대신 셀 오토레이아웃 — 코드에 이미 flex 구조라 자연히
  지원됨, 그 취지를 주석으로 남겼다(별도 클래스 불필요).
- board-row notice 텍스트가 12 vs 15라던 기존 주석 — **재실측 결과 틀렸다.** 아래 "발견해서
  고친 것" 참조.
- `table/header-col/*` codeSyntax 깨짐(−col 누락) — 코드는 정상 이름 `--table-header-col-*`을
  쓰고 PROGRESS.md 기록 유지(아래 "막힌 것" 표, 변경 없음).

**발견해서 고친 것**:
- `_table.scss`: `--table-border`·`--table-header-*-bg/fg`·`--table-cell-fg`가 전부 slate 계열
  하드코딩(#e2e8f0 등)이었고 다크 전용 하드코딩도 따로 있었다 — `get_variable_defs`로
  Table/Header·Table/Row 라이브 바인딩을 직접 재조회하니 라이트·다크 값이 전부 같아서(둘 다
  `surface/subtle`·`text/primary` 등) `[data-theme=dark]` 오버라이드 자체를 없앴다.
  header-col/bg와 header-row/bg가 다른 값(neutral-50 vs slate-50)이라던 기존 주석은 slate→
  neutral 정리 이전의 낡은 측정이었다 — 지금은 둘 다 `surface/subtle`(#fafafa)로 같다.
- `_table.scss`: `--table-cell-fg-muted`를 Figma 실제 이름 `fg-supporting`으로 리네임
  (CLAUDE.md 7장 — 보조 텍스트 접미사 통일).
- `_table.scss`: `$table-cell-sizes` 맵이 `_shape.scss`가 1단계부터 이미 내보낸
  `--table-cell-min-height-*`·`--table-cell-padding-x-*` CSS 변수를 안 쓰고 리터럴 px를
  중복 선언하고 있었다 — 값은 같았지만 소스가 둘이라 하나로 합쳤다.
- `_table.scss`: `table/row/bg-alt`(지그재그 행 배경) 토큰을 신규 발견 — 기존 코드는 아예
  참조하지 않고 있었다. `markup.md` 규칙대로 `:nth-child(even)`로 적용, hover가 항상 이기도록
  선언 순서를 hover 뒤로 뒀다.
- `_board.scss`: `board/col/views`(100)·`board/col/date`·`board/col/meta`(둘 다 120) 3개
  Shape 토큰 중 `_board.scss`는 `.board-cell` 하나뿐이라 구분이 없다 — 리터럴
  `$board-col-width: 120px`를 `var(--board-col-meta)` 참조로 바꿔 중복을 없앴다.
  `board/col/views`(100)는 여전히 어떤 코드도 참조하지 않는 미사용 토큰으로 남는다(별도
  `.board-cell` variant가 없어서 손댈 데가 없음 — 삭제는 Figma 소관이라 하지 않음).
- `_board.scss`: **board-row notice 타이틀 축소가 틀렸다.** `get_metadata`로 Kind=post
  (1028:5816)·Kind=notice(1028:5840)의 Title 노드 크기를 직접 대조하니 둘 다 height 22로
  동일했다 — 기존 코드가 notice에 적용하던 "Body/2Xs/Medium"(12px)은 Title이 아니라 그 옆의
  Notice 배지(.chip, chip-brand-fg/bg와 함께 바인딩됨) 텍스트 스타일이었다. Title 폰트 축소
  오버라이드를 제거했다 — "공지" 표시는 배지를 조건부로 넣는 마크업만으로 끝난다.
- `_board.scss`: `board-card`에 Kind=notice 대응이 아예 없었다. `get_metadata`로 Kind=notice
  (1031:9648)가 post(1031:9618)보다 높이 30px 큰 이유를 확인 — Title 위에 Notice(.chip) 배지
  줄이 조건부로 추가되기 때문(board-row와 달리 인라인이 아니라 별도 줄)이다. `&__tags` 슬롯을
  신규 추가.

**S3b(WARN)**: `_board.scss`가 `--table-header-col-bg`·`-fg`·`--table-row-bg-hover`를 선언
없이 참조하는 3건 — 기존부터 있던 의도된 공유(테이블과 보드가 같은 헤더/호버 배경 재사용)라
WARN 그대로 둔다.

---

## 7단계 완료 메모 — 내비게이션 · 표시(Header·_Nav/Menu Item·_Nav/Announcement·_Side Nav/Item·Logo·Tabs/Item·Tabs/Segmented·Pagination·_Pagination/Number·Calendar·Day Cell·Modal·_Modal/*·Avatar·Avatar Group·Progress bar·Scrollbar)

**작업**: 16개 컴포넌트를 `get_variable_defs`·`get_metadata`·`use_figma`(componentPropertyDefinitions
직접 조회)로 다시 확인해 `figma/tokens.theme.json`·`tokens.shape.json`과 대조·재작성했다.

| 시점 | S1 | S2(누락·전용·불일치) |
|---|---|---|
| 6단계 종료 | 98 | 129 |
| Header+Side Nav+Tabs 후 | 48 | 66 |
| Pagination 후 | 36 | 52 |
| Calendar 후 | 8 | 48 |
| Modal+Avatar+Scrollbar 후 | 0(예외 처리 포함) | 9 |

### 브레이크포인트 결정 — `$css-breakpoint-lg` 1280 → 1440

**실측**: Header(833:40)의 `Width` 축은 `full`(1440 캔버스)·`1920`·`375` 세 값뿐이다 —
375는 높이 64(모바일, 햄버거), full/1920은 높이 80(데스크톱, 풀 메뉴)이고 **768·1024 구간을
보여주는 변형 자체가 없다.** `tokens/_breakpoint.scss`의 `--header-height`도 정확히
`@media(min-width:1440px)`에서 64→80으로 바뀐다(이 미디어쿼리 자체는 Figma Breakpoint
컬렉션의 실측 기준폭 768/1024/1440/1920을 그대로 쓴 것). 즉 Figma가 실제로 보여주는
"데스크톱 진입점"은 1440이고, 1280은 근거가 된 적이 없다.

**추가 확인**: `$css-breakpoint-lg`(1280이었던 그 상수)는 현재 `abstracts/_maps.scss`의
`$breakpoints` 맵에만 쓰이는데, 그 맵을 소비하는 `mq()` 믹스인은 코드베이스 어디에서도
호출되지 않는다(grep 확인, 죽은 코드). `_header.scss` 자신의 모바일 메뉴/햄버거 전환도 이
상수를 안 쓰고 `$css-breakpoint-sm`(768)만 쓴다 — 즉 1280→1440 변경은 **현재 컴파일 결과에
아무 영향이 없다**(회귀 위험 없음), 나중에 `mq('lg')`가 쓰이기 시작할 때를 위해 지금 Figma와
맞춰뒀다.

**결정**: `$css-breakpoint-lg: 1280px` → `1440px`. `tokens/_breakpoint.scss`에 근거 기록.

**남는 질문(막을 필요는 없음)**: 768·1024 구간에서 메뉴가 어떻게 보여야 하는지는 Figma에
데모 자체가 없어 여전히 근거가 없다 — 현재 코드는 768(sm) 이상에서 이미 풀 메뉴를 보여주는데,
이걸 1440까지 미루는 게 맞는지는 별도 확인이 필요한 사안이라 손대지 않았다.

### 컴포넌트별 요약

- **Header**: `nav/*` 라이트·다크 별칭이 거의 다 같은 대상이라(`nav-announcement-bg`만 예외)
  기존의 "site-header-dark가 사이트 다크모드에서 밝은 배경으로 반전" 하드코딩을 걷어냈다.
  **Surface=floating**을 신규 확인·구현(반투명 배경 `nav/bg-floating` #ffffffcc + `backdrop-filter:
  blur(16px)`) — 2026-08-28 당시 "확인 필요"로 남아 있던 것.
- **_Side Nav/Item**: `nav/dark-item/bg-hover`·`bg-selected`가 라이트·다크 별칭 대상이 완전히
  같다(둘 다 blue-800/blue-600 고정) — 기존 "⚠️ 확인 필요"(다크에서 밝은 하늘색으로 반전돼
  흰 글자와 대비가 무너지는 것처럼 보였던 값)는 Figma 문제가 아니라 **코드가 Theme=dark를
  진짜 다크모드처럼 반전시키던 버그**였다. 오버라이드를 없애 해결.
- **Tabs**: "텍스트가 전 타입·전 사이즈 Body/Sm 고정"이라던 기존 실측이 틀렸다 — 실제로는
  sm=Body/Sm(14)·md/lg=Body/Lg(16)·xl=Body/Xl(18)로 스케일한다(3개 Type 전부 동일 규칙,
  get_variable_defs로 12개 조합 대조). `.tabs-item` 베이스의 고정 `text(body-sm)` 호출을
  제거하고 사이즈별 맵으로 옮겼다 — 이전엔 md/lg/xl 탭이 전부 14px로 그려지고 있었다.
  `tabs/underline/indicator`(neutral-800)는 `tabs/underline/fg-active`(icon/strong)와 라이트에서
  같은 값(#262626)이라 currentColor로 합치고 싶어지지만 서로 다른 토큰이다 — 지시대로 별도
  프로퍼티 유지. segmented가 pill보다 사이즈마다 정확히 4px 작다는 것도 get_metadata로 확인
  (32/40/48/54 vs 28/36/44/50).
- **Pagination**: Figma엔 `pagination/border`가 따로 없고 numbers 타입의 구분선과 button-group
  테두리가 전부 `pagination/group/border` 하나를 같이 쓴다(get_variable_defs로 Type=numbers
  확인) — 이름을 `group-border`로 맞춤. 아이콘 색은 `$neutral-600` 고정값이었는데 실제 바인딩은
  `icon/primary`.
- **Calendar·Day Cell**: State×Day 우선순위(default·today·available은 Day가 이기고 selected·
  past·unavailable은 State가 이김)는 **기존 CSS 선언 순서가 이미 정확히 이 규칙대로였다** —
  건드리지 않고 주석으로 근거만 남겼다. `calendar/cell/unavailable-border`를 신규 발견 — 배경·
  글자색뿐 아니라 테두리도 있는데 기존 코드는 반영하지 않고 있었다.
- **Modal**: `modal/bg`가 `white` 프리미티브 직접 참조라 다크모드에서도 흰 모달이 그려지던
  문제(2026-08-28 "⚠️ 확인 필요")를 `modal/bg`(다크: neutral-800)로 해결. `modal/overlay`
  (딤드 배경)가 기존 코드에 아예 없어 `.modal-overlay` 신규 추가. Layout×Breakpoint가
  3×4=12가 아니라 8변형(alert 2종엔 lg·xl이 없음)이라는 걸 componentPropertyDefinitions로
  확인 — `.modal-lg`·`.modal-xl`은 `.modal-form`에만 조합하라고 주석으로 명시(CSS로 강제할
  방법은 없다).
- **Avatar / Avatar Group**: 기존 Avatar Group 노드 주석(584:6107)이 **틀린 id였다**(그
  id는 실제로 존재하지 않고 `_Doc/Header` 계열 문서 프레임 근방이었다) — 실제 Avatar Group은
  1363:255. Avatar 자체(Type image/initials/placeholder × Size xs~xl, Online bool, 13색
  Background 인스턴스 스왑)는 이전엔 "범위 밖"이라 32px 원형 하나만 최소 구현돼 있었는데
  이번에 정식 컴포넌트로 확장했다. Online 표시 링은 지시대로 box-shadow로(사이즈 계산 보존),
  크기는 아바타 크기의 정확히 1/4(get_metadata로 sm·xl 두 사이즈 대조 확인). avatar/c/01~13은
  시맨틱이 없는 컴포넌트 고유 팔레트라 줄마다 `/* 예외: ... */` 주석을 달고 리터럴로 유지.
- **Progress bar**: 이미 `width:%`로 구현돼 있었다(지시사항과 일치) — 손댈 것 없음. Figma
  Theme 컬렉션에 `progress-bar/*` 그룹 자체가 없어(11단계 변형은 시안 표현용이라는 지시와
  일치) 기존의 브랜드 램프 직접 참조($brand-600 등)도 그대로 유지.
- **Scrollbar**: `scrollbar/track/bg`·`thumb/bg`만 값 교체(라이트·다크 대상이 다름). thumb-hover는
  Figma에 대응 변수가 없어 기존처럼 primitive 상수 유지.
- **Logo**: 색 토큰이 없는 SVG 워드마크 컴포넌트라 이번 단계에서 변경 없음.

### 검증 없이 남겨둔 것 (Figma 수정 사안 아님 — 코드 스코프 밖이라 기록만)

- `tabs/underline/bg-hover`·`tabs/underline/border-hover` — Theme 컬렉션에 존재하지만
  Tabs/Item 컴포넌트 셋 전체(60변형)를 한 번에 조회해도 어디에도 바인딩되지 않는다(전수
  확인). Tabs/Item 소관이 아닌 것으로 결론 — 다른 컴포넌트가 쓰거나 미사용 토큰으로 보인다.
- `list/item/bg-selected`·`list/item/fg-supporting` — 4단계(`_dropdown.scss`)의 `_List/Item`
  구현이 `bg-selected`를 별도로 안 두고 `bg-hover`를 재사용하고 있고, `fg-supporting`은 아예
  없다. 4단계 소관이라 7단계에서 확장하지 않았다 — 필요하면 별도 확인.
- `--avatar-online-ring`은 Figma의 553개 변수엔 없는 CSS 전용 별칭이다(ADR-019의 `white`
  리터럴을 이름 붙인 것) — S2 CSS전용 1건으로 잡히지만 오탐이 아니라 의도된 것.

---

## 막힌 것

**`DECISIONS.md` 에 없는 판단이 필요해 멈춘 지점.**
사람이 결정하면 ADR 로 옮기고 여기서 지운다.

**7단계가 끝나 아래 3건이 이제 일괄 처리 대상이다.** 코드 작업 세션은 Figma 쓰기 API를 쓰지
않으므로 여기서 처리하지 않는다 — Figma 작업 세션이 셋 다 고친 뒤 `figma/tokens.*.json`을
재추출하면(퍼블리시 순서는 CLAUDE.md 9장) 그 스냅샷으로 `check:tokens` S2를 다시 돌려 확인한다.

| 날짜 | 단계 | 내용 |
|---|---|---|
| 2026-08-30 | 1단계(`figma/tokens.primitive.json`) | Figma `effect/focus ring` 변수명에 공백이 있다(`effect/focus-ring`이어야 함). **지금은** `scripts/lib/tokens.mjs`의 `cssVarName()`이 공백을 하이픈으로 치환해 임시로 우회하고 있다 |
| 2026-08-30 | 6단계(테이블) | `table/header-col/bg`·`/fg`의 codeSyntax가 `-col` 없이 `--table-header-bg`/`-fg`를 가리킨다(`table/header-row/*`는 정상). 코드는 정상 이름(`--table-header-col-*`)을 쓰고 있다 |
| 2026-08-30 | 5단계(con) | `con/white/*` 6개(`bg-hover`·`fg-hover`·`border-hover`·`fg-selected`·`bg-selected`·`border-selected`)의 codeSyntax가 서로 뒤섞여 있다(의도된 리네임이 아니라 데이터 오류로 보임) |

---

## 검사 실패 이력

같은 항목이 반복 실패하면 검사 규칙이나 방침에 문제가 있다는 신호다.

| 날짜 | 항목 | 내용 | 원인 |
|---|---|---|---|
| | | | |
