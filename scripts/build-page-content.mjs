#!/usr/bin/env node
//
// 지역 페이지 본문의 두 원천을 DB에 넣는 SQL을 만든다.
//
//   suri_regions.profile          ← scripts/data/region-profiles.json
//   suri_repair_keywords.content  ← scripts/data/keyword-content/<slug>.json
//
// 완성된 본문을 페이지마다 저장하지 않는 이유는 web/lib/compose-local.ts 주석 참고 —
// 여기서는 재료만 넣고, 조립은 빌드 때 한다. 그래서 이 스크립트가 뱉는 SQL은
// 페이지 수(1,479)가 아니라 지역 수 + 키워드 수에 비례한다.
//
// DB에 직접 쓰지 않고 .sql만 뱉는 이유:
//   1) 이 저장소에는 service_role 키가 없다(anon 키로는 RLS에 막혀 쓰기가 안 된다).
//   2) DB 반영은 사람이 내용을 보고 승인하는 단계다 — CLAUDE.md 규칙.
//
// 사용법:
//   node scripts/build-page-content.mjs                 # 지역 프로필만
//   node scripts/build-page-content.mjs door-repair     # 지역 프로필 + 해당 키워드 자산

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const keywordSlug = process.argv[2] ?? null

/** Postgres 문자열 리터럴 이스케이프 — 작은따옴표만 두 번 겹치면 된다. */
const sqlStr = (s) => `'${s.replace(/'/g, "''")}'`

const out = []
out.push('-- scripts/build-page-content.mjs 생성물. 직접 고치지 말고 원본 JSON을 고칠 것.')
out.push('begin;')
out.push('')

// ── 지역 프로필 ──
// display_name으로 맞추는 이유: 관리 화면에서 자유 입력으로 만든 CUSTOM 지역은 slug가
// custom-<타임스탬프>라 의미가 없고, 사람이 보고 검수할 수 있는 키가 이름뿐이다.
const profiles = JSON.parse(readFileSync(join(HERE, 'data/region-profiles.json'), 'utf8'))
let regionCount = 0
for (const [name, p] of Object.entries(profiles.regions)) {
  if (name.startsWith('_')) continue // 파일 안 주석 키 (_note 등)
  out.push(
    `update public.suri_regions set profile = ${sqlStr(JSON.stringify(p))}::jsonb ` +
      `where display_name = ${sqlStr(name)};`,
  )
  regionCount++
}

// ── 키워드 자산 + 문장 풀 ──
let keywordNote = '없음'
if (keywordSlug) {
  const kw = JSON.parse(
    readFileSync(join(HERE, `data/keyword-content/${keywordSlug}.json`), 'utf8'),
  )
  // local_pool을 content 안에 함께 넣는다. 둘 다 이 키워드에만 속하고 항상 같이 읽히므로
  // 컬럼을 나누면 조회만 한 번 늘어난다.
  const content = { ...kw.content, local_pool: kw.local_pool }
  out.push('')
  out.push(
    `update public.suri_repair_keywords set content = ${sqlStr(JSON.stringify(content))}::jsonb ` +
      `where slug = ${sqlStr(keywordSlug)};`,
  )
  keywordNote = keywordSlug
}

out.push('')
out.push('commit;')
out.push(`-- 지역 ${regionCount}개 · 키워드 ${keywordNote}`)

console.log(out.join('\n'))
