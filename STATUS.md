# 진행 상태

**작업을 끝낼 때마다 갱신한다.** 세션이 끊겨도 이것만 읽으면 재개할 수 있다.
끝난 일은 지운다 — git 로그에 있다. 값·수치·개수를 적지 않는다.

---

## 지금 하는 일

**8단계 — Figma ↔ SCSS 색 바인딩 전수 대조.** 0~7단계는 완료.
방법은 `SCSS.md` 「컴포넌트 하나를 끝내는 흐름」, 검사 항목은 `scripts/README.md` D14.

끝낸 컴포넌트만 적는다.

| 컴포넌트 | 상태 |
| --- | --- |
| Alert | 검사통과 |

---

## 지금 어긋난 것

**위에서부터 처리한다.** 처리하면 행을 지운다. 이력은 남기지 않는다.

| 대상 | 무엇을 해야 하나 |
| --- | --- |
| `scripts/README.md` 의 스냅샷 추출 방법 | 적혀 있는 스니펫이 실제 커밋된 파일과 다른 모양을 만든다. 재추출 전에 먼저 고친다 |
| `figma/tokens.primitive.json` · `tokens.breakpoint.json` | `tokens.ids.json` 과 개수가 안 맞는다. 재추출 필요 |
| `scss/tokens/_breakpoint.scss` | 최상단(Wide) 미디어쿼리가 남아 있다 — ADR-026 은 만들지 않기로 정했다. 섹션 간격·패딩 CSS 변수는 Figma 리네임 전 이름을 쓰고, 서브비주얼 높이는 별칭이 아니라 리터럴이다 |
| `scss/components/_input.scss` · `_textarea.scss` · `_select.scss` | radius 가 버튼 토큰을 참조한다. 입력 전용 토큰이 생겼으니 교체한다(ADR-027). 옆 주석은 이제 틀린 내용이다 |
| 컴포넌트별 인라인 hex | 옛 프리미티브 램프 값이 남아 있다. `check:tokens` S2 로 잔여 확인 |
| `tabs/underline` 계열 hover 토큰 | Theme 에 있는데 그 컴포넌트 세트 전수 조회에서 어디에도 바인딩되지 않는다. 다른 컴포넌트가 쓰는지 확인 |
| `_List/Item` 의 선택 배경·보조 텍스트 토큰 | Figma 에 있으나 코드가 hover 를 재사용하고 보조 텍스트는 없다 |

---

## 막힌 것 — 사람이 결정해야 진행되는 것

결정이 나면 `DECISIONS.md` 로 옮기고 여기서 지운다.

| 무엇 | 왜 막혔나 |
| --- | --- |
| Wide 구간의 `grid/margin` 토큰을 남길지 | 그 값은 컨테이너 폭에서 계산되는 값이라 CSS 가 자동으로 만든다. `container/padding-x` 와도 데스크톱 아래에서 같다. 합칠 수 있는지는 Figma 쪽 판단이다 |
| 태블릿 구간에서 헤더 메뉴가 어떻게 보여야 하나 | Figma 에 그 구간 변형이 없어 근거가 없다. 현재 코드는 모바일 기준폭 이상에서 이미 풀 메뉴를 보여준다 |

---

## 사람이 해야 하는 것

- Field/Group 의 `Addon` 변형 축 옵션 순서 정리 — Figma UI 에서만 된다
- DS Master 재퍼블리시, 그 뒤에 `figma/tokens.*.json` 재추출
- `DECISIONS.md` 미결 항목 중 이미 선례가 생긴 것들의 확정
