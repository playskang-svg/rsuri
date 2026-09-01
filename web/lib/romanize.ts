// 자유 입력 지역명(한글)을 URL 슬러그로 바꾼다.
//
// 왜 필요한가: 관리 화면에서 만든 지역은 그대로 URL 경로가 된다
// (/{키워드}/{지역슬러그}). 타임스탬프 슬러그(custom-1788251196-4821)를 쓰면
// 검색 결과에 의미 없는 주소가 노출되는데, 이 사이트는 검색 노출이 존재 이유다.
// '천안 불당' → 'cheonan-buldang'.
//
// 국어의 로마자 표기법(개정)을 음절 단위로 적용한다. 음운 변화(자음동화 등)는
// 반영하지 않는다 — 슬러그는 사람이 읽을 수 있으면 충분하고, 규칙이 단순해야
// 같은 이름이 항상 같은 슬러그로 떨어진다.

const INITIALS = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's',
  'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h',
]

const MEDIALS = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa',
  'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i',
]

const FINALS = [
  '', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k',
  'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't',
  't', 'ng', 't', 't', 'k', 't', 'p', 't',
]

const HANGUL_BASE = 0xac00
const HANGUL_LAST = 0xd7a3

export function romanizeKorean(input: string): string {
  let out = ''
  for (const ch of input) {
    const code = ch.codePointAt(0)!
    if (code >= HANGUL_BASE && code <= HANGUL_LAST) {
      const offset = code - HANGUL_BASE
      out += INITIALS[Math.floor(offset / 588)]
      out += MEDIALS[Math.floor((offset % 588) / 28)]
      out += FINALS[offset % 28]
    } else {
      out += ch
    }
  }
  return out
}

/** 로마자화 후 URL에 쓸 수 있는 형태로 정리한다. 비면 빈 문자열을 준다. */
export function toSlug(name: string): string {
  return romanizeKorean(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
