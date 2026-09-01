// 카테고리별 참고 사진 (Unsplash 핫링크 — 2026-09-01 전 ID HTTP 200 확인).
//
// ⚠️ 이 사진들은 분위기용 참고 이미지다. "시공 전후 사진"으로 표기하지 않는다 —
// 실제 현장 사진이 아니기 때문(원본 데이터의 사진 필드가 비어 있음). 실제 사진이
// 입고되면 suri_page_images가 이 자리를 대체한다.
//
// 중복 방지: 카테고리당 사진 2장 풀에서 페이지 해시로 고르고, object-position과
// 색 필터(hue/saturate)를 해시로 미세 변형해 같은 원본이라도 페이지마다 다르게 보인다.

const P = (id: string) => `https://images.unsplash.com/photo-${id}?w=1100&q=72&auto=format&fit=crop`

const POOL: Record<string, string[]> = {
  'kitchen-sink': [P('1556911220-e15b29be8c8f'), P('1585128792020-803d29415281')],
  'leak-waterproof': [P('1585704032915-c3400ca199e7'), P('1604709177225-055f99402ea3')],
  'bathroom-toilet': [P('1584622650111-993a426fbf0a'), P('1620626011761-996317b8d101')],
  'door-window-sash': [P('1600607687939-ce8a6c25118c'), P('1600566753086-00f18fb6b3ea')],
  'wallpaper-flooring': [P('1615873968403-89e068629265'), P('1620641788421-7a1c342ea42e')],
  'electrical-lighting': [P('1607400201889-565b1ee75f8e'), P('1621905251189-08b45d6a269e')],
  'piping-heating-boiler': [P('1581092160562-40aa08e78837'), P('1604709177225-055f99402ea3')],
  'tile-marble': [P('1631679706909-1844bbd07221'), P('1584622650111-993a426fbf0a')],
  // 비둘기/조류퇴치 — 실외기 사진을 섞어 두면 '실외기 비둘기' 키워드에도 맞는다.
  'pigeon-bird-control': [
    P('1785759189500-d1fae62b1735'),
    P('1758636697712-1b2791d31f18'),
    P('1694675879520-ff32d348fb7f'),
  ],
  'screen-vent-etc': [P('1523575708161-ad0fc2a9b951'), P('1513694203232-719a280e022f')],
}
const FALLBACK = [P('1600585154340-be6161a56a0c'), P('1513694203232-719a280e022f')]

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export interface CategoryPhoto {
  src: string
  /** 페이지 해시 기반 미세 변형 — 같은 원본도 페이지마다 다르게 보이게 */
  style: { objectPosition: string; filter: string }
}

export function categoryPhoto(categorySlug: string, seedKey: string, slot = 0): CategoryPhoto {
  const pool = POOL[categorySlug] ?? FALLBACK
  // 인덱스는 base 해시 + slot으로 결정 — 같은 페이지의 slot 0/1이 항상 다른 사진을 쓰게 한다.
  const src = pool[(hashCode(seedKey) + slot) % pool.length]
  const h = hashCode(seedKey + ':' + slot)
  const posX = 30 + (h % 41) // 30~70%
  const posY = 35 + ((h >> 3) % 31) // 35~65%
  const hue = ((h >> 5) % 13) - 6 // -6°~+6°
  const sat = 92 + ((h >> 7) % 17) // 92~108%
  return {
    src,
    style: {
      objectPosition: `${posX}% ${posY}%`,
      filter: `hue-rotate(${hue}deg) saturate(${sat}%)`,
    },
  }
}
