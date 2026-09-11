// 키워드 단위 시공 전/후 사진.
//
// 사진을 지역 조합 페이지마다 일일이 넣는 건 불가능하므로(키워드 × 지역 = 수백 장),
// 키워드에 전/후 + 설명을 한 세트로 붙여 두고 그 키워드의 모든 하위 페이지가 상속한다.
// 원본은 scripts/data/field-photos.json — 운영자가 준 실제 현장 사진과 개념도를 키워드에 붙인다.

import { cache } from 'react'
import { USE_FIXTURES } from './supabase'

export interface KeywordImage {
  id: number
  repair_keyword_id: number
  set_no: number
  role: 'BEFORE' | 'AFTER' | 'PROCESS'
  url: string
  caption: string | null
  sort_order: number
}

/** 한 세트 = 전/후(+과정 여러 장) + 설명 한 줄 */
export interface PhotoSet {
  setNo: number
  before: string | null
  after: string | null
  process: string[]
  caption: string | null
}

export const getKeywordImages = cache(async (): Promise<KeywordImage[]> => {
  if (USE_FIXTURES) return []
  const { loadSiteData } = await import('./site-data')
  return loadSiteData().keywordImages
})

/** 같은 세트 안의 행 순서 — sort_order 우선, 동률이면 입력 순서(id)로 고정한다. */
function byOrder(a: KeywordImage, b: KeywordImage) {
  return a.sort_order - b.sort_order || a.id - b.id
}

export function groupSetsByKeyword(images: KeywordImage[]): Map<number, PhotoSet[]> {
  const grouped = new Map<number, Map<number, KeywordImage[]>>()
  for (const img of images) {
    let sets = grouped.get(img.repair_keyword_id)
    if (!sets) {
      sets = new Map()
      grouped.set(img.repair_keyword_id, sets)
    }
    const rows = sets.get(img.set_no)
    if (rows) rows.push(img)
    else sets.set(img.set_no, [img])
  }

  const result = new Map<number, PhotoSet[]>()
  for (const [keywordId, sets] of grouped) {
    const photoSets: PhotoSet[] = []
    for (const [setNo, rows] of sets) {
      const sorted = [...rows].sort(byOrder)
      photoSets.push({
        setNo,
        before: sorted.find((r) => r.role === 'BEFORE')?.url ?? null,
        after: sorted.find((r) => r.role === 'AFTER')?.url ?? null,
        process: sorted.filter((r) => r.role === 'PROCESS').map((r) => r.url),
        // 세트 안에서는 같은 설명을 쓰지만, 한 행에만 적어 두는 운영도 허용한다.
        caption: sorted.find((r) => r.caption)?.caption ?? null,
      })
    }
    photoSets.sort((a, b) => a.setNo - b.setNo)
    result.set(keywordId, photoSets)
  }
  return result
}

/** 세트가 전부 개념도(svg)인지. 그림이 실제 현장 사진으로 오인되지 않게 화면에 밝힐 때 쓴다. */
export function isIllustrationOnly(sets: PhotoSet[]): boolean {
  return sets.every((set) =>
    [set.before, set.after, ...set.process].every((u) => !u || u.startsWith('/illustrations/')),
  )
}
