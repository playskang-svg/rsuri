// web/scripts/generate-sitemap.mjs
//
// keyword-tree 스킬에서 확인된 함정: Next.js 14.2.x의 app/sitemap.ts는
// output:'export'와 조합하면 실제로 깨진다(루트 sitemap.xml 미생성 또는 빌드 에러 —
// vercel/next.js #77304, #61969). 그래서 프레임워크 컨벤션 대신 빌드 전에
// public/sitemap.xml을 직접 써낸다. package.json의 build 스크립트가 next build보다
// 먼저 이 스크립트를 실행한다.

import { writeFileSync, mkdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

// next build은 .env.local을 자동으로 읽지만, 이 스크립트는 next build보다 먼저
// 별도 node 프로세스로 실행되므로 직접 로드해야 한다. 일반 .env보다 .env.local을
// 우선한다(둘 다 있으면 .env.local 값이 이긴다).
loadEnv({ path: '.env' })
loadEnv({ path: '.env.local', override: true })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://suriwiki.com'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY가 필요합니다 (.env.local).')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fetchAllRows(table) {
  const pageSize = 1000
  let rows = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + pageSize - 1)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    rows = rows.concat(data ?? [])
    if (!data || data.length < pageSize) break
    from += pageSize
  }
  return rows
}

function ancestorSlugs(regionId, byId) {
  const chain = []
  let current = byId.get(regionId)
  while (current) {
    chain.unshift(current.slug)
    current = current.parent_id != null ? byId.get(current.parent_id) : undefined
  }
  return chain
}

function isPublished(page) {
  return page.decision === 'CREATE' || page.decision === 'UPDATE'
}

async function main() {
  const [regions, keywords, pages] = await Promise.all([
    fetchAllRows('suri_regions'),
    fetchAllRows('suri_repair_keywords'),
    fetchAllRows('suri_pages'),
  ])
  const byId = new Map(regions.map((r) => [r.id, r]))
  const keywordSlugById = new Map(keywords.map((k) => [k.id, k.slug]))

  const urls = new Set([`${SITE_URL}/`])

  for (const kw of keywords) {
    urls.add(`${SITE_URL}/${kw.slug}`)
  }

  for (const page of pages) {
    if (!isPublished(page)) continue
    if (page.page_type === 'LANDING' && page.region_id && page.repair_keyword_id) {
      const kw = keywordSlugById.get(page.repair_keyword_id)
      const path = ancestorSlugs(page.region_id, byId)
      if (kw && path.length > 0) urls.add(`${SITE_URL}/${kw}/${path.join('/')}`)
    } else if (page.page_type === 'CASE' && page.slug) {
      urls.add(`${SITE_URL}/case/${page.slug}`)
    } else if ((page.page_type === 'WIKI' || page.page_type === 'TOPIC') && page.slug) {
      urls.add(`${SITE_URL}/wiki/${page.slug}`)
    }
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...urls].map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    '\n</urlset>\n'

  mkdirSync('public', { recursive: true })
  writeFileSync('public/sitemap.xml', xml)
  console.log(`sitemap.xml 생성 완료 (${urls.size}개 URL)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
