#!/usr/bin/env node
// 전문가 CT·MOD v0.6 문서가 빌드 결과에서 축약·변형되지 않았는지 검증한다.

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CT_MOD_GUIDE, validateBlueprint } from './lib/content-model.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'))
const data = readJson('web/lib/site-data.json')
const profiles = readJson('scripts/data/region-profiles.json').regions

for (const [name, profile] of Object.entries(profiles)) {
  if (!profile || typeof profile !== 'object' || !('type' in profile)) continue
  for (const field of ['research_raw', 'display_text', 'verification_status', 'verified_facts', 'verified_at']) {
    if (!(field in profile)) throw new Error(`${name}: M28 ${field} 필드가 없습니다`)
  }
  if (profile.verification_status === 'verified') {
    if (!profile.research_raw || !profile.display_text) throw new Error(`${name}: 검증된 M28은 원본과 노출본이 모두 필요합니다`)
    const sentences = profile.display_text.split(/[.!?](?:\s|$)/).filter(Boolean)
    if (sentences.length < 2 || sentences.length > 3) throw new Error(`${name}: display_text는 2~3문장이어야 합니다`)
    if (profile.display_text.length > 120) throw new Error(`${name}: display_text는 80자 내외로 압축해야 합니다`)
    if (profile.verified_facts.length < 1) throw new Error(`${name}: 교차 확인한 핵심 사실이 없습니다`)
  } else if (profile.display_text) {
    throw new Error(`${name}: 사실 검증 전 display_text를 공개할 수 없습니다`)
  }
}

const keywordNames = new Set(data.keywords.map((keyword) => keyword.display_name))
for (const page of data.pages) {
  for (const field of CT_MOD_GUIDE.minimum_page_fields) {
    if (!(field in page)) throw new Error(`${page.search_intent}: 최소 저장 필드 ${field}가 없습니다`)
  }
  const keyword = data.keywords.find((item) => item.id === page.repair_keyword_id)
  const region = data.regions.find((item) => item.id === page.region_id)
  if (!keyword || !region) throw new Error(`${page.search_intent}: 키워드 또는 지역 참조가 없습니다`)
  const exactPhrase = `${region.display_name} ${keyword.display_name}`
  if (page.search_intent !== exactPhrase || page.meta_title !== `${exactPhrase} | 수리위키`) {
    throw new Error(`${page.search_intent}: 제공 키워드 표기를 그대로 사용해야 합니다`)
  }
  if (!keywordNames.has(keyword.display_name)) throw new Error(`${page.search_intent}: 허브 키워드가 없습니다`)
  if (page.region_profile_id !== region.id) throw new Error(`${page.search_intent}: region_profile_id가 지역 레코드와 다릅니다`)
  validateBlueprint(page)
  const hasRequiredEvidence =
    Boolean(keyword.content?.tagline) &&
    keyword.content.symptoms.length > 0 &&
    keyword.content.services.length > 0 &&
    Boolean(keyword.content.local_pool?.sections?.some((section) => !section.final))
  if (!hasRequiredEvidence && page.decision !== 'HOLD') {
    throw new Error(`${page.search_intent}: 필수 모듈 근거가 없으므로 HOLD여야 합니다`)
  }
  if (page.selected_modules.includes('M28')) {
    const profile = region.profile
    if (profile.verification_status !== 'verified' || !profile.research_raw || !profile.display_text) {
      throw new Error(`${page.search_intent}: M28 네 단계가 끝나지 않았습니다`)
    }
  }
}

console.log(
  `CT·MOD v${CT_MOD_GUIDE.version} 검증 완료 — CT ${Object.keys(CT_MOD_GUIDE.content_types).length}개 · 모듈 ${Object.keys(CT_MOD_GUIDE.modules).length}개 · 페이지 ${data.pages.length}개`,
)
