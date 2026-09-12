#!/usr/bin/env node
// 계열(family) 콘텐츠 JSON 품질 검사.
//
// scripts/data/keyword-content/*.json 하나가 그 계열에 속한 모든 키워드 × 모든 지역
// 페이지로 상속된다(build-site-data.mjs → compose-local.ts). build-site-data.mjs는
// "연결이 끊기지 않았는가"(slug·family·notes 존재)만 보고, "내용 규칙을 지켰는가"는
// 보지 않는다. 이 스크립트가 후자를 본다 — 규칙 하나를 어기면 수백 지역 페이지가
// 한꺼번에 틀린 글이 되므로 눈으로 훑어서는 못 잡는다.
//
//   node scripts/check-content.mjs
//
// 검사 항목
//   1. 필수 필드 존재 (content.*, local_pool.*)
//   2. local_pool.angles가 region-profiles.json의 지역 유형 8개를 전부 채우는가
//   3. local_pool.sections 중 final:true가 정확히 1개인가
//   4. requests/sections의 types가 실재하는 지역 유형만 쓰는가(오타 검출)
//   5. content(계열 공통 자산)에 실제 지역 표기가 섞이지 않았는가 — 섞이면 상속받는
//      순간 다른 지역에도 틀린 문장이 퍼진다
//   6. faqs의 q가 계열 안에서 중복되지 않는가

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'scripts/data')
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

const map = readJson(join(DATA, 'keyword-map.json'))
const profiles = readJson(join(DATA, 'region-profiles.json'))
const REGION_TYPES = Object.keys(profiles._types)
const REGION_TOKENS = Object.keys(profiles.regions)

const contentDir = join(DATA, 'keyword-content')
const files = readdirSync(contentDir).filter((f) => f.endsWith('.json'))

let errors = 0
let warnings = 0
const fail = (file, msg) => {
  console.error(`✗ ${file}: ${msg}`)
  errors++
}
const warn = (file, msg) => {
  console.warn(`△ ${file}: ${msg}`)
  warnings++
}

// content 안에 실제 지역 토큰이 문자열로 박혀 있는지 — 단어 경계 없이 부분일치라
// 오탐이 날 수 있어 3자 이상 토큰만 본다("강남"처럼 흔한 2자는 오탐이 많다).
function findLeakedRegions(value, path, file) {
  if (typeof value === 'string') {
    for (const token of REGION_TOKENS) {
      if (token.length < 3) continue
      if (value.includes(token)) fail(file, `content에 지역명 "${token}" 포함 의심 (${path}): "${value.slice(0, 40)}..."`)
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => findLeakedRegions(v, `${path}[${i}]`, file))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) findLeakedRegions(v, `${path}.${k}`, file)
  }
}

for (const file of files) {
  const raw = readJson(join(contentDir, file))
  const content = raw.content ?? raw
  const localPool = raw.content?.local_pool ?? raw.local_pool

  // 1. 필수 필드
  const need = ['tagline', 'services', 'process', 'symptoms', 'why_pro', 'faqs']
  for (const key of need) {
    if (!content?.[key] || (Array.isArray(content[key]) && content[key].length === 0)) {
      fail(file, `content.${key} 없음/비어 있음`)
    }
  }
  if (!localPool) {
    fail(file, 'local_pool 없음 — 이 계열의 모든 지역 페이지가 빈 페이지가 됩니다')
    continue
  }
  for (const key of ['angles', 'lead_tail', 'requests', 'sections']) {
    if (!localPool[key]) fail(file, `local_pool.${key} 없음`)
  }

  // 2. angles 8개 유형 전부
  const angles = localPool.angles ?? {}
  const missingTypes = REGION_TYPES.filter((t) => !angles[t])
  if (missingTypes.length > 0) {
    // 몇 개 지역이 영향받는지까지 센다.
    const affected = REGION_TOKENS.filter((token) => missingTypes.includes(profiles.regions[token]?.type))
    fail(
      file,
      `local_pool.angles에 지역 유형 누락: ${missingTypes.join(', ')} — 영향받는 지역 ${affected.length}곳(${affected.slice(0, 5).join('·')}${affected.length > 5 ? ' 외' : ''})은 이 계열 페이지 조립이 실패해 빈 페이지가 됩니다`,
    )
  }

  // 3. final:true 정확히 1개
  const sections = localPool.sections ?? []
  const finals = sections.filter((s) => s.final === true)
  if (finals.length !== 1) {
    fail(file, `local_pool.sections의 final:true가 ${finals.length}개 (정확히 1개여야 함 — 상담 안내 문단 위치 고정 규칙)`)
  }

  // 4. types 오타 검출
  const allTyped = [...(localPool.requests ?? []), ...sections]
  for (const item of allTyped) {
    for (const t of item.types ?? []) {
      if (!REGION_TYPES.includes(t)) {
        fail(file, `"${item.title}"의 types에 존재하지 않는 지역 유형 "${t}" (오타 의심, 실재 유형: ${REGION_TYPES.join(', ')})`)
      }
    }
  }

  // 5. 지역명 혼입 (content만 검사 — local_pool은 지역별 문장이 정상)
  findLeakedRegions(content, 'content', file)

  // 6. faqs 질문 중복
  const qs = (content.faqs ?? []).map((f) => f.q)
  const dup = qs.filter((q, i) => qs.indexOf(q) !== i)
  if (dup.length > 0) fail(file, `content.faqs 질문 중복: ${[...new Set(dup)].join(' / ')}`)

  if (missingTypes.length === 0 && finals.length === 1) {
    console.log(`✓ ${file} — angles 8/8, final 1개, 필수 필드 존재`)
  }
}

// keyword-notes.json이 모든 keyword-map.json 항목을 덮는지도 같이 본다(build-site-data.mjs가
// 이미 던지지만, 배포 전에 여기서 먼저 걸러 CI에서 알 수 있게 한다).
const notes = readJson(join(DATA, 'keyword-notes.json'))
for (const k of map.keywords) {
  if (!notes[k.slug]) fail('keyword-notes.json', `"${k.name}"(${k.slug}) 항목 없음`)
}

console.log(`\n${files.length}개 계열 검사 완료 — 오류 ${errors}건, 경고 ${warnings}건`)
if (errors > 0) process.exit(1)
