#!/usr/bin/env node
// 기존 지역 메모를 v0.6의 원본/노출본 분리 구조로 옮긴다.
// 기존 메모는 검증 전 자료이므로 research_raw에만 보존하고 display_text는 비운다.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const file = join(dirname(fileURLToPath(import.meta.url)), 'data', 'region-profiles.json')
const data = JSON.parse(readFileSync(file, 'utf8'))

for (const [regionName, profile] of Object.entries(data.regions)) {
  if (!profile || typeof profile !== 'object' || !('type' in profile)) continue
  if (!('research_raw' in profile)) {
    profile.research_raw = {
      status: 'v0.5에서 이전한 미검증 조사자료',
      region_name: regionName,
      nearby_areas: profile.near,
      administrative_areas: profile.dongs,
      legacy_note: profile.note,
    }
  }
  if (!('display_text' in profile)) profile.display_text = null
  if (!('verification_status' in profile)) profile.verification_status = 'pending'
  if (!('verified_facts' in profile)) profile.verified_facts = []
  if (!('verified_at' in profile)) profile.verified_at = null
}

writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
console.log('region-profiles.json — v0.6 research_raw/display_text 분리 완료')
