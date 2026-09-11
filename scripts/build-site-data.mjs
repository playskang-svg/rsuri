#!/usr/bin/env node
// 저장소 파일 → 사이트 데이터(web/lib/site-data.json).
//
// 2026-09-11부터 사이트 구조(분야·키워드·지역·페이지)는 DB가 아니라 이 스크립트가 만든다.
//   - 운영자가 준 키워드 그룹(scripts/data/keyword-groups.md)이 곧 사이트 구조다.
//     그룹 하나 = 허브 하나, 그룹 안의 "지역 + 키워드" 한 줄 = 지역 페이지 하나.
//   - DB(suri_*)에 쓰려면 service_role 키가 필요한데, 구조를 바꿀 때마다 키·승인에 묶이면
//     PR 한 번으로 끝날 일이 며칠씩 걸린다. 파일이면 PR diff로 검토되고 main 머지로 배포된다.
//
// 결과는 결정적이다 — 같은 입력이면 id·순서까지 같은 파일이 나온다. 빌드마다 문장이나
// 주소가 바뀌면 이미 색인된 페이지가 흔들린다.
//
//   node scripts/build-site-data.mjs   # web/npm run build가 먼저 실행한다. 결과 파일은 커밋하지 않는다.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'scripts/data')
const OUT = join(ROOT, 'web/lib/site-data.json')

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

// 상담 번호. 이전에는 suri_local_pros에서 가장 많이 쓰인 번호를 골랐다(lib/contact.ts).
const SITE_PHONE = '010-4684-8838'

// ── 1. 키워드 그룹 읽기 ──
function parseGroups(md) {
  const groups = new Map()
  let current = null
  for (const line of md.split('\n')) {
    const head = line.match(/^## (.+?) \((\d+)개\)\s*$/)
    if (head) {
      current = head[1].trim()
      groups.set(current, { declared: Number(head[2]), items: [] })
      continue
    }
    const item = line.match(/^- (.+)$/)
    if (item && current) groups.get(current).items.push(item[1].trim())
  }
  for (const [name, g] of groups) {
    if (g.items.length !== g.declared) {
      throw new Error(`그룹 "${name}" 항목 수가 머리글(${g.declared})과 다릅니다: ${g.items.length}`)
    }
  }
  return groups
}

const groups = parseGroups(readFileSync(join(DATA, 'keyword-groups.md'), 'utf8'))
const map = readJson(join(DATA, 'keyword-map.json'))
const notes = readJson(join(DATA, 'keyword-notes.json'))
const profiles = readJson(join(DATA, 'region-profiles.json')).regions
const photos = readJson(join(DATA, 'field-photos.json'))

// ── 2. 대응표 검증 — 그룹이 하나라도 허브·별칭 어디에도 안 걸리면 조용히 빠진다 ──
const keywordByName = new Map(map.keywords.map((k) => [k.name, k]))
for (const name of groups.keys()) {
  if (!keywordByName.has(name) && !map.aliases[name]) {
    throw new Error(`keyword-map.json에 없는 그룹: "${name}" — keywords나 aliases에 추가하세요`)
  }
}
for (const [alias, target] of Object.entries(map.aliases)) {
  if (!keywordByName.has(target)) throw new Error(`별칭 "${alias}"의 대상 "${target}"이 keywords에 없습니다`)
}
const slugs = new Set()
for (const k of map.keywords) {
  if (slugs.has(k.slug)) throw new Error(`중복 slug: ${k.slug}`)
  slugs.add(k.slug)
  if (!map.families[k.family]) throw new Error(`"${k.name}"의 family "${k.family}"가 families에 없습니다`)
  if (!notes[k.slug]) throw new Error(`keyword-notes.json에 "${k.slug}"(${k.name}) 항목이 없습니다`)
}

// ── 3. 분야 ──
const categories = map.categories.map((c, i) => ({
  id: i + 1,
  slug: c.slug,
  display_name: c.name,
  sort_order: i + 1,
}))
const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]))

// ── 4. 키워드 — 계열 공통 본문 + 키워드별 글 ──
const familyContent = new Map()
function contentOf(family) {
  if (!familyContent.has(family)) {
    const file = map.families[family].content
    const parsed = readJson(join(DATA, 'keyword-content', file))
    // 초기 파일은 local_pool을 content 밖 최상위에 두었다. 둘 다 받는다.
    familyContent.set(family, { ...parsed.content, local_pool: parsed.content.local_pool ?? parsed.local_pool })
  }
  return familyContent.get(family)
}

const uniq = (arr) => [...new Set(arr)]
const aliasesByTarget = new Map()
for (const [alias, target] of Object.entries(map.aliases)) {
  aliasesByTarget.set(target, [...(aliasesByTarget.get(target) ?? []), alias])
}

const keywords = map.keywords.map((k, i) => {
  const base = contentOf(k.family)
  const note = notes[k.slug]
  const faqQs = new Set()
  const faqs = [...note.faqs, ...base.faqs].filter((f) => (faqQs.has(f.q) ? false : faqQs.add(f.q)))
  return {
    id: i + 1,
    category_id: categoryIdBySlug.get(map.families[k.family].category),
    slug: k.slug,
    display_name: k.name,
    description: note.description,
    default_phone: SITE_PHONE,
    menu_order: i + 1,
    family: k.family,
    aliases: aliasesByTarget.get(k.name) ?? [],
    content: {
      ...base,
      tagline: note.tagline || base.tagline,
      symptoms: uniq([...note.symptoms, ...base.symptoms]).slice(0, 8),
      faqs: faqs.slice(0, 7),
    },
  }
})
const keywordIdByName = new Map(keywords.map((k) => [k.display_name, k.id]))

// ── 5. 지역 — 그룹에 실제로 등장한 표기만 만든다 ──
const regionTokens = []
const pairs = [] // [keywordName, token]
for (const [name, g] of groups) {
  const target = keywordByName.has(name) ? name : map.aliases[name]
  for (const item of g.items) {
    if (item === name) continue // 지역 없는 줄 = 허브 자체
    if (!item.endsWith(' ' + name)) throw new Error(`"${item}"이 그룹 이름 "${name}"으로 끝나지 않습니다`)
    const token = item.slice(0, -(name.length + 1)).trim()
    if (target !== name) throw new Error(`별칭 그룹 "${name}"에 지역 항목이 있습니다 — 별칭은 지역 없는 그룹만 허용`)
    if (!regionTokens.includes(token)) regionTokens.push(token)
    pairs.push([name, token])
  }
}

const regionSlugs = new Set()
const regions = regionTokens.map((token, i) => {
  const slug = map.regions[token]
  if (!slug) throw new Error(`keyword-map.json regions에 "${token}"의 slug가 없습니다`)
  if (regionSlugs.has(slug)) throw new Error(`지역 slug 중복: ${slug}`)
  regionSlugs.add(slug)
  const profile = profiles[token]
  if (!profile) throw new Error(`region-profiles.json에 "${token}" 프로필이 없습니다 — 본문 조립이 실패합니다`)
  return {
    id: i + 1,
    parent_id: null,
    level: 'CUSTOM',
    slug,
    display_name: token,
    lat: null,
    lng: null,
    housing_characteristics: null,
    profile,
  }
})
const regionByToken = new Map(regions.map((r) => [r.display_name, r]))

// ── 6. 지역 페이지 ──
const firstDongs = (dongs, n) => dongs.split('·').slice(0, n).join('·')
const pages = pairs.map(([kwName, token], i) => {
  const kw = keywords.find((k) => k.display_name === kwName)
  const region = regionByToken.get(token)
  const phrase = `${token} ${kwName}`
  return {
    id: i + 1,
    page_type: 'LANDING',
    content_type: 'CT1',
    slug: null,
    region_id: region.id,
    repair_keyword_id: keywordIdByName.get(kwName),
    category_id: kw.category_id,
    source_case_id: null,
    search_intent: phrase,
    required_modules: [],
    selected_modules: [],
    module_order: [],
    meta_title: `${phrase} | 수리위키`,
    meta_description:
      `${phrase} 출장 안내 — ${firstDongs(region.profile.dongs, 4)} 등. ${kw.description} ` +
      '사진을 보내주시면 가능 여부와 일정을 먼저 회신드립니다.',
    decision: 'CREATE',
    merged_into_page_id: null,
    diy_vs_pro: null,
    area_served: token,
    seo_keywords: [phrase],
    lsi_keywords: [],
    guide: null,
    local: null,
  }
})

// ── 7. 시공 전후 세트·대표 사진 ──
const keywordImages = []
let imageId = 1
for (const kw of keywords) {
  const setNames = photos.keywordSets[kw.slug] ?? photos.familySets[kw.family] ?? []
  setNames.forEach((name, setIdx) => {
    const set = photos.sets[name]
    if (!set) throw new Error(`field-photos.json에 없는 세트: ${name}`)
    const rows = [
      ...(set.before ? [{ role: 'BEFORE', url: set.before }] : []),
      ...(set.process ?? []).map((url) => ({ role: 'PROCESS', url })),
      ...(set.after ? [{ role: 'AFTER', url: set.after }] : []),
    ]
    rows.forEach((row, sort) => {
      keywordImages.push({
        id: imageId++,
        repair_keyword_id: kw.id,
        set_no: setIdx + 1,
        role: row.role,
        url: row.url,
        caption: set.caption,
        sort_order: sort,
      })
    })
  })
}

// 히어로·카드 사진: 키워드 실사 세트의 완성 사진 → 계열 사진 순. 개념도(svg)는 제외한다.
const photoPools = {}
for (const kw of keywords) {
  const setNames = photos.keywordSets[kw.slug] ?? photos.familySets[kw.family] ?? []
  const own = setNames
    .map((n) => photos.sets[n].after)
    .filter((u) => u && !u.endsWith('.svg'))
  photoPools[kw.slug] = uniq([...own, ...(photos.familyPhotos[kw.family] ?? [])])
}

const out = {
  _note: 'scripts/build-site-data.mjs가 만든 파일. 직접 고치지 말고 scripts/data/의 원본을 고친 뒤 다시 생성한다.',
  site: { phone: SITE_PHONE, homeHero: photos.homeHero },
  categoryPhotos: photos.categoryPhotos ?? {},
  categories,
  keywords,
  regions,
  pages,
  keywordImages,
  photoPools,
}

const json = JSON.stringify(out, null, 1) + '\n'
{
  writeFileSync(OUT, json)
  console.log(
    `site-data.json — 분야 ${categories.length} · 허브 ${keywords.length} · 지역 ${regions.length} · 지역 페이지 ${pages.length} · 사진 ${keywordImages.length}`,
  )
}
