# 지역 페이지 콘텐츠 모델

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
| 지역 프로필 | `suri_regions.profile` | 주거 유형(type) · 인접 지역(near) · 주거 특성 한 줄(note) · 대표 동(dongs) | 그 지역의 **모든** 키워드 페이지가 공유 |
| 페이지 override | `suri_pages.local` | 손으로 쓴 완성 본문 | 그 페이지 하나. 있으면 조립을 이긴다 |

**완성본을 페이지마다 저장하지 않는 이유**: 페이지가 1,479건이라 같은 문장이 수백 번 중복
저장되고, 문장 하나를 고치려면 전 페이지를 다시 써야 한다. 실제로 문수리 67지역분 완성본을
SQL로 뽑아 보니 196KB였는데, 재료만 저장하니 32KB로 줄었다.

## 조립 규칙 (`web/lib/compose-local.ts`)

```
local = suri_pages.local
     ?? compose(keyword.slug, region.display_name, region.profile, keyword.content.local_pool)
```

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
