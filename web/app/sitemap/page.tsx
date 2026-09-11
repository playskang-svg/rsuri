import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { PageHero } from '@/app/_components/PageHero'

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

/** 목록 링크 한 줄. 개수가 많아 한 칸을 최대한 얇게 쓴다. */
function LinkRow({ href, label, note }: { href: string; label: string; note?: string }) {
  return (
    <Link
      href={href}
      className="flex items-baseline justify-between gap-2 rounded-md px-2.5 py-3 text-[14px] font-semibold sm:py-1.5 hover:bg-[var(--teal-soft)] hover:text-[var(--teal)]"
    >
      <span className="min-w-0 truncate">{label}</span>
      {note && <span className="flex-none text-[12px] font-bold text-[var(--ink-soft)]">{note}</span>}
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

  // 지역 페이지가 실제로 있는 키워드만 지역 색인에 낸다 (현재 10종 / 194페이지)
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

  const summary = [
    { label: '수리 분야', count: keywords.length, href: '#by-service' },
    { label: '지역별 안내', count: regionPageCount, href: '#by-region' },
    { label: '분야 모음', count: categoryBlocks.length, href: '#by-category' },
    { label: '시공 사례', count: cases.length, href: '#by-case' },
  ]

  return (
    <main>
      {/* ── 머리말 — 머스터드 색 블록, 오른쪽에 구획별 페이지 수 ── */}
      <PageHero
        tone="yellow"
        above={
          <nav aria-label="현재 위치" className="mb-5 text-[13px] text-[var(--ink-soft)]">
            <Link href="/" className="hover:text-[var(--ink)]">
              수리위키
            </Link>
            {' › '}
            <span className="font-bold text-[var(--ink)]">사이트맵</span>
          </nav>
        }
        eyebrow="Sitemap / All Pages"
        title={
          <>
            전체 페이지를
            <br />
            한눈에 봅니다.
          </>
        }
        desc={`수리위키에 있는 페이지 ${totalPages.toLocaleString('ko-KR')}개를 수리 분야, 지역별 안내, 시공 사례로 나눠 정리했습니다. 항목을 누르면 그 페이지로 바로 이동합니다.`}
        tags={[`${totalPages.toLocaleString('ko-KR')} Pages`, 'Board Index']}
        aside={
          <ul className="grid grid-cols-2 gap-3">
            {summary.map((s) => (
              <li key={s.href}>
                <a href={s.href} className="block bg-white px-4 py-5 transition-colors hover:bg-[var(--paper)]">
                  <span className="eyebrow block">{s.label}</span>
                  <span className="mt-3 block text-3xl font-black tracking-[-0.04em]">
                    {s.count.toLocaleString('ko-KR')}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        }
      />

      {/* ── 수리 분야 ── */}
      <section id="by-service" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-serif-kr text-2xl font-black sm:text-3xl">수리 분야</h2>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          수리 항목 {keywords.length}종을 분야별로 묶었습니다. 뒤의 숫자는 그 항목에 준비된
          지역 안내 페이지 수입니다.
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {categoryBlocks.map(({ category, items }) => (
            <section key={category.id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--line)] pb-3">
                <h3 className="font-serif-kr text-lg font-black">
                  <Link href={`/category/${category.slug}`} className="tap44 hover:text-[var(--copper)]">
                    {category.display_name}
                  </Link>
                </h3>
                <span className="text-[12px] font-bold text-[var(--ink-soft)]">
                  {items.length}종
                </span>
              </div>
              <ul className="mt-2 grid gap-0.5 sm:grid-cols-2">
                {items.map((k) => {
                  const n = regionsByKeyword.get(k.id)?.length ?? 0
                  return (
                    <li key={k.id}>
                      <LinkRow
                        href={`/${k.slug}`}
                        label={k.display_name}
                        note={n > 0 ? `${n}곳` : undefined}
                      />
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </section>

      {/* ── 지역별 안내 ──
          194페이지를 한 번에 펼치면 화면이 링크 벽이 된다. 키워드별로 접어 두되
          details는 닫혀 있어도 링크가 HTML에 남으므로 크롤러는 전부 읽는다. */}
      {keywordsWithRegions.length > 0 && (
        <section id="by-region" className="scroll-mt-20 border-t border-[var(--line)] bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 className="font-serif-kr text-2xl font-black sm:text-3xl">지역별 안내</h2>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              수리 항목을 펼치면 그 항목의 지역 페이지 전체가 나옵니다. 모두{' '}
              {regionPageCount.toLocaleString('ko-KR')}개입니다.
            </p>

            <div className="mt-7 border-t border-[var(--line)]">
              {keywordsWithRegions.map((k) => {
                const list = regionsByKeyword.get(k.id)!
                return (
                  <details key={k.id} className="area-fold">
                    <summary>
                      <span>
                        {k.display_name}{' '}
                        <span className="text-[13px] font-semibold text-[var(--ink-soft)]">
                          {list.length}곳
                        </span>
                      </span>
                    </summary>
                    <div className="pb-5">
                      <Link
                        href={`/${k.slug}`}
                        className="inline-block px-2.5 pb-2 text-[13px] font-extrabold text-[var(--teal)] hover:underline"
                      >
                        {k.display_name} 대표 페이지 →
                      </Link>
                      <ul className="grid gap-0.5 sm:grid-cols-2 lg:grid-cols-3">
                        {list.map((r) => (
                          <li key={r.href}>
                            <LinkRow
                              href={r.href}
                              label={`${r.name} ${k.display_name}`}
                              note={r.upper || undefined}
                            />
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
      <section id="by-category" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-serif-kr text-2xl font-black sm:text-3xl">분야 모음</h2>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          한 분야에 속한 수리 항목을 모아 보는 페이지입니다.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2.5">
          {categoryBlocks.map(({ category, items }) => (
            <li key={category.id}>
              <Link
                href={`/category/${category.slug}`}
                className="inline-flex items-baseline gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-3 text-sm font-bold sm:py-2 hover:border-[var(--copper)] hover:text-[var(--copper)]"
              >
                {category.display_name}
                <span className="text-[12px] font-semibold text-[var(--ink-soft)]">
                  {items.length}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 시공 사례 ── */}
      {cases.length > 0 && (
        <section id="by-case" className="scroll-mt-20 border-t border-[var(--line)] bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 className="font-serif-kr text-2xl font-black sm:text-3xl">시공 사례</h2>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              전·후 사진과 함께 정리한 기록 {cases.length}건입니다.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cases.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/case/${c.slug}`}
                    className="block rounded-xl border border-[var(--line)] bg-[var(--paper)] px-5 py-4 text-[15px] font-bold hover:border-[var(--copper)] hover:text-[var(--copper)]"
                  >
                    {c.meta_title ?? c.slug}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── 기계용 사이트맵 안내 ── */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <p className="text-[13px] text-[var(--ink-soft)]">
          검색엔진용 XML 사이트맵은{' '}
          <a href="/sitemap.xml" className="font-bold text-[var(--teal)] hover:underline">
            /sitemap.xml
          </a>
          에 있습니다.
        </p>
      </section>
    </main>
  )
}
