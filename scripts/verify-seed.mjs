#!/usr/bin/env node
// scripts/verify-seed.mjs
//
// DB에 들어간 내용이 원본(src/data/mockWikiData.ts)과 정확히 일치하는지 대조한다.
// seed.mjs가 만드는 것과 같은 buildPlan() 결과를 기대값으로 삼기 때문에,
// 어떤 경로로 넣었든(스크립트 실행 / SQL Editor 붙여넣기 / 수동 입력)
// 한 글자라도 다르면 잡아낸다.
//
// 실행: npm run seed:verify
// 읽기만 하므로 anon 키면 충분하다 (SUPABASE_URL / SUPABASE_ANON_KEY).

import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { INITIAL_WIKI_PAGES } from '../src/data/mockWikiData.ts'
import { buildPlan, MAPPED } from './seed.mjs'

loadEnv({ path: '.env' })
loadEnv({ path: '.env.local', override: true })

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL / SUPABASE_ANON_KEY가 필요합니다 (.env.local).')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

let problems = 0
const fail = (msg) => {
  problems++
  console.error(`  ✗ ${msg}`)
}

// 눈에 안 보이는 차이(줄바꿈/공백)를 그대로 드러내기 위해 위치까지 찍어준다
function firstDiff(a, b) {
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) {
      return `위치 ${i}: 기대 ${JSON.stringify(a.slice(Math.max(0, i - 20), i + 20))} / 실제 ${JSON.stringify(b.slice(Math.max(0, i - 20), i + 20))}`
    }
  }
  return `길이 다름: 기대 ${a.length}자 / 실제 ${b.length}자`
}

async function main() {
  const { data: regions, error: rErr } = await db.from('suri_regions').select('id, slug, level')
  const { data: keywords, error: kErr } = await db.from('suri_repair_keywords').select('id, slug')
  const { data: pages, error: pErr } = await db.from('suri_pages').select('*')
  const { data: sections, error: sErr } = await db.from('suri_page_sections').select('*')
  const { data: pros, error: lErr } = await db.from('suri_local_pros').select('*')
  for (const e of [rErr, kErr, pErr, sErr, lErr]) if (e) throw new Error(e.message)

  const regionIdBySlug = new Map(regions.filter((r) => r.level === 'DONG').map((r) => [r.slug, r.id]))
  const keywordIdBySlug = new Map(keywords.map((k) => [k.slug, k.id]))

  let checkedPages = 0
  let checkedSections = 0

  for (const mock of INITIAL_WIKI_PAGES) {
    if (!MAPPED(mock)) continue
    const plan = buildPlan(mock)
    const regionId = regionIdBySlug.get(plan.dongSlug)
    const keywordId = keywordIdBySlug.get(plan.keywordSlug)
    console.log(`\n▶ ${plan.label}`)

    if (!regionId || !keywordId) {
      fail(`지역/키워드를 DB에서 못 찾음 (${plan.dongSlug} / ${plan.keywordSlug})`)
      continue
    }

    for (const expected of plan.pages) {
      const actual = pages.find(
        (p) =>
          p.page_type === expected.page_type &&
          p.region_id === regionId &&
          p.repair_keyword_id === keywordId,
      )
      if (!actual) {
        fail(`${expected.page_type} 페이지 없음`)
        continue
      }
      checkedPages++

      for (const field of ['content_type', 'slug', 'search_intent', 'meta_title', 'meta_description', 'decision']) {
        if ((actual[field] ?? null) !== (expected[field] ?? null)) {
          fail(`${expected.page_type}.${field} 불일치 — ${firstDiff(String(expected[field]), String(actual[field]))}`)
        }
      }
      for (const field of ['required_modules', 'selected_modules', 'module_order']) {
        if (JSON.stringify(actual[field]) !== JSON.stringify(expected[field])) {
          fail(`${expected.page_type}.${field} 불일치 — 기대 ${JSON.stringify(expected[field])} / 실제 ${JSON.stringify(actual[field])}`)
        }
      }

      const actualSections = sections
        .filter((s) => s.page_id === actual.id)
        .sort((a, b) => a.sort_order - b.sort_order)
      if (actualSections.length !== expected.sections.length) {
        fail(`${expected.page_type} 섹션 개수 불일치 — 기대 ${expected.sections.length} / 실제 ${actualSections.length}`)
      }
      for (const exp of expected.sections) {
        const act = actualSections.find((s) => s.sort_order === exp.sort_order)
        if (!act) {
          fail(`${expected.page_type} 섹션 #${exp.sort_order}(${exp.module_code}) 없음`)
          continue
        }
        checkedSections++
        if (act.module_code !== exp.module_code) {
          fail(`${expected.page_type} #${exp.sort_order} module_code: 기대 ${exp.module_code} / 실제 ${act.module_code}`)
        }
        if ((act.heading ?? null) !== (exp.heading ?? null)) {
          fail(`${expected.page_type} #${exp.sort_order} heading: 기대 ${JSON.stringify(exp.heading)} / 실제 ${JSON.stringify(act.heading)}`)
        }
        if (act.body !== exp.body) {
          fail(`${expected.page_type} #${exp.sort_order}(${exp.module_code}) body 불일치 — ${firstDiff(exp.body, act.body)}`)
        }
      }
    }

    for (const exp of plan.pros) {
      const act = pros.find((p) => p.region_id === regionId && p.phone === exp.phone)
      if (!act) {
        fail(`지역 마스터 없음: ${exp.name} (${exp.phone})`)
        continue
      }
      for (const field of ['name', 'shop_name', 'intro', 'master_grade']) {
        if ((act[field] ?? null) !== (exp[field] ?? null)) {
          fail(`마스터 ${exp.name}.${field} 불일치 — 기대 ${JSON.stringify(exp[field])} / 실제 ${JSON.stringify(act[field])}`)
        }
      }
      if (JSON.stringify(act.badges) !== JSON.stringify(exp.badges)) {
        fail(`마스터 ${exp.name}.badges 불일치 — 기대 ${JSON.stringify(exp.badges)} / 실제 ${JSON.stringify(act.badges)}`)
      }
    }

    if (problems === 0) console.log('  ✓ 일치')
  }

  console.log(`\n검사한 페이지 ${checkedPages}개, 섹션 ${checkedSections}개`)
  if (problems > 0) {
    console.error(`\n❌ 불일치 ${problems}건 — 위 내용을 확인하세요.`)
    process.exit(1)
  }
  console.log('✅ 원본과 완전히 일치합니다.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
