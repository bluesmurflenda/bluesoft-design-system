# 진행 상태

**커서가 갱신한다.** 한 단계를 끝낼 때마다 여기에 적는다.
세션이 끊겨도 이 문서를 읽으면 어디서 재개할지 알 수 있다.

작업 순서는 `CLAUDE.md` 11장에 있다.

---

## 현재 단계

```
0단계 완료 — 1단계(tokens/) 진행 대기
```

---

## 단계별 상태

| 순서 | 대상 | 상태 | 완료일 | 비고 |
|---|---|---|---|---|
| 0-a | `figma/tokens.*.json` · `tokens.ids.json` 추출 | 완료 | 2026-08-30 | MCP(`use_figma`)로 4개 컬렉션(553개 변수) + id→이름 맵 추출. 각 파일 `count` 필드와 실제 개수 일치 확인 |
| 0-b | `scripts/` 검사 스크립트 | 완료 | 2026-08-30 | 아래 "0단계 완료 메모" 참조 — 스크립트는 정상 동작하지만 `check:tokens`·`check:nodes` 자체는 아직 그린이 아니다(기존 코드의 실제 문제를 찾아냈기 때문 — 의도된 결과) |
| 1 | `tokens/` 4개 파일 | 대기 | | 0-b가 찾은 문제 상당수가 여기서 정리된다(아래 요약) |
| 2 | `abstracts/` + `base/_typography.scss` | 대기 | | |
| 3 | 버튼 계열 | 대기 | | |
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
| 2026-08-30 | `tokens/_primitive.scss` 색상 변수 전체 | `--color-blue-500` 등 `color-` 접두사 | 접두사 없음(`--blue-500`), `codeSyntax`도 이미 그 형태 | **결정됨(ADR-018)** — 1단계에서 `color-` 접두사 제거, Figma 이름 그대로 전면 리네임 |
| 2026-08-30 | `tokens/_primitive.scss`의 `slate` 램프(50~950) | 아직 존재 | 삭제됨(ADR-001, `neutral`로 통합) | 1단계에서 제거 |
| 2026-08-30 | `tokens/_primitive.scss` | `--font-leading-prose-md` 등 신규 프리미티브 없음 | 존재 | 1단계에서 추가 |
| 2026-08-30 | 다수 컴포넌트의 `neutral` 계열 하드코딩 hex | `#f1f5f9`·`#e2e8f0`·`#0f172a` 등(slate 계열 값) | `neutral` 계열 값으로 대체됨 | `check:tokens` S2 불일치 56건 중 다수가 이 패턴 — 1단계에서 정리 |
| 2026-08-30 | `_Checkbox base` validation 링(valid/invalid) | Figma에서 `green/*`·`red/*` 프리미티브 직접 바인딩 | (Figma 라이브 상태 그 자체가 원인) | **결정됨(ADR-019)** — 의도된 것, `D1_NODE_EXCEPTIONS`에 등록 |
| 2026-08-30 | `Avatar`의 `Online` 표시 링 | Figma에서 `white` 프리미티브 직접 바인딩 | (Figma 라이브 상태 그 자체가 원인) | **결정됨(ADR-019)** — 의도된 것, `D1_NODE_EXCEPTIONS`에 등록(전역 허용 아님 — `Avatar`에서만) |

---

## 0단계 완료 메모 — `check:tokens`·`check:nodes` 실행 결과 요약

**두 스크립트 다 정상 동작한다(실행 확인·오탐 제거 완료).** 다만 대상 코드가 아직 정리 전이라
`npm run check` 는 지금 실패한다 — **이건 스크립트 버그가 아니라 실제로 찾은 문제다.**
전체 목록은 언제든 `npm run check:tokens` / `npm run check:nodes` 재실행으로 다시 볼 수 있으므로
여기엔 개수만 남긴다.

| 검사 | 상태 | 건수 | 요지 |
|---|---|---|---|
| S1 hex 하드코딩 | FAIL | 439 | `tokens/_primitive.scss` 밖에서 hex 직접 사용 — 컴포넌트 다수가 커스텀 프로퍼티 값에 원시 hex를 직접 씀(주로 다크모드 값) |
| S2 Figma↔CSS 대조 | FAIL | 704(누락 491·CSS전용 157·불일치 56) | 대부분 `color-` 접두사 불일치(위 표)에서 발생. 불일치 56건 중 다수는 `slate`→`neutral` 미반영 |
| S3 미정의 변수 | FAIL | 10 | `_modal.scss`가 `_featured-icon.scss`에서 이미 제거된 `--featured-icon-*` 를 여전히 참조(회귀) |
| S4 컴포넌트 프리미티브 직접 참조 | FAIL | 57 | button/checkbox-radio/dropdown/header/icon-button/input 등이 `$color-*` 프리미티브 별칭을 시맨틱 없이 직접 참조 |
| S5 중복 오버라이드 | WARN | 144 | 대부분 `_primitive.scss`의 다크 블록(라이트와 동일값 임시 배치, 파일 자체 주석에 설명됨) |
| S6 중첩 깊이 | PASS | 0 | |
| S7a BEM 요소 체이닝 | PASS | 0 | |
| S7b ID 셀렉터 | PASS | 0 | |
| D1 컬러 프리미티브 직접 참조 | PASS | 0 | 최초 23건(Checkbox validation 링 8 + Avatar Online 링 15) 전부 ADR-019로 의도 확인, `D1_NODE_EXCEPTIONS`(컴포넌트+프리미티브 쌍으로 좁힌 예외)에 등록 |
| D2 하드코딩 색상 | PASS | 0 | |
| D10 컴포넌트 세트 규격 | PASS | 0 | 점검한 16개 컴포넌트 페이지 전부 통과 |

**`check:nodes` 는 이제 전부 PASS.** `check:tokens`는 S1·S2·S3·S4가 여전히 FAIL — 위 표의 "결정됨" 항목들은
1단계(`tokens/` 재작성)에서 정리되면 대부분 해소된다.

**D3~D9·D11~D13(변수 메타데이터 검사)은 스크립트 대상이 아니다** — Figma Variables REST API가
Enterprise 전용이라 401. 필요할 때 Figma MCP로 대화 중 수동 실행한다(`scripts/README.md` 참조).

---

## 막힌 것

**`DECISIONS.md` 에 없는 판단이 필요해 멈춘 지점.**
사람이 결정하면 ADR 로 옮기고 여기서 지운다.

| 날짜 | 단계 | 내용 |
|---|---|---|
| | | |

---

## 검사 실패 이력

같은 항목이 반복 실패하면 검사 규칙이나 방침에 문제가 있다는 신호다.

| 날짜 | 항목 | 내용 | 원인 |
|---|---|---|---|
| | | | |
