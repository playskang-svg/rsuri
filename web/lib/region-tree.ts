import type { Region } from './types'

export interface RegionIndex {
  byId: Map<number, Region>
  childrenByParent: Map<number | null, Region[]>
}

export function buildRegionIndex(regions: Region[]): RegionIndex {
  const byId = new Map<number, Region>()
  const childrenByParent = new Map<number | null, Region[]>()
  for (const r of regions) {
    byId.set(r.id, r)
    const key = r.parent_id
    if (!childrenByParent.has(key)) childrenByParent.set(key, [])
    childrenByParent.get(key)!.push(r)
  }
  return { byId, childrenByParent }
}

// 루트(SIDO)부터 해당 지역까지의 조상 체인 — breadcrumb과 URL 세그먼트 조립에 쓴다
export function getAncestorChain(regionId: number, byId: Map<number, Region>): Region[] {
  const chain: Region[] = []
  let current = byId.get(regionId)
  while (current) {
    chain.unshift(current)
    current = current.parent_id != null ? byId.get(current.parent_id) : undefined
  }
  return chain
}

// [...path] 세그먼트(예: ['seoul','gangnam-gu','yeoksam-dong']) → region row.
// slug는 전역 유일이 아니라 형제 범위 안에서만 유일하므로(동명 지역 흔함 —
// keyword-tree에서 확인된 함정) 반드시 부모를 따라 내려가며 매칭한다.
export function resolveRegionByPath(pathSlugs: string[], regions: Region[]): Region | null {
  const index: RegionIndex = buildRegionIndex(regions)
  let parentId: number | null = null
  let current: Region | null = null
  for (const slug of pathSlugs) {
    const siblings: Region[] = index.childrenByParent.get(parentId) ?? []
    const match: Region | undefined = siblings.find((r: Region) => r.slug === slug)
    if (!match) return null
    current = match
    parentId = match.id
  }
  return current
}
