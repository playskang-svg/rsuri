# 지역 페이지 콘텐츠 모델

> 현재 최상위 규칙은 전문가 문서 v0.6과 `scripts/data/ct-mod-v0.6.json`이다. 모든 빌드는
> `scripts/validate-content-model.mjs`에서 CT1~CT6, M01~M28, 키워드 원문, 근거 및 HOLD 조건을
> 검사한다. 아래 2단 조립 모델은 그 CT·MOD 구조 안에서 본문 재료를 공급한다.

## CT·MOD가 실제로 어떻게 적용되나

문서 08절의 모듈 선택 로직을 빌드가 그대로 밟는다. 네 파일이 한 줄로 이어진다.

| 파일 | 역할 |
|---|---|
| `scripts/data/ct-mod-v0.6.json` | 전문가 문서 전문을 옮긴 정본. CT 조합표·모듈 사전·M28 워크플로·상관관계 라이브러리·이미지 규칙까지 들어 있다 |
| `scripts/data/keyword-intent.json` | 08절 2·4단계 — 키워드마다 검색 질문 1문장과 중심 CT를 선언한다 |
| `scripts/lib/content-model.mjs` | 08절 5·6단계 — 근거가 있는 모듈로 뼈대를 세우고 옵션을 2~4개 얹는다 |
| `scripts/validate-content-model.mjs` | 08절 8·9단계 — 조합·근거·순서를 되짚고 어긋나면 빌드를 세운다 |

핵심은 **CT를 희망대로 찍지 않는다**는 것이다. 의도한 CT의 필수 모듈에 실제 근거가 없으면
문서 07절("문장을 만들어 채우지 않고 CT를 바꾸거나 HOLD")에 따라 CT를 내리거나 HOLD로
돌리고, 그 사실을 `intended_content_type` · `content_type_fell_back` · `hold_reason`에 남긴다.

지금 상태: 문틀교체·계단리모델링 20개 페이지는 CT5(진단·판단형) 의도로 선언돼 있지만
M05(상태 구분)·M06(전문가 판단)·M07(수리·교체 기준)의 현장 근거가 없어 CT1로 내려가 있다.
운영자가 그 세 모듈의 사실을 채우면 선언만으로 CT5로 올라간다 — 코드를 고칠 필요가 없다.

**CT·MOD는 본문 모듈을 규정하지 사이트 내비게이션을 규정하지 않는다.** 거미줄 내부링크와
지역 마스터 블록은 `data-chrome`으로 표시하고 `module_order` 밖에 둔다. 한 번 이 둘을 모듈
게이트에 묶었다가 CT1 옵션표에 M22가 없다는 이유로 546개 페이지에서 내부링크가 통째로
사라진 적이 있다.

## 왜 바꿨나

2026-09-03 기준 LANDING 페이지 1,479건 중 본문이 있는 건 6건이었다. 나머지 1,473건은
`meta_title` 한 줄만 있어서, 템플릿의 모든 섹션이 `{guide && ...}`에 걸려 통째로 렌더링되지
않았다. 화면에 남는 건 브레드크럼 + h1 + 지역 목록뿐이었다.

원인은 템플릿이 아니라 **발행 전제**였다. 기존 모델은 "지역별 실제 CASE(현장 기록)가 있어야
페이지를 발행한다"였는데, CASE는 사람이 현장에서 하나씩 쌓는 자원이라 조합 페이지 수를
따라갈 수 없다. 관리 화면의 일괄 추가로 조합만 1,479건이 생기고 CASE는 6건에 머물렀다.

벤치마크(`koreajipsurimaster.com`)의 지역 페이지를 실제로 뜯어보면 지역별 CASE를 요구하지
않는다. 시공 전/후 사진은 **키워드 단위로 몇 세트**를 만들어 그 키워드의 모든 지역 페이지가
돌려 쓰고(강남 페이지의 사진 캡션에 "경기 분당구", "인천 부평구"가 그대로 박혀 있다),
지역마다 다른 건 **텍스트**다. 그 구조를 가져왔다.

## 2단 구조

본문은 두 층에서 온다. 어느 쪽에도 완성된 페이지 본문을 저장하지 않는다 — 조립은 빌드 때
`web/lib/compose-local.ts`가 한다.

| 층 | 저장 위치 | 내용 | 범위 |
|---|---|---|---|
| 키워드 자산 | `suri_repair_keywords.content` | tagline · 서비스 항목 · 진행 절차 · 증상 체크리스트 · 전문업체 이유 · 공통 FAQ | 그 키워드의 **모든** 지역 페이지가 상속 |
| 키워드 문장 풀 | `suri_repair_keywords.content.local_pool` | 지역 유형별 히어로 각도 · 의뢰 유형 카드 풀 · 롱폼 문단 풀 | 조립 재료 |
| 지역 프로필 | `suri_regions.profile` | 내부 조사 원본(`research_raw`) · 검증된 공개문(`display_text`) · 주거 유형(type) · 인접 지역(near) · 대표 동(dongs) | 그 지역의 **모든** 키워드 페이지가 공유 |
| 페이지 override | `suri_pages.local` | 손으로 쓴 완성 본문 | 그 페이지 하나. 있으면 조립을 이긴다 |

**완성본을 페이지마다 저장하지 않는 이유**: 페이지가 1,479건이라 같은 문장이 수백 번 중복
저장되고, 문장 하나를 고치려면 전 페이지를 다시 써야 한다. 실제로 문수리 67지역분 완성본을
SQL로 뽑아 보니 196KB였는데, 재료만 저장하니 32KB로 줄었다.

## 조립 규칙 (`web/lib/compose-local.ts`)

```
local = suri_pages.local
     ?? compose(keyword.slug, region.display_name, region.profile, keyword.content.local_pool)
```

- M28은 `verification_status:'verified'`이며 `research_raw`와 `display_text`가 모두 있을 때만
  선택·노출한다. 이전 버전의 `note`는 `research_raw`로 보존하지만 검증 전에는 공개하지 않는다.

- **후보를 정하는 건 지역 유형**, 순서를 흔드는 건 해시다. 신축 단지 페이지에 "30년차 문틀
  뒤틀림" 카드가 뽑히면 그 페이지는 틀린 글이 된다 — 해시는 순서만 건드린다.
- **같은 (키워드, 지역)이면 몇 번을 빌드해도 같은 결과**여야 한다. 난수를 쓰면 빌드마다
  문장이 바뀌어 이미 색인된 페이지가 매번 갈아엎어진다.
- 지역 유형에 맞는 `angles` 항목이 없으면 `null`을 돌려주고 조립을 포기한다. 아무 각도나
  갖다 붙이면 그 동네와 상관없는 한 줄이 히어로 맨 앞에 걸린다 — 빈 페이지보다 나쁘다.
- 롱폼 마지막 문단은 항상 `final: true` 문단(문의 안내)으로 고정한다. 읽고 나서 바로 상담으로
  이어지는 자리라 위치가 바뀌면 안 된다.

## 페이지 섹션 순서 (벤치마크와 동일)

1. 브레드크럼
2. 히어로 — 지역 한 줄(`hero_line`) + 상담 CTA + 대표 사진
3. 시공 사례 전/후 — **실제 사진(`suri_keyword_images`)이 있을 때만**. 스톡 사진으로는 전후
   비교가 성립하지 않는다(같은 현장이 아니다)
4. 이 지역에서 많이 받는 의뢰 (`top_requests`)
5. 지역 롱폼 본문 (`longform`)
6. 서비스 세부 항목 (키워드 자산)
7. 표준 시공 절차
8. 전문 업체가 유리한 이유
9. 시공 기록 발췌 (해당 조합에 CASE가 있을 때)
10. FAQ — **지역 FAQ가 첫 문항**, 이어서 키워드 공통 FAQ
11. 지역 담당 마스터
12. 거미줄 내부링크
13. 모바일 고정 상담바

## 키워드 하나를 추가하는 절차

1. `scripts/data/keyword-content/<slug>.json` 작성
   - `content` — 지역명이 절대 들어가면 안 된다. 모든 지역이 상속하므로 지역명을 박으면
     상속받는 순간 틀린 글이 된다
   - `local_pool.angles` — `region-profiles.json`의 8개 `type`을 모두 채운다. 빠진 유형의
     지역은 조립이 실패해 빈 페이지가 된다
   - `local_pool.sections` 중 하나에 `"final": true` (문의 안내)
2. 새로 등장한 지역이 있으면 `scripts/data/region-profiles.json`에 프로필 추가
3. SQL 생성: `node scripts/build-page-content.mjs <slug>`
4. 생성된 SQL을 검토 후 DB에 반영 (CLAUDE.md — 마이그레이션·DB 반영은 승인 후)
5. 발행 상태 갱신 — 재료가 갖춰진 페이지를 `HOLD` → `CREATE`로 되돌린다:

```sql
update suri_pages p set decision = 'CREATE', updated_at = now()
from suri_regions r, suri_repair_keywords k
where p.region_id = r.id and p.repair_keyword_id = k.id
  and p.page_type = 'LANDING' and p.decision = 'HOLD'
  and r.profile is not null and k.content is not null;
```

6. 정적 export라 DB만 바꾸면 사이트에 반영되지 않는다. GitHub Actions의
   `Deploy to Cloudflare Workers`를 `workflow_dispatch`로 한 번 돌린다 (docs/DEPLOY.md)

## 발행 기준

재료가 없는 페이지는 `decision='HOLD'`로 둔다. `suri_pages`의 RLS 정책이
`decision <> 'HOLD'`라 anon(정적 빌드)에서 아예 보이지 않고, 관리 화면은 `is_admin()` 정책으로
계속 보인다.

내용 없는 페이지 1,400장이 색인되면 도메인 전체 평가가 깎인다. 키워드별로 콘텐츠가 채워지는
대로 위 5번 SQL로 되돌려 발행한다.

## 남은 것

- **시공 전/후 사진이 0장이다** (`suri_page_images`·`suri_keyword_images` 모두 비어 있음).
  벤치마크의 핵심 자산인데 우리에겐 없어서 3번 섹션이 나오지 않는다. 실사가 들어오면
  키워드 단위로 등록하는 것만으로 전 지역 페이지에 붙는다
- **관리 화면에 콘텐츠 편집기가 없다.** 지금은 JSON 파일 → SQL → DB 경로로만 넣는다
- `suri_regions`에 같은 `display_name`이 두 번 있는 행이 있다(강남구·마포구·서초구·송파구·
  양천구·영등포구). 관리 화면 자유 입력과 초기 시드가 겹친 결과로 보인다 — 페이지가 두 행에
  나뉘어 붙으므로 정리가 필요하다
