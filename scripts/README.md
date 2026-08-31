# 검증 스크립트 — 검사 항목

각 항목은 **실제로 발생한 문제**에서 나왔다. 새 문제가 나오면 항목을 추가한다.
**항목은 줄지 않는다.**

## 실행 환경 — 변수 API 제약

**Figma Variables REST API 는 Enterprise 플랜 전용이다.** 우리 계정에는 없다.
따라서 검사를 세 갈래로 나눈다.

| 검사군 | 대상 | 실행 방법 | CI |
|---|---|---|---|
| **N** 노드 스캔 | D1 · D2 · D10 | REST `file_content:read` | 가능 |
| **T** 토큰 대조 | S2 | `tokens.json` 스냅샷 대조 | 가능 |
| **V** 변수 검사 | D3~D9 · D11~D13 | **Figma MCP 로 수동 실행** | 불가 |
| **S** SCSS | S1 · S3~S7 | 로컬 파일 | 가능 |

### tokens.json 스냅샷

Variables API 를 못 쓰므로 **MCP 로 뽑은 변수 목록을 파일로 둔다.**

```
figma/tokens.json    ← Figma 퍼블리시할 때마다 갱신
```

S2 는 이 파일과 SCSS 를 대조한다. **퍼블리시 시점이 곧 값이 확정된 시점**이므로
그때 갱신하면 낡지 않는다.

### tokens.json 생성 방법

**Figma MCP 로 직접 뽑는다.** 사람이 옮겨 적지 않는다.

```js
// Figma MCP 에서 실행
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byId = {}; vars.forEach(v => byId[v.id] = v);
const hex = c => {
  if (!c || typeof c.r !== 'number') return c;
  if (c.a != null && c.a < 1)
    return `rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},${+c.a.toFixed(3)})`;
  return '#' + [c.r,c.g,c.b].map(x => Math.round(x*255).toString(16).padStart(2,'0')).join('');
};
const cssVar = n => 'var(--' + n.replace(/\//g,'-') + ')';
const out = { _meta: { exportedAt: '', source: '', counts: {} } };
for (const c of cols) {
  out._meta.counts[c.name] = c.variableIds.length;
  out[c.name] = { _modes: c.modes.map(m => m.name) };
  for (const vid of c.variableIds) {
    const v = byId[vid]; if (!v) continue;
    const e = {};
    for (const m of c.modes) {
      const raw = v.valuesByMode[m.modeId];
      e[m.name] = raw === undefined ? null
        : (raw && raw.type === 'VARIABLE_ALIAS') ? cssVar((byId[raw.id]||{}).name || '?')
        : (v.resolvedType === 'COLOR' ? hex(raw) : raw);
    }
    out[c.name][v.name] = c.modes.length === 1 ? e[c.modes[0].name] : e;
  }
}
return { json: JSON.stringify(out, null, 2) };
```

**출력이 크므로 컬렉션별로 나눠 뽑는다.** 한 번에 받으면 잘린다.

```
figma/tokens.primitive.json
figma/tokens.theme.json
figma/tokens.shape.json
figma/tokens.breakpoint.json
```

각 파일 상단에 `_meta` 로 뽑은 날짜와 개수를 남긴다.
**개수가 맞는지 먼저 확인한다** — 잘렸으면 개수가 안 맞는다.

### 형식

| 컬렉션 | 형식 |
|---|---|
| 단일 모드 (Primitive) | `"neutral/900": "#171717"` |
| 다중 모드 | `"card/bg": { "Default": "var(--white)", "Dark": "var(--neutral-800)" }` |

**별칭은 CSS 변수 문자열로 저장한다.** 그래야 SCSS 와 그대로 대조된다.

### id 맵 — `figma/tokens.ids.json`

`check-nodes.mjs` 가 REST 로 받는 `boundVariables` 에는 **변수 id 만** 있고 이름이 없다
(`{"type":"VARIABLE_ALIAS","id":"VariableID:997:12"}` — 실제로 REST 응답을 찍어 확인함).
`tokens.primitive/theme/shape/breakpoint.json` 은 이름→값 맵이라 이 해석에 못 쓴다.

그래서 **id→이름 맵을 별도 파일로 둔다**: `figma/tokens.ids.json`.
컬렉션별로 나눠 담되(어느 컬렉션 소속인지가 D1 판정에 필요) 한 파일에 합쳐 커밋한다.
키는 `VariableID:` 접두사를 뗀 나머지(`"997:12"`)다.

```js
// 컬렉션 하나당 이렇게 뽑는다(값 없이 id/이름만이라 가볍다 — 4개 합쳐도 20KB 안쪽)
const col = collections.find(c => c.name === TARGET);
const out = {};
for (const vid of col.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(vid);
  if (v) out[vid.replace('VariableID:', '')] = v.name;
}
```

`check-nodes.mjs` 는 `boundVariables` 의 id로 이 맵을 찾아 `{name, collection}` 을 얻고,
`collection === 'Primitive'` 이면서 `tokens.primitive.json` 에서 그 이름의 값이 hex 색이면
"컬러 프리미티브 직접 참조"로 판정한다(D1).

### V군을 언제 돌리나

**Figma 를 수정한 뒤, 퍼블리시하기 전에** MCP 로 돌린다.
코드 작업 중에는 돌리지 않는다 — 코드가 Figma 를 바꾸지 않기 때문이다.

---

## 스크립트

| 스크립트 | 검사군 | 실행 |
|---|---|---|
| `check-nodes.mjs` | N | REST API |
| `check-tokens.mjs` | T · S | 로컬 파일 |

```json
// package.json
"scripts": {
  "check:nodes": "node scripts/check-nodes.mjs",
  "check:tokens": "node scripts/check-tokens.mjs",
  "check": "npm run check:nodes && npm run check:tokens"
}
```

### Figma 토큰

**환경변수로 받는다.** 코드에 넣지 않는다.

```
# .env  — .gitignore 에 반드시 추가
FIGMA_TOKEN=figd_...
FIGMA_FILE_KEY=kJD5jv7RNKxLD1hP8oKtBG
```

발급: Figma → Settings → Security → Personal access tokens → Generate new token
필요 스코프: **File content (Read-only)** · **Variables (Read-only)**

필요 스코프에 **Variables 는 없다** — Enterprise 전용이라 목록에 뜨지 않는다.

`FIGMA_TOKEN` 이 없으면 `check:nodes` 는 **실패가 아니라 skip 으로 처리하고 그 사실을 출력한다.**
`check:tokens` 는 토큰 없이 돌아간다.

`check-nodes.mjs` 는 `GET /v1/files/{key}` 로 노드 트리를 받는다.
`boundVariables` 의 변수 id 를 `tokens.json` 의 id 맵으로 이름 해석한다.

**변수 값 자체는 REST 로 못 받는다.** `tokens.json` 이 그 역할을 한다.

---

## check-ds.mjs — Figma 검사

### D1. COLOR 프리미티브 직접 참조

근거: 프로젝트 1장 · ADR-003

**컴포넌트 노드가 색상 프리미티브를 직접 바인딩하면 실패.**

```
검사 대상: COMPONENT_SET · COMPONENT 안의 fills · strokes
제외:     font/* · space/* · radius/* (모드 없음)
허용:     허용 목록(아래) 에 있는 프리미티브
```

허용 목록은 코드 상수로 둔다. `white` · `black` · 브랜드색 · 의미색.
예외 컴포넌트: 로고 · 소셜 버튼 · 상태바.

**나온 배경:** 체크박스·입력·페이지네이션·모달 배경이 `white` 를 직접 물어 다크모드에서 흰 판이 됐다.

**주의:** 인스턴스 내부 노드는 그 마스터 소유다. **자체 레이어만 센다.**
이 구분을 안 하면 같은 문제를 수십 배로 과대 집계한다.

### D2. 하드코딩 색상

근거: 프로젝트 1장

**변수·스타일 바인딩 없이 SOLID 색을 가진 노드는 실패.**

```
제외: fillStyleId · strokeStyleId 가 있는 것 (스타일 참조)
      visible === false 인 paint
```

### D3. 대비

근거: 프로젝트 3장

**`*/fg*` 와 대응 `*/bg*` 쌍을 라이트·다크 양쪽에서 계산.**

| 쌍 | 기준 |
|---|---|
| `X/fg` on `X/bg` | 4.5:1 |
| `X/fg-selected` on `X/bg-selected` | 4.5:1 |
| 아이콘 토큰 | 3:1 |

```
제외: disabled · unavailable · past · placeholder (WCAG 예외)
      알파 배경 (배경색에 따라 달라짐)
```

**한쪽 모드만 검사하면 놓친다.** 반드시 양쪽.

### D4. 형제 참조

근거: 프로젝트 1장 · ADR-010

**컴포넌트 토큰이 같은 그룹의 다른 하위그룹을 참조하면 실패.**

```
tabs/pill/bg-hover → tabs/underline/bg-hover   실패
tabs/pill/bg-hover → surface/subtle            통과
```

**나온 배경:** `pill` 이 `underline` 토큰을 참조해 두 Variant 가 묶여 있었다.

### D5. dark/light 스타일 토큰 반전

근거: 프로젝트 2장 · ADR-002

**토큰명에 `/dark/` 또는 `/light/` 가 들어가면 라이트·다크 값이 같아야 한다.**

`Theme=dark` 는 다크모드가 아니라 "어두운 스타일"이다.
반전하면 어두운 툴팁이 다크모드에서 흰색이 된다.

**나온 배경:** `tooltip/dark/bg` 가 기계적 반전 규칙에 걸려 어두운 툴팁이 흰색이 됐다.
`nav/dark/*` 도 같은 문제였는데 툴팁만 고치고 놓쳤다 — **이 검사 항목을 만들자마자 잡혔다.**

**주의:** `brand/*` 를 참조하면 별칭은 같아도 값이 반전된다.
"어두운 스타일" 토큰은 프리미티브로 고정해야 한다.

**예외:** 같은 그룹 안에서 위계를 두려고 의도적으로 다르게 한 경우.
`description` 에 이유를 적고 예외 목록에 넣는다.

### D6. 시맨틱 경유 가능한데 안 하는 것

근거: 프로젝트 1장 · ADR-003

**컴포넌트 토큰이 프리미티브를 직접 참조하는데, 같은 값의 시맨틱이 존재하면 경고.**

실패가 아니라 **경고**다. 역할이 안 맞을 수 있다(배경 토큰에 `text/*` 는 부적절).

### D7. 깨진 참조

근거: 프로젝트 7장 참조 구조

- 존재하지 않는 변수 id 를 가리키는 노드
- 존재하지 않는 변수 id 를 가리키는 별칭
- 텍스트·이펙트 스타일의 깨진 변수 참조

**나온 배경:** 토큰 삭제·이름 변경 후 참조가 끊겼는지 확인할 방법이 없었다.

### D8. 순환 참조 · 과도한 별칭 사슬

근거: `CLAUDE.md` 7장 참조 구조

- 별칭이 자기 자신으로 돌아오면 실패
- 사슬이 3단계를 넘으면 경고

### D9. 모드 값 무결성

근거: `CLAUDE.md` 7장 모드 값

| 검사 | 실패 조건 |
|---|---|
| 값 누락 | 어떤 모드에 값이 없음 |
| 브레이크포인트 역전 | Wide → Mobile 로 가면서 값이 커짐 |

```
역전 예외: container/padding-x (Desktop 이상 0 — max-width 구조)
           전 모드 동일한 상한값
```

### D10. 컴포넌트 세트 규격

근거: 프로젝트 6장 · ADR-011

- 세트 프레임에 점선 테두리가 없으면 실패
- 세트 프레임 배경이 `surface/default` 가 아니면 실패

배경이 모드를 따라가야 페이지를 `Theme=Dark` 로 바꿨을 때 다크 변형을 그 자리에서 확인할 수 있다.

**나온 배경:** 체크박스 계열 5세트가 검정 배경이었다. 통일 작업에서 누락됐다.

### D11. 네이밍 일관성

근거: `CLAUDE.md` 7장 네이밍

| 검사 | 실패 조건 |
|---|---|
| 깊이 | 4단계 이상 |
| 동의어 | 같은 뜻에 다른 접미사 (`fg-supporting` vs `fg-muted` vs `supporting-fg`) |
| 순서 | `supporting-fg` 처럼 뒤집힌 것 |
| 형식 | 같은 성격 그룹인데 접미사 규칙이 다름 |

### D12. 메타데이터

근거: `CLAUDE.md` 7장 메타데이터

- `codeSyntax.WEB` 이 비어 있으면 경고
- `scopes` 가 역할과 안 맞으면 경고 (아이콘 색인데 `SHAPE_FILL` 없음 등)

### D13. 고아 토큰

근거: 프로젝트 5장 · 7장 메타데이터

**어디서도 참조되지 않는 토큰을 나열한다.** 실패가 아니라 **목록 출력**이다.

```
참조 검사 범위: 노드 · 별칭 · 텍스트/이펙트 스타일 · 다른 프로젝트 파일
```

**description 이 있으면 목록에서 제외한다.** 이유가 적혀 있다는 건 의도적이라는 뜻이다.

**나온 배경:** DS Master 에서 미사용인 레이아웃 토큰이 프로젝트 파일에서 수백 곳 쓰이고 있었다.
한 파일만 보고 삭제했으면 사고였다.

### D14. 요소별 토큰 매핑 대조

근거: `CLAUDE.md` 6장(작업 대상별 참조) · ADR-023

**`scripts/lib/element-map/*.mjs`에 매핑이 있는 컴포넌트만, 요소별 토큰 참조가 Figma와
일치하는지 대조한다.** N군(REST)이라 `check-nodes.mjs`가 D1/D2/D10과 같은 호출 안에서 돈다.

```
매핑 파일 하나 = 컴포넌트 세트 하나
{ set, variantAxis, elements: [{ figmaPath, element, figmaType, cssSelector, cssProperty, token, except?, via? }] }
```

- `figmaPath`: 변형 루트 기준 레이어 경로(`''` = 루트 자신, `'Body/Title'`처럼 `/`로 중첩 표기)
- `cssSelector`/`cssProperty`: **실제로 그 값이 선언되는 지점**(컴파일된 CSS 기준). 자식 요소가
  색 선언이 없고 조상에서 상속받으면(Icon·Close처럼) 조상 셀렉터를 가리키고 `via`에 이유를 남긴다
- `token`: 기대 토큰. `{color}`처럼 `variantAxis`의 축 이름을 플레이스홀더로 쓸 수 있다
- `except`: 특정 축 값에서 이 매핑 자체가 성립하지 않는 경우(예: banner는 border 자체가 없음)

각 항목에 대해 참조된 축(placeholder가 쓰인 축)만 전개하고, 나머지 축은 첫 번째 비-제외값으로
고정해 대표 변형 하나를 고른다 — 참조 안 되는 축까지 전수 조합하면 같은 검사를 중복해서
반복한다. Figma 쪽(REST 덤프)과 SCSS 쪽(컴파일된 CSS의 `var(--x)`) 을 각각 기대 토큰과
대조해서 **어느 쪽이 어긋났는지 구분해 보고한다**(`Figma 불일치` vs `SCSS 불일치`).

**한계— 캐스케이드로 실제 이기는 값은 검사하지 않는다.** 셀렉터가 올바른 토큰을 참조하는지만
보지, 여러 클래스가 동시에 걸렸을 때(`class="alert alert-banner alert-brand"`) 소스 순서·
specificity로 실제 적용되는 값이 뭔지는 시뮬레이션하지 않는다. Alert의 banner 테두리 버그
(`.alert-banner`의 `border: none`이 나중에 나오는 `.alert-brand`의 `border`에 덮어써진 것)가
이 한계의 실제 사례다 — 두 선언 다 올바른 토큰을 참조하고 있어서 D14로는 안 잡힌다.

**`--dump` 모드**: `node scripts/check-nodes.mjs --dump <컴포넌트세트명>` — 위반 필터링 없이
그 세트의 모든 변형에 대해 `path → 바인딩된 토큰`을 JSON으로 전부 출력한다. element-map 작성·
검증용이지 회귀 검사가 아니다(리포트에 안 실림, `--dump` 없이 돌리는 정기 검사와 별개).

**나온 배경:** Alert 대조 세션에서 반자동(하이브리드) 방식이 필요하다고 판단했다 — Figma 요소
↔ SCSS 셀렉터 매핑은 자동 도출이 안 되지만(레이어명·클래스명이 다른 체계), Figma 조회(REST)와
SCSS 파싱(postcss)은 자동화되므로 매핑만 사람이 한 번 쓰면 회귀 검사로 계속 재사용된다.

**D1/D2의 `walk()`와 인스턴스 처리가 다르다.** D1/D2는 인스턴스 경계에서 내려가지 않는다(같은
위반을 파일 전체에서 중복 집계하지 않으려는 것 — figma.md). D14의 `walkForDump()`는 **내려간다**
— 위반 집계가 아니라 "이 자리에 실제로 어떤 색이 적용됐는가"를 봐야 하는데, REST는 INSTANCE
노드도 오버라이드가 반영된 `children`을 그대로 반환하기 때문이다(실측: Alert의 `Icon` 인스턴스
자체 `fills`는 빈 배열이고, 실제 색은 그 안의 중첩 벡터 `Icon/Icon`에 있었다 — 2026-09-01,
라이브 데이터로 처음 발견. `figmaPath`를 인스턴스 내부까지 적어야 하는 이유이기도 하다).

---

## check-tokens.mjs — SCSS 검사

### S1. hex 하드코딩

근거: 전역 4장

**`tokens/_primitive.scss` 밖에서 hex 를 쓰면 실패.**

```
예외: 같은 줄에 /* 예외: 이유 */ 주석이 있는 경우
```

주석을 강제하면 무심코 하드코딩하는 걸 막으면서 정당한 예외는 통과한다.
예외 목록이 코드에 남아 나중에 정리 대상이 보인다.

### S2. Figma ↔ CSS 토큰 대조

근거: 프로젝트 10장 · ADR-013

**Figma 토큰 목록과 CSS 변수 목록을 대조.**

| 결과 | 의미 |
|---|---|
| Figma 에만 있음 | CSS 누락 |
| CSS 에만 있음 | 삭제된 토큰이 코드에 남음 |
| 값 불일치 | 낡은 값 |

**이 항목이 핵심이다.** 사람이 눈으로 볼 일이 사라진다.

**`figma/tokens.*.json` 스냅샷이 없을 때:**

| 단계 | 판정 |
|---|---|
| 0단계 (검사 스크립트를 만드는 중, 아직 추출 전) | `SKIP` |
| 1단계 이후 | `FAIL` — 기준값 없이 코드를 검증할 수 없다 |

기본은 `FAIL`. `check-tokens.mjs --bootstrap` 로 실행했을 때만 `SKIP` 으로 낮춘다.
0단계를 벗어나면(스냅샷이 커밋된 이후) `--bootstrap` 을 쓰지 않는다.

### S3. 미정의 변수

근거: `CLAUDE.md` 7장 참조 구조

**`var(--x)` 의 `--x` 가 어디에도 정의되지 않으면 실패.**

오타·삭제된 토큰 참조를 잡는다.

### S3b. 파일 간 암묵 의존

근거: 4단계 — `dropdown.scss` 가 `--field-bg` 를 선언 없이 참조했는데, `select.scss` 가 먼저
선언해서 우연히 통과하고 있었다(2026-08-31 발견).

**`var(--x)` 를 쓰는데 그 파일 자신도, `tokens/*.scss`(전역 토큰층)도 `--x` 를 선언하지
않고 다른 컴포넌트 파일만 선언했으면 경고.**

```
실패 아니라 경고다 — :root 는 파일 순서와 무관하게 전역으로 병합되므로 컴파일 결과는
문제없다. 다만 선언 쪽 파일이 나중에 그 변수를 지우거나 이름을 바꾸면 참조 쪽은 조용히
깨진다 — 의도된 공유(예: select.scss가 dropdown.scss의 list-item-fg를 재사용)와 우연한
의존을 구분하는 건 사람 몫이라 목록만 낸다.
```

### S4. 컴포넌트의 프리미티브 직접 참조

근거: 프로젝트 1장 · ADR-003

**`components/` 파일이 프리미티브 변수를 참조하면 실패.**

D1 과 같은 규칙의 코드 버전. 허용 목록도 같다.

### S5. 중복 오버라이드

근거: 전역 4장

**모드 블록에 `:root` 와 같은 값을 다시 선언하면 경고.**

```scss
// 경고
[data-theme='dark'] {
  --tooltip-bg: var(--neutral-900);   // :root 와 동일
}
```

### S6. 중첩 깊이

근거: 전역 5장

**`check-tokens.mjs`가 SCSS 소스를 직접 스캔해 검사한다. stylelint는 도입하지 않았다(ADR-020).**

중괄호 균형을 세는 경량 스캐너다(S5의 `extractTopLevelBlocks`와 같은 방식) — 완전한 SCSS
파서가 아니지만 이 프로젝트 규모에는 충분하다. 의사 클래스·의사 요소·속성 셀렉터(`&:hover`,
`&::after`, `&[aria-disabled='true']`)는 깊이에서 제외하고, 요소(`&__x`)·수식어(`&-x`,
`&--x`) 중첩은 전부 센다 — 전역 5장의 "금지" 예시(`.board{&__list{&-item{&--active{}}}}`)가
정확히 4단계로 걸리는 기준과 같다.

### S7. BEM 위반

근거: 전역 5장

- 요소 체이닝 (`.block__el1__el2`) — 컴파일된 CSS를 postcss로 파싱해 확인(S7a)
- ID 셀렉터 사용 — 같은 postcss 파싱 결과를 재사용(S7b)

---

## 실행 결과 형식

```
검사        상태    건수   비고
D1 프리미티브 직접   PASS    0
D3 대비            FAIL    2    list/item/fg-supporting Light 2.42
D13 고아 토큰      INFO   14    목록 출력
```

**실패는 커밋을 막는다. 경고·정보는 막지 않는다.**

---

## 항목 추가 이력

새 문제가 나오면 여기에 한 줄 남긴다.

| 날짜 | 항목 | 계기 |
|---|---|---|
| 2026-08-29 | D1~D13 · S1~S7 | 초기 정의. 이번 세션에서 발생한 문제 유형 |
| 2026-08-31 | S3b | 4단계에서 `dropdown.scss`가 `--field-bg`를 선언 없이 참조하고 `select.scss`가 먼저 선언해서 우연히 통과하던 걸 발견 |
| 2026-08-31 | S6·S7b | stylelint 도입 안 하기로 결정(ADR-020) — `check-tokens.mjs`가 직접 검사하도록 재작성 |
| 2026-09-01 | D14 | Alert 대조 세션에서 하이브리드 방식(ADR-023) 도입 — 요소별 토큰 매핑을 `scripts/lib/element-map/`에 쌓고 REST+컴파일된 CSS로 자동 대조 |
