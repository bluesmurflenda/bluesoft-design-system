# SCSS 작업 규칙 — BLUESOFT DS Master

**SCSS 를 쓰는 사람이 읽는 문서다.** Figma 규칙은 `FIGMA.md` 에 있다.

**Figma 를 고쳐야 할 상황이 나오면 코드 작업을 멈추고 보고한다.**
조회는 하되 쓰기 API 를 호출하지 않는다.

**조회 없이 값을 쓰지 않는다.** 이 문서에 값이 없는 이유다.

---

### 파일 구조

```
scss/
├─ tokens/
│  ├─ _primitive.scss      hex 가 있는 유일한 곳. Figma Primitive 컬렉션
│  ├─ _theme.scss          :root + [data-theme="dark"]
│  ├─ _shape.scss          :root + [data-shape="…"]
│  └─ _breakpoint.scss     :root + 미디어쿼리
├─ abstracts/
│  ├─ _maps.scss           $type-scale · 컴포넌트 Map
│  └─ _mixins.scss         text() · mq() · container()
├─ base/
│  ├─ _reset.scss
│  └─ _typography.scss     .text-* 유틸 (@each 생성)
└─ components/             시맨틱 토큰만 참조
   ├─ _button.scss
   ├─ _field.scss
   └─ …

scripts/
├─ README.md              검사 항목 정의
├─ check-nodes.mjs        Figma 노드 스캔 (REST)
└─ check-tokens.mjs       SCSS + tokens.json 대조

figma/
├─ tokens.primitive.json  MCP 로 추출한 변수 스냅샷
├─ tokens.theme.json
├─ tokens.shape.json
└─ tokens.breakpoint.json
```

**`figma/tokens.*.json` 은 Figma 퍼블리시할 때마다 다시 뽑는다.**
Variables REST API 를 못 쓰므로 이 파일이 값의 기준이다.

`tokens/` 4개 파일은 **Figma 조회 결과를 옮긴 것**이다. 사람이 값을 임의로 바꾸지 않는다.

**첫 생성은 수동이다.** Figma MCP 로 각 컬렉션을 조회해 CSS 변수로 옮긴다.
`check:tokens` 의 토큰 대조(S2)가 누락·불일치를 잡는다.

나중에 Figma REST API → 자동 생성으로 바꿀 수 있다.
그때를 위해 **`_primitive.scss` 와 `_theme.scss` 는 사람이 손대지 않는 파일로 취급한다.**
예외 주석이 필요하면 그 줄에만 남긴다.

### 작업 순서

앞 단계가 끝나야 다음이 가능하다. 각 단계 끝에 검사를 통과시킨다.

| 순서    | 대상                                             | 이유                                                |
| ------- | ------------------------------------------------ | --------------------------------------------------- |
| **0-a** | **`figma/tokens.*.json` 추출 (MCP)**             | **Variables REST API 를 못 써서 스냅샷이 필요하다** |
| **0-b** | **`scripts/` 검사 스크립트 + `package.json`**    | **이것이 없으면 1단계를 검증할 수 없다**            |
| 1       | `tokens/` 4개 파일                               | 나머지가 전부 참조한다                              |
| 2       | `abstracts/` + `base/_typography.scss`           | 컴포넌트가 mixin 을 쓴다                            |
| 3       | 버튼 계열                                        | `focus ring` · `radius` 가 전체에서 재사용          |
| 4       | 입력 계열                                        | 3의 ring 사용법이 이어진다                          |
| 5       | 상태 표시 (chip · alert · card · tooltip 등)     | chip 토큰이 뒤에서 재사용                           |
| 6       | 테이블 · 보드                                    | 슬롯에 3·4·5 컴포넌트가 들어간다                    |
| 7       | 내비게이션 · 표시 (tabs · pagination · modal 등) | 앞 토큰을 가장 많이 참조                            |

**0단계는 `scripts/README.md` 의 항목 정의를 그대로 구현한다.**
검사 없이 코드를 쌓으면 뭐가 틀렸는지 나중에 못 찾는다.

**Figma Variables REST API 는 이 계정에서 못 쓴다**(Enterprise 전용).
그래서 변수 값은 `figma/tokens.*.json` 스냅샷으로 둔다 — 추출 방법은 `scripts/README.md`.

**한 단계 안에서는 컴포넌트 단위로 나눈다.** 컴포넌트 하나를 끝내고 다음으로 간다.

### 각 컴포넌트 작업 흐름

```
1. Figma MCP 로 그 컴포넌트를 조회한다
   - 축(variantOptions) · 속성 · 각 변형의 크기·토큰
2. Plan 을 적는다 — 만들 클래스, 쓸 Map, 예외 처리
3. 코드를 쓴다
4. 검사 스크립트를 통과시킨다
5. STATUS.md 를 갱신한다
6. 다음 컴포넌트로
```

**문서와 라이브가 다르면 `STATUS.md` 의 "지금 어긋난 것" 에 적는다.**
라이브대로 코드를 쓰고 계속 진행한다 — 그것 때문에 멈추지 않는다.

**조회 없이 값을 쓰지 않는다.** 이 문서에 값이 없는 이유다.

### 반응형 타이포

`Breakpoint` 컬렉션의 `type/*` 토큰이 CSS 변수로 나온다.
`_breakpoint.scss` 에서 미디어쿼리로 값이 바뀌므로 **컴포넌트는 미디어쿼리를 쓰지 않는다.**

```scss
// _breakpoint.scss
:root {
    --type-display-lg-size: var(--font-size-display-xs);
} // Mobile 기본
@media (min-width: 1024px) {
    :root {
        --type-display-lg-size: var(--font-size-display-md);
    }
}

// _maps.scss
$type-scale: (
    display-lg: (
        size: var(--type-display-lg-size),
        leading: var(--type-display-lg-leading),
        family: display,
    ),
);

// 컴포넌트 — 미디어쿼리 없이 반응형
.hero__title {
    @include text(display-lg, bold);
}
```

**Figma 텍스트 스타일이 `type/*` 을 바인딩한 것만 반응형이다.**
프리미티브를 직접 바인딩한 스타일은 고정이다. 조회해서 확인한다.

### 완료 판정

```bash
npm run check:nodes     # Figma 노드 스캔 (FIGMA_TOKEN 필요)
npm run check:tokens    # SCSS + tokens.json 대조
npm run build           # 컴파일
```

**셋 다 통과해야 그 단계가 끝난 것이다.** 하나라도 실패하면 커밋하지 않는다.

**`FIGMA_TOKEN` 이 없으면 `check:nodes` 는 skip 된다.** 그 사실을 출력하고 나머지로 판정한다.
토큰이 없다는 이유로 작업을 멈추거나 사람에게 묻지 않는다.

변수 검사(D3~D9·D11~D13)는 **Figma 를 수정한 뒤 MCP 로 돌린다.** 코드 작업 중에는 필요 없다.

통과하면 `STATUS.md` 의 해당 단계를 `검사통과` 로 바꾼다.

---

## 확인이 필요할 때

`DECISIONS.md` 에 없는 판단이 필요하면 **작업을 멈추고 보고한다.**
스스로 정하지 않는다. 결정이 나면 `DECISIONS.md` 에 기록한다.

**다음은 멈출 이유가 아니다** — 답이 이미 있다.

| 상황 | 답 |
| --- | --- |
| 파일을 어디에 만드나 | 「파일 구조」 |
| 무엇부터 하나 | 「작업 순서」 |
| 언제 끝난 것인가 | 「완료 판정」 |
| 값이 얼마인가 | Figma 를 조회한다. 없으면 `figma/tokens.*.json` |
| 어디까지 했나 | `STATUS.md` |
| 검사 항목이 무엇이고 왜 있나 | `scripts/README.md` |
| `FIGMA_TOKEN` 이 없다 | `check:nodes` 를 skip 하고 진행한다 |
| `.env` 를 만들어도 되나 | 된다. `.gitignore` 에 추가한다 |

---

## 실패했던 사례

같은 실수를 막기 위한 기록. **틀릴 때마다 한 줄 추가한다.**

| 사례 | 원인 |
| --- | --- |
| ADR 이 Accepted 인데 코드에 미반영 | 결정 후 반영 확인 안 함 |
| 폐기된 문서의 옛 값을 코드에 넣음 | 값의 출처를 문서로 잡음. 값은 Figma 와 스냅샷에만 있다 |
| 스냅샷이 낡은 채로 대조해 통과 처리 | 퍼블리시 후 `figma/tokens.*.json` 재추출을 빠뜨림 |
| 이름은 같은데 다른 변수였다 | 삭제 후 재생성이라 이름으로는 안 보인다. `tokens.ids.json` 의 id 로 확인한다 |
| 선언 순서 때문에 나중 규칙이 앞 규칙을 덮음 | 같은 specificity 에서는 뒤가 이긴다. 컴파일 결과로 확인 |
| 검사 스크립트 규칙을 다른 검사에 그대로 재사용해 오탐 | 그 규칙이 왜 생겼는지 확인 안 함 |
