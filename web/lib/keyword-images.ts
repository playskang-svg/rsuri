// 키워드 단위 시공 전/후 사진.
//
// 사진을 지역 조합 페이지마다 일일이 넣는 건 불가능하므로(키워드 × 지역 = 수백 장),
// 키워드에 전/후 + 설명을 한 세트로 붙여 두고 그 키워드의 모든 하위 페이지가 상속한다.
// 페이지 고유 사진(suri_page_images)이 있으면 그쪽이 우선한다 — 기존 동작 유지.

import { cache } from 'react'
import { supabase } from './supabase'

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

const PAGE_SIZE = 1000

// 다른 테이블 조회는 실패하면 throw 하는 게 맞지만(데이터가 비면 사이트가 성립하지 않는다),
// 키워드 사진은 부가 기능이다. 마이그레이션 적용 전에 빌드가 돌면 테이블이 없어 조회가
// 실패하는데, 여기서 throw 하면 사이트 전체 빌드가 죽는다. 빈 배열로 넘긴다.
export const getKeywordImages = cache(async (): Promise<KeywordImage[]> => {
  const rows: KeywordImage[] = []
  let from = 0
  try {
    for (;;) {
      // PostgREST는 .range() 없이 select 하면 1000행에서 조용히 잘린다.
      // .order()도 반드시 있어야 한다 — ORDER BY 없는 OFFSET 페이지네이션은 행 순서가
      // 보장되지 않아 1000행을 넘는 순간 두 번째 페이지에서 행이 중복되거나 누락된다.
      const { data, error } = await supabase
        .from('suri_keyword_images')
        .select('*')
        .order('id')
        .range(from, from + PAGE_SIZE - 1)
      if (error) {
        console.warn(
          `suri_keyword_images 조회 실패 — 키워드 사진 없이 빌드를 계속한다: ${error.message}`,
        )
        return []
      }
      const batch = (data ?? []) as KeywordImage[]
      rows.push(...batch)
      if (batch.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
  } catch (e) {
    console.warn(
      `suri_keyword_images 조회 중 예외 — 키워드 사진 없이 빌드를 계속한다: ${
        e instanceof Error ? e.message : String(e)
      }`,
    )
    return []
  }
  return rows
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

/** 홈·허브 카드 배경용 대표 사진. 완성된 모습(after)을 먼저 보여준다. */
export function coverImage(sets: PhotoSet[] | undefined): string | null {
  const first = sets?.[0]
  if (!first) return null
  return first.after ?? first.before ?? first.process[0] ?? null
}
