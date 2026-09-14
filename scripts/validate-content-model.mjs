#!/usr/bin/env node
// 전문가 CT·MOD v0.6 문서가 빌드 결과에서 축약·변형되지 않았는지 검증한다.
// 통과하지 못하면 빌드와 배포가 멈춘다(web/package.json의 build 스크립트).

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CT_MOD_GUIDE, KEYWORD_INTENT, validateBlueprint } from './lib/content-model.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'))
const data = readJson('web/lib/site-data.json')
const profiles = readJson('scripts/data/region-profiles.json').regions

// ── M28: 4단계 워크플로(조사→사실검증→정제→압축저장)를 끝낸 지역만 노출한다 ──
const m28 = CT_MOD_GUIDE.m28
const [minSentences, maxSentences] = m28.display_sentence_count

for (const [name, profile] of Object.entries(profiles)) {
  if (!profile || typeof profile !== 'object' || !('type' in profile)) continue
  for (const field of ['research_raw', 'display_text', 'verification_status', 'verified_facts', 'verified_at']) {
    if (!(field in profile)) throw new Error(`${name}: M28 ${field} 필드가 없습니다`)
  }
  if (profile.verification_status !== 'verified') {
    if (profile.display_text) throw new Error(`${name}: 사실 검증 전 display_text를 공개할 수 없습니다`)
    continue
  }

  if (!profile.research_raw || !profile.display_text) {
    throw new Error(`${name}: 검증된 M28은 조사 원본과 노출본이 모두 필요합니다`)
  }
  const sentences = profile.display_text.split(/[.!?](?:\s|$)/).filter(Boolean)
  if (sentences.length < minSentences || sentences.length > maxSentences) {
    throw new Error(`${name}: display_text는 ${minSentences}~${maxSentences}문장이어야 합니다`)
  }
  // 80자 "내외"라 정확히 80자로 자르지 않고 1.5배를 상한으로 둔다.
  if (profile.display_text.length > Math.round(m28.display_target_characters * 1.5)) {
    throw new Error(`${name}: display_text는 ${m28.display_target_characters}자 내외로 압축해야 합니다`)
  }
  if (profile.verified_facts.length < m28.verification_facts_min) {
    throw new Error(`${name}: 교차 확인한 핵심 사실이 없습니다`)
  }
  // 03단계 정제 — 인구통계 프로파일링과 브랜드·시설명은 노출본에서 빠져야 한다.
  for (const banned of m28.exclude_from_display) {
    if (profile.display_text.includes(banned)) {
      throw new Error(`${name}: display_text에 정제 단계에서 빼야 할 표현이 남아 있습니다 (${banned})`)
    }
  }
}

// ── 키워드마다 검색 의도(문서 08절 2·4단계)가 선언돼 있어야 한다 ──
for (const keyword of data.keywords) {
  const intent = KEYWORD_INTENT.keywords[keyword.slug]
  if (!intent) throw new Error(`${keyword.slug}: 검색 의도가 선언되지 않았습니다`)
  if (!CT_MOD_GUIDE.content_types[intent.ct]) {
    throw new Error(`${keyword.slug}: 알 수 없는 중심 CT ${intent.ct}`)
  }
  if (!intent.question.includes('{region}')) {
    throw new Error(`${keyword.slug}: 검색 의도 문장에 지역 자리가 없습니다`)
  }
}

// ── 페이지별 조합 검증 ──
const fellBack = []
const held = []

for (const page of data.pages) {
  const label = page.search_intent

  for (const field of CT_MOD_GUIDE.minimum_page_fields) {
    if (!(field in page)) throw new Error(`${label}: 최소 저장 필드 ${field}가 없습니다`)
  }

  const keyword = data.keywords.find((item) => item.id === page.repair_keyword_id)
  const region = data.regions.find((item) => item.id === page.region_id)
  if (!keyword || !region) throw new Error(`${label}: 키워드 또는 지역 참조가 없습니다`)

  // 운영자가 준 키워드 표기는 띄어쓰기까지 그대로 쓴다.
  const exactPhrase = `${region.display_name} ${keyword.display_name}`
  if (page.target_phrase !== exactPhrase || page.meta_title !== `${exactPhrase} | 수리위키`) {
    throw new Error(`${label}: 제공 키워드 표기를 그대로 사용해야 합니다`)
  }
  // search_intent는 표기가 아니라 "검색자가 궁금한 핵심 질문 1문장"이다.
  if (!page.search_intent.endsWith('?')) {
    throw new Error(`${exactPhrase}: search_intent는 검색 질문 1문장이어야 합니다`)
  }
  if (!page.search_intent.includes(region.display_name)) {
    throw new Error(`${exactPhrase}: search_intent에 지역이 들어가야 합니다`)
  }

  if (page.region_profile_id !== region.id) {
    throw new Error(`${label}: region_profile_id가 지역 레코드와 다릅니다`)
  }

  validateBlueprint(page)

  if (page.decision === 'HOLD') {
    if (!page.hold_reason) throw new Error(`${label}: HOLD 사유가 기록되지 않았습니다`)
    held.push(label)
    continue
  }

  // M28을 실제로 쓰는 페이지는 지역 프로필 4단계가 끝나 있어야 한다.
  if (page.selected_modules.includes('M28')) {
    const profile = region.profile
    if (profile.verification_status !== 'verified' || !profile.research_raw || !profile.display_text) {
      throw new Error(`${label}: M28 네 단계가 끝나지 않았습니다`)
    }
  }

  if (page.content_type_fell_back) fellBack.push({ label, from: page.intended_content_type, to: page.content_type })
}

// ── 동일 키워드에서 파생된 지역 페이지는 검색 질문이 서로 달라야 한다(문서 07절) ──
const intents = new Set()
for (const page of data.pages) {
  if (intents.has(page.search_intent)) throw new Error(`검색 질문이 중복됩니다: ${page.search_intent}`)
  intents.add(page.search_intent)
}

console.log(
  `CT·MOD v${CT_MOD_GUIDE.version} 검증 완료 — CT ${Object.keys(CT_MOD_GUIDE.content_types).length}개 · ` +
    `모듈 ${Object.keys(CT_MOD_GUIDE.modules).length}개 · 페이지 ${data.pages.length}개`,
)
if (fellBack.length > 0) {
  const byPair = new Map()
  for (const item of fellBack) {
    const key = `${item.from}→${item.to}`
    byPair.set(key, (byPair.get(key) ?? 0) + 1)
  }
  for (const [pair, count] of byPair) {
    console.log(`  · CT 하향 ${pair}: ${count}개 — 의도한 CT의 필수 모듈 근거가 아직 없습니다`)
  }
}
if (held.length > 0) console.log(`  · HOLD ${held.length}개`)
