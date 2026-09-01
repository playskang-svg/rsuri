#!/usr/bin/env node
// scripts/seed.mjs
//
// SuriWiki 초기 시드 — src/data/mockWikiData.ts에 실제로 존재하는 콘텐츠를
// Supabase(docs/PRD.md 4번 스키마)로 옮긴다.
//
// 실행 방법 두 가지:
//   1) npm run seed              — Supabase에 직접 쓴다. .env.local에 아래 두 값 필요:
//        SUPABASE_URL
//        SUPABASE_SERVICE_ROLE_KEY   (Supabase 대시보드 > Project Settings > API Keys)
//   2) npm run seed:sql          — DB에 쓰지 않고 동등한 SQL을 stdout으로 출력한다.
//        service_role 키가 없을 때, 또는 반영 전에 SQL을 눈으로 검토하고 싶을 때 쓴다.
//        출력된 SQL은 Supabase SQL Editor에 그대로 붙여 실행할 수 있다.
//      두 경로는 아래의 같은 변환 함수(buildLandingSections/buildCaseSections)를 쓰므로
//      결과가 갈라지지 않는다.
//
// 이 스크립트는 "없는 사실이나 반복 문장을 만들지 않는다"(CT·MOD 가이드) 원칙에 따라
// mockWikiData.ts에 실제로 작성된 6개 CASE만 다룬다. suri_regions / suri_categories /
// suri_repair_keywords 사전(dictionary)은 이미 초기 마이그레이션 직후 별도 SQL로
// 채워져 있고, 여기서는 지역/키워드 이름으로 기존 row를 찾아 연결만 한다.
// 나머지 26개 키워드는 사전에만 존재하고 아직 CASE/페이지가 없다 — 실제 현장 사실이
// 들어오는 대로 이 스크립트에 항목을 추가해 나간다.
//
// 다시 실행해도 안전하다(idempotent):
//   - suri_pages는 (repair_keyword_id, region_id, page_type) 유니크 제약으로 upsert
//   - suri_cases는 (region_id, repair_keyword_id)로 존재 여부를 확인 후 update/insert
//   - suri_page_sections는 매번 해당 page_id의 기존 행을 지우고 다시 쓴다(전량 교체)
//   - suri_local_pros는 (region_id, phone)로 중복 삽입을 막는다
//
// CASE 1개 → 페이지 2개 생성:
//   LANDING (CT1, 문제·해결형) — wikiGuide.* 기반, 검색자가 바로 보는 페이지
//   CASE    (CT6, 사례·현장형) — caseStudies[0].* 기반(실측값·보증코드 등
//            LANDING에는 없는 근거) — CT·MOD 가이드가 요구하는 "같은 CASE에서
//            검색 의도가 다른 페이지를 파생"의 최소 구현.

import 'dotenv/config'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { INITIAL_WIKI_PAGES } from '../src/data/mockWikiData.ts'

const EMIT_SQL = process.argv.includes('--emit-sql')

// 클라이언트는 실제로 쓸 때만 만든다 — SQL 출력 모드에서는 키가 필요 없고,
// verify-seed.mjs가 buildPlan만 쓰려고 이 파일을 import할 때도 키를 요구하면 안 된다.
let db = null
function getDb() {
  if (db) return db
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 .env.local에 필요합니다.\n' +
        '키 없이 SQL만 뽑으려면: npm run seed:sql',
    )
    process.exit(1)
  }
  db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  return db
}

// mockWikiData.ts의 region.neighborhood(동 이름) → 이미 시딩된 suri_regions dong slug
const DONG_SLUG_BY_NAME = {
  역삼동: 'yeoksam-dong',
  반포동: 'banpo-dong',
  잠실동: 'jamsil-dong',
  공덕동: 'gongdeok-dong',
  여의도동: 'yeouido-dong',
  정자동: 'jeongja-dong',
}

// mockWikiData.ts repairMainName(공사명) → 이미 시딩된 suri_repair_keywords.slug
const KEYWORD_SLUG_BY_NAME = {
  '싱크대 수리 및 배수구 세트 교체': 'sink-drain-set-repair',
  '정밀 누수 탐지 및 배관 긴급 공사': 'leak-detection-emergency',
  '욕실/화장실 부분 리모델링 및 도기 교체': 'bathroom-partial-remodel',
  '하이샷시 창호 롤러 및 모헤어 교체': 'window-roller-weatherstrip',
  '친환경 실크 도배 및 방 단열벽지 시공': 'eco-silk-wallpaper',
  'LED 조명 교체 및 누전 차단기 점검 수리': 'led-lighting-breaker-repair',
}

// 전기·가스·구조·심한누수·고소작업이면 M16을 자동 필수로 올린다 (CT·MOD 가이드 07장)
const SAFETY_REQUIRED_CATEGORIES = new Set(['누수/방수', '전기/조명/설비'])

// ─────────────────────────────────────────────────────────────
// 시세·보증 문구 제거 (사용자 지시)
//
// 원본 pageTitle/metaDescription에는 "비용 시세", "시세표(8만~18만원)"처럼
// 가격이 박혀 있고, 이건 검색결과에 그대로 노출된다. 필드만 빼고 문장을 두면
// 의미가 없으므로 제목·설명도 함께 정리한다.
//
// 정규식으로 뭉개지 않고 6건을 명시적으로 치환한다 — 무엇이 바뀌는지 검토 가능하고,
// 한국어 마케팅 카피를 패턴으로 자르다 문장이 깨지는 사고를 피할 수 있다.
// ─────────────────────────────────────────────────────────────
const TITLE_OVERRIDES = {
  '강남구 역삼동 싱크대 수리 및 배수구 교체 비용 시세 & 표준 공정 가이드 | 수리위키':
    '강남구 역삼동 싱크대 수리 및 배수구 교체 표준 공정 가이드 | 수리위키',
  '성남시 분당구 정자동 누수 탐지 및 배관 수리 비용 시세 & 표준 공정 가이드 | 수리위키':
    '성남시 분당구 정자동 누수 탐지 및 배관 수리 표준 공정 가이드 | 수리위키',
  '서초구 반포동 화장실 욕실 부분 리모델링 & 변기/세면대 교체 시세표 | 수리위키':
    '서초구 반포동 화장실 욕실 부분 리모델링 및 변기·세면대 교체 가이드 | 수리위키',
  '마포구 공덕동 샷시 롤러/모헤어 교체 및 외풍 차단 비용 시세 | 수리위키':
    '마포구 공덕동 샷시 롤러·모헤어 교체 및 외풍 차단 가이드 | 수리위키',
  '송파구 잠실동 친환경 실크 부분 도배 & 방 곰팡이 단열벽지 시세표 | 수리위키':
    '송파구 잠실동 친환경 실크 부분 도배 및 방 곰팡이 단열벽지 가이드 | 수리위키',
  '영등포구 여의도동 두꺼비집 누전 차단기 교체 & LED 조명 출장 수리 시세표 | 수리위키':
    '영등포구 여의도동 두꺼비집 누전 차단기 교체 및 LED 조명 출장 수리 가이드 | 수리위키',
}

const DESC_OVERRIDES = {
  '서울 강남구 역삼동 싱크대 수리, 배수구 악취 차단 트랩 및 원홀 수전 교체 견적 시세표(8만~18만원). 역삼동 20분 내 출장 검증 마스터 및 실제 아파트 시공사례.':
    '서울 강남구 역삼동 싱크대 수리, 배수구 악취 차단 트랩 및 원홀 수전 교체 방법. 역삼동 출장 검증 마스터와 실제 아파트 시공사례를 정리했습니다.',
  '분당 정자동 1기 신도시 아파트 누수 탐지, 청음/가스식 첨단 장비 검사 비용(25만~55만원). 아랫집 천장 물샘 책임 규명 및 일상생활배상책임보험 서류 무료 지원.':
    '분당 정자동 1기 신도시 아파트 누수 탐지, 청음·가스식 장비 검사 방법. 아랫집 천장 물샘 책임 규명과 일상생활배상책임보험 서류를 안내합니다.',
  '서울 서초구 반포동 아파트 욕실 부분 수리, 아메리칸스탠다드 치마형 양변기/세면기 교체 및 샤워 수전 시공 견적(18만~45만원). 반포동 당일 시공 검증 기사.':
    '서울 서초구 반포동 아파트 욕실 부분 수리, 치마형 양변기·세면기 교체 및 샤워 수전 시공 방법. 반포동 검증 기사의 실제 시공사례를 정리했습니다.',
  '마포구 공덕동 샷시 창문 뻑뻑함 해결, 롤러 교체 및 삭은 모헤어 털갈이 시세표(12만~35만원). 베란다 찬바람 소음 완벽 차단 및 당일 시공.':
    '마포구 공덕동 샷시 창문 뻑뻑함 해결, 롤러 교체 및 삭은 모헤어 털갈이 방법. 베란다 찬바람과 소음을 줄이는 시공 절차를 정리했습니다.',
  '송파구 잠실 엘스/리센츠/트리지움 친환경 실크 도배, 누수 천장 1면 부분 도배 견적(20만~60만원). 먼지 없는 보양 및 당일 원데이 시공.':
    '송파구 잠실 엘스·리센츠·트리지움 친환경 실크 도배, 누수 천장 1면 부분 도배 방법. 보양부터 마감까지 원데이 시공 절차를 정리했습니다.',
  '여의도 구축 아파트 두꺼비집 차단기 떨어짐 원인 메거 검측 및 교체(7만~18만원). 24시간 긴급 전기 출동 및 플리커프리 LED 조명 시공.':
    '여의도 구축 아파트 두꺼비집 차단기 떨어짐 원인, 메거 절연저항 검측 및 교체 방법. 긴급 전기 출동과 LED 조명 시공 절차를 정리했습니다.',
}

// 보증·비용 약속이 답변인 FAQ는 발행하지 않는다
const FAQ_DROP = /보증|무상\s*A\/S|0원|비용을 내야/

const cleanTitle = (t) => TITLE_OVERRIDES[t] ?? t
const cleanDesc = (d) => DESC_OVERRIDES[d] ?? d

async function getRegionId(dongName) {
  const slug = DONG_SLUG_BY_NAME[dongName]
  if (!slug) throw new Error(`지역 매핑 없음: ${dongName}`)
  const { data, error } = await getDb()
    .from('suri_regions')
    .select('id')
    .eq('slug', slug)
    .eq('level', 'DONG')
    .single()
  if (error) throw new Error(`suri_regions 조회 실패(${dongName}/${slug}): ${error.message}`)
  return data.id
}

async function getKeyword(repairMainName) {
  const slug = KEYWORD_SLUG_BY_NAME[repairMainName]
  if (!slug) throw new Error(`키워드 매핑 없음: ${repairMainName}`)
  const { data, error } = await getDb()
    .from('suri_repair_keywords')
    .select('id, category_id')
    .eq('slug', slug)
    .single()
  if (error) throw new Error(`suri_repair_keywords 조회 실패(${repairMainName}/${slug}): ${error.message}`)
  return data
}

// 문단을 "첫 문장(즉답, M01)"과 "나머지(원인·발생구조, M04)"로 나눈다.
// 실제 mock 문장을 그대로 두 조각으로 자르는 것이지 새 문장을 만들지 않는다.
function splitSummary(summary) {
  const sentences = summary.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length <= 1) return { lead: summary, cause: summary }
  return { lead: sentences[0], cause: sentences.slice(1).join(' ') }
}

function withOrder(list) {
  return list.map((s, i) => ({ ...s, sort_order: i + 1 }))
}

function buildLandingSections(mock) {
  const g = mock.wikiGuide
  const { lead, cause } = splitSummary(g.summary)
  const list = []
  list.push({ module_code: 'M01', heading: null, body: lead })
  list.push({ module_code: 'M04', heading: '왜 이런 문제가 생기나요', body: cause })
  list.push({
    module_code: 'M03',
    heading: '이런 증상이면 의심하세요',
    body: g.commonSymptoms.map((s) => `- ${s}`).join('\n'),
  })
  list.push({
    module_code: 'M09',
    heading: '해결 방법',
    body: g.steps
      .map((s) => `${s.stepNum}. ${s.title} — ${s.desc}${s.tip ? ` (팁: ${s.tip})` : ''}`)
      .join('\n'),
  })
  if (SAFETY_REQUIRED_CATEGORIES.has(mock.category)) {
    list.push({ module_code: 'M16', heading: '전문가 호출이 필요한 경우', body: g.diyVsProGuide })
  }
  list.push({
    module_code: 'M17',
    heading: '재발 방지',
    body: g.preventionTips.map((t) => `- ${t}`).join('\n'),
  })
  const publishableFaqs = mock.faqs.filter((f) => !FAQ_DROP.test(f.answer))
  if (publishableFaqs.length > 0) {
    list.push({
      module_code: 'M21',
      heading: 'FAQ',
      body: publishableFaqs.map((f) => `Q. ${f.question}\nA. ${f.answer}`).join('\n\n'),
    })
  }
  const pro = mock.localPros[0]
  list.push({
    module_code: 'M24',
    heading: '상담 안내',
    body: pro
      ? `${mock.region.neighborhood} 전담 마스터 ${pro.name}(${pro.shopName})에게 전화/사진 상담하세요. ${pro.phone}`
      : '전화 또는 사진으로 먼저 상담해 주세요.',
  })
  return withOrder(list)
}

function buildCaseSections(mock) {
  const c = mock.caseStudies[0]
  if (!c) return []
  const list = []
  list.push({ module_code: 'M02', heading: null, body: `${c.title} (${c.buildingType}, ${c.completedDate})` })
  list.push({
    module_code: 'M03',
    heading: '문제',
    body: [
      c.beforeTechnicalData?.defectType,
      c.beforeTechnicalData?.measuredValue ? `측정값: ${c.beforeTechnicalData.measuredValue}` : null,
      c.beforeTechnicalData?.diagnosticNote,
    ]
      .filter(Boolean)
      .join('\n'),
  })
  list.push({ module_code: 'M06', heading: '판단', body: c.beforeTechnicalData?.diagnosticNote ?? '' })
  list.push({
    module_code: 'M08',
    heading: '실제 작업 공정',
    body: c.workDetails.map((w) => `- ${w}`).join('\n'),
  })
  list.push({
    module_code: 'M18',
    heading: '결과',
    body: [
      c.afterTechnicalData?.inspectionResult,
      // 보증코드(warrantyCode)는 보증 약속에 해당하므로 발행하지 않는다 — 검측값만 남긴다
      c.afterTechnicalData?.certifiedValue ?? null,
      c.reviewText ? `\n"${c.reviewText}" — ${c.author}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  })
  list.push({ module_code: 'M24', heading: '상담 안내', body: '비슷한 증상이면 전화 또는 사진으로 먼저 상담해 주세요.' })
  return withOrder(list)
}

// ─────────────────────────────────────────────────────────────
// mock 1건 → "적용할 내용"(순수 데이터). Supabase 백엔드와 SQL 백엔드가
// 이 결과를 공유하므로 두 경로의 결과가 갈라지지 않는다.
// ─────────────────────────────────────────────────────────────
const LANDING_REQUIRED = ['M01', 'M03', 'M04', 'M09']
const CASE_REQUIRED = ['M02', 'M03', 'M06', 'M08', 'M18']

// 이 mock이 시딩 대상인지(지역·키워드 매핑이 있는지). verify-seed.mjs도 같은 기준을 쓴다.
export function MAPPED(mock) {
  return Boolean(
    KEYWORD_SLUG_BY_NAME[mock.repairMainName] && DONG_SLUG_BY_NAME[mock.region.neighborhood],
  )
}

export function buildPlan(mock) {
  const c = mock.caseStudies[0]
  const landingSections = buildLandingSections(mock)
  const caseSections = buildCaseSections(mock)

  const g = mock.wikiGuide

  // 표·목록·단계처럼 구조가 살아야 렌더링되는 데이터. 산문 모듈(sections)과 달리
  // 문자열로 합쳐버리면 화면에서 되살릴 수 없어 원본 형태 그대로 보관한다.
  //
  // 원본(mockWikiData)에는 estimatedCost(시세), diyDifficulty(난이도),
  // warrantyPeriod(보증)도 있지만 사용자 지시로 발행 대상에서 제외한다.
  const guide = {
    summary: g.summary,
    symptoms: g.commonSymptoms,
    steps: g.steps.map((s) => ({
      num: s.stepNum,
      title: s.title,
      desc: s.desc,
      tip: s.tip ?? null,
    })),
    prevention_tips: g.preventionTips,
    // 보증·비용 약속이 담긴 FAQ는 발행 제외 (사용자 지시)
    faqs: mock.faqs
      .filter((f) => !FAQ_DROP.test(f.answer))
      .map((f) => ({ q: f.question, a: f.answer })),
  }

  const pages = [
    {
      page_type: 'LANDING',
      content_type: 'CT1',
      slug: null,
      search_intent: `${mock.combinedKeyword}, 왜 필요하고 어떻게 해결하나요?`,
      required_modules: LANDING_REQUIRED,
      selected_modules: landingSections
        .map((s) => s.module_code)
        .filter((m) => !LANDING_REQUIRED.includes(m)),
      module_order: landingSections.map((s) => s.module_code),
      meta_title: cleanTitle(mock.pageTitle),
      meta_description: cleanDesc(mock.metaDescription),
      decision: 'CREATE',
      sections: landingSections,

      // 자가수리 vs 전문가 판단 — 가격·보증 약속이 아니라 판단 기준이라 유지한다
      diy_vs_pro: g.diyVsProGuide,
      // 지역/SEO
      area_served: mock.geoMeta.areaServed,
      seo_keywords: mock.geoMeta.keywords,
      lsi_keywords: mock.geoMeta.lsiKeywords,
      guide,
    },
  ]

  if (caseSections.length > 0) {
    pages.push({
      page_type: 'CASE',
      content_type: 'CT6',
      slug: mock.slug, // /case/{slug} 라우팅에 필요 — LANDING과 달리 지역 경로로 파생되지 않음
      search_intent: `${mock.region.fullAddress}에서 실제로 어떻게 작업했나요?`,
      required_modules: CASE_REQUIRED,
      selected_modules: caseSections.map((s) => s.module_code).filter((m) => !CASE_REQUIRED.includes(m)),
      module_order: caseSections.map((s) => s.module_code),
      meta_title: c?.title ?? cleanTitle(mock.pageTitle),
      meta_description: cleanDesc(mock.metaDescription),
      decision: 'CREATE',
      sections: caseSections,
    })
  }

  return {
    label: mock.combinedKeyword,
    dongSlug: DONG_SLUG_BY_NAME[mock.region.neighborhood],
    keywordSlug: KEYWORD_SLUG_BY_NAME[mock.repairMainName],
    caseRow: {
      building_type: c?.buildingType ?? null,
      problem: mock.wikiGuide.commonSymptoms.join(' / '),
      judgment: c?.beforeTechnicalData?.diagnosticNote ?? null,
      work_performed: (c?.workDetails ?? []).join(' / '),
      result: c?.afterTechnicalData?.inspectionResult ?? null,
      limitations: null,
      completed_on: c?.completedDate ?? null,
      is_approved: true,
    },
    pages,
    // 지역 자체의 부가 정보. 페이지가 아니라 지역에 붙는 값이라 따로 갱신한다.
    region: {
      lat: mock.region.lat ?? null,
      lng: mock.region.lng ?? null,
      housing_characteristics: mock.region.housingCharacteristics ?? null,
    },
    pros: mock.localPros.map((pro) => ({
      name: pro.name,
      shop_name: pro.shopName,
      phone: pro.phone,
      rating: pro.rating ?? null,
      review_count: pro.reviewCount ?? 0,
      completed_jobs: pro.completedJobs ?? 0,
      badges: pro.badges ?? [],
      intro: pro.intro ?? null,
      master_grade: pro.masterGrade ?? null,
      safety_certified: !!pro.safetyCertified,
      distance: pro.distance ?? null,
    })),
  }
}

// ─────────────────────────────────────────────────────────────
// 백엔드 A: Supabase 직접 쓰기 (service_role 키 필요)
// ─────────────────────────────────────────────────────────────
async function replaceSections(pageId, sections) {
  const { error: delErr } = await getDb().from('suri_page_sections').delete().eq('page_id', pageId)
  if (delErr) throw delErr
  if (sections.length === 0) return
  const { error: insErr } = await getDb()
    .from('suri_page_sections')
    .insert(sections.map((s) => ({ ...s, page_id: pageId })))
  if (insErr) throw insErr
}

async function upsertPage(fields) {
  const { data, error } = await getDb()
    .from('suri_pages')
    .upsert(fields, { onConflict: 'repair_keyword_id,region_id,page_type' })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function upsertCase(regionId, keywordId, caseRow) {
  const fields = { ...caseRow, region_id: regionId, repair_keyword_id: keywordId }

  const { data: existing } = await getDb()
    .from('suri_cases')
    .select('id')
    .eq('region_id', regionId)
    .eq('repair_keyword_id', keywordId)
    .maybeSingle()

  if (existing) {
    const { error } = await getDb().from('suri_cases').update(fields).eq('id', existing.id)
    if (error) throw error
    return existing.id
  }
  const { data, error } = await getDb().from('suri_cases').insert(fields).select('id').single()
  if (error) throw error
  return data.id
}

async function upsertLocalPros(regionId, pros) {
  for (const pro of pros) {
    const { data: existing } = await getDb()
      .from('suri_local_pros')
      .select('id')
      .eq('region_id', regionId)
      .eq('phone', pro.phone)
      .maybeSingle()
    if (existing) continue
    const { error } = await getDb().from('suri_local_pros').insert({ ...pro, region_id: regionId })
    if (error) throw error
  }
}

async function applyViaSupabase(plan, mock) {
  const regionId = await getRegionId(mock.region.neighborhood)
  const keyword = await getKeyword(mock.repairMainName)
  const caseId = await upsertCase(regionId, keyword.id, plan.caseRow)

  for (const page of plan.pages) {
    const { sections, ...pageFields } = page
    const pageId = await upsertPage({
      ...pageFields,
      region_id: regionId,
      repair_keyword_id: keyword.id,
      category_id: keyword.category_id,
      source_case_id: caseId,
    })
    await replaceSections(pageId, sections)
  }

  await upsertLocalPros(regionId, plan.pros)
  console.log(`✓ ${plan.label} — ${plan.pages.map((p) => p.page_type).join(' + ')} 시딩 완료`)
}

// ─────────────────────────────────────────────────────────────
// 백엔드 B: SQL 출력 (키 불필요, 검토 후 SQL Editor에 붙여넣기)
// 모든 id는 slug로 조회해서 채운다 — 생성된 id를 하드코딩하지 않는다.
// ─────────────────────────────────────────────────────────────
function q(v) {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

function qArr(arr) {
  if (!arr || arr.length === 0) return 'array[]::text[]'
  return `array[${arr.map(q).join(', ')}]::text[]`
}

// 값 타입을 보고 알아서 SQL 리터럴로 바꾼다. 컬럼이 늘어나도 이 함수만 통과하면 되므로
// 새 필드를 추가할 때 emitPlanSql을 손볼 필요가 없다.
function qAuto(v) {
  if (Array.isArray(v)) return qArr(v)
  if (v !== null && typeof v === 'object') return `${q(JSON.stringify(v))}::jsonb`
  return q(v)
}

function emitPlanSql(plan) {
  const { dongSlug, keywordSlug } = plan
  const R = `r.slug = ${q(dongSlug)} and r.level = 'DONG'`
  const out = []

  out.push(`-- ══════════ ${plan.label} ══════════`)

  const c = plan.caseRow
  out.push(`insert into public.suri_cases
  (region_id, repair_keyword_id, building_type, problem, judgment, work_performed, result, limitations, completed_on, is_approved)
select r.id, k.id, ${q(c.building_type)}, ${q(c.problem)}, ${q(c.judgment)}, ${q(c.work_performed)}, ${q(c.result)}, ${q(c.limitations)}, ${q(c.completed_on)}, ${q(c.is_approved)}
from public.suri_regions r, public.suri_repair_keywords k
where ${R} and k.slug = ${q(keywordSlug)}
  and not exists (select 1 from public.suri_cases x where x.region_id = r.id and x.repair_keyword_id = k.id);`)

  for (const page of plan.pages) {
    const P = `p.page_type = ${q(page.page_type)} and k.slug = ${q(keywordSlug)} and ${R}`

    // 컬럼 목록을 page 객체에서 뽑아 쓴다 — 필드가 늘어도 여기를 고칠 필요가 없다.
    const { sections: _ignored, ...fields } = page
    const cols = Object.keys(fields)
    const vals = cols.map((c) => qAuto(fields[c]))
    // 충돌 키(repair_keyword_id, region_id, page_type)는 갱신 대상에서 뺀다
    const updatable = cols.filter((c) => c !== 'page_type')

    out.push(`insert into public.suri_pages
  (${cols.join(', ')}, region_id, repair_keyword_id, category_id, source_case_id)
select ${vals.join(', ')}, r.id, k.id, k.category_id, c.id
from public.suri_regions r
join public.suri_repair_keywords k on k.slug = ${q(keywordSlug)}
join public.suri_cases c on c.region_id = r.id and c.repair_keyword_id = k.id
where ${R}
on conflict (repair_keyword_id, region_id, page_type) do update set
  ${updatable.map((c) => `${c} = excluded.${c}`).join(',\n  ')},
  category_id = excluded.category_id, source_case_id = excluded.source_case_id,
  updated_at = now();`)

    // 섹션은 전량 교체 — Supabase 백엔드의 replaceSections와 같은 의미
    out.push(`delete from public.suri_page_sections s
using public.suri_pages p, public.suri_repair_keywords k, public.suri_regions r
where s.page_id = p.id and p.repair_keyword_id = k.id and p.region_id = r.id and ${P};`)

    const values = page.sections
      .map((s) => `  (${q(s.module_code)}::text, ${q(s.sort_order)}::int, ${q(s.heading)}::text, ${q(s.body)}::text)`)
      .join(',\n')

    out.push(`insert into public.suri_page_sections (page_id, module_code, sort_order, heading, body)
select p.id, v.module_code, v.sort_order, v.heading, v.body
from public.suri_pages p
join public.suri_repair_keywords k on k.id = p.repair_keyword_id
join public.suri_regions r on r.id = p.region_id
cross join (values
${values}
) as v(module_code, sort_order, heading, body)
where ${P};`)
  }

  // 지역 부가정보(좌표·주거특성) — 페이지가 아니라 지역에 붙는 값
  const rg = plan.region
  out.push(`update public.suri_regions r
set lat = ${q(rg.lat)}, lng = ${q(rg.lng)},
    housing_characteristics = ${q(rg.housing_characteristics)},
    updated_at = now()
where ${R};`)

  for (const pro of plan.pros) {
    const cols = Object.keys(pro)
    out.push(`insert into public.suri_local_pros
  (region_id, ${cols.join(', ')})
select r.id, ${cols.map((c) => qAuto(pro[c])).join(', ')}
from public.suri_regions r
where ${R}
  and not exists (select 1 from public.suri_local_pros lp where lp.region_id = r.id and lp.phone = ${q(pro.phone)});`)

    // 이미 있던 행에도 새 필드가 채워지도록 항상 갱신한다
    out.push(`update public.suri_local_pros lp
set distance = ${q(pro.distance)}
from public.suri_regions r
where lp.region_id = r.id and lp.phone = ${q(pro.phone)} and ${R};`)
  }

  return out.join('\n\n')
}

async function main() {
  const plans = []
  for (const mock of INITIAL_WIKI_PAGES) {
    if (!MAPPED(mock)) {
      console.warn(`⚠ 매핑 없음, 건너뜀: ${mock.combinedKeyword}`)
      continue
    }
    plans.push({ plan: buildPlan(mock), mock })
  }

  if (EMIT_SQL) {
    const body = plans.map(({ plan }) => emitPlanSql(plan)).join('\n\n')
    process.stdout.write(
      `-- scripts/seed.mjs --emit-sql 로 생성됨. 직접 수정하지 말고 스크립트를 고칠 것.\n` +
        `-- 원본: src/data/mockWikiData.ts (CASE ${plans.length}건)\n\n` +
        `begin;\n\n${body}\n\ncommit;\n`,
    )
    return
  }

  for (const { plan, mock } of plans) {
    await applyViaSupabase(plan, mock)
  }
  console.log('시딩 완료.')
}

// verify-seed.mjs가 buildPlan을 재사용하려고 이 파일을 import하는데,
// 그때 시딩이 실행되면 안 되므로 직접 실행일 때만 main()을 돈다.
//
// pathToFileURL을 쓰는 이유: 이 저장소 경로에는 한글과 공백이 있어서
// import.meta.url은 퍼센트 인코딩되지만 process.argv[1]은 원본 그대로다.
// `file://${process.argv[1]}`로 문자열 비교하면 영원히 false가 되어
// 스크립트가 아무 출력 없이 조용히 끝난다(실제로 겪음).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
