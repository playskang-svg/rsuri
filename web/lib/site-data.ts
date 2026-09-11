// 사이트 데이터 — scripts/build-site-data.mjs가 만든 lib/site-data.json을 읽는다.
//
// 2026-09-11부터 분야·키워드·지역·페이지는 DB가 아니라 저장소 파일이 원본이다
// (운영자가 준 키워드 그룹이 곧 사이트 구조 — scripts/data/keyword-groups.md).
// 모양은 예전 getAllData()와 같게 맞춰 두어 페이지 코드는 출처가 바뀐 줄 모른다.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { KeywordImage } from './keyword-images'
import type { Category, LocalPro, Page, PageImage, PageSection, Region, RepairKeyword } from './types'

export interface SiteData {
  site: { phone: string; homeHero: string }
  categories: Category[]
  keywords: RepairKeyword[]
  regions: Region[]
  pages: Page[]
  keywordImages: KeywordImage[]
  /** 키워드 slug → 히어로·카드용 실사(완성 사진 위주). 빈 배열이면 사진 칸을 비운다. */
  photoPools: Record<string, string[]>
  /** 분야 slug → 대표 사진 (홈 분야 카드·분야 히어로) */
  categoryPhotos: Record<string, string>
}

const HERE = dirname(fileURLToPath(import.meta.url))

let cached: SiteData | null = null

export function loadSiteData(): SiteData {
  if (!cached) cached = JSON.parse(readFileSync(join(HERE, 'site-data.json'), 'utf8')) as SiteData
  return cached
}

export function buildSiteData() {
  const d = loadSiteData()
  // 지역 마스터 프로필(suri_local_pros)은 옮기지 않는다 — 실제 인물 확인이 안 된 평점·경력이
  // 들어 있었다. 상담 번호는 키워드 default_phone으로 전 페이지에 걸린다.
  const localPros: LocalPro[] = []
  const sections: PageSection[] = []
  const pageImages: PageImage[] = []
  return {
    regions: d.regions,
    categories: d.categories,
    keywords: d.keywords,
    pages: d.pages,
    sections,
    localPros,
    pageImages,
  }
}
