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

/** 현장 사진 세트 한 벌 — field-photos.json의 sets 한 항목. 홈·허브가 전/후 박스에 쓴다. */
export interface FieldPhotoSet {
  key: string
  /** field = /photos/field/ 실사, illustration = 개념도(svg), external = 외부 URL(네이버) */
  kind: 'field' | 'illustration' | 'external'
  before: string | null
  after: string | null
  process: string[]
  caption: string
  /** 이 세트를 쓰는 대표 허브 — 캡션 아래 링크. 없으면 null */
  keywordSlug: string | null
  keywordName: string | null
  /** 전/후를 같은 자리·같은 각도에서 찍었는지. false면 와이프 대신 2단 나란히로 보여 준다. 없으면 와이프. */
  sameAngle?: boolean
}

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
  /** 모든 사진 세트(실사·개념도·외부 구분 포함) */
  photoSets: FieldPhotoSet[]
  /** 홈 히어로·시공 전후 기록용 — 실사 전/후 쌍만, 극적인 순 */
  homePhotoSets: FieldPhotoSet[]
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
