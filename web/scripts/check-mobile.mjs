// 모바일 레이아웃 검증 — docs/RENEWAL_INSTRUCTIONS.md 8번 기준.
//
// 지시문 8번은 "검증은 실제 렌더 기준으로 한다"고 못박는다. CSS를 눈으로 읽어서는
// 탭 타깃이 몇 px인지, 어디가 옆으로 넘치는지 알 수 없다 — 실제로 그려서 재야 한다.
//
// 쓰는 법:
//   SURIWIKI_FIXTURES=1 npm run build      # DB 없이 out/ 생성 (lib/fixtures.ts)
//   npx serve out -l 8765                   # 또는: python3 -m http.server 8765 -d out
//   npm i -D playwright && node scripts/check-mobile.mjs
//
// playwright는 devDependency에 넣지 않았다. 이 검사는 레이아웃을 손볼 때만 돌리는데,
// 브라우저까지 받는 무게를 모든 npm ci에 얹을 이유가 없다. 필요할 때 설치한다.
// 브라우저가 다른 경로에 있으면 CHROMIUM_PATH로 지정한다.
//
// 검사 항목
//   - 가로 스크롤: 페이지 본문이 옆으로 밀리는가, 밀린다면 어느 요소 때문인가
//   - 본문 크기·행간: 모바일에서 16px / 1.6 이상인가
//   - 탭 타깃: 실제로 눌리는 세로 영역이 44px 이상인가
//   - 하단 고정 상담바가 본문 마지막을 가리는가
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:8765'
const SHOTS = process.env.SHOTS ?? '.mobile-shots'
mkdirSync(SHOTS, { recursive: true })

const WIDTHS = [360, 390, 768, 1280]
const PAGES = [
  ['home', '/index.html'],
  ['hub', '/door-repair.html'],
  ['landing', '/door-repair/seoul/mapo-gu.html'],
  ['case', '/case/fixture-case-door-sag.html'],
  ['sitemap', '/sitemap.html'],
]

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
)
const findings = []

for (const width of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
    isMobile: width < 768,
    hasTouch: width < 768,
  })
  const page = await ctx.newPage()

  // 폰트 CDN이 이 환경에서 막혀 있어 networkidle이 매번 타임아웃까지 간다.
  // 요청을 즉시 끊고 시스템 폰트로 렌더링한다 — 실제 사이트가 폰트 로드에
  // 실패했을 때와 같은 상태라, 레이아웃 검증으로는 오히려 보수적이다.
  await page.route('**', (route) => {
    const url = route.request().url()
    if (url.startsWith('http://127.0.0.1')) return route.continue()
    return route.abort()
  })

  for (const [name, path] of PAGES) {
    await page.waitForTimeout(0)
    const res = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 20000 })
    if (!res || res.status() >= 400) {
      findings.push({ width, name, kind: 'load', detail: `HTTP ${res?.status()}` })
      continue
    }

    const report = await page.evaluate((vw) => {
      const out = { overflow: null, small: [], body: null, covered: null }

      // 1) 가로 스크롤. 페이지 본문이 옆으로 밀리면 안 된다.
      const de = document.documentElement
      if (de.scrollWidth > vw + 1) {
        // 실제로 넘치는 요소를 찾는다 — "어딘가 넘친다"만으로는 못 고친다.
        const guilty = []
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          if (r.right > vw + 1 || r.left < -1) {
            const style = getComputedStyle(el)
            if (style.position === 'fixed') continue
            guilty.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.className && String(el.className).slice(0, 70)) || '',
              right: Math.round(r.right),
              width: Math.round(r.width),
              text: (el.textContent || '').trim().slice(0, 40),
            })
          }
        }
        // 가장 안쪽(자식이 없는) 것만 남긴다 — 부모는 자식 때문에 넘친 것이다.
        const inner = guilty.filter(
          (g, i) => !guilty.some((o, j) => i !== j && o.right >= g.right && o.width < g.width),
        )
        out.overflow = { scrollWidth: de.scrollWidth, viewport: vw, elements: inner.slice(0, 6) }
      }

      // 2) 본문 크기·행간
      const bs = getComputedStyle(document.body)
      out.body = {
        fontSize: parseFloat(bs.fontSize),
        lineHeight: parseFloat(bs.lineHeight) / parseFloat(bs.fontSize),
      }

      // 3) 탭 타깃 — 실제로 눌리는 영역을 잰다.
      //
      // getBoundingClientRect()는 ::after로 넓힌 히트 영역을 세지 않는다. 요소의 박스만
      // 보고 판정하면 .tap44가 붙어 실제로는 44px인 것까지 미달로 나온다. 그래서
      // elementFromPoint로 "그 지점을 누르면 이 요소가 잡히는가"를 직접 확인한다.
      //
      // 세로 44px만 요구한다. 가로는 텍스트 길이를 따르는 게 자연스럽고, 두 글자 링크를
      // 폭 44로 늘리면 글자 사이가 벌어져 오히려 읽기 나빠진다. 스크롤 방향이 세로라
      // 오조작도 세로에서 생긴다.
      if (vw < 768) {
        const NEED = 44
        const seen = new Set()
        const hits = (x, y, el) => {
          const found = document.elementFromPoint(x, y)
          return !!found && (found === el || el.contains(found) || found.contains(el))
        }
        for (const el of document.querySelectorAll('a[href], button, summary, input')) {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          if (r.top < 0 || r.bottom > window.innerHeight) continue // 화면 밖은 판정 불가
          // 닫힌 <details> 안(햄버거 메뉴·브레드크럼 패널)은 지금 누를 수 없다.
          // 레이아웃 상자는 계산되지만 화면에 없어서, 히트 테스트가 그 위를 덮은
          // 다른 요소를 잡아 전부 미달로 나온다 — 거짓 양성이다.
          const holder = el.closest('details')
          if (holder && !holder.open && !holder.contains(el.closest('summary'))) continue
          if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
            continue
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          // 중심에서 위아래로 22px씩 — 둘 다 이 요소가 잡히면 세로 44px이 확보된 것이다.
          const reach = (NEED - 1) / 2
          if (hits(cx, cy - reach, el) && hits(cx, cy + reach, el)) continue
          const label = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 32)
          const key = `${el.tagName}:${label}:${Math.round(r.width)}x${Math.round(r.height)}`
          if (seen.has(key)) continue
          seen.add(key)
          out.small.push({
            tag: el.tagName.toLowerCase(),
            label,
            w: Math.round(r.width),
            h: Math.round(r.height),
            cls: (el.className && String(el.className).slice(0, 60)) || '',
          })
        }
      }

      // 4) 하단 고정 상담바가 본문 마지막을 가리는가
      const bar = document.querySelector('.callbar')
      if (bar && vw < 768) {
        // scroll-behavior:smooth가 걸려 있어 scrollTo가 애니메이션된다.
        // 'instant'를 명시하지 않으면 이동 전 좌표를 재게 된다.
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })
        // 상담바는 main 안에 있지만 position:fixed라 문서 흐름에서 빠져 있다.
        // 실제로 가리는지는 "마지막으로 보이는 콘텐츠"와 바 윗변을 비교해야 안다.
        const last = document.querySelector('main > *:not(.callbar):last-of-type')
        const target = last ?? document.querySelector('main')
        if (target) {
          out.covered = Math.max(
            0,
            Math.round(target.getBoundingClientRect().bottom - bar.getBoundingClientRect().top),
          )
        }
        window.scrollTo({ top: 0, behavior: 'instant' })
      }

      return out
    }, width)

    if (report.overflow) findings.push({ width, name, kind: 'overflow', detail: report.overflow })
    if (report.body.fontSize < 16 && width < 768)
      findings.push({ width, name, kind: 'font', detail: `본문 ${report.body.fontSize}px` })
    if (report.body.lineHeight < 1.6 && width < 768)
      findings.push({ width, name, kind: 'leading', detail: `행간 ${report.body.lineHeight.toFixed(2)}` })
    if (report.small.length)
      findings.push({ width, name, kind: 'tap', detail: report.small.slice(0, 10) })
    if (report.covered) findings.push({ width, name, kind: 'covered', detail: `${report.covered}px 가림` })

    if (width === 390 || width === 1280) {
      await page.screenshot({ path: `${SHOTS}/${name}-${width}.png`, fullPage: false })
    }
  }
  await ctx.close()
}

await browser.close()

if (!findings.length) {
  console.log('모든 폭에서 문제 없음.')
} else {
  console.log(`발견 ${findings.length}건\n`)
  for (const f of findings) {
    console.log(`[${f.width}px] ${f.name} — ${f.kind}`)
    console.log(typeof f.detail === 'string' ? `  ${f.detail}` : JSON.stringify(f.detail, null, 2).split('\n').map((l) => '  ' + l).join('\n'))
    console.log()
  }
}
