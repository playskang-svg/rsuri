// 디자인 토큰 명도대비 검사.
//
// 색을 고칠 때마다 손으로 대비를 재는 건 불가능하고, 눈으로는 통과 여부를 못 맞힌다.
// 실제로 이번 리뉴얼에서 "골드 바탕 + 흰 글자"가 2.43:1로 WCAG AA에 한참 못 미쳤는데
// 화면으로는 멀쩡해 보였다. 그 조합이 CTA 버튼이었다.
//
// app/globals.css의 :root 토큰을 읽어 실제로 화면에 붙는 조합만 검사한다.
// 조합 목록은 아래 PAIRS에 있다 — 새 조합을 쓰기 시작하면 여기에 추가한다.
//
//   node scripts/check-contrast.mjs

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CSS = resolve(HERE, '../app/globals.css')

const AA_BODY = 4.5 // 본문
const AA_LARGE = 3.0 // 24px 이상 또는 19px 이상 굵은 글씨

function parseTokens(css) {
  const root = css.match(/:root\s*\{([\s\S]*?)\}/)
  if (!root) throw new Error('globals.css에서 :root 블록을 찾지 못했다')
  const tokens = {}
  for (const [, name, value] of root[1].matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens[name] = value
  }
  return tokens
}

function channel(c) {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a, b) {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// [설명, 글자, 바탕, 큰글씨여도 되는지]
const PAIRS = [
  ['본문 / 배경', 'ink', 'paper', false],
  ['본문 / 카드', 'ink', 'card', false],
  ['보조 텍스트 / 배경', 'ink-soft', 'paper', false],
  ['보조 텍스트 / 카드', 'ink-soft', 'card', false],
  ['강조 텍스트(골드 잉크) / 배경', 'copper', 'paper', false],
  ['강조 텍스트(골드 잉크) / 카드', 'copper', 'card', false],
  ['강조 hover / 배경', 'copper-deep', 'paper', false],
  ['eyebrow·포커스링 / 배경', 'teal', 'paper', false],
  ['CTA 글자 / CTA 바탕', 'ink-deep', 'gold', false],
  ['CTA 글자 / CTA hover 바탕', 'ink-deep', 'gold-deep', false],
  ['어두운 면 위 본문', 'on-ink', 'ink', false],
  ['어두운 면 위 보조', 'on-ink-soft', 'ink', false],
  ['어두운 면 위 골드 강조', 'gold', 'ink', false],
  ['어두운 면 위 흰 글자', 'card', 'ink', false],
  ['팁 박스 글자 / 팁 바탕', 'tip-ink', 'tip-bg', false],
  ['경고 글자 / 경고 바탕', 'danger-ink', 'danger-bg', false],
]

const tokens = parseTokens(readFileSync(CSS, 'utf8'))
let failed = 0

console.log(`디자인 토큰 명도대비 — ${Object.keys(tokens).length}개 토큰\n`)

for (const [label, fgName, bgName, large] of PAIRS) {
  const fg = tokens[fgName]
  const bg = tokens[bgName]
  if (!fg || !bg) {
    console.log(`?  토큰 없음: --${fgName} / --${bgName}  (${label})`)
    failed += 1
    continue
  }
  const ratio = contrast(fg, bg)
  const need = large ? AA_LARGE : AA_BODY
  const pass = ratio >= need
  if (!pass) failed += 1
  const aaa = ratio >= 7 ? ' AAA' : ''
  console.log(
    `${pass ? 'OK ' : 'X  '}${ratio.toFixed(2).padStart(5)}:1  ${label.padEnd(32)}` +
      `${fg} on ${bg}${aaa}`,
  )
}

console.log()
if (failed > 0) {
  console.error(`${failed}개 조합이 WCAG AA(본문 ${AA_BODY}:1)에 미달한다.`)
  process.exit(1)
}
console.log('모든 조합이 WCAG AA를 넘는다.')
