// 카테고리별 블루프린트 배경 패턴 (inline SVG data URI).
//
// 실제 시공 사진이 아직 없어서(원본 데이터의 beforeImg/afterImg가 빈 값) 가짜 사진을
// 넣는 대신, 공종을 상징하는 도면풍 라인 패턴을 은은한 배경 텍스처로 쓴다.
// 페이지(slug) 해시로 패턴 각도·간격을 조금씩 틀어 페이지끼리 완전히 같은
// 비주얼이 반복되지 않게 한다. 실제 사진이 들어오면 suri_page_images가 이 자리를 대체.

const STROKE = '%2314666d' // --teal, URI-encoded '#14666d'

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// 카테고리 slug → 반복 타일 하나를 그리는 SVG 조각
const TILES: Record<string, (s: number) => string> = {
  'kitchen-sink': (s) =>
    `<path d='M8 ${18 + s} h24 M20 ${18 + s} v14 q0 6 8 6' fill='none' stroke='${STROKE}' stroke-width='1.4'/>`,
  'leak-waterproof': (s) =>
    `<path d='M6 ${30 + s} q7-12 14 0 q7 12 14 0 M6 ${14 + s} q7-12 14 0' fill='none' stroke='${STROKE}' stroke-width='1.4'/>`,
  'bathroom-toilet': (s) =>
    `<rect x='8' y='${10 + s}' width='14' height='14' rx='3' fill='none' stroke='${STROKE}' stroke-width='1.4'/><circle cx='32' cy='${30 + s}' r='6' fill='none' stroke='${STROKE}' stroke-width='1.4'/>`,
  'door-window-sash': (s) =>
    `<rect x='7' y='${7 + s}' width='30' height='26' fill='none' stroke='${STROKE}' stroke-width='1.4'/><line x1='22' y1='${7 + s}' x2='22' y2='${33 + s}' stroke='${STROKE}' stroke-width='1.4'/>`,
  'wallpaper-flooring': (s) =>
    `<path d='M4 ${12 + s} h36 M4 ${26 + s} h36 M14 ${12 + s} v14 M30 ${26 + s} v14' stroke='${STROKE}' stroke-width='1.2'/>`,
  'electrical-lighting': (s) =>
    `<path d='M10 ${8 + s} h10 l-6 12 h12 l-16 18 5-14 h-9 z' fill='none' stroke='${STROKE}' stroke-width='1.3' stroke-linejoin='round'/>`,
  'piping-heating-boiler': (s) =>
    `<path d='M6 ${12 + s} h16 q6 0 6 6 v8 q0 6 6 6 h8' fill='none' stroke='${STROKE}' stroke-width='1.6'/><circle cx='6' cy='${12 + s}' r='2.5' fill='${STROKE}'/>`,
  'tile-marble': (s) =>
    `<path d='M2 ${20 + s} h40 M22 ${2 + s} v18 M12 ${20 + s} v18 M32 ${20 + s} v18' stroke='${STROKE}' stroke-width='1.2'/>`,
  'screen-vent-etc': (s) =>
    `<path d='M6 ${8 + s} h32 M6 ${16 + s} h32 M6 ${24 + s} h32 M6 ${32 + s} h32' stroke='${STROKE}' stroke-width='1'/>`,
}

export function blueprintBg(categorySlug: string, seedKey: string): string {
  const tile = TILES[categorySlug] ?? TILES['piping-heating-boiler']
  const h = hashCode(seedKey)
  const shift = h % 5 // 타일 내부 오프셋
  const size = 44 + (h % 3) * 6 // 44/50/56 — 페이지마다 밀도 변화
  const angle = (h % 7) - 3 // -3° ~ +3°
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 44 44'>` +
    `<g transform='rotate(${angle} 22 22)' opacity='0.55'>${tile(shift)}</g></svg>`
  return `url("data:image/svg+xml,${svg}")`
}
