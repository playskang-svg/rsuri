// Supabase 없이 사이트를 통째로 빌드하기 위한 대체 데이터.
//
// 왜 필요한가: 이 앱은 빌드 타임에 Supabase를 읽어 페이지를 굽는다. DB에 닿지 못하는
// 환경(네트워크가 막힌 CI 컨테이너, 오프라인 작업, 키가 없는 새 체크아웃)에서는
// `npm run build`가 첫 쿼리에서 죽어 레이아웃을 눈으로 확인할 방법이 아예 없다.
// 디자인·반응형 작업이 DB 접속에 묶일 이유가 없어서 이 경로를 열어 둔다.
//
//   SURIWIKI_FIXTURES=1 npm run build
//
// 값은 지어내지 않고 저장소에 이미 있는 실제 콘텐츠를 읽어 쓴다
// (scripts/data/keyword-content/*.json, scripts/data/region-profiles.json).
// 그래서 화면에 뜨는 문장 길이와 카드 개수가 실제 사이트와 같고, 반응형 검증이
// 의미를 갖는다. 지어낸 짧은 더미로는 "글자가 길어서 깨지는" 문제를 못 잡는다.
//
// 이 파일은 SURIWIKI_FIXTURES가 켜져 있을 때만 import된다 — 평소 빌드에는 딸려가지 않는다.

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  Category,
  KeywordContent,
  LocalPro,
  Page,
  PageImage,
  PageSection,
  Region,
  RegionProfile,
  RepairKeyword,
} from './types'

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA = resolve(HERE, '../../scripts/data')

interface RegionProfileFile {
  regions: Record<string, RegionProfile>
}

interface KeywordContentFile {
  keyword_slug: string
  content: KeywordContent
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

/** 국어 로마자 표기까지 갈 필요는 없다 — fixtures의 slug는 URL 형태만 맞으면 된다. */
const SLUG_BY_NAME: Record<string, string> = {
  서울특별시: 'seoul',
  경기도: 'gyeonggi',
  강남구: 'gangnam-gu',
  마포구: 'mapo-gu',
  노원구: 'nowon-gu',
  성남시: 'seongnam-si',
}

function slugFor(name: string, index: number): string {
  return SLUG_BY_NAME[name] ?? `region-${index}`
}

export function buildFixtures() {
  const profiles = readJson<RegionProfileFile>(join(DATA, 'region-profiles.json')).regions

  // 실제 콘텐츠가 있는 키워드만 쓴다. 콘텐츠가 없으면 조립이 실패해 빈 페이지가 되는데,
  // 그건 fixtures의 결함이 아니라 실제 사이트에서도 HOLD로 걸러지는 정상 동작이다.
  const keywordFiles = readdirSync(join(DATA, 'keyword-content')).filter((f) => f.endsWith('.json'))

  const categories: Category[] = [
    { id: 1, slug: 'door-window', display_name: '문·창호', sort_order: 1 },
    { id: 2, slug: 'interior-finish', display_name: '도배·바닥·마감', sort_order: 2 },
  ]

  const keywords: RepairKeyword[] = keywordFiles.map((file, i) => {
    const parsed = readJson<KeywordContentFile>(join(DATA, 'keyword-content', file))
    return {
      id: i + 1,
      category_id: parsed.keyword_slug === 'door-repair' ? 1 : 2,
      slug: parsed.keyword_slug,
      display_name:
        { 'door-repair': '문수리', 'stair-restoration': '계단 복원', 'wallpaper-restoration': '도배 복원' }[
          parsed.keyword_slug
        ] ?? parsed.keyword_slug,
      description: parsed.content.tagline,
      default_phone: '010-4684-8838',
      menu_order: i + 1,
      content: parsed.content,
    }
  })

  // 시도 2 + 시군구 4. 프로필은 시군구에 붙는다 — 본문 조립이 그 값을 읽는다.
  // 유형(type)이 서로 다른 지역을 골랐다. 같은 유형만 있으면 조립 분기를 못 밟아 본다.
  const SIGUNGU: { name: string; parent: number }[] = [
    { name: '강남구', parent: 1 },
    { name: '마포구', parent: 1 },
    { name: '노원구', parent: 1 },
    { name: '성남시', parent: 2 },
  ]

  const regions: Region[] = [
    {
      id: 1, parent_id: null, level: 'SIDO', slug: 'seoul', display_name: '서울특별시',
      lat: null, lng: null, housing_characteristics: null, profile: null,
    },
    {
      id: 2, parent_id: null, level: 'SIDO', slug: 'gyeonggi', display_name: '경기도',
      lat: null, lng: null, housing_characteristics: null, profile: null,
    },
    ...SIGUNGU.map((r, i) => ({
      id: 10 + i,
      parent_id: r.parent,
      level: 'SIGUNGU' as const,
      slug: slugFor(r.name, i),
      display_name: r.name,
      lat: null,
      lng: null,
      housing_characteristics: null,
      profile: profiles[r.name] ?? null,
    })),
  ]

  const sigungu = regions.filter((r) => r.level === 'SIGUNGU')

  // 키워드 × 지역 전 조합을 LANDING으로 발행한다. 실제 사이트도 재료가 갖춰진 조합은
  // 전부 CREATE로 돌린다 — 조합 수가 많을 때 목록이 어떻게 접히는지 봐야 한다.
  const pages: Page[] = []
  let pageId = 1

  for (const kw of keywords) {
    for (const region of sigungu) {
      pages.push({
        id: pageId++,
        page_type: 'LANDING',
        content_type: 'CT1',
        slug: null,
        region_id: region.id,
        repair_keyword_id: kw.id,
        category_id: kw.category_id,
        source_case_id: null,
        search_intent: `${region.display_name} ${kw.display_name}`,
        required_modules: ['M01', 'M24'],
        selected_modules: [],
        module_order: [],
        meta_title: `${region.display_name} ${kw.display_name} — 수리위키`,
        meta_description: kw.content?.tagline ?? null,
        decision: 'CREATE',
        merged_into_page_id: null,
        diy_vs_pro: null,
        area_served: region.display_name,
        seo_keywords: [],
        lsi_keywords: [],
        guide: null,
        local: null, // compose-local이 프로필 + 문장 풀로 조립한다
      })
    }
  }

  // 키워드 허브가 비어 보이지 않게 CASE도 하나 만든다.
  const firstKeyword = keywords[0]
  if (firstKeyword) {
    pages.push({
      id: pageId++,
      page_type: 'CASE',
      content_type: 'CT6',
      slug: 'fixture-case-door-sag',
      region_id: sigungu[1]?.id ?? sigungu[0].id,
      repair_keyword_id: firstKeyword.id,
      category_id: firstKeyword.category_id,
      source_case_id: null,
      search_intent: '현장 기록',
      required_modules: [],
      selected_modules: [],
      module_order: [],
      meta_title: '문 처짐 — 경첩 교체와 문틀 보정',
      meta_description: '닫을 때 아래쪽만 끌리던 방문. 경첩 나사 구멍이 헐거워진 게 원인이었습니다.',
      decision: 'CREATE',
      merged_into_page_id: null,
      diy_vs_pro: null,
      area_served: null,
      seo_keywords: [],
      lsi_keywords: [],
      guide: {
        summary:
          '닫을 때 아래쪽만 바닥에 끌리던 방문입니다. 경첩을 조여도 며칠이면 돌아온다고 하셨는데, 나사 구멍이 헐거워져 하중을 못 잡는 상태였습니다.',
        symptoms: ['문을 닫으면 아래쪽만 바닥에 닿는다', '경첩 나사를 조여도 며칠 뒤 다시 처진다'],
        steps: [
          { num: 1, title: '경첩 상태 확인', desc: '나사 구멍이 커져 헛도는지 먼저 봅니다.', tip: '문짝을 들어 올렸을 때 유격이 크면 구멍 문제입니다.' },
          { num: 2, title: '구멍 보강', desc: '기존 구멍을 메우고 위치를 다시 잡습니다.', tip: null },
          { num: 3, title: '경첩 교체·조정', desc: '규격에 맞는 경첩으로 교체하고 문틀과 간격을 맞춥니다.', tip: null },
        ],
        prevention_tips: ['문에 무거운 것을 걸어 두면 경첩에 하중이 계속 걸립니다.'],
        faqs: [{ q: '작업 시간은 얼마나 걸리나요?', a: '경첩 교체만이면 1시간 안쪽입니다.' }],
      },
      local: null,
    })
  }

  const localPros: LocalPro[] = sigungu.map((region, i) => ({
    id: i + 1,
    region_id: region.id,
    name: ['정우진', '김태호', '최민수', '박성철'][i] ?? '담당 기사',
    shop_name: `${region.display_name} 집수리`,
    phone: '010-4684-8838',
    rating: 4.8,
    review_count: 120 + i * 17,
    completed_jobs: 400 + i * 33,
    badges: ['설비기능장', '수리위키 인증'],
    intro: null,
    master_grade: '설비기능장',
    safety_certified: true,
    distance: null,
  }))

  const sections: PageSection[] = []
  const pageImages: PageImage[] = [] // 실사가 없는 현재 상태를 그대로 재현한다

  return { regions, categories, keywords, pages, sections, localPros, pageImages }
}
