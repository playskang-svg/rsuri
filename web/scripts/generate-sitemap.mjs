// web/scripts/generate-sitemap.mjs
//
// keyword-tree 스킬에서 확인된 함정: Next.js 14.2.x의 app/sitemap.ts는
// output:'export'와 조합하면 실제로 깨진다(루트 sitemap.xml 미생성 또는 빌드 에러 —
// vercel/next.js #77304, #61969). 그래서 프레임워크 컨벤션 대신 빌드 전에
// public/sitemap.xml을 직접 써낸다. package.json의 build 스크립트가 next build보다
// 먼저 이 스크립트를 실행한다.
//
// public/rss.xml도 여기서 같이 만든다. 같은 데이터로 같은 주소를 만드는 일이라
// 스크립트를 나누면 두 곳의 URL 규칙이 어긋날 수 있다. 정적 export라 DB만 바뀌어도
// 재빌드 때마다 새로 구워지고, 한 번 만들어 커밋하는 방식이면 곧 낡은 피드가 된다.

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'

// 2026-09-11부터 사이트 구조의 원본은 DB가 아니라 저장소 파일이다. 페이지를 굽는 next build와
// 같은 파일(lib/site-data.json — scripts/build-site-data.mjs가 생성)을 읽어야 사이트맵과
// 실제 페이지 집합이 어긋나지 않는다.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://suriwiki.com'

// DB 없이 화면만 확인하는 빌드(SURIWIKI_FIXTURES=1)에서는 사이트맵을 만들지 않는다.
// fixtures의 가짜 URL로 사이트맵을 써 버리면 그게 out/에 남아 실제 배포에 섞일 수 있다.
if (process.env.SURIWIKI_FIXTURES === '1') {
  console.log('SURIWIKI_FIXTURES=1 — 사이트맵·RSS 생성을 건너뛴다(화면 검증용 빌드).')
  process.exit(0)
}

const siteData = JSON.parse(readFileSync(new URL('../lib/site-data.json', import.meta.url), 'utf8'))

function ancestorSlugs(regionId, byId) {
  const chain = []
  let current = byId.get(regionId)
  while (current) {
    chain.unshift(current.slug)
    current = current.parent_id != null ? byId.get(current.parent_id) : undefined
  }
  return chain
}

function isPublished(page) {
  return page.decision === 'CREATE' || page.decision === 'UPDATE'
}

// 피드는 새 글을 알리는 용도라 최근 글만 싣는다. 전체 목록은 sitemap.xml이 맡는다.
// 지역×키워드 페이지가 수천 개로 늘어도 피드가 수 MB가 되지 않게 끊는다.
const RSS_ITEM_LIMIT = 100

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildRss(items) {
  const now = new Date().toUTCString()
  const body = items
    .map(
      (it) =>
        '    <item>\n' +
        `      <title>${escapeXml(it.title)}</title>\n` +
        `      <link>${escapeXml(it.link)}</link>\n` +
        `      <guid isPermaLink="true">${escapeXml(it.link)}</guid>\n` +
        `      <description>${escapeXml(it.description)}</description>\n` +
        (it.category ? `      <category>${escapeXml(it.category)}</category>\n` : '') +
        `      <pubDate>${it.date.toUTCString()}</pubDate>\n` +
        '    </item>',
    )
    .join('\n')

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n' +
    '  <channel>\n' +
    '    <title>수리위키 — 우리 동네 집수리</title>\n' +
    `    <link>${SITE_URL}/</link>\n` +
    '    <description>문·문틀·문지방·필름·계단·마루·도배, 지역별 보수·복원 안내</description>\n' +
    '    <language>ko-KR</language>\n' +
    `    <lastBuildDate>${now}</lastBuildDate>\n` +
    `    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />\n` +
    body +
    '\n  </channel>\n' +
    '</rss>\n'
  )
}

// 페이지에 수정 시각이 따로 없어 빌드 시각을 쓴다. 날짜를 매번 새로 찍으면 피드 리더가
// 전 글을 새 글로 보지만, 피드는 최근 100건만 싣고 guid(주소)가 그대로라 중복으로 잡히지 않는다.
const BUILD_DATE = new Date()

async function main() {
  const { regions, categories, keywords, pages } = siteData
  const byId = new Map(regions.map((r) => [r.id, r]))
  const keywordSlugById = new Map(keywords.map((k) => [k.id, k.slug]))
  const keywordById = new Map(keywords.map((k) => [k.id, k]))
  const categoryNameById = new Map(categories.map((c) => [c.id, c.display_name]))
  const rssItems = []

  // 제목·설명은 각 페이지 generateMetadata와 같은 필드를 쓴다 — 피드와 실제 페이지가
  // 다른 제목을 달면 검색엔진이 둘을 다른 문서로 본다.
  const addRssItem = (page, link) => {
    const kw = page.repair_keyword_id ? keywordById.get(page.repair_keyword_id) : undefined
    const categoryId = page.category_id ?? kw?.category_id
    rssItems.push({
      id: page.id,
      title: page.meta_title || kw?.display_name || '수리위키',
      link,
      description: page.meta_description || '',
      category: categoryId != null ? categoryNameById.get(categoryId) : undefined,
      date: page.updated_at || page.created_at ? new Date(page.updated_at || page.created_at) : BUILD_DATE,
    })
  }

  // 고정 페이지 — 데이터와 무관하게 항상 있는 주소
  const urls = new Set([`${SITE_URL}/`, `${SITE_URL}/sitemap`])

  for (const kw of keywords) {
    urls.add(`${SITE_URL}/${kw.slug}`)
  }

  // 카테고리 페이지는 서로만 링크하고 있어 어디서도 닿지 않는 고아였고 여기서도 빠져
  // 있었다. 이제 /sitemap이 전부 링크하지만, 색인 제출 대상에도 넣어 둔다.
  // 키워드가 하나도 없는 카테고리(general)는 빈 페이지라 색인에 올리지 않는다 —
  // /sitemap 페이지가 링크하는 목록과 같은 기준이다.
  for (const category of categories) {
    if (!keywords.some((k) => k.category_id === category.id)) continue
    urls.add(`${SITE_URL}/category/${category.slug}`)
  }

  for (const page of pages) {
    if (!isPublished(page)) continue
    if (page.page_type === 'LANDING' && page.region_id && page.repair_keyword_id) {
      const kw = keywordSlugById.get(page.repair_keyword_id)
      const path = ancestorSlugs(page.region_id, byId)
      if (kw && path.length > 0) {
        const link = `${SITE_URL}/${kw}/${path.join('/')}`
        urls.add(link)
        addRssItem(page, link)
      }
    } else if (page.page_type === 'CASE' && page.slug) {
      const link = `${SITE_URL}/case/${page.slug}`
      urls.add(link)
      addRssItem(page, link)
    } else if ((page.page_type === 'WIKI' || page.page_type === 'TOPIC') && page.slug) {
      urls.add(`${SITE_URL}/wiki/${page.slug}`)
    }
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...urls].map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    '\n</urlset>\n'

  mkdirSync('public', { recursive: true })
  writeFileSync('public/sitemap.xml', xml)
  console.log(`sitemap.xml 생성 완료 (${urls.size}개 URL)`)

  // /wiki/*는 라우트가 아직 app/_pending에 있어 실제 페이지가 없다 — 피드에는 싣지 않는다.
  // 날짜가 같으면 id 역순으로 끊어 빌드마다 같은 결과가 나오게 한다.
  rssItems.sort((a, b) => b.date - a.date || b.id - a.id)
  const feed = rssItems.slice(0, RSS_ITEM_LIMIT)
  writeFileSync('public/rss.xml', buildRss(feed))
  console.log(`rss.xml 생성 완료 (${feed.length}/${rssItems.length}개 글)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
