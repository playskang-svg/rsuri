// 상담 전화번호 결정.
//
// 지금까지 허브·지역 페이지의 상담 버튼이 `keyword.default_phone`에만 걸려 있었는데
// 그 값은 전 키워드가 NULL이라, 실제로는 어느 페이지에도 전화번호가 나오지 않았다.
// 전화 상담이 이 사이트의 유일한 전환 경로인데 번호가 없으면 페이지를 만든 의미가 없다.
//
// 번호는 코드에 박지 않고 등록된 지역 마스터(suri_local_pros)에서 가져온다 —
// 번호가 바뀌면 DB만 고치면 되고, 배포 코드를 건드릴 일이 없다.

import type { LocalPro } from './types'

/** 지역 담당 마스터가 여럿이어도 대표 번호는 하나여야 한다 — 가장 많이 등록된 번호를 쓴다. */
export function fallbackPhone(localPros: LocalPro[]): string | null {
  const tally = new Map<string, number>()
  for (const p of localPros) {
    if (!p.phone) continue
    tally.set(p.phone, (tally.get(p.phone) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [phone, count] of tally) {
    // 동점이면 문자열 순으로 고정한다. 빌드마다 번호가 바뀌면 안 된다.
    if (count > bestCount || (count === bestCount && best !== null && phone < best)) {
      best = phone
      bestCount = count
    }
  }
  return best
}

export function telHrefOf(phone: string | null | undefined): string | undefined {
  return phone ? `tel:${phone.replace(/-/g, '')}` : undefined
}
