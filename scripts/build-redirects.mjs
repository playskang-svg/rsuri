#!/usr/bin/env node
// 옛 주소 → 새 주소 301 (web/public/_redirects).
//
// 2026-09-11 키워드 그룹으로 사이트 구조를 통째로 바꾸면서 이미 색인된 주소 일부가 사라졌다.
// 404로 두면 쌓인 평가가 버려지므로 가장 가까운 새 페이지로 보낸다.
//   - 옛 지역 페이지: 같은 키워드·같은 지역이 살아 있으면 그대로(리다이렉트 없음)
//                    → 없으면 같은 계열 키워드의 같은 지역 → 없으면 그 키워드 허브
//   - 옛 허브·분야: scripts/data/legacy-redirects.json 대응표
//
// 새 사이트에 실제로 있는 주소는 절대 리다이렉트하지 않는다 — _redirects가 페이지를 가린다.
// 그래서 site-data.json을 읽어 새 주소 집합을 만든 뒤 걸러낸다. 빌드 때마다 다시 만든다.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'))

const site = readJson('web/lib/site-data.json')
const legacy = readJson('scripts/data/legacy-redirects.json')
const oldUrls = readFileSync(join(ROOT, 'scripts/data/legacy-urls.txt'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)

const regionById = new Map(site.regions.map((r) => [r.id, r]))
const keywordById = new Map(site.keywords.map((k) => [k.id, k]))
const keywordBySlug = new Map(site.keywords.map((k) => [k.slug, k]))

// 새 사이트의 모든 주소
const live = new Set(['/', '/sitemap'])
for (const k of site.keywords) live.add(`/${k.slug}`)
for (const c of site.categories) live.add(`/category/${c.slug}`)
const landingsBySlugRegion = new Set()
for (const p of site.pages) {
  const kw = keywordById.get(p.repair_keyword_id)
  const region = regionById.get(p.region_id)
  live.add(`/${kw.slug}/${region.slug}`)
  landingsBySlugRegion.add(`${kw.slug}/${region.slug}`)
}

// 계열 안의 형제 키워드 — 메뉴 순서대로(대표 키워드가 앞)
const siblingsOf = (kw) =>
  site.keywords.filter((k) => k.family === kw.family && k.id !== kw.id).sort((a, b) => a.menu_order - b.menu_order)

function hubTarget(oldSlug) {
  if (keywordBySlug.has(oldSlug)) return `/${oldSlug}`
  return legacy.hubs[oldSlug] ?? legacy.default
}

const rules = []
for (const url of oldUrls) {
  if (live.has(url)) continue
  const seg = url.split('/').filter(Boolean)
  let target
  if (seg[0] === 'category') {
    target = legacy.categories[seg[1]] ?? legacy.default
  } else if (seg[0] === 'case') {
    target = legacy.default
  } else if (seg.length === 1) {
    target = hubTarget(seg[0])
  } else {
    const regionSlug = seg[seg.length - 1]
    const kw = keywordBySlug.get(seg[0])
    if (kw) {
      const sib = siblingsOf(kw).find((k) => landingsBySlugRegion.has(`${k.slug}/${regionSlug}`))
      target = sib ? `/${sib.slug}/${regionSlug}` : `/${kw.slug}`
    } else {
      target = hubTarget(seg[0])
    }
  }
  if (!live.has(target)) throw new Error(`리다이렉트 행선지가 새 사이트에 없습니다: ${url} → ${target}`)
  if (target !== url) rules.push(`${url} ${target} 301`)
}

const header =
  '# scripts/build-redirects.mjs가 만든다. 직접 고치지 말 것.\n' +
  '# 2026-09-11 키워드 그룹 전면 교체 전 색인 주소 → 새 주소\n'
writeFileSync(join(ROOT, 'web/public/_redirects'), header + rules.join('\n') + '\n')
console.log(`_redirects — ${rules.length}건 (옛 주소 ${oldUrls.length}개 중 새 사이트에 그대로 있는 것 ${oldUrls.length - rules.length}개)`)
