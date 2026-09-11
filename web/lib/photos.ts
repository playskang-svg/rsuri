// 히어로·카드 사진.
//
// 2026-09-11 전면 교체: 예전에는 Unsplash 스톡 사진을 키워드 이름으로 골라 썼는데, 운영자
// 확인 결과 "사진이 수리 내용하고 너무 안 맞는다" — 외국 주택의 문·바닥 사진이 한국 아파트
// 문틀·문지방 수리 페이지에 걸려 있었다. 이제 운영자가 준 실제 현장 사진만 쓴다.
//
// 규칙: 그 키워드와 맞는 실사가 없으면 null을 돌려주고, 호출하는 쪽은 사진 칸을 비운다.
// 맞지 않는 사진을 채워 넣는 것보다 빈 칸이 낫다. 사진 목록은 scripts/data/field-photos.json.

import { loadSiteData } from './site-data'
import { USE_FIXTURES } from './supabase'

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function poolOf(keywordSlug: string): string[] {
  if (USE_FIXTURES) return []
  return loadSiteData().photoPools[keywordSlug] ?? []
}

/** 이 키워드에 맞는 실사 한 장. seedKey로 카드마다 다른 장을 고른다. 없으면 null. */
export function keywordPhoto(keywordSlug: string, seedKey = '', slot = 0): string | null {
  const pool = poolOf(keywordSlug)
  if (pool.length === 0) return null
  return pool[(hashCode(seedKey) + slot) % pool.length]
}

/** 히어로 슬라이드용 — 이 키워드의 실사 전부(최대 n장). */
export function keywordPhotos(keywordSlug: string, n = 4): string[] {
  return poolOf(keywordSlug).slice(0, n)
}

export function homeHeroPhoto(): string | null {
  if (USE_FIXTURES) return null
  return loadSiteData().site.homeHero
}

/** 분야 대표 사진 — field-photos.json에서 직접 고른 한 장. 없으면 null. */
export function categoryPhoto(categorySlug: string): string | null {
  if (USE_FIXTURES) return null
  return loadSiteData().categoryPhotos[categorySlug] ?? null
}
