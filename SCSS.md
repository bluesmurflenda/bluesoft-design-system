# SCSS 작업 규칙 — BLUESOFT DS Master

**SCSS 를 쓰는 사람이 읽는 문서다.** Figma 규칙은 `FIGMA.md` 에, 지금 할 일은 `STATUS.md` 에 있다.

- **Figma 는 조회만 한다.** 고쳐야 할 상황이 나오면 멈추고 보고한다
- **조회 없이 값을 쓰지 않는다.** 이 문서에 값이 없는 이유다
- `DECISIONS.md` 에 없는 판단이 필요하면 멈추고 보고한다

---

## 파일 구조

```
scss/
├─ tokens/
│  ├─ _primitive.scss      hex 가 있는 유일한 곳
│  ├─ _theme.scss          :root + [data-theme="dark"]
│  ├─ _shape.scss          :root + [data-shape="…"]
│  └─ _breakpoint.scss     :root + 미디어쿼리
├─ abstracts/
│  ├─ _maps.scss           $type-scale · 컴포넌트 Map
│  └─ _mixins.scss         text() · mq() · container()
├─ base/                   _reset.scss · _typography.scss
└─ components/             시맨틱 토큰만 참조

scripts/                   검사 스크립트 — 항목 정의는 scripts/README.md
figma/tokens.*.json        변수 스냅샷 = 값의 기준
```

`_primitive.scss` 와 `_theme.scss` 는 **사람이 손대지 않는 파일로 취급한다.**
Figma 조회 결과를 옮긴 것이다. 예외 주석이 필요하면 그 줄에만 남긴다.

## 값의 출처

**Figma Variables REST API 는 Enterprise 전용이라 이 계정에서 못 쓴다.**
그래서 `figma/tokens.*.json` 스냅샷이 값의 기준이고, **퍼블리시할 때마다 다시 뽑는다.**
추출 방법은 `scripts/README.md`. 검사 S2 가 스냅샷과 SCSS 를 대조한다.

## 컴포넌트 하나를 끝내는 흐름

```
1. Figma MCP 로 그 컴포넌트를 조회한다 — 축·속성·각 변형의 크기와 토큰
2. Plan 을 적는다 — 만들 클래스, 쓸 Map, 예외 처리
3. 코드를 쓴다
4. 검사를 통과시킨다
5. STATUS.md 를 갱신한다
```

**한 번에 컴포넌트 하나씩 한다.** 하나를 끝내고 다음으로 간다.

**문서·코드와 Figma 라이브가 다르면 라이브대로 쓰고** `STATUS.md` 「지금 어긋난 것」에 적는다.
그것 때문에 멈추지 않는다.

**컴포넌트는 미디어쿼리를 쓰지 않는다.** `Breakpoint` 컬렉션의 `type/*` 토큰이 CSS 변수로
나오고 `_breakpoint.scss` 가 미디어쿼리로 값을 바꾼다. 컴포넌트는 그 변수를 쓰면 반응형이 된다.
**Figma 텍스트 스타일이 `type/*` 을 바인딩한 것만 반응형이다** — 프리미티브를 직접 바인딩한
스타일은 고정이니 조회해서 확인한다.

## 완료 판정

```bash
npm run check:nodes     # Figma 노드 스캔 (FIGMA_TOKEN 필요)
npm run check:tokens    # SCSS + 스냅샷 대조
npm run build           # 컴파일
```

**셋 다 통과해야 끝난 것이다.** 하나라도 실패하면 커밋하지 않는다.

`FIGMA_TOKEN` 이 없으면 `check:nodes` 는 skip 된다. 그 사실만 출력하고 나머지로 판정한다.
**토큰이 없다는 이유로 작업을 멈추거나 사람에게 묻지 않는다.** `.env` 는 만들어도 된다.

`D3~D9 · D11~D13` 은 스크립트가 아니라 사람이 Figma 를 고친 뒤 MCP 로 돌리는 검사다.
코드 작업 중에는 해당 없다 — 기준은 `FIGMA.md` 「토큰 위생」.

## 검사가 못 잡는 실수

| 사례 | 원인 |
| --- | --- |
| ADR 이 Accepted 인데 코드에 미반영 | 결정 후 반영 확인 안 함 |
| 스냅샷이 낡은 채로 대조해 통과 처리 | 퍼블리시 후 재추출을 빠뜨림 |
| 이름은 같은데 다른 변수였다 | 삭제 후 재생성이라 이름으로는 안 보인다. `tokens.ids.json` 의 id 로 확인한다 |
| 선언 순서 때문에 나중 규칙이 앞 규칙을 덮음 | 같은 specificity 에서는 뒤가 이긴다. 컴파일 결과로 확인 |
| 검사 규칙을 다른 검사에 그대로 재사용해 오탐 | 그 규칙이 왜 생겼는지 확인 안 함 |
