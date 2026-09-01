# BLUESOFT 디자인시스템 — 결정 기록

**append-only.** 승인된 기록을 나중에 편집하지 않는다.
결정이 바뀌면 원본을 `Superseded` 로 표시하고 새 기록을 쓴 뒤 둘을 연결한다.

## 형식

```
## ADR-000 · 제목
상태: Proposed | Accepted | Superseded
확신도: 높음 | 중 | 낮음
날짜: YYYY-MM-DD

### 맥락      왜 결정이 필요했는가
### 결정      무엇으로 정했는가
### 근거      왜 그렇게 정했는가
### 뒤집으려면 되돌리는 방법과 예상 작업량
```

## 값에 대한 주의

**ADR 안의 수치는 결정 당시의 실측값이다.** 현재 상태가 아니다.
"45변형" "500개" 같은 숫자는 **왜 그렇게 판단했는지**를 남기려고 적은 것이다.

현재 값이 필요하면 Figma MCP 로 조회하거나 검사 스크립트를 돌린다.

## 운영

- Claude 앱이 **전부 `Proposed` 로 채운다.** 사람에게 미세 판단을 위임하지 않는다
- 사람은 **확신도 "낮음"만** 훑고 틀린 것만 뒤집는다
- `Accepted` 된 것은 **다시 묻지 않는다**
- 커서는 이 문서를 읽고 따른다. **없는 판단이 필요하면 멈추고 보고한다**

| 확신도 | 의미 | 사람이 볼 필요 |
|---|---|---|
| 높음 | 실측 근거가 명확하고 대안이 없다 | 없음 |
| 중 | 두 안이 있지만 한쪽이 명확히 낫다 | 없음 |
| 낮음 | 취향·브랜드 판단이 섞였다 | **있음** |

---

## ADR-001 · 중성색은 neutral 하나로 통일한다

상태: Accepted 확신도: 높음 날짜: 2026-08-29

### 맥락
중성색 계열이 `neutral` 과 `slate` 두 개로 갈려 있었다.
`slate` 는 푸른 기가 도는 회색이라 같은 화면에 두 계열이 섞였다.
다크모드에서 테이블 헤더가 남색으로 뜨는 원인이었다.

### 결정
`slate/*` 를 전부 `neutral/*` 같은 단계로 교체하고 프리미티브를 삭제했다.

### 근거
중성색이 두 계열일 이유가 없다. `slate` 는 외부 라이브러리에서 넘어온 흔적이었다.
라이트모드 색이 미세하게 바뀌지만(`#f8fafc` → `#fafafa`) 육안 차이는 거의 없다.

### 뒤집으려면
`Primitive` 에 `slate/50~950` 을 다시 만들고 해당 토큰을 재바인딩. 반나절.

---

## ADR-002 · Theme=dark 는 다크모드가 아니다

상태: Accepted 확신도: 높음 날짜: 2026-08-29

### 맥락
`Header` · `Tooltip` · nav 계열의 `Theme` 축과 다크모드가 이름이 같아 혼동됐다.
기계적 반전 규칙을 적용했다가 "어두운 스타일" 툴팁이 다크모드에서 흰색이 됐다.

### 결정
`Theme` 축은 **"스타일"** 로 정의한다. `*/dark/*` · `*/light/*` 토큰은 다크모드에서 반전하지 않는다.
축 이름은 `light|dark` 로 유지한다.

### 근거
축 이름을 `default|inverse` 로 바꾸는 것을 검토했으나, `light|dark` 를 쓰는 세트가 4개이고
인스턴스가 많아 변경 위험이 실익보다 크다.
토큰 값으로 동작을 정의하면 축 이름이 같아도 혼동이 없다.

### 뒤집으려면
4개 세트의 축 값을 동시에 변경 + 인스턴스 재확인. 하루 이상. 오버라이드 유실 위험.

---

## ADR-003 · 컴포넌트 토큰은 시맨틱을 경유한다

상태: Accepted 확신도: 높음 날짜: 2026-08-29

### 맥락
컴포넌트 토큰 상당수가 프리미티브를 직접 참조했다.
`surface/default` 를 바꿔도 카드·버튼이 따라오지 않았다.

### 결정
같은 값의 시맨틱 토큰이 있으면 그것을 경유한다.
시맨틱에 대응이 없는 것(의미색·브랜드 자산·컴포넌트 고유 톤)만 프리미티브 직접 참조를 허용한다.

### 근거
계층이 끊기면 시맨틱 계층의 존재 이유가 없어진다.
경유 시 값이 바뀌지 않으므로 시각적 위험이 없다.

### 뒤집으려면
개별 토큰을 프리미티브로 되돌리면 된다. 건별 5분.

---

## ADR-004 · 아이콘 전용 토큰을 둔다

상태: Accepted 확신도: 중 날짜: 2026-08-29

### 맥락
아이콘 색이 `neutral/600` 프리미티브를 직접 참조해 다크모드에서 안 바뀌었다.
`text/*` 를 재사용할지 전용 토큰을 만들지 판단이 필요했다.

### 결정
`icon/primary` · `subtle` · `strong` · `disabled` · `brand` · `inverse` 를 신설한다.
이름 형식은 `text/*` 와 맞춘다(접미사 `fg` 없음).

### 근거
**아이콘은 UI 그래픽이라 대비 기준이 3:1 이고 텍스트는 4.5:1 이다.**
`text/*` 를 재사용하면 기준이 섞여 아이콘만 조정할 수 없다.

### 뒤집으려면
`icon/*` 을 삭제하고 `text/*` 로 재바인딩. 반나절.

---

## ADR-005 · Icon Set 마스터는 프리미티브를 직접 참조한다

상태: Accepted 확신도: 높음 날짜: 2026-08-29

### 맥락
Icon Set 파일의 아이콘 마스터가 `neutral/900` · `sky/500` 프리미티브를 물고 있다.
ADR-003 과 어긋나 보인다.

### 결정
**Icon Set 마스터는 그대로 둔다.** 색은 사용처에서 오버라이드한다.

### 근거
마스터가 시맨틱을 물면 `Icon Set → Theme` 참조가 생겨 의존 방향이 역전된다.
지금은 `Icon Set → DS Master` 단방향이다.

### 뒤집으려면
순환 의존이 생기므로 뒤집지 않는다.

---

## ADR-006 · container/width 하나만 남긴다

상태: Accepted 확신도: 중 날짜: 2026-08-29

### 맥락
`container/width`(브레이크포인트별 실제 폭)와 `container/max-width`(1200 고정)가
같은 자리에 섞여 쓰여 Laptop·Mobile 컨테이너가 1200 으로 잡혀 있었다.

### 결정
`container/width` 만 남기고 `container/max-width` 를 삭제했다.
CSS 는 `width:100%` + `max-width` 하드값 + `margin-inline:auto` 구조를 쓴다.

### 근거
Figma 는 `width:100%` 를 표현할 수 없어 브레이크포인트별 실제 폭이 필요하다.
CSS 의 `max-width` 는 1200 하나뿐이라 토큰이 필요 없다.
`max-width` 로 통일하면 Mobile 시안이 1200 이 되어 깨진다.

### 뒤집으려면
`Breakpoint` 에 `container/max-width` 를 1200 고정으로 다시 만든다. 30분.

---

## ADR-007 · Table/Cell 슬롯 이름을 유지한다

상태: Accepted 확신도: 중 날짜: 2026-08-29

### 맥락
슬롯 이름(`Leading` · `Chip` · `Input` · `Action`)이 실제 용도와 어긋난다.
`Chip` 슬롯의 상당수가 Chip 이 아니라 Avatar Group 이다.

### 결정
**이름을 유지한다.** 슬롯 선택은 이름이 아니라 사이징(FIXED / HUG)으로 판단한다.
대개편 시 `Lead` · `Content` · `Trailing` 으로 함께 바꾼다.

### 근거
인스턴스가 500개를 넘어 이름 변경 시 오버라이드 유실 위험이 크다.
얻는 것이 이름의 정확성뿐이다.

### 뒤집으려면
Table/Cell 대개편과 함께. 인스턴스 전수 재확인 필요.

---

## ADR-008 · Table/Cell 높이는 min-height 다

상태: Accepted 확신도: 높음 날짜: 2026-08-29

### 맥락
셀 높이가 고정이라 긴 텍스트가 잘렸다.
`padding-y` 토큰이 있었으나 실제 컴포넌트는 `padding-y: 0` 이었다.

### 결정
`counterAxisSizingMode: AUTO` + `minHeight` 로 바꾸고 `min-height` 토큰을 바인딩했다.
`padding-y` 토큰은 삭제했다. 여백은 세로 중앙 정렬이 만든다.

### 근거
한 줄일 때는 이전과 같고 여러 줄일 때만 늘어난다.
`padding-y` 를 함께 쓰면 여러 줄에서 높이가 과도해진다.

### 뒤집으려면
`counterAxisSizingMode` 를 FIXED 로 되돌린다. 30분. 다만 텍스트 잘림이 재발한다.

---

## ADR-009 · Button Size 는 xs 를 포함한다

상태: **Superseded → ADR-015** 확신도: 낮음 날짜: 2026-08-29

### 맥락
`Button` 에 `Size=xs` 가 45변형 있으나 인스턴스 사용처가 0건이다.
코드에 포함할지 판단이 필요했다.

### 결정
코드에 포함한다. 5단계(xs·sm·md·lg·xl)로 구현한다.

### 근거
`Table/Cell` 의 작은 사이즈처럼 조밀한 자리에서 `sm` 이 큰 상황이 나올 수 있다.

### 뒤집힌 이유
"나올 수 있다"는 가정이었고 실제 사용처가 없었다. → **ADR-015**

---


## ADR-010 · Variant 별 토큰은 독립시킨다

상태: Accepted 확신도: 높음 날짜: 2026-08-29

### 맥락
`tabs/pill` 이 `tabs/underline` 토큰을 참조해 두 Variant 가 묶여 있었다.
`underline` 을 바꾸면 `pill` 도 바뀐다.

### 결정
값이 같아도 Variant 별로 독립 토큰을 만든다.
컴포넌트 토큰이 같은 그룹의 다른 하위그룹을 참조하지 않는다.

### 근거
Variant 는 독립적으로 조정할 수 있어야 한다.
토큰 개수가 늘지만 별칭이라 유지 비용이 낮다.

### 뒤집으려면
중복 토큰을 삭제하고 공용 토큰으로 재바인딩. 건별 10분.

---

## ADR-011 · 컴포넌트 세트 배경은 surface/default 다

상태: Accepted 확신도: 중 날짜: 2026-08-29

### 맥락
세트 프레임 배경이 `white` 고정이라 페이지를 `Theme=Dark` 로 바꿔도
배경이 흰색으로 남아 다크 변형을 판단하기 어려웠다.

### 결정
`surface/default` 로 바꾼다. 모드를 따라간다.

### 근거
컴포넌트 배경이 `surface/default` 인 경우가 많아, 세트 배경도 같으면
그 컴포넌트가 실제로 어떻게 보이는지 정확히 판단된다.

### 뒤집으려면
`white` 로 되돌린다. 10분.

---

## ADR-012 · avatar/c/* 는 Theme 에 직접값으로 둔다

상태: Accepted 확신도: 중 날짜: 2026-08-29

### 맥락
아바타 배경 파스텔 13색이 프리미티브 램프에 없어 별칭을 걸 대상이 없다.
`Theme` 계층에 직접값이 있는 것은 원칙 위반으로 보인다.

### 결정
`Theme` 에 직접값으로 유지한다. 검사 스크립트는 예외로 통과시킨다.

### 근거
아바타 전용 색이고 13개뿐이라 프리미티브로 올려도 재사용처가 없다.
색상군이 하나 늘어나는 비용이 더 크다.

### 뒤집으려면
`Primitive` 에 `avatar-c/01~13` 을 추가하고 `Theme` 이 별칭으로 참조. 30분.

---

## ADR-013 · 문서에 값·수치를 넣지 않는다

상태: Accepted 확신도: 높음 날짜: 2026-08-29

### 맥락
문서에 값을 적으면 Figma 가 바뀔 때마다 낡는다.
낡은 값이 코드에 들어가 다크모드가 깨진 사고가 있었다.
문서를 검토할 때마다 새 오류가 나와 끝나지 않았다.

### 결정
문서에는 **방침만** 쓴다. 값·수치·API 동작 단정을 넣지 않는다.
값이 필요하면 Figma MCP 로 조회하고, 대조는 검사 스크립트가 한다.

### 근거
방침은 사람이 정한 것이라 실측 대상이 아니다 — 검토할 게 없다.
값은 스크립트가 실행 시점에 읽으므로 항상 맞다.

### 뒤집으려면
뒤집지 않는다. 이 결정이 반복 수정을 끊는 근거다.

---

## ADR-014 · 검사 항목은 누적한다

상태: Accepted 확신도: 높음 날짜: 2026-08-29

### 맥락
"완벽해질 때까지 검토"는 끝나지 않는다. 검토 각도가 무한하기 때문이다.

### 결정
목표를 **회귀 방지**로 둔다.
발견한 문제 유형을 검사 항목으로 만들고, 새 문제가 나오면 항목을 추가한다.
**항목은 줄지 않는다.**

### 근거
스크립트가 틀리면 그 스크립트를 고치면 되고, 고치면 다시는 안 틀린다.
사람이 매번 새로 검토하면 매번 다르게 틀린다.

### 뒤집으려면
뒤집지 않는다.

---

## ADR-015 · Button Size 는 xs 를 제외한다

상태: Accepted 확신도: 높음 날짜: 2026-08-29
대체: ADR-009

### 맥락
ADR-009 에서 `xs` 를 코드에 포함하기로 했으나, 근거가 "필요해질 수 있다"는 가정뿐이었다.
실제 인스턴스 사용처는 0건이다.

### 결정
**코드에서 제외한다.** `$button-sizes` Map 은 4단계(sm·md·lg·xl)로 만든다.
`button/radius-xs` 도 CSS 변수로 내보내지 않는다.
`Icon Button` 은 원래 Figma 에 xs 가 없어 동일하게 4단계다.

**Figma 의 45변형은 삭제하지 않고 유지한다.**

### 근거
쓰이지 않는 45변형을 코드로 만들면 유지 대상만 늘어난다.
Figma 에 남아 있으므로 필요해지면 코드만 추가하면 된다 — 추가 비용이 낮다.

### 뒤집으려면
Map 에 xs 항목을 추가한다. 10분.

```scss
xs: (height: 28px, pad: var(--button-padding-x-xs), type: body-2xs, radius: var(--button-radius-xs))
```

---

---

## ADR-016 · DESIGN-SYSTEM.md 를 만들지 않는다

상태: Accepted 확신도: 높음 날짜: 2026-08-29

### 맥락
초기 계획은 문서 4개였다 — `CLAUDE.md` · `DESIGN-SYSTEM.md` · `DECISIONS.md` · `PROGRESS.md`.
`DESIGN-SYSTEM.md` 는 "구조·예외·근거"를 담을 예정이었다.

### 결정
**만들지 않는다.** 그 내용은 `CLAUDE.md` 에 흡수한다.

### 근거
ADR-013 으로 "문서에 값·수치를 넣지 않는다"를 정한 뒤,
`DESIGN-SYSTEM.md` 에 남을 것이 **방침뿐**이 되었다. 방침은 `CLAUDE.md` 의 역할이다.
문서를 나누면 같은 주제가 두 곳에 흩어져 "한 사실은 한 파일에" 를 어긴다.

컴포넌트별 상세는 Figma MCP 조회로 대체한다 — 문서보다 정확하고 낡지 않는다.

### 뒤집으려면
`CLAUDE.md` 에서 구조 관련 장(1·2·4·6·7장)을 분리한다. 반나절.
다만 분리 기준이 모호해 다시 겹칠 위험이 있다.

---

## ADR-017 · 변수 메타데이터 검사는 스크립트가 아니라 MCP 수동 실행이다

상태: Accepted 확신도: 높음 날짜: 2026-08-30

### 맥락

`check-ds.mjs`(현 `check-nodes.mjs`)가 `GET /v1/files/{key}/variables/local` 로 변수 컬렉션·값을
받아 D1~D13 전부를 스크립트화할 계획이었다. 실제로 호출해보니 401 — Figma Variables REST API는
Enterprise 플랜 전용이고 이 프로젝트의 토큰은 해당 플랜이 아니다.

`GET /v1/files/{key}`(노드 트리) 로 대체 가능한지 실측했다. 컴포넌트 노드의 `boundVariables`는
`{"type":"VARIABLE_ALIAS","id":"VariableID:997:12"}` 형태로 **변수 id만** 주고 이름·컬렉션·값을
주지 않는다 — 이름 해석에 반드시 변수 목록이 필요한데 REST로는 얻을 수 없다.

### 결정

**노드 트리만으로 되는 검사(D1·D2·D10)만 스크립트(`check-nodes.mjs`)로 남긴다.**
변수 이름·값·scopes·description·별칭이 필요한 검사(D3~D9·D11~D13)는 Figma MCP로 대화 중
수동 실행한다. 단, id→이름 해석용으로 `figma/tokens.ids.json`(변수 id→이름·컬렉션 맵, MCP로
추출해 커밋)을 별도로 둬서 D1이 "이 프리미티브가 어떤 이름인지"는 알 수 있게 한다.

### 근거

REST 제약은 플랜을 바꾸지 않는 한 우회할 수 없는 사실이다. MCP(Plugin API)는 파일을 열어야
실행되므로 CI에 못 태우지만, 애초에 "V군은 Figma를 수정한 뒤 퍼블리시 전에" 도는 것이라
코드 작업 세션과는 실행 시점이 겹치지 않는다 — CI 부재가 실질적 손실이 아니다.

### 뒤집으려면

Figma 플랜을 Enterprise로 올리면 `/variables/local`을 다시 쓸 수 있다. 그 전까지는
`figma/tokens.ids.json` 갱신 절차(컬렉션 바뀔 때마다 MCP 재추출)를 유지한다.

---

## ADR-018 · 프리미티브 네이밍은 `color-` 접두사를 버리고 Figma 이름을 그대로 쓴다

상태: Accepted 확신도: 높음 날짜: 2026-08-30

### 맥락

`tokens/_primitive.scss`의 색상 변수는 전부 `--color-blue-500` 처럼 `color-` 접두사가 있다.
Figma Primitive 컬렉션의 실제 변수명은 `blue/500`(접두사 없음)이고, `codeSyntax.WEB`도
이미 `var(--blue-500)`으로 채워져 있다 — 코드와 Figma Dev Mode 표시가 서로 다르다(`check:tokens`
S2가 이 불일치를 157건의 "CSS 전용" + 491건의 "Figma 전용"으로 잡아냈다. 대부분 이 접두사 하나 때문).

### 결정

**`color-` 접두사를 제거하고 Figma 변수명을 그대로 쓴다.** `neutral/900` → `--neutral-900`
(현재 `--color-neutral-900`). `$color-*` SCSS 별칭과 이를 참조하는 컴포넌트 파일도 함께 정리한다.
**1단계(`tokens/` 재작성)에서 실행한다** — 지금 바로 리네임하지 않는다.

### 근거

Figma Dev Mode가 보여주는 이름과 코드의 변수 이름이 같아야 디자이너·개발자가 서로 다른 이름을
번역할 필요가 없다. `codeSyntax`가 이미 접두사 없는 형태로 채워져 있으므로, 코드 쪽을 거기에
맞추는 게 Figma를 코드에 맞춰 바꾸는 것보다 근거가 명확하다(Figma가 원본).

### 뒤집으려면

`$color-*` 별칭을 되살리고 컴포넌트 참조를 원복. 참조하는 곳이 많아(1단계 전체 파일) 반나절 이상.

---

## ADR-019 · D1(컬러 프리미티브 직접 참조) 예외 2건 — Checkbox 유효성 색·Avatar Online 링

상태: Accepted 확신도: 높음 날짜: 2026-08-30

### 맥락

`check-nodes.mjs` D1이 Figma 라이브에서 23건을 찾았다 — `_Checkbox base`의 validation
링(valid=`green/600`·`green/700`, invalid=`red/500`·`red/600`)과 `Avatar`의 `Online`
표시 링(`white`)이 시맨틱 토큰 없이 프리미티브를 직접 바인딩하고 있었다.

### 결정

**둘 다 의도된 것으로 보고 allowlist 예외로 처리한다.** 전역 허용이 아니라
**컴포넌트 이름 + 프리미티브 이름 쌍으로 좁혀서** 등록한다(`scripts/lib/allowlist.mjs`
`D1_NODE_EXCEPTIONS`) — `white`를 전역으로 풀면 D1이 원래 잡으려던 회귀(체크박스·입력·
페이지네이션·모달 배경이 `white`를 직접 물어 다크모드에서 흰 판이 된 사고, D1 "나온 배경")를
다시 놓친다. `_Checkbox base`·`Avatar` 두 컴포넌트 안에서만 예외가 적용되고, 다른 컴포넌트가
같은 프리미티브를 직접 물면 여전히 FAIL이다.

### 근거

유효성 표시색(성공=초록/실패=빨강)과 온라인 표시(흰 테두리)는 CLAUDE.md 1장의 "의미색"·
"유채색 배경 위 글자(장식 요소)"에 해당하고, 대응하는 시맨틱 토큰이 아직 없다.

### 뒤집으려면

해당 컴포넌트에 전용 시맨틱 토큰(예: `choice/validation-ring-valid` 등)을 만들고
`D1_NODE_EXCEPTIONS`에서 항목을 지운다. 건당 30분.

---

## ADR-020 · stylelint 를 도입하지 않는다

상태: Accepted 확신도: 높음 날짜: 2026-08-31

### 맥락

S6(중첩 깊이)·S7(BEM 위반) 강제 수단으로 stylelint 를 쓰기로 문서(`scripts/README.md`)에
적었고, `check-tokens.mjs`가 `stylelint-config-standard-scss` 기반 `.stylelintrc.json`을
`max-nesting-depth`·`selector-max-id` 두 규칙만 걸러 쓰는 방식으로 구현돼 있었다. devDependencies
에 `stylelint`가 있었지만 독립 실행 스크립트(`npm run lint`)는 없었다.

### 결정

**도입하지 않는다.** `check-tokens.mjs`가 SCSS 소스·컴파일된 CSS를 직접 스캔해 S6·S7b를
검사하도록 재작성한다(중괄호 균형 스캐너 + postcss 파싱, S5·S7a와 같은 방식). `stylelint`·
`stylelint-config-standard-scss`를 devDependencies에서 제거하고 `.stylelintrc.json`을
삭제한다. S7a·S7b가 쓰는 CSS 파싱은 `postcss`(stylelint의 전이 의존성으로만 설치돼 있던 것)를
독립 devDependency로 등록해 유지한다.

### 근거

`npm run lint`(전체 규칙)를 실제로 돌려보니 332건이 나왔는데, 우리가 원래 강제하려던 두
규칙(`max-nesting-depth`·`selector-max-id`)의 위반은 **0건**이었다 — 이미
`check-tokens.mjs`가 걸러서 통과 확인 중이었다. 나머지는:
- 102건 — `selector-class-pattern`이 이 프로젝트의 BEM `__`/`--` 표기를 kebab-case 위반으로
  오탐(`.tabs-item__content` 등 정상 클래스가 전부 걸림).
- 230건 — 빈 줄 삽입 규칙 5종(134건)·색상 표기법 규칙 4종(53건) 등 이 프로젝트가 정한 규칙과
  무관한 포매팅·스타일 취향.

전체 규칙 세트를 `check`에 넣으면 항상 FAIL하는 게이트가 되고, 필요한 2규칙만 쓰려면
`selector-class-pattern`을 BEM 패턴으로 재정의하고 나머지 규칙을 하나씩 꺼야 한다 — 그
설정을 만들고 유지하는 비용이, 이미 `check-tokens.mjs`로 통과 확인 중인 2규칙을 위해 낼
가치보다 크다.

### 뒤집으려면

`.stylelintrc.json`을 새로 만들어 `selector-class-pattern`을 BEM 패턴(`/^[a-z0-9-]+(__[a-z0-9-]+)?(--[a-z0-9-]+)?$/`
류)으로 지정하고, 나머지 무관한 규칙을 개별 비활성화한다. `check-tokens.mjs`의 S6/S7b를
`stylelint.lint()` 호출로 되돌린다. 반나절.

---

## ADR-021 · scopes 조이기 기준

상태: Accepted 확신도: 높음 날짜: 2026-08-31

### 맥락

Theme 컬렉션 토큰 다수가 `scopes: ALL_SCOPES`로 남아 있었다 — 어떤 속성에든 바인딩할 수
있다는 뜻이라, Figma 에서 변수를 고를 때 엉뚱한 자리(예: 배경색 자리에 텍스트 전용 토큰)가
후보로 잘못 뜰 여지가 컸다.

### 결정

**역할별로 좁힌다.** 램프(brand·accent 등 원시 색 단계)는 4개 scope 전부 유지, 배경은
`FRAME_FILL`+`SHAPE_FILL`, 테두리는 `STROKE_COLOR`, 전경(텍스트·아이콘)은 `TEXT_FILL`+
`SHAPE_FILL`로 좁힌다. Theme 77건을 이 기준으로 조였다 — 충돌 0건 확인.

**Primitive 189건은 조이지 않는다.** 프리미티브는 정의상 어디든 쓰일 수 있어야 하는
원시값 계층이라 scope 를 좁히는 것 자체가 목적에 안 맞는다.

**예외**: `surface/default`는 실사용이 넓어 4개 전부 유지(strokes 314곳·TEXT 2곳).
`border/default`는 `STROKE_COLOR`에 `SHAPE_FILL` 하나를 더했다(구분선 도형 채움 45곳).
순수 border 토큰 27건은 `STROKE_COLOR` 1개다.

### 근거

`ALL_SCOPES`는 후보가 너무 넓어 잘못 선택되기 쉽다 — scope 를 역할에 맞게 좁히면 Figma
속성 패널에서 그 자리에 맞는 토큰만 후보로 뜬다.

**다만 조인 뒤 실사용을 반드시 대조해야 한다** — `surface/default`가 테두리 자리에 314곳
쓰이는 것처럼, scope 를 좁히면서 그 변수가 실제로 걸쳐 쓰이던 속성을 놓치면 그 자리에서
후보 목록에서 사라져 버린다. 이번엔 대조 후 충돌 0건을 확인했다.

### 뒤집으려면

해당 토큰의 `scopes`를 `ALL_SCOPES`로 되돌린다. 건별 1분.

---

## ADR-022 · 아이콘 sprite 의 fill 을 빌드 산출물 단계에서 currentColor 로 치환한다

상태: Accepted 확신도: 높음 날짜: 2026-08-31

### 맥락

Alert 대조 작업 중 아이콘·닫기 버튼이 색상(brand/success/warning/...)과 무관하게 항상 회색으로
렌더링되는 걸 발견했다. 원인을 추적하니 `icons/raw/base/*.svg`(개별 원본, 293개)의 모든
`<path>`가 Figma export 시점 리터럴 `fill="#525252"`(우연히 `icon/primary` 라이트값과 일치)를
가지고 있고, 이 원본들이 조립된 `icons/sprite.svg`(1136개 `<symbol>`, 저장소 루트 — `docs/assets/`
사본이 아니라 원본)도 그 값을 그대로 물고 있었다.

`.icon` 컨테이너에 `fill: currentColor`를 CSS 로 걸어도 소용없다 — `<use>` 가 참조하는
`<symbol>` 내부 `<path>` 자체에 이미 지정값(`fill` 속성)이 있으면 조상의 상속값이 적용되지
않는다(SVG/CSS 명세: 요소 자신의 지정값이 상속보다 우선하고, `<use>` 참조 내용은 바깥 문서의
셀렉터로 직접 선택할 수 없다). 즉 SVG 소스 자체를 고쳐야 하는 문제였다.

`icons/sprite.svg`는 이 저장소(마스터 라이브러리)가 SI 프로젝트마다 복붙해 쓰는 산출물의
일부다(`README.md`: "Figma DS Master를 기준으로 SI 프로젝트마다 복붙해 쓰는 master SCSS").
`docs/` 는 `scripts/sync-docs-assets.mjs`가 이 파일을 그대로 복사한 미러일 뿐이라, docs 복사
단계에서만 치환하면 docs 사이트만 고쳐지고 실제로 이 파일을 가져다 쓰는 프로젝트들은 그대로
회색 버그를 물려받는다.

### 결정

`icons/sprite.svg`(저장소 루트, 배포 산출물) 자체를 새 스크립트로 치환한다.
`icons/raw/base/*.svg`(개별 원본)는 건드리지 않는다.

```
scripts/fix-icon-sprite-fill.mjs   fill="#525252" → fill="currentColor" (정확히 이 문자열만)
npm run fix:icon-sprite            로 실행
```

이 저장소엔 raw SVG → sprite 를 조립하는 스크립트가 없다(외부에서 한 번 조립해 커밋한 정적
파일). 그래서 "sprite 생성 스크립트 안에 치환을 넣는다"가 아니라 **sprite 파일을 직접
치환하는 별도 스크립트**로 만들었다. Figma Icon Set 에서 아이콘을 새로 받아 `icons/sprite.svg`를
다시 커밋할 때마다 이 스크립트를 다시 돌려야 한다 — 자동으로 안 걸린다(postbuild 에 안 걸음,
아래 "뒤집으려면" 참조 아님 — 의도적으로 수동 단계로 남겼다. sprite 재조립 자체가 이 저장소
밖에서 일어나는 수동 작업이라 그 뒤에 오는 이 단계도 같이 수동으로 뒀다).

`docs 동기화(sync-docs-assets.mjs)`는 손대지 않았다 — 이미 치환된 `icons/sprite.svg`를
그대로 복사하기만 하면 되므로.

### 근거

**정확히 `fill="#525252"` 문자열만 치환**해서 다른 색은 전혀 안 건드린다 — 전수 확인 결과
sprite 안의 fill 값은 293건이 전부 `#525252`이고 나머지 8건은 Social Button 브랜드 로고 심볼
(`icon-base-social-google`의 `#4285F4` 등 Google 4색·Naver `#03C75A`·Kakao `#FFEB3B`/`#3E2723`)
뿐이었다. 치환 후 재확인: 293건 모두 `currentColor`로 바뀌었고 브랜드 8건은 그대로, `<symbol>`
개수(1136)·`<svg>` 태그 균형 모두 변화 없음 — 구조가 안 깨졌다.

Headless Chrome 스크린샷으로 Alert·Icon Button·Social Button 세 페이지를 직접 확인했다.
Alert·Icon Button은 아이콘이 이제 색상별 토큰(fg)을 따라간다(이전엔 전부 회색). Social Button은
실제로는 `LOGO` 매핑이 `message-circle`/`smile`/`globe` 플레이스홀더만 쓰고 있어(스프라이트에
실제 브랜드 마크가 없다는 문서 설명과 별개로, `icon-base-social-*` 심볼 자체는 존재하지만
미사용) 애초에 브랜드색과 무관했다 — 오히려 컬러 배경 위에서 흰색/검정으로 올바르게 갈리는
것까지 확인(이전엔 배경과 무관하게 항상 회색이었을 결함).

`icon-duo-*`(838개, `stroke` 기반 duotone 아이콘군)는 이번 치환 대상이 아니다 — `fill` 이
아니라 `stroke="#171717"`/`stroke="#0EA5E9"`를 쓰고, 현재 어떤 컴포넌트·docs 페이지도
참조하지 않는 미사용 인벤토리라 범위 밖으로 남겨뒀다. 나중에 실제로 쓰기 시작하면 그때
같은 방식(stroke 치환)으로 판단한다.

### 뒤집으려면

`icons/sprite.svg`를 git 이력에서 치환 전 커밋으로 되돌린다. 또는 역방향 스크립트
(`fill="currentColor"` → `fill="#525252"`)를 만들어 돌린다. 건당 5분.

---

## ADR-023 · Figma↔SCSS 요소 대조를 하이브리드로 한다

상태: Accepted 확신도: 높음 날짜: 2026-09-01

### 맥락

28개 컴포넌트의 요소별 색 바인딩을 전수 대조할 방법이 필요했다. 완전 자동화가 가능한지
판단을 먼저 했다 — 3단계로 나눠보면:

1. **Figma 쪽 "요소→토큰" 추출**: `check-nodes.mjs`의 D1/D2가 이미 REST(`GET /v1/files/{key}/nodes`)
   + `tokens.ids.json`으로 이 일의 절반을 하고 있었다(노드 트리 순회 + `boundVariables` 이름
   해석, 인스턴스 내부는 제외). MCP `get_variable_defs`는 노드 트리 전체를 뭉뚱그려 집계해서
   요소별 구분이 안 된다(Alert에서 Icon·Close·Title이 전부 `alert-brand-fg` 하나로만 나와
   "아마 셋 다 이거겠다"는 정황 추론에 그쳤다) — REST+`tokens.ids.json`이 이 목적엔 더 정확했다.
2. **SCSS 쪽 파싱**: `check-tokens.mjs`가 이미 postcss로 컴파일된 CSS를 파싱한다(S5·S7a·S7b,
   ADR-020). 이것도 기존 인프라로 된다.
3. **"요소↔셀렉터" 매핑**: 이건 자동 도출이 안 됐다. Figma 레이어명(`Icon`)과 BEM 클래스명
   (`.alert__icon`)은 다른 명명 체계고, 이 매핑을 아는 건 사람(또는 Claude 앱)이 컴포넌트를
   조회하며 하는 바로 그 판단이다 — 지금 만드는 기준표 자체가 이 매핑과 동급의 작업물이다.

### 결정

**Figma 조회(REST)와 SCSS 파싱(postcss)은 자동화하고, 요소명↔셀렉터 매핑은 컴포넌트별 설정
파일로 사람이 정의한다.** 매핑이 없는 컴포넌트는 검사 대상에서 자연히 빠지고 지금처럼 프롬프트
기준표로 진행한다.

구현(Alert을 파일럿으로 완료):

- `scripts/check-nodes.mjs --dump <세트명>`: D1/D2의 `walk`/`resolveVarId`를 재사용해 그
  컴포넌트 세트의 모든 변형에 대해 `path → 바인딩된 토큰`을 위반 필터링 없이 JSON으로 낸다.
  element-map 작성·검증용.
- `scripts/lib/element-map/*.mjs`: 컴포넌트당 하나. `{ figmaPath, cssSelector, cssProperty,
  token, except?, via? }` 목록. `token`·`cssSelector`는 `{color}` 같은 변형 축 플레이스홀더를
  쓴다. `cssSelector`는 Figma 레이어가 아니라 **실제로 그 값이 선언되는 지점**을 가리킨다 —
  Icon·Close처럼 자체 선언이 없고 조상에서 상속받으면 조상 셀렉터를 가리키고 `via`에 이유를
  남긴다(자세한 근거는 `scripts/README.md` D14).
- **D14**(`check-nodes.mjs`에 통합, N군): 매핑마다 참조된 축만 전개해 대표 변형을 고르고,
  Figma 덤프·컴파일된 CSS(`dist/main.css`) 양쪽을 기대 토큰과 대조해 **Figma 불일치 / SCSS
  불일치를 구분해서** 보고한다.

### 근거

Figma 레이어명과 BEM 클래스명은 다른 명명 체계라 자동 도출이 불가능하다. 매핑 작성은 지금
기준표 작성과 조사량이 같아서(Alert처럼 단순한 컴포넌트는 조사를 구조화만 하면 되므로 추가
비용이 거의 없고, Table/Cell·Calendar·Modal·Avatar Group처럼 복잡한 컴포넌트는 `PROGRESS.md`
3~7단계에 반복 기록된 것처럼 애초에 한 번에 정확히 파악되지 않는 경우가 많아 매핑 작성 자체가
지금 하는 조사와 같은 작업량이다) 순증 비용이 없고, **한 번 쓰면 회귀 검사로 계속 재사용된다**
(ADR-014 "검사 항목은 누적한다"와 같은 방향).

Alert로 파일럿 구현 후 실제 REST 없이(FIGMA_TOKEN 만료 상태) `fetch`를 모킹한 통합 테스트로
로직을 검증했다 — 정상 매핑은 조용히 통과하고, Figma 쪽 데이터를 일부러 빠뜨리면 "Figma
불일치"로, `dist/main.css`를 일부러 깨뜨리면(임시 변경 후 재빌드로 원복) "SCSS 불일치"로 정확히
구분되는 것을 확인했다.

### 한계

**토큰 참조 오류만 잡는다.** 여러 클래스가 동시에 걸렸을 때 소스 순서·specificity로 실제
적용되는 값이 뭔지는 시뮬레이션하지 않는다 — Alert의 banner 테두리 버그(`.alert-banner`의
`border: none`이 나중에 나오는 `.alert-brand`의 `border`에 소스 순서상 덮어써진 것)가 그
예다. 두 선언 다 올바른 토큰을 참조하고 있어서 D14로는 안 잡히고, 실제로 오늘 이 버그는
사람(Claude 앱의 기준표 지시)이 스크린샷을 보고서야 잡혔다. 색 토큰 바인딩만 다루고, 효과
(그림자)·타이포·간격은 대상이 아니다.

### 뒤집으려면

`scripts/lib/element-map/` 디렉터리를 삭제하고 `check-nodes.mjs`의 D14 블록(`--dump` 모드
포함)을 제거한다. 프롬프트 기준표 방식으로 돌아간다. 30분.

---

## ADR-024 · docs 사이트에 다크모드 토글을 추가한다

상태: Accepted 확신도: 높음 날짜: 2026-09-01

### 맥락

`docs/` 의 모든 페이지가 `<html data-theme="light">` 로 고정돼 있어, `[data-theme='dark']`
오버라이드가 있는 토큰·컴포넌트(체크박스·드롭다운·칩·알럿 등 다수)를 이 문서 사이트에서
육안으로 검증할 방법이 없었다. 컴포넌트 CSS(`main.css`) 자체는 이미 다크 오버라이드를
전부 갖고 있어 이론상 `data-theme` 속성만 바꾸면 즉시 반영된다.

다만 실제로 구현해보니 컴포넌트 CSS와 별개로 **docs 사이트 자체의 크롬(`docs.css`)** —
사이드바·카드·페이지 헤더 배경/보더/텍스트 색 — 이 시맨틱 토큰이 아니라 `#fff`·`var(--neutral-*)`
같은 라이트 전용 리터럴로 하드코딩돼 있어서, 토글만 달면 컴포넌트 데모는 다크로 바뀌는데
그 주변 문서 UI는 계속 흰 배경으로 남는 반쪽짜리 다크모드가 될 뻔했다.

### 결정

`docs/assets/nav.js`에 다크모드 토글 버튼(`.icon-btn` 컴포넌트 재사용)을 사이드바 헤더에
추가하고, `localStorage`(`bluesoft-docs-theme`)로 선택을 저장해 페이지 이동 간 유지한다.
동시에 `docs/assets/docs.css`의 하드코딩된 배경/보더/텍스트 색을 `--surface-*`·`--border-*`·
`--text-*` 시맨틱 토큰으로 교체해 문서 크롬도 함께 전환되게 한다.

### 근거

컴포넌트 쪽 CSS는 이미 완성돼 있어 토글 자체의 구현 비용은 버튼 하나 + `localStorage` 읽고
쓰기 정도로 낮다. 컴포넌트별로 별도 다크 섹션을 만드는 대안은 26개 페이지 전체에 중복 콘텐츠를
만드는 것이라 비용이 훨씬 크고, 검사 스크립트만으로 대체하는 대안은 이 문서 사이트를 만든
목적(시각적으로 볼 수 있는 문서) 중 다크모드 부분을 포기하는 것이다.

### 뒤집으려면

`nav.js`의 `THEME_KEY`·`storedTheme` 블록과 `#doc-theme-toggle` 관련 코드를 제거하고,
`docs.css`의 시맨틱 토큰을 원래 리터럴로 되돌린다. 15분.

---

## ADR-025 · 미사용 space()/radius() 유효성 검증 함수를 제거한다

상태: Proposed 확신도: 높음 날짜: 2026-09-01

### 맥락

이 항목은 이 세션이 시작되기 전부터 워킹트리에 커밋 안 된 상태로 이미 존재하던 변경이다
(`scss/abstracts/_functions.scss` 삭제 + `main.scss`·`_maps.scss`·`CLAUDE.md` 연동 수정).
누가·왜 했는지 세션 안에서는 확인할 수 없어, 이 변경이 안전한지를 직접 검증했다.

`_functions.scss`는 커밋 f7bccc7("abstracts 계층 신설")에서 `space($key)`/`radius($key)`
함수로 도입됐다 — `$space-*`/`$radius-*` alias 위에 "존재하지 않는 키를 컴파일 에러로
드러내는" 유효성 검증만 얹는 래퍼였다. `scss/` 전체를 `space(`·`radius(` 로 grep했지만
실제 호출부가 **0건**이었다 — 도입된 뒤로 한 번도 실사용되지 않은 죽은 코드였다.

### 결정

`_functions.scss` 삭제, `main.scss`의 `@use 'abstracts/functions';` 제거, `CLAUDE.md`
파일 구조표에서 해당 행 제거를 그대로 받아들인다.

### 근거

호출부가 0건이라 실질적 효과가 없었고, 원래 목적(오탈자 방지)은 함수 없이도 이미 달성된다 —
`$space-4` 같은 존재하지 않는 SCSS 변수를 참조하면 Sass가 자체적으로 컴파일 에러를 낸다.
유지 비용(파일 하나, `main.scss` 등록, 문서화)만 있고 이득이 없는 죽은 추상화였다.

### 뒤집으려면

f7bccc7의 `scss/abstracts/_functions.scss` 내용을 복원하고, `main.scss`에
`@use 'abstracts/functions';`를 다시 추가하고, `CLAUDE.md` 파일 구조표에 해당 행을
다시 추가한다. 5분.

---

## 미결 — 결정이 필요할 때 여기에 추가한다

| # | 항목 | 성격 |
|---|---|---|
| 1 | `Con` · `Card` · `Social Button` 의 disabled 표현 부재 | Figma 에 상태 추가 vs 코드에서 `opacity` |
| 2 | `_List/Item` focus 표시 부재 | Figma 추가 vs 코드에서 ring |
| ~~3~~ | ~~`Chip` · `Alert` 의 `brand` 와 `info` 중복~~ | **해소**: 다르다. brand는 브랜드 램프를 따라가고 info는 blue 고정 — 다크에서 `chip/brand/fg`=#93c5fd vs `chip/info/fg`=#60a5fa로 갈린다. 브랜드 색을 바꿔도 info는 파랑을 유지해야 하므로 의도된 설계. |
| ~~4~~ | ~~`Calendar` `Type=Card` 와 `default` 동일~~ | **해소**: 다르다. fills의 visible 플래그로 갈린다 — Card=배경 보임, default=투명. 스크린샷으로 확인. |
| ~~5~~ | ~~`Pagination` `simple` 과 `numbers` 규격 동일~~ | **해소**: 다르다. Size가 내부 요소를 바꾼다(셀 32/40/48, gap 2/2/4). Type은 구성 자체가 다르다(simple=텍스트+버튼, numbers=화살표+번호목록). |
| 6 | `Checkbox` radius 하드값 | 토큰화 vs 유지 |
| ~~7~~ | ~~`Toggle` track radius · padding 하드값~~ | **해소**: radius는 이미 토큰화됨(`$radius-full`). space 스케일은 `space-N = N*4px`(step 값이지 리터럴 px가 아님) — `$toggle-height`(20px)는 `$space-5`, `$toggle-knob-size`(16px)는 `$space-4`로 토큰화했다. `$toggle-width`(36px)·`$toggle-knob-inset`(2px)은 스케일에 대응 step이 없어(각각 32/40 사이, 4px 미만) 리터럴로 유지하고 주석으로 이유를 남겼다. |
| 8 | `Tooltip` radius 하드값 | 토큰화 vs 유지 |
| 9 | `Modal` alert 계열에 lg·xl 부재 | 의도 확인 |
| 10 | `Featured Icon` 에 `info` 색 부재 | 추가 vs 유지 |
| ~~11~~ | ~~`ALL_SCOPES` 토큰의 scopes 조이기~~ | **해소(ADR-021)**: Theme 77건을 역할별로 조였다. 충돌 0 확인. `surface/default`는 실사용이 넓어 4개 전부 유지, `border/default`는 `STROKE_COLOR`+`SHAPE_FILL`(구분선 도형 채움 45곳)로 예외 유지. |
| ~~12~~ | ~~`board-row` `notice` 텍스트가 `post` 보다 작음~~ | **해소**: batch 4 에서 확인. title 크기는 동일하고 차이는 Notice 배지 유무였다. |

**이 목록은 코드 작업을 막지 않는다.** 대부분 "의도인지 확인"이다.
