import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 관리센터(admin.suriwiki.com)에서 만든 지역 전문 키워드 사이트 목록.
// 원본은 빌드 때 scripts/build-partners.mjs 가 만드는 partners.json(커밋하지 않음). 없으면 빈 목록이다.
export type Partner = {
  slug: string
  host: string
  url: string
  main_keyword: string
  subs: string[]
  region_count: number
  regions: string[]
  hub: { slug: string; name: string; path: string }
}
export type PartnerData = { built_at: string; noindex: boolean; partners: Partner[] }

const HERE = dirname(fileURLToPath(import.meta.url))
let cached: PartnerData | null = null

export function getPartners(): PartnerData {
  if (cached) return cached
  const file = join(HERE, 'partners.json')
  cached = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as PartnerData) : { built_at: '', noindex: true, partners: [] }
  return cached
}

// 키워드 사이트가 아직 검색 비공개(noindex)면 링크 점수를 넘기지 않는다
export const partnerRel = (d: PartnerData) => (d.noindex ? 'nofollow noopener' : 'noopener')
