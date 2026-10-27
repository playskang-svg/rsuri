import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { PageHero, SectionHead } from '@/app/_components/PageHero'
import '@/app/_styles/sitemap.css'

// 사람이 읽는 사이트맵. 크롤러용 public/sitemap.xml과 짝이지만 목적이 다르다 —
// 이쪽은 방문자가 "이 사이트에 뭐가 있는지" 한 장에서 보고 바로 이동하는 자리다.
//
// 만든 이유: 내비의 '사이트맵'이 #sitemap 해시였는데 그 id를 가진 섹션이
// 지역 상세 페이지에만 있어서, 홈·허브·카테고리에서 누르면 아무 일도 없었다.
//
// 겸사겸사 고아 페이지도 걷어낸다. /category/* 는 서로만 링크하고 있어 다른 어떤
// 페이지에서도 닿지 않았다(sitemap.xml에도 빠져 있었다).
export const metadata: Metadata = {
  title: '사이트맵 — 전체 페이지 한눈에 | 수리위키',
  description:
    '수리위키의 모든 페이지를 수리 분야·지역별 안내·시공 사례로 나눠 정리했습니다. 찾는 항목을 눌러 바로 이동하세요.',
  alternates: { canonical: '/sitemap' },
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 색인 한 줄 — 모노 번호 · 이름 · 메타. 44px 행. */
function LinkRow({ href, label, num, note }: { href: string; label: string; num?: string; note?: string }) {
  return (
    <Link href={href} className="smap-row">
      {num && (
        <span className="smap-num" aria-hidden>
          {num}
        </span>
      )}
      <span className="smap-row-label">{label}</span>
      {note && <span className="smap-note">{note}</span>}
    </Link>
  )
}

export default async function SitemapPage() {
  const { categories, keywords, pages, regions } = await getAllData()
  const { byId } = buildRegionIndex(regions)

  const published = pages.filter(isPublished)

  // 키워드 → 그 키워드로 발행된 지역 페이지들
  const regionsByKeyword = new Map<number, { href: string; name: string; upper: string }[]>()
  for (const p of published) {
    if (p.page_type !== 'LANDING' || !p.region_id || !p.repair_keyword_id) continue
    const kw = keywords.find((k) => k.id === p.repair_keyword_id)
    if (!kw) continue
    const chain = getAncestorChain(p.region_id, byId)
    if (chain.length === 0) continue
    const list = regionsByKeyword.get(kw.id) ?? []
    list.push({
      href: `/${kw.slug}/${chain.map((r) => r.slug).join('/')}`,
      name: chain[chain.length - 1].display_name,
      upper: chain.slice(0, -1).map((r) => r.display_name).join(' '),
    })
    regionsByKeyword.set(kw.id, list)
  }
  for (const list of regionsByKeyword.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }

  // 카테고리별 키워드. 카테고리가 없는 키워드도 흘리지 않도록 마지막에 '기타'로 모은다.
  const keywordsByCategory = new Map<number, typeof keywords>()
  for (const k of keywords) {
    const list = keywordsByCategory.get(k.category_id) ?? []
    list.push(k)
    keywordsByCategory.set(k.category_id, list)
  }
  const categoryBlocks = [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((category) => ({
      category,
      items: (keywordsByCategory.get(category.id) ?? []).sort(
        (a, b) => a.menu_order - b.menu_order || a.display_name.localeCompare(b.display_name, 'ko'),
      ),
    }))
    .filter((b) => b.items.length > 0)

  // 지역 페이지가 실제로 있는 키워드만 지역 색인에 낸다
  const keywordsWithRegions = keywords
    .filter((k) => (regionsByKeyword.get(k.id)?.length ?? 0) > 0)
    .sort(
      (a, b) =>
        (regionsByKeyword.get(b.id)!.length - regionsByKeyword.get(a.id)!.length) ||
        a.display_name.localeCompare(b.display_name, 'ko'),
    )

  const cases = published
    .filter((p) => p.page_type === 'CASE' && p.slug)
    .sort((a, b) => (a.meta_title ?? '').localeCompare(b.meta_title ?? '', 'ko'))

  const regionPageCount = [...regionsByKeyword.values()].reduce((n, l) => n + l.length, 0)
  const totalPages = 1 + keywords.length + categoryBlocks.length + regionPageCount + cases.length

  // 구획 번호는 실제로 그리는 구획에만 01부터 매긴다 — 목차와 본문 머리가 같은 번호를 쓴다.
  const sections = [
    { id: 'by-service', href: '#by-service', label: '수리 분야', count: keywords.length, drawn: true },
    { id: 'by-region', href: '#by-region', label: '지역별 안내', count: regionPageCount, drawn: keywordsWithRegions.length > 0 },
    { id: 'by-category', href: '#by-category', label: '분야 모음', count: categoryBlocks.length, drawn: true },
    { id: 'by-case', href: '#by-case', label: '시공 사례', count: cases.length, drawn: cases.length > 0 },
  ]
    .filter((s) => s.drawn)
    .map((s, i) => ({ ...s, num: pad2(i + 1) }))
  const numOf = (id: string) => sections.find((s) => s.id === id)?.num ?? ''
  const summary = sections.filter((x) => x.count > 0) // 0건이면 #by-case 섹션이 없어 앵커가 헛돈다

  // 수리 분야 색인은 분야를 넘어 01부터 이어 번호를 단다.
  let serial = 0
  const numberedBlocks = categoryBlocks.map(({ category, items }) => ({
    category,
    items: items.map((k) => ({ k, num: pad2(++serial) })),
  }))

  return (
    <main>
      {/* ── 머리말 — 종이 면, 오른쪽에 구획별 페이지 수 ── */}
      <PageHero
        tone="paper"
        above={
          <nav aria-label="현재 위치">
            <ol className="flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-[var(--ink-soft)]">
              <li>
                <Link href="/" className="inline-flex min-h-11 items-center hover:text-[var(--copper)]">
                  수리위키
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li aria-current="page" className="font-bold text-[var(--ink)]">
                사이트맵
              </li>
            </ol>
          </nav>
        }
        eyebrow="사이트맵 · 전체 페이지"
        title={
          <>
            전체 페이지를
            <br />
            한눈에 봅니다.
          </>
        }
        desc={`수리위키에 있는 페이지 ${totalPages.toLocaleString('ko-KR')}개를 수리 분야, 지역별 안내, 시공 사례로 나눠 정리했습니다. 항목을 누르면 그 페이지로 바로 이동합니다.`}
        aside={
          <nav aria-label="구획별 페이지 수" className="panel smap-toc" data-reveal="up">
            <p className="smap-toc-head">
              <span>구획</span>
              <span>페이지</span>
            </p>
            <ol>
              {summary.map((s) => (
                <li key={s.href}>
                  <a href={s.href}>
                    <span className="smap-num" aria-hidden>
                      {s.num}
                    </span>
                    <span className="smap-toc-label">{s.label}</span>
                    <span className="smap-toc-count">{s.count.toLocaleString('ko-KR')}</span>
                  </a>
                </li>
              ))}
            </ol>
            <p className="smap-toc-total">
              <span className="smap-label">홈 포함 전체</span>
              <span className="smap-toc-count">{totalPages.toLocaleString('ko-KR')}</span>
            </p>
          </nav>
        }
      />

      {/* ── 수리 분야 — 분야 블록을 다단으로 ── */}
      <section id="by-service" className="section-y sec-rule scroll-mt-20">
        <div className="wrap">
          <SectionHead
            num={numOf('by-service')}
            label="수리 분야"
            title="분야별 수리 항목"
            desc={`수리 항목 ${keywords.length}종을 분야별로 묶었습니다. 뒤의 숫자는 그 항목에 준비된 지역 안내 페이지 수입니다.`}
          />
          <div className="smap-cols mt-10">
            {numberedBlocks.map(({ category, items }) => (
              <section key={category.id} className="smap-block" data-reveal="up">
                <div className="smap-block-head">
                  <h3>
                    <Link href={`/category/${category.slug}`}>{category.display_name}</Link>
                  </h3>
                  <span className="smap-note">{items.length}종</span>
                </div>
                <ul>
                  {items.map(({ k, num }) => {
                    const n = regionsByKeyword.get(k.id)?.length ?? 0
                    return (
                      <li key={k.id}>
                        <LinkRow href={`/${k.slug}`} num={num} label={k.display_name} note={n > 0 ? `${n}곳` : undefined} />
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>

      {/* ── 지역별 안내 ──
          한 번에 펼치면 화면이 링크 벽이 된다. 키워드별로 접어 두되
          details는 닫혀 있어도 링크가 HTML에 남으므로 크롤러는 전부 읽는다. */}
      {keywordsWithRegions.length > 0 && (
        <section id="by-region" className="section-y sec-rule scroll-mt-20">
          <div className="wrap">
            <SectionHead
              num={numOf('by-region')}
              label="지역별 안내"
              title="항목별 지역 안내"
              desc={`수리 항목을 펼치면 그 항목의 지역 페이지 전체가 나옵니다. 모두 ${regionPageCount.toLocaleString('ko-KR')}개입니다.`}
            />
            <div className="smap-folds mt-10" data-reveal="stagger" style={{ ['--stagger' as string]: '40ms' }}>
              {keywordsWithRegions.map((k, i) => {
                const list = regionsByKeyword.get(k.id)!
                return (
                  <details key={k.id} className="area-fold smap-fold" style={{ ['--i' as string]: i }}>
                    <summary>
                      <span className="smap-fold-head">
                        <span className="smap-num" aria-hidden>
                          {pad2(i + 1)}
                        </span>
                        <span>{k.display_name}</span>
                      </span>
                      <span className="smap-note">{list.length}곳</span>
                    </summary>
                    <div className="smap-fold-body">
                      <Link href={`/${k.slug}`} className="smap-fold-hub">
                        {k.display_name} 대표 페이지 →
                      </Link>
                      <ul className="smap-list">
                        {list.map((r) => (
                          <li key={r.href}>
                            <LinkRow href={r.href} label={`${r.name} ${k.display_name}`} note={r.upper || undefined} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── 분야 모음 (카테고리 페이지) ── */}
      <section id="by-category" className="section-y sec-rule scroll-mt-20">
        <div className="wrap">
          <SectionHead
            num={numOf('by-category')}
            label="분야 모음"
            title="분야 모음 페이지"
            desc="한 분야에 속한 수리 항목을 모아 보는 페이지입니다."
          />
          <ul className="smap-tiles mt-10" data-reveal="stagger" style={{ ['--stagger' as string]: '50ms' }}>
            {categoryBlocks.map(({ category, items }, i) => (
              <li key={category.id} style={{ ['--i' as string]: i }}>
                <Link href={`/category/${category.slug}`} className="smap-tile">
                  <span className="smap-num" aria-hidden>
                    {pad2(i + 1)}
                  </span>
                  <span className="smap-tile-name">{category.display_name}</span>
                  <span className="smap-note">항목 {items.length}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 시공 사례 ── */}
      {cases.length > 0 && (
        <section id="by-case" className="section-y sec-rule scroll-mt-20">
          <div className="wrap">
            <SectionHead
              num={numOf('by-case')}
              label="시공 사례"
              title="시공 사례 기록"
              desc={`전·후 사진과 함께 정리한 기록 ${cases.length}건입니다.`}
            />
            <ul className="smap-list mt-10" data-reveal="up">
              {cases.map((c, i) => (
                <li key={c.id}>
                  <LinkRow href={`/case/${c.slug}`} num={pad2(i + 1)} label={c.meta_title ?? c.slug ?? ''} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── 기계용 사이트맵 안내 ── */}
      <div className="sec-rule">
        <div className="wrap py-8">
          <p className="smap-xml">
            검색엔진용 XML 사이트맵은{' '}
            <a href="/sitemap.xml">/sitemap.xml</a>
            에 있습니다.
          </p>
        </div>
      </div>
    </main>
  )
}
