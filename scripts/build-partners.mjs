// 관리센터(admin.suriwiki.com)의 키워드 사이트 목록 → 수리위키 파트너 데이터.
//   web/lib/partners.json     사이트 빌드가 읽는다(홈 '지역 전문 파트너', 분야 페이지)
//   web/public/partners.json  관리센터가 다시 읽어 '수리위키 연결' 상태를 보여 준다
// 관리센터 응답이 없으면 저장소의 bizhelp/registry/sites.json 으로 대신한다(빌드는 멈추지 않는다).
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = process.env.SURIWIKI_PARTNERS_URL || 'https://admin.suriwiki.com/api/export/partners'
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'))

// 파트너 키워드 → suriwiki.com 분야. 앞에서부터 처음 맞는 규칙을 쓴다(현관문필름은 '필름'이 먼저).
const RULES = [
  [/필름/, 'film'],
  [/문턱|문지방/, 'threshold'],
  [/문틀/, 'doorframe'],
  [/계단/, 'stairs'],
  [/도배|벽지/, 'wallpaper'],
  [/장판|마루/, 'floor'],
  [/문/, 'door'],
]

async function fetchPartners() {
  try {
    const r = await fetch(SRC, { signal: AbortSignal.timeout(8000) })
    const j = await r.json()
    if (r.ok && j.ok && Array.isArray(j.partners)) return { source: 'admin', noindex: !!j.noindex, list: j.partners }
    throw new Error(`HTTP ${r.status}`)
  } catch (e) {
    const reg = readJson('bizhelp/registry/sites.json')
    const list = Object.entries(reg.site_meta || {}).map(([host, m]) => ({
      slug: host.split('.')[0], host, url: `https://${host}/`, main_keyword: m.main_keyword, subs: m.sub_keywords || [],
      regions: (reg.pages || []).filter((p) => p.site === host && p.region).map((p) => p.region), segment: '',
    }))
    console.warn(`build-partners: 관리센터 응답 없음(${e.message}) → registry/sites.json 사용`)
    return { source: 'registry', noindex: reg.noindex !== false, list }
  }
}

const categories = readJson('scripts/data/keyword-map.json').categories
const { source, noindex, list } = await fetchPartners()
const partners = list.map((p) => {
  // 메인 키워드로만 고른다(서브 키워드까지 보면 '싱크대 문짝 리폼'이 문 수리로 잘못 붙는다)
  const slug = (RULES.find(([re]) => re.test(p.main_keyword)) || [])[1]
  const cat = categories.find((c) => c.slug === slug)
  return {
    slug: p.slug, host: p.host, url: p.url, main_keyword: p.main_keyword, subs: (p.subs || []).slice(0, 6),
    region_count: (p.regions || []).length, regions: (p.regions || []).slice(0, 6),
    hub: cat ? { slug: cat.slug, name: cat.name, path: `/category/${cat.slug}` } : { slug: '', name: '홈 파트너', path: '/#partners' },
  }
})
const out = { built_at: new Date().toISOString(), source, noindex, partners }
const json = JSON.stringify(out, null, 2)
writeFileSync(join(ROOT, 'web/lib/partners.json'), json)
writeFileSync(join(ROOT, 'web/public/partners.json'), json)
console.log(`partners.json — ${partners.length}곳 (${source}${noindex ? ', noindex' : ''})`)
