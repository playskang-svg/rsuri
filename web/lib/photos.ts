// 카테고리별 참고 사진 (Unsplash 핫링크 — 2026-09-02 전 ID HTTP 200 확인).
//
// ⚠️ 이 사진들은 분위기용 참고 이미지다. "시공 전후 사진"으로 표기하지 않는다 —
// 실제 현장 사진이 아니기 때문(원본 데이터의 사진 필드가 비어 있음). 실제 사진이
// 입고되면 suri_page_images가 이 자리를 대체한다.
//
// 선정 기준 (2026-09-02 전면 교체):
//   1) 사람이 나오지 않을 것 — 외국인 모델 사진은 한국 지역 상담 페이지에서
//      "이 업체가 실제로 시공한 현장"으로 오독되기 쉽고 신뢰를 떨어뜨린다.
//      사물·현장 위주로만 고른다. 사진을 추가할 때도 이 규칙을 지킨다.
//   2) 카테고리(공종)와 실제로 맞을 것 — 거실 인테리어 사진을 전기·배관 페이지에
//      쓰면 키워드와 무관한 이미지가 된다.
//
// 중복 방지: 카테고리당 사진 2~3장 풀에서 페이지 해시로 고르고, object-position과
// 색 필터(hue/saturate)를 해시로 미세 변형해 같은 원본이라도 페이지마다 다르게 보인다.

const P = (id: string) => `https://images.unsplash.com/photo-${id}?w=1100&q=72&auto=format&fit=crop`

const POOL: Record<string, string[]> = {
  // 주방/싱크대 — 싱크볼·주방 수전
  'kitchen-sink': [
    P('1629078692818-c5a0443f4ae3'),
    P('1661045327753-3f2a047d00a4'),
    P('1646592491489-ebdf758b9d11'),
  ],
  // 누수/방수 — 수전 클로즈업 + 노출 배관
  'leak-waterproof': [
    P('1585704032915-c3400ca199e7'),
    P('1538474705339-e87de81450e8'),
    P('1646009445351-b8192e095f3a'),
  ],
  // 욕실/화장실 — 욕실 전경·욕조·세면대
  'bathroom-toilet': [
    P('1584622650111-993a426fbf0a'),
    P('1620626011761-996317b8d101'),
    P('1687951276836-06efbfda608b'),
  ],
  // 문/샷시/창호 — 창틀·미닫이 새시 (거실 전경 대신 창 자체)
  'door-window-sash': [P('1564327481459-8bcd5561cf86'), P('1784280017604-c7eb21ee002c')],
  // 도배/장판/바닥 — 벽지 질감 + 마루 바닥
  'wallpaper-flooring': [
    P('1612764550058-b7ccce95a20e'),
    P('1572319340370-2d2028f4b2bb'),
    P('1560185008-b033106af5c3'),
  ],
  // 전기/조명/설비 — 분전반·차단기
  'electrical-lighting': [
    P('1635335874521-7987db781153'),
    P('1576446468729-7674e99608f5'),
    P('1566417110090-6b15a06ec800'),
  ],
  // 배관/난방/보일러 — 보일러 분배기·가스 계량기·배관
  'piping-heating-boiler': [
    P('1650551182991-b07558247564'),
    P('1609213244695-7d6902be89da'),
    P('1538474705339-e87de81450e8'),
  ],
  // 타일/대리석 — 타일 바닥·줄눈
  'tile-marble': [
    P('1656646523907-97b094c7e63a'),
    P('1609946860441-a51ffcf22208'),
    P('1687951276836-06efbfda608b'),
  ],
  // 방충망/환풍기/기타 — 방충망 망 자체
  'screen-vent-etc': [
    P('1707819056053-c812026680bd'),
    P('1659636770355-38f45919b28d'),
    P('1767032915447-a09b88e07b0c'),
  ],
  // 비둘기/조류퇴치 — 실외기 사진을 섞어 두면 '실외기 비둘기' 키워드에도 맞는다.
  'pigeon-bird-control': [
    P('1785759189500-d1fae62b1735'),
    P('1758636697712-1b2791d31f18'),
    P('1694675879520-ff32d348fb7f'),
  ],
  // 어느 공종에도 안 걸리는 키워드(집수리·농가주택수리 등)가 붙는 분야.
  // 이 키가 없으면 그런 키워드가 전부 FALLBACK 2장을 돌려쓴다 — 집 전체를 다루는
  // 키워드답게 외관·마루·배관을 섞어 최소한의 변화는 주게 한다.
  general: [
    P('1600585154340-be6161a56a0c'),
    P('1560185008-b033106af5c3'),
    P('1538474705339-e87de81450e8'),
  ],
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
