# 수리위키 디자인 시스템 — 「현장 기록지 × 렌더링 박스」

서브페이지 작업자가 보는 사용 설명서. 토큰·클래스·컴포넌트 이름은 `web/app/globals.css`·`web/app/_components/`에 있는 그대로다.
원칙: 크림 종이 위 1px 괘선·번호·모노 라벨, 사진은 실사 전/후 비교 박스만, 숫자는 데이터에서 계산된 것만.

## 1. 토큰 (이름 그대로, 값은 globals.css)

| 역할 | 토큰 |
|---|---|
| 면 | `--paper`(기본) · `--beige`(마키·인용·서브 히어로) · `--card`(패널, 순백 `#fff` 금지) · `--ink`(히어로·푸터) · `--ink-2`(진행 과정·상담 띠) |
| 글자 | `--ink` · `--ink-soft`(보조) · `--on-ink` · `--on-ink-soft`(어두운 면) |
| 강조 | `--copper`(=`--teal`=`--blue`, 밝은 면 링크·포커스·선택·체크) · `--gold`(어두운 면 라벨·번호·코너 틱) · `--cta`(테라코타, `.btn-call` 바탕에만) |
| 괘선 | `--line` · `--line-soft`(안쪽) · `--line-dark` · `--grid-dark`(어두운 면) |
| 기타 | `--elev-1/2` · `--r-panel`(12px) · `--r-control`(8px) · `--r-chip`(4px) · `--section-y` · `--serif` · `--sans` · `--mono` |

새 조합을 화면에 쓰면 `web/scripts/check-contrast.mjs` PAIRS에 넣고 통과시킨다. 새 색 추가 금지.

## 2. 클래스

**면·컨테이너** — `.wrap`(1200px, 거터 16/24/32) · `.section-y` · `.sec-rule`(상단 1px) · `.dark` · `.dark-2` · `.blueprint`(그리드, 어두운 면과 같이) · `.panel`(렌더링 박스) · `.panel-lift`(호버 리프트, 카드에만) · `.panel-dark` · `.card`(옛 이름, = panel)

**타이포** — `.t-display`(h1) · `.t-h2` · `.t-h3` · `.t-lead` · `.t-caption` · `.t-serif-line`(세리프 한 줄) · `.label-mono`(번호·메타) · `.eyebrow`(옛 이름, 한국어로 바꿔 쓴다) · `.font-serif-kr`(옛 이름, 세리프 600)

**버튼** — `.btn-call`(카카오·상담, 테라코타) · `.btn-ghost`(밝은 면) · `.btn-ghost-dark`(어두운 면) · `.btn-sm`(40px, 헤더용). 링크·버튼에 transform 호버 금지.

**부속** — `.tick`(10px 체크 사각, `.tick-gold`) · `.chip-mono`(사진 위 라벨; 히어로 박스 안에서는 코너 틱을 피해 22px 안쪽) · `.tap44` · `.sr-only` · `.case-cta`(시공 전후 그리드 마지막 칸 상담 패널, `.panel-dark .on-dark`와 같이)

**홈 전용 블록** — `.home-hero`(모바일에서 전화 버튼은 숨김 — 하단 상담바가 맡는다) · `.stat-band`(3칸: 수리 항목·안내 지역·안내 페이지) · `.marquee`(JS 없음·reduced-motion이면 한 줄 손 스크롤 스트립) · `.principles`(≥900px `3fr 4fr 5fr`) · `.region-cols`(모바일부터 2열, 768 3열, 1024 4열) · `#process`는 섹션 머리 괘선을 숨기고 레일 선 하나만 · `.cat-photo`는 1024px 미만에서 숨김

**옛 블록(이름 유지, 룩만 갱신)** — `.sec-head` `.num-cols` `.faq` `.page-hero` `.hero-inner` `.hero-photo` `.hero-tags` `.cta-band` `.site-foot` `.crumb-*` `.area-fold` `.search-*` `.diag-*` `.rule-list` `.cond-table` `.note-*` `.step-*`. `.callbar`는 전역 상담바가 대신하므로 `display:none`.

## 3. 모션

- 마크업: `data-reveal="up"` (단일) · `data-reveal="stagger"` (부모, 자식마다 `style={{'--i': n}}`; 간격은 `--stagger`, 기본 80ms) · `data-reveal="line"` (괘선 scaleX) · `data-reveal="photo"`.
- 초기 숨김은 `html.has-js` 뒤에서만. `Reveal`은 layout에 이미 있다 — 페이지에서 다시 마운트하지 않는다.
- `display: contents` 요소에 `data-reveal`을 걸면 IO가 못 잡는다 → 자식에 건다.
- reduced-motion에서 전부 꺼진다. 패럴랙스·스크롤 스케일·자동 슬라이드 금지.

## 4. 컴포넌트 (`web/app/_components/`)

| 이름 | 사용 |
|---|---|
| `CompareBox` | `sets`(PhotoSet[] 또는 FieldPhotoSet[]) · `size` 'hero'/'card' · `alt` · `ratio` '4/5'/'3/4' · `showThumbs` · `thumbsPosition` · `autoWipe`(홈 히어로만) · `eager` · `dark` · `showCaption`. 개념도 세트는 자동으로 `개념도` 칩. 세트에 `sameAngle:false`가 있으면 와이프 대신 **2단 나란히**(`.compare[data-layout="pair"]`, 3:2, 구분선·핸들 없음)로 그린다 — 촬영 위치가 다른 전/후를 와이프하면 다른 곳 사진처럼 보인다. 터치는 가로로 8px 이상 끌었을 때만 드래그(세로 스크롤 중 구분선이 튀지 않게), 마우스는 클릭 위치로 바로. |
| `BeforeAfterSlider` | 옛 이름 래퍼(`sets`, `alt`) → CompareBox card. 그대로 써도 된다. |
| `SectionHead` | `num="01" label="시공 전후" title desc as align('split'/'stack') dark`. 옛 `eyebrow` prop도 받는다. 번호는 페이지 안에서 01부터. |
| `PageHero` | `tone` 'paper'/'beige'/'dark'/'image'(옛 yellow→beige, blue→dark 매핑). `photo`가 있으면 우측 3:4 렌더링 박스(image). `images`는 첫 장만. `eyebrow`(한국어 라벨) · `above`(브레드크럼) · `aside` · `tags` · children(버튼). |
| `CategoryIndex` | `panels=[{category, items(+regionCount), photo, set}]` · `defaultOpenSlug`. 오른쪽 칸은 기록 카드 — `set`(field-photos.json `categorySets`)의 전·후 두 장을 나란히, 개념도는 '개념도' 표시. 세트가 없으면 `photo` 한 장, 둘 다 없으면 사진 상담 카드. 모바일(<1024)은 목록만. |
| `RegionColumns` | `regions=[{dong, upper?, count, href}]` · `total` · `limit`. 허브·사이트맵 지역 목록. |
| `ProcessRail` | `steps=[{title, desc}]`. 어두운 면 안에서. |
| `PrincipleBand` · `Marquee` · `CountUp` | 홈 전용이지만 재사용 가능. CountUp 값은 계산값만. |
| `PartnerSites` | 기존 props + `num`. |
| `CtaBand` · `SiteHeader` · `MobileConsultBar` · `SiteFooter` · `FloatingActions` | layout에 이미 있다. 페이지에서 CtaBand를 또 넣지 않는다. FloatingActions는 지역 랜딩만(`telHref`). |
| `HeroSlider` | 유지(지역 랜딩 히어로). 신규 사용 금지. |

사진 헬퍼(`web/lib/photos.ts`): `keywordPhoto` `keywordPhotos` `categoryPhoto` `homeHeroPhoto`(기존) + `fieldPhotoSets()` `fieldPhotoPairs()` `homePhotoSets()`.
홈 세트 순서와 `sameAngle` 판정은 `scripts/build-site-data.mjs`의 `HOME_SET_ORDER` 한 곳에서 정한다(0번 = 히어로, 와이프가 성립하는 세트를 앞에).

## 4.1 문구 규칙 (홈)

- 숫자는 계산값만: `keywords.length` · 지역 수는 `'강남'/'강남구'`처럼 같은 이름을 합친 고유 수(`regionKey`) · `landings.length` · `photoSets.length`.
- '같은 각도'·'같은 자리' 같은 사진에 대한 주장은 쓰지 않는다. 촬영 위치가 다를 수 있다고 밝힌다.
- 상담 CTA는 어디로 가는지 밝힌다 — `카카오톡으로 사진 상담`(pf.kakao.com), 전화는 번호 그대로. '문자'를 쓰면 `sms:` 링크를 실제로 둔다.
- 사업자 정보(상호·대표·등록번호·소재지)는 운영자가 주기 전까지 적지 않는다. 근거 없는 '법 준수' 문구도 쓰지 않는다.
- 한 페이지에서 같은 약속 문장을 세 번 반복하지 않는다(h1 · 원칙 01 · 상담 띠가 각각 다른 원문 약속을 맡는다).

## 5. 페이지별 적용 규칙

- **공통**: URL·라우트·`generateStaticParams/Metadata`·`data-module`·앵커 id 불변. 페이지 전용 스타일은 `web/app/_styles/<page>.css`. 섹션 사이는 `.sec-rule` 하나(배경 교차 금지). 어두운 면은 히어로(dark 톤)·CTA 띠·푸터만. 모노 영문 eyebrow(Service / …, Before / After 등)는 한국어로.
- **허브 `/{keyword}`**: `PageHero tone="paper"` + `photo`(keywordPhotos 첫 장, 없으면 사진 칸 비움) · `eyebrow={category.display_name}`. 시공 전후 = `CompareBox size="card"` 또는 `BeforeAfterSlider`(개념도는 자동 표기). 지역 목록 = `RegionColumns`.
- **지역 랜딩 `/{keyword}/{region}`**: 모듈 분기·순서·본문 유지. `.page-hero[data-tone=dark]` 유지. 각 Mxx 머리 = `SectionHead(num, label)`. 핵심 포인트·증상 카드는 괘선 격자(`.num-cols` 또는 열 사이 1px `--line`), 렌더링 박스(`.panel`)는 전/후·사진·상담 박스에만. 하단 상담 박스 = `--beige` 면 `.panel` + 세리프 h3 + 버튼 2개. `.callbar`는 지워도 된다(전역 바가 대신).
- **분야 `/category/{slug}`**: `PageHero tone="paper"`(+ `categoryPhoto`) + `CategoryIndex panels defaultOpenSlug={slug}`.
- **사이트맵**: `PageHero tone="paper"` + 다단 텍스트 색인(`RegionColumns` 패턴), 모노 번호. 어두운 면 없음.
- **404**: `.t-display` 한 줄(기존 문구) + `KeywordSearch` + 분야 7개 링크(44px 행).
- **모바일**: 거터 16, 섹션 64, h1 ≥ 36px, 본문 16/1.7, 탭 44, 가로 스크롤 요소는 썸네일 스트립뿐. 하단 상담바 높이만큼 body가 여백을 준다 — 페이지에서 `pb-24`를 또 주지 않는다.
