#!/usr/bin/env node
// scripts/seed-base-keywords.mjs
//
// 기본 키워드 153개 + 지역 194개 + 그 조합 페이지 1,183장을 한 번에 깐다.
// 원본은 scripts/data/base-keywords.json — koreajipsurimaster.com 계열 사이트에서
// 발라낸 키워드와, 각 사이트 페이지 제목 앞부분에 붙어 있던 지역명이다.
//
// 153개 중 92개는 regions가 비어 있다("지역 0개" 키워드). 그런 키워드는 조합 페이지를
// 만들지 않고 키워드만 만든다 — 허브 페이지(/{키워드})는 코드가 항상 생성하므로
// 지역이 하나도 없어도 사이트에 뜬다. 그래서 빈 regions는 오류가 아니라 정상 입력이다.
//
// 실행:
//   npm run seed:base                — Supabase에 쓴다
//   npm run seed:base -- --dry-run   — 아무것도 쓰지 않고 만들 개수만 센다
//
// 두 경로 모두 .env.local의 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요하다.
// --dry-run도 "무엇이 이미 있는지"를 알아야 개수를 셀 수 있어 읽기는 한다(쓰기만 안 한다).
// service_role 키는 RLS를 우회한다 — 값을 로그에 찍지 말 것.
//
// 여러 번 돌려도 안전하다(idempotent). 제1원칙은 "이미 있는 것을 되돌리지 않는다":
//   - 이미 있는 키워드 슬러그는 손대지 않는다 (기존 52개 키워드의 분야·설명을 덮으면 안 된다)
//   - 이미 있는 지역은 "부모 없는 CUSTOM"만 재사용한다 (아래 3번 주석 참고)
//   - 이미 있는 조합 페이지는 decision·meta를 그대로 둔다 (운영자가 손본 걸 되돌리면 안 된다)
// 그래서 delete/update 경로가 아예 없다. 삽입만 한다.
//
// base-keywords.json의 extras는 지역이 아니라 증상형 키워드("에어컨 자국 도배" 등)라
// 시드하지 않는다. 스크립트 끝에 "관리 화면에서 키워드로 추가할 수 있는 후보"로 출력만 한다.

// dotenv의 `import 'dotenv/config'`는 cwd의 .env만 읽는다. 이 저장소 루트에는 .env가 없고
// .env.local만 있어서, 그대로 두면 키를 못 찾아 100% 종료한다.
// scripts/verify-seed.mjs와 같은 방식으로 두 파일을 순서대로 읽는다(.env.local이 이긴다).
import { config as loadEnv } from 'dotenv'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'

loadEnv({ path: '.env' })
loadEnv({ path: '.env.local', override: true })

const DRY_RUN = process.argv.includes('--dry-run')

// 1,183건을 한 건씩 넣으면 왕복만 1,183번이다. 한 요청에 500행씩 묶는다.
const BATCH = 500

// supabase-js는 필터가 없어도 한 번에 1000행까지만 준다.
const PAGE = 1000

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA = JSON.parse(readFileSync(resolve(HERE, 'data/base-keywords.json'), 'utf8'))

let db = null
function getDb() {
  if (db) return db
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 .env.local에 필요합니다.')
    process.exit(1)
  }
  db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  return db
}

// ─────────────────────────────────────────────────────────────
// 슬러그
//
// web/lib/romanize.ts의 toSlug와 같은 알고리즘을 옮겨 적었다. 그 파일은 TS라
// .mjs에서 import할 수 없는데, 결과가 어긋나면 관리 화면에서 만든 지역과
// 시드가 만든 지역이 서로 다른 URL로 갈라진다. 고칠 일이 생기면 두 곳을 같이 고친다.
//
// 국어의 로마자 표기법(개정)을 음절 단위로 적용하고 음운 변화는 반영하지 않는다.
// 공백은 하이픈이 된다: '인천 계양' → incheon-gyeyang.
// ─────────────────────────────────────────────────────────────
const INITIALS = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's',
  'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h',
]

const MEDIALS = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa',
  'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i',
]

const FINALS = [
  '', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k',
  'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't',
  't', 'ng', 't', 't', 'k', 't', 'p', 't',
]

const HANGUL_BASE = 0xac00
const HANGUL_LAST = 0xd7a3

function romanizeKorean(input) {
  let out = ''
  for (const ch of input) {
    const code = ch.codePointAt(0)
    if (code >= HANGUL_BASE && code <= HANGUL_LAST) {
      const offset = code - HANGUL_BASE
      out += INITIALS[Math.floor(offset / 588)]
      out += MEDIALS[Math.floor((offset % 588) / 28)]
      out += FINALS[offset % 28]
    } else {
      out += ch
    }
  }
  return out
}

function toSlug(name) {
  return romanizeKorean(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ─────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────

/** "가,나 , 다" → ['가','나','다'] / 빈 문자열·undefined → [] */
function splitList(text) {
  return String(text ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

/** 1000행 제한을 넘겨 끝까지 읽는다. tweak으로 필터를 얹는다. */
async function fetchAll(table, columns, tweak = (q) => q) {
  const out = []
  for (let from = 0; ; from += PAGE) {
    // .order('id')가 없으면 1000행을 넘는 순간 페이지 사이에서 행이 중복되거나 빠진다.
    // 여기서 빠지면 이미 있는 조합을 '신규'로 세어 요약과 --dry-run 숫자가 틀어진다.
    const { data, error } = await tweak(getDb().from(table).select(columns))
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    out.push(...data)
    if (data.length < PAGE) return out
  }
}

/** 관리 화면 regionLabel과 같다 — 조상 display_name을 공백으로 이어 붙인다. */
function regionLabel(byId, id) {
  const parts = []
  let cur = byId.get(id)
  while (cur) {
    parts.unshift(cur.display_name)
    cur = cur.parent_id != null ? byId.get(cur.parent_id) : undefined
  }
  return parts.join(' ')
}

// dry-run에서는 아직 없는 행을 가리킬 id가 필요하다. 실제 id(양수)와 절대 겹치지 않게 음수를 쓴다.
let fakeId = 0
const nextFakeId = () => --fakeId

// ─────────────────────────────────────────────────────────────
// 1. 분야(카테고리) 자동 배정
//
// 관리 화면은 이번 개편에서 분야 선택을 노출하지 않는다. 그건 UI 결정이고,
// DB의 category_id는 여전히 쓰인다 — web/lib/photos.ts의 사진 풀이 '카테고리 슬러그'로
// 사진을 고르기 때문이다. 그래서 전부 'general'에 몰아넣으면 풀에 general 키가 없어서
// 153개 키워드가 홈에서 폴백 사진 2장을 돌려쓰게 된다. 이름으로 기존 분야에 배정한다.
//
// 규칙은 위에서부터 첫 매치이고 **순서가 곧 우선순위**다.
//   - '화장실문수리'·'화장실문교체비용'처럼 문 규칙과 욕실 규칙에 동시에 걸리는 이름,
//     '상가유리문가격'처럼 문과 유리(타일/대리석)에 걸리는 이름이 아주 많다.
//   - 이 사이트의 주력이 '문'이라 문 관련을 맨 위에 두어 door-window-sash로 보낸다.
//   - 타일/유리 규칙을 맨 아래에 둔 것도 같은 이유다 — '강화도어'는 문,
//     '강화유리수리'·'유리제작'만 tile-marble로 남는다.
//
// 여기 적힌 슬러그는 web/lib/photos.ts의 POOL 키이자 suri_categories의 실제 슬러그다.
// 둘 중 하나라도 바뀌면 사진이 폴백으로 떨어지니 같이 고쳐야 한다.
// ─────────────────────────────────────────────────────────────
const CATEGORY_RULES = [
  ['door-window-sash', ['문', '도어', '현관', '방화문', '문틀', '문지방', '문턱', '중문', '자동문', '유리문', '폴딩도어', '샷시', '필름', '방충망']],
  ['wallpaper-flooring', ['도배', '벽지', '마루', '바닥', '장판', '계단']],
  ['kitchen-sink', ['싱크대', '씽크대', '수전', '주방']],
  ['bathroom-toilet', ['변기', '샤워', '욕실', '화장실']],
  ['piping-heating-boiler', ['수도', '배관', '설비', '보일러']],
  ['tile-marble', ['타일', '줄눈', '대리석', '유리', '거울', '강화']],
]

// 어느 규칙에도 안 걸리는 이름('집수리', '농가주택수리' 등)이 갈 곳.
const FALLBACK_CATEGORY = 'general'

function categorySlugFor(name) {
  for (const [slug, words] of CATEGORY_RULES) {
    if (words.some((w) => name.includes(w))) return slug
  }
  return FALLBACK_CATEGORY
}

/**
 * 키워드 슬러그 → category_id 맵을 만든다.
 * DB에 없는 분야 슬러그가 나오면 general로 접고 경고한다 — 분야를 새로 만들어
 * 사진 풀에 없는 키를 늘리는 것보다, 눈에 띄게 경고하고 접는 쪽이 안전하다.
 */
async function assignCategories(stats) {
  const rows = await fetchAll('suri_categories', 'id,slug')
  const idBySlug = new Map(rows.map((c) => [c.slug, c.id]))

  const wanted = new Map() // 키워드 슬러그 → 분야 슬러그(접기 전)
  for (const k of DATA.keywords) wanted.set(k.slug, categorySlugFor(k.name))

  const missing = [...new Set(wanted.values())].filter(
    (s) => s !== FALLBACK_CATEGORY && !idBySlug.has(s),
  )
  stats.categoryMissing = missing

  const effective = new Map() // 키워드 슬러그 → 실제 쓸 분야 슬러그
  for (const [kwSlug, catSlug] of wanted) {
    effective.set(kwSlug, idBySlug.has(catSlug) ? catSlug : FALLBACK_CATEGORY)
  }

  // general은 초기 스키마에 없을 수 있다. 실제로 쓰이는 경우에만 만든다.
  const needsGeneral = [...effective.values()].includes(FALLBACK_CATEGORY)
  if (needsGeneral && !idBySlug.has(FALLBACK_CATEGORY)) {
    stats.categoryCreated = true
    if (DRY_RUN) {
      idBySlug.set(FALLBACK_CATEGORY, nextFakeId())
    } else {
      const ins = await getDb()
        .from('suri_categories')
        .insert({ slug: FALLBACK_CATEGORY, display_name: '수리', sort_order: 99 })
        .select('id')
        .single()
      if (ins.error) throw new Error(`suri_categories 생성 실패: ${ins.error.message}`)
      idBySlug.set(FALLBACK_CATEGORY, ins.data.id)
    }
  }

  // 요약 출력용 — JSON 153개 전체 기준 분포
  stats.categoryCounts = new Map()
  for (const catSlug of effective.values()) {
    stats.categoryCounts.set(catSlug, (stats.categoryCounts.get(catSlug) ?? 0) + 1)
  }

  const categoryIdByKeyword = new Map()
  for (const [kwSlug, catSlug] of effective) categoryIdByKeyword.set(kwSlug, idBySlug.get(catSlug))
  return categoryIdByKeyword
}

// ─────────────────────────────────────────────────────────────
// 2. 키워드
// ─────────────────────────────────────────────────────────────
async function ensureKeywords(categoryIdByKeyword, stats) {
  const before = await fetchAll('suri_repair_keywords', 'id,slug')
  const idBySlug = new Map(before.map((k) => [k.slug, k.id]))

  const toInsert = []
  DATA.keywords.forEach((k, i) => {
    // 이미 있는 키워드는 category_id도 건드리지 않는다.
    // 기존 52개는 운영자가 손으로 분류해 둔 것이라 시드가 덮으면 안 된다.
    if (idBySlug.has(k.slug)) {
      stats.keywordSkipped++
      return
    }
    toInsert.push({
      category_id: categoryIdByKeyword.get(k.slug),
      slug: k.slug,
      display_name: k.name,
      description: k.desc,
      menu_order: i,
    })
  })
  stats.keywordNew = toInsert.length

  if (toInsert.length === 0) return idBySlug
  if (DRY_RUN) {
    for (const k of toInsert) idBySlug.set(k.slug, nextFakeId())
    return idBySlug
  }

  // ignoreDuplicates = ON CONFLICT DO NOTHING.
  // 위에서 이미 걸렀지만, 동시에 두 번 돌더라도 기존 행을 덮지 않게 한 번 더 막는다.
  const { error } = await getDb()
    .from('suri_repair_keywords')
    .upsert(toInsert, { onConflict: 'slug', ignoreDuplicates: true })
  if (error) throw new Error(`suri_repair_keywords 삽입 실패: ${error.message}`)

  const after = await fetchAll('suri_repair_keywords', 'id,slug')
  return new Map(after.map((k) => [k.slug, k.id]))
}

// ─────────────────────────────────────────────────────────────
// 3. 지역
//
// 전부 최상위(parent_id NULL) CUSTOM으로 만든다. 관리 화면의 자유 지역 추가와 같은 모양이다.
//
// 재사용 대상을 "부모 없는 CUSTOM"으로만 한정한 이유(운영자 결정):
//   예전에는 display_name만 보고 아무 지역이나 재사용했다. 그러면 '강남구'·'마포구'·'목동'·
//   '서초구'·'송파구'·'양천구'·'영등포구' 7개가 서울 트리 밑의 기존 행에 붙어
//   /{키워드}/seoul/gangnam-gu 처럼 2단계 주소가 되고, 부모 없는 신규 지역은 1단계가 된다.
//   같은 시드에서 나온 페이지의 주소 모양이 두 가지로 갈리는 것이다.
//   기존 302건 페이지는 하나도 건드리지 않기로 했으므로, 트리 쪽을 옮기는 대신
//   시드가 트리 지역을 쳐다보지 않게 했다. 이름이 같아도 새 flat CUSTOM을 만든다.
//   UNIQUE(parent_id, slug)는 parent_id가 NULL이면 Postgres가 NULL끼리 다르게 봐서
//   제약 위반이 아니다. 슬러그 충돌은 아래에서 -2, -3으로 직접 피한다.
// ─────────────────────────────────────────────────────────────
function uniqueRegionNames() {
  const seen = new Set()
  const out = []
  for (const k of DATA.keywords) {
    // regions가 빈 문자열인 키워드(92개)는 여기서 아무것도 내놓지 않는다.
    for (const name of splitList(k.regions)) {
      if (seen.has(name)) continue
      seen.add(name)
      out.push(name)
    }
  }
  return out
}

async function ensureRegions(names, stats) {
  const rows = await fetchAll('suri_regions', 'id,parent_id,level,slug,display_name')
  rows.sort((a, b) => a.id - b.id)

  // regionLabel이 조상을 따라가야 하므로 byId는 전체 지역을 담는다.
  const byId = new Map(rows.map((r) => [r.id, r]))

  // 재사용 후보는 부모 없는 CUSTOM뿐이다(= 이 스크립트가 예전에 만든 것들).
  // 같은 이름이 여럿이면 먼저 만들어진 것을 쓴다 — 어차피 임의라면 매번 같은 쪽이 낫다.
  const idByName = new Map()
  for (const r of rows) {
    if (r.parent_id != null || r.level !== 'CUSTOM') continue
    if (!idByName.has(r.display_name)) idByName.set(r.display_name, r.id)
  }

  // 슬러그 충돌은 같은 parent_id 범위 안에서만 따지면 된다.
  // 새로 만드는 건 전부 parent_id NULL이므로 최상위 슬러그끼리만 비교한다.
  const topSlugs = new Set(rows.filter((r) => r.parent_id == null).map((r) => r.slug))

  const toInsert = []
  for (const name of names) {
    if (idByName.has(name)) {
      stats.regionReused++
      continue
    }
    const base = toSlug(name) || 'region'
    let slug = base
    for (let n = 2; topSlugs.has(slug); n++) slug = `${base}-${n}`
    topSlugs.add(slug)
    toInsert.push({ display_name: name, level: 'CUSTOM', slug })
  }
  stats.regionNew = toInsert.length

  if (DRY_RUN) {
    for (const r of toInsert) {
      const id = nextFakeId()
      idByName.set(r.display_name, id)
      byId.set(id, { id, parent_id: null, level: 'CUSTOM', slug: r.slug, display_name: r.display_name })
    }
    return { byId, idByName }
  }

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const chunk = toInsert.slice(i, i + BATCH)
    const { data, error } = await getDb()
      .from('suri_regions')
      .insert(chunk)
      .select('id,parent_id,level,slug,display_name')
    if (error) throw new Error(`suri_regions 삽입 실패(${i}번째 배치): ${error.message}`)
    for (const r of data) {
      byId.set(r.id, r)
      if (!idByName.has(r.display_name)) idByName.set(r.display_name, r.id)
    }
    console.log(`  지역 ${Math.min(i + BATCH, toInsert.length)}/${toInsert.length}`)
  }

  return { byId, idByName }
}

// ─────────────────────────────────────────────────────────────
// 4. 조합 페이지
//
// search_intent / meta_* / required_modules / module_order는
// web/app/admin/page.tsx의 attachRegions가 만드는 형식과 같게 맞춘다.
// 관리 화면으로 붙인 페이지와 시드로 깐 페이지가 서로 다르게 보이면 안 된다.
// ─────────────────────────────────────────────────────────────
function pageRow(kwId, regionId, label) {
  return {
    page_type: 'LANDING',
    content_type: 'CT1',
    repair_keyword_id: kwId,
    region_id: regionId,
    search_intent: `${label} 안내`,
    required_modules: ['M01', 'M24'],
    module_order: ['M01', 'M24'],
    meta_title: `${label} | 수리위키`,
    meta_description: `${label} 출장 상담 안내. 사진과 수리 내용을 남겨 주시면 확인 후 안내드립니다.`,
    decision: 'CREATE',
  }
}

async function ensurePages(idBySlug, regions, stats) {
  const kwIds = DATA.keywords.map((k) => idBySlug.get(k.slug)).filter((id) => id > 0)

  const existing = kwIds.length
    ? await fetchAll('suri_pages', 'repair_keyword_id,region_id', (q) =>
        q.eq('page_type', 'LANDING').in('repair_keyword_id', kwIds),
      )
    : []
  const taken = new Set(existing.map((p) => `${p.repair_keyword_id}:${p.region_id}`))

  const planned = new Set()
  const rows = []
  for (const k of DATA.keywords) {
    const kwId = idBySlug.get(k.slug)
    // regions가 비어 있으면 이 루프가 0회 돈다 = 조합 페이지 없이 키워드만 남는다.
    for (const name of splitList(k.regions)) {
      const regionId = regions.idByName.get(name)
      const key = `${kwId}:${regionId}`
      if (taken.has(key)) {
        stats.pageSkipped++
        continue
      }
      // 같은 조합이 두 번 계획되는 일은 없어야 하지만, 방어적으로 한 번만 넣는다.
      if (planned.has(key)) continue
      planned.add(key)
      rows.push(pageRow(kwId, regionId, `${regionLabel(regions.byId, regionId)} ${k.name}`))
    }
  }
  stats.pageNew = rows.length

  if (DRY_RUN || rows.length === 0) return

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    // 여기서도 DO NOTHING이다. 운영자가 HOLD로 내렸거나 meta를 고친 조합을 되돌리면 안 된다.
    const { error } = await getDb()
      .from('suri_pages')
      .upsert(chunk, {
        onConflict: 'repair_keyword_id,region_id,page_type',
        ignoreDuplicates: true,
      })
    if (error) throw new Error(`suri_pages 삽입 실패(${i}번째 배치): ${error.message}`)
    console.log(`  페이지 ${Math.min(i + BATCH, rows.length)}/${rows.length}`)
  }
}

// ─────────────────────────────────────────────────────────────
// 5. extras — 지역이 아니라 증상형 키워드다. 시드하지 않고 후보로만 알려준다.
// ─────────────────────────────────────────────────────────────
function extraCandidates() {
  const seen = new Set()
  const out = []
  for (const k of DATA.keywords) {
    for (const e of splitList(k.extras)) {
      if (seen.has(e)) continue
      seen.add(e)
      out.push(e)
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────

async function main() {
  const stats = {
    categoryCreated: false,
    categoryMissing: [],
    categoryCounts: new Map(),
    keywordNew: 0,
    keywordSkipped: 0,
    regionNew: 0,
    regionReused: 0,
    pageNew: 0,
    pageSkipped: 0,
  }

  console.log(DRY_RUN ? '[--dry-run] 아무것도 쓰지 않고 계획만 셉니다.' : '기본 키워드 시딩 시작.')

  const categoryIdByKeyword = await assignCategories(stats)
  const idBySlug = await ensureKeywords(categoryIdByKeyword, stats)
  const regions = await ensureRegions(uniqueRegionNames(), stats)
  await ensurePages(idBySlug, regions, stats)

  const noRegionKeywords = DATA.keywords.filter((k) => splitList(k.regions).length === 0)
  const verb = DRY_RUN ? '예정' : '완료'

  console.log(`\n── 요약 (${verb}) ──`)
  console.log(`키워드       : 신규 ${stats.keywordNew} / 건너뜀 ${stats.keywordSkipped} (원본 ${DATA.keywords.length})`)
  console.log(`지역         : 신규 ${stats.regionNew} / 기존 재사용 ${stats.regionReused}`)
  console.log(`               (재사용은 부모 없는 CUSTOM 지역만 — 시/도 트리 지역은 이름이 같아도 새로 만든다)`)
  console.log(`조합 페이지  : 신규 ${stats.pageNew} / 건너뜀 ${stats.pageSkipped}`)
  console.log(`지역 0개 키워드: ${noRegionKeywords.length}개 — 조합 페이지 없이 허브 페이지만 생깁니다.`)

  console.log(`\n── 분야별 키워드 수 (원본 ${DATA.keywords.length}개 기준) ──`)
  const counts = [...stats.categoryCounts].sort((a, b) => b[1] - a[1])
  const pad = Math.max(...counts.map(([slug]) => slug.length))
  for (const [slug, n] of counts) console.log(`${slug.padEnd(pad)} : ${n}`)
  if (stats.categoryCreated) console.log(`(분야 '${FALLBACK_CATEGORY}'를 새로 만들었습니다.)`)
  if (stats.categoryMissing.length > 0) {
    console.log(`\n⚠ DB에 없는 분야 슬러그가 있어 '${FALLBACK_CATEGORY}'로 접었습니다: ${stats.categoryMissing.join(', ')}`)
    console.log('  web/lib/photos.ts의 POOL 키와 suri_categories의 슬러그가 어긋난 상태입니다 — 사진이 폴백으로 떨어집니다.')
  }
  if (!DRY_RUN) console.log('\n사이트 반영은 Deploy 워크플로 실행 후.')

  const extras = extraCandidates()
  if (extras.length > 0) {
    console.log(`\n── 시드하지 않은 증상형 키워드 후보 ${extras.length}개 ──`)
    console.log('지역이 아니라 키워드다. 필요하면 관리 화면 > 수리명 추가에 그대로 붙여 넣어라.')
    console.log(extras.join('\n'))
  }
}

// 이 저장소 경로에는 한글과 공백이 있다. import.meta.url은 퍼센트 인코딩되지만
// process.argv[1]은 원본 그대로여서 문자열 비교로는 영원히 false가 된다(seed.mjs에서 겪음).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
