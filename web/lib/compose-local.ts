// 지역 페이지 본문 조립.
//
// 지역 페이지 1,479건마다 완성된 본문을 DB에 저장하지 않는다. 저장하면 같은 문장이
// 수백 번 중복되고, 문장 하나를 고치려면 전 페이지를 다시 써야 한다. 대신 두 조각만
// 저장해 두고 빌드 때 조립한다:
//
//   suri_regions.profile          — 그 동네의 실제 주거 특성
//   suri_repair_keywords.content  — 그 수리의 문장 풀 (local_pool)
//
// 특정 페이지만 손으로 쓴 본문을 넣고 싶으면 suri_pages.local에 저장하면 그쪽이 이긴다.
//
// 규칙 하나: 같은 (키워드, 지역)이면 몇 번을 빌드해도 같은 결과여야 한다. 빌드마다
// 문장이 바뀌면 이미 색인된 페이지가 매번 갈아엎어진다. 그래서 난수가 아니라 해시를 쓴다.

import type {
  KeywordLocalPool,
  PageLocal,
  PooledCard,
  PooledSection,
  RegionProfile,
} from './types'

// lib/blueprint.ts와 같은 해시.
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** 배열을 n칸 회전 — 후보군이 같아도 지역마다 앞에 오는 항목이 달라진다. */
function rotate<T>(arr: T[], n: number): T[] {
  if (arr.length === 0) return arr
  const k = n % arr.length
  return [...arr.slice(k), ...arr.slice(0, k)]
}

/**
 * 지역 유형 전용 문장을 먼저, 모자라면 공통 문장으로 채운다.
 *
 * 해시는 '순서'만 흔든다. 어떤 문장이 후보가 되는지는 전적으로 지역 유형이 정한다 —
 * 신축 단지 페이지에 "30년차 문틀 뒤틀림" 카드가 뽑히면 그 페이지는 틀린 글이 된다.
 */
function pickForRegion<T extends { types?: string[] }>(
  pool: T[],
  type: string,
  seed: string,
  count: number,
): T[] {
  const typed = pool.filter((x) => x.types && x.types.includes(type))
  const general = pool.filter((x) => !x.types || x.types.length === 0)
  const h = hashCode(seed)
  return [...rotate(typed, h), ...rotate(general, h >> 3)].slice(0, count)
}

/** "노원구·도봉구·중랑구" → "도봉구·중랑구" (앞의 자기 자신을 뺀 인접 지역) */
function neighborsOf(near: string): string | null {
  const parts = near.split('·')
  return parts.length > 1 ? parts.slice(1).join('·') : null
}

export function composeLocal(
  keywordSlug: string,
  regionName: string,
  profile: RegionProfile | null,
  pool: KeywordLocalPool | null,
): PageLocal | null {
  if (!profile || !pool) return null

  const seed = `${keywordSlug}/${regionName}`

  // 유형에 맞는 각도가 없으면 조립을 포기한다. 아무 각도나 갖다 붙이면 그 동네와
  // 상관없는 한 줄이 히어로 맨 앞에 걸린다 — 빈 페이지보다 나쁘다.
  const angle = pool.angles[profile.type]
  if (!angle) return null

  // 롱폼은 3문단 — 지역 유형에 맞는 2개 + 마지막은 항상 문의 안내로 고정한다.
  // 읽고 나서 바로 상담으로 이어지게 하는 자리라 위치가 바뀌면 안 된다.
  const finalSection = pool.sections.find((s) => s.final)
  const picked = pickForRegion<PooledSection>(
    pool.sections.filter((s) => !s.final),
    profile.type,
    seed,
    2,
  )
  const sections = [...picked, ...(finalSection ? [finalSection] : [])].map((s) => ({
    title: s.title,
    body: s.body,
  }))

  const neighbors = neighborsOf(profile.near)

  return {
    hero_line: `${profile.near} — ${angle}`,
    top_requests: pickForRegion<PooledCard>(pool.requests, profile.type, seed, 6).map((r) => ({
      title: r.title,
      desc: r.desc,
    })),
    longform: {
      lead: `${profile.note}. ${pool.lead_tail}`,
      sections,
    },
    region_faq: {
      q: `${regionName} 어디까지 출장 가능한가요?`,
      a:
        `${profile.dongs} 등 ${regionName} 전 지역으로 출장합니다. ` +
        (neighbors ? `인접한 ${neighbors} 일대도 같은 일정으로 가능합니다. ` : '') +
        '지역과 현장 사진을 보내주시면 일정 회신이 빠릅니다.',
    },
  }
}
