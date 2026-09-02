// 참고 사진 (Unsplash 핫링크 — 2026-09-02 전 ID HTTP 200 확인).
//
// ⚠️ 이 사진들은 분위기용 참고 이미지다. "시공 전후 사진"으로 표기하지 않는다 —
// 실제 현장 사진이 아니기 때문. 운영자가 올린 사진(suri_keyword_images /
// suri_page_images)이 있으면 그쪽이 이 자리를 대체한다.
//
// 선정 기준:
//   1) 사람이 나오지 않을 것 — 외국인 모델 사진은 한국 지역 상담 페이지에서
//      "이 업체가 시공한 현장"으로 오독되기 쉽다. 사물·현장 위주로만 고른다.
//   2) 키워드와 실제로 맞을 것.
//
// ── 왜 분야가 아니라 '키워드 주제'로 고르는가 ──
// 처음에는 분야(카테고리) 슬러그로만 골랐는데, 키워드 203개 중 127개가
// door-window-sash 한 분야에 몰리면서 방화문·문틀·중문·자동문이 전부 창문 사진
// 두 장을 돌려쓰게 됐다. 계단은 벽지 사진, 거울은 타일 사진으로 떨어졌다.
// 그래서 키워드 이름에서 주제를 먼저 읽고(TOPIC_RULES), 안 걸릴 때만 분야로 내려간다.
// 분야는 9종인데 실제 공종은 그보다 잘게 나뉘므로 이 순서가 맞다.

const P = (id: string) => `https://images.unsplash.com/photo-${id}?w=1100&q=72&auto=format&fit=crop`

const POOL: Record<string, string[]> = {
  // ── 주제별: 키워드 이름으로 고른다 ──
  // 문 계열이 키워드의 절반 이상이라 가장 여러 장을 둔다.
  door: [
    P('1542354642-233af003db87'),
    P('1764592119348-0aaeab50e2d0'),
    P('1542020383883-6c6b2a343807'),
    P('1786465220058-41cbeb61e775'),
  ],
  stairs: [
    P('1777811146491-8b391f5e25ab'),
    P('1777811146533-495d67756f49'),
    P('1728031649144-2808cd271f77'),
  ],
  // 유리문·강화도어·중문·자동문·거울 — 통유리 출입구와 거울
  glass: [
    P('1631195092568-a1030d926fd3'),
    P('1724660583307-e7b0c5c5fcd9'),
    P('1784601680693-dcee08d57fbe'),
  ],
  floor: [P('1560185008-b033106af5c3'), P('1611072337226-1140ab367200')],
  wallpaper: [P('1612764550058-b7ccce95a20e'), P('1572319340370-2d2028f4b2bb')],
  window: [P('1564327481459-8bcd5561cf86'), P('1784280017604-c7eb21ee002c')],

  // ── 분야별: 주제 규칙에 안 걸릴 때 ──
  'kitchen-sink': [
    P('1629078692818-c5a0443f4ae3'),
    P('1661045327753-3f2a047d00a4'),
    P('1646592491489-ebdf758b9d11'),
  ],
  'leak-waterproof': [
    P('1585704032915-c3400ca199e7'),
    P('1538474705339-e87de81450e8'),
    P('1646009445351-b8192e095f3a'),
  ],
  'bathroom-toilet': [
    P('1584622650111-993a426fbf0a'),
    P('1620626011761-996317b8d101'),
    P('1687951276836-06efbfda608b'),
  ],
  'door-window-sash': [P('1564327481459-8bcd5561cf86'), P('1784280017604-c7eb21ee002c')],
  'wallpaper-flooring': [
    P('1612764550058-b7ccce95a20e'),
    P('1572319340370-2d2028f4b2bb'),
    P('1560185008-b033106af5c3'),
  ],
  'electrical-lighting': [
    P('1635335874521-7987db781153'),
    P('1576446468729-7674e99608f5'),
    P('1566417110090-6b15a06ec800'),
  ],
  'piping-heating-boiler': [
    P('1650551182991-b07558247564'),
    P('1609213244695-7d6902be89da'),
    P('1538474705339-e87de81450e8'),
  ],
  'tile-marble': [
    P('1656646523907-97b094c7e63a'),
    P('1609946860441-a51ffcf22208'),
    P('1687951276836-06efbfda608b'),
  ],
  'screen-vent-etc': [
    P('1707819056053-c812026680bd'),
    P('1659636770355-38f45919b28d'),
    P('1767032915447-a09b88e07b0c'),
  ],
  // 실외기 사진을 섞어 두면 '실외기 비둘기' 키워드에도 맞는다.
  'pigeon-bird-control': [
    P('1785759189500-d1fae62b1735'),
    P('1758636697712-1b2791d31f18'),
    P('1694675879520-ff32d348fb7f'),
  ],
  general: [
    P('1600585154340-be6161a56a0c'),
    P('1560185008-b033106af5c3'),
    P('1538474705339-e87de81450e8'),
  ],
}
const FALLBACK = [P('1600585154340-be6161a56a0c'), P('1513694203232-719a280e022f')]

// 위에서부터 첫 매치를 쓴다. 순서가 곧 규칙이다:
//   - '문'은 거의 모든 이름에 들어가므로 반드시 마지막에 둔다.
//   - 유리문·중문·자동문은 문이지만 통유리라 glass가 더 맞아서 door보다 앞에 둔다.
//   - '창고문'이 window로 새지 않게 window는 '샷시/창호/창문'만 본다('창고' ≠ '창호').
//   - '현관 롤 방충망'이 '현관' 때문에 door로 새지 않게 방충망을 door보다 앞에 둔다.
//   - '비둘기 방충망 보강'은 방충망보다 비둘기가 먼저다.
const TOPIC_RULES: [string, string[]][] = [
  ['pigeon-bird-control', ['비둘기', '조류']],
  ['stairs', ['계단']],
  ['general', ['집수리', '주택수리', '농가']],
  ['screen-vent-etc', ['방충망', '환풍기']],
  ['glass', ['유리', '거울', '강화도어', '강화유리', '폴딩도어', '자동문', '중문']],
  ['floor', ['마루', '바닥', '장판']],
  ['wallpaper', ['도배', '벽지']],
  ['window', ['샷시', '샤시', '창호', '창문']],
  ['door', ['문', '도어', '현관', '필름', '시트지']],
]

function topicOf(keywordName: string): string | null {
  for (const [topic, words] of TOPIC_RULES) {
    if (words.some((w) => keywordName.includes(w))) return topic
  }
  return null
}

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

/**
 * keywordName을 주면 키워드 주제로, 없으면 분야로 사진을 고른다.
 * 카드 섬네일처럼 키워드가 분명한 자리에서는 반드시 keywordName을 넘겨라.
 */
export function categoryPhoto(
  categorySlug: string,
  seedKey: string,
  slot = 0,
  keywordName?: string,
): CategoryPhoto {
  const topic = keywordName ? topicOf(keywordName) : null
  const pool = (topic && POOL[topic]) || POOL[categorySlug] || FALLBACK
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
