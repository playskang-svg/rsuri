import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { blueprintBg } from '@/lib/blueprint'

export const dynamicParams = false

// 지역이 177곳까지 늘어난다 — 키워드마다 전부 펼치면 이 페이지가 칩 수천 개가 된다.
// 앞쪽만 보여주고 나머지는 키워드 허브로 넘긴다.
const REGION_CHIP_LIMIT = 24

export async function generateStaticParams() {
  const { categories } = await getAllData()
  return categories.map((c) => ({ category: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category: categorySlug } = await params
  const { categories } = await getAllData()
  const category = categories.find((c) => c.slug === categorySlug)
  if (!category) return {}
  return { title: `${category.display_name} 수리 가이드 | 수리위키` }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category: categorySlug } = await params
  const { categories, keywords, pages, regions } = await getAllData()
  const category = categories.find((c) => c.slug === categorySlug)
  if (!category) notFound()

  const { byId } = buildRegionIndex(regions)
  const categoryKeywords = keywords
    .filter((k) => k.category_id === category.id)
    .sort((a, b) => a.menu_order - b.menu_order)

  const landingsByKeyword = new Map<number, { path: string; dong: string }[]>()
  for (const p of pages) {
    if (p.page_type !== 'LANDING' || !isPublished(p) || !p.region_id || !p.repair_keyword_id) continue
    const chain = getAncestorChain(p.region_id, byId)
    if (chain.length === 0) continue
    const list = landingsByKeyword.get(p.repair_keyword_id) ?? []
    list.push({
      path: chain.map((r) => r.slug).join('/'),
      dong: chain[chain.length - 1].display_name,
    })
    landingsByKeyword.set(p.repair_keyword_id, list)
  }

  const otherCategories = categories
    .filter((c) => c.id !== category.id)
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <main>
      <section className="relative border-b border-[var(--line)] bg-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: blueprintBg(category.slug, category.slug) }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <nav aria-label="현재 위치" className="text-[13px] text-[var(--ink-soft)]">
            <Link href="/" className="hover:text-[var(--ink)]">
              수리위키
            </Link>{' '}
            › 수리 분야
          </nav>
          <h1 className="font-serif-kr mt-4 text-3xl font-black sm:text-4xl">
            {category.display_name}
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <ul className="space-y-4">
          {categoryKeywords.map((keyword) => {
            const live = landingsByKeyword.get(keyword.id) ?? []
            const shown = live.slice(0, REGION_CHIP_LIMIT)
            const hidden = live.length - shown.length
            return (
              <li key={keyword.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {/* 지역이 0곳이어도 허브 페이지는 항상 생긴다 — 죽은 회색 텍스트로 두지 않는다 */}
                    <h2 className="text-lg font-extrabold">
                      <Link href={`/${keyword.slug}`} className="hover:text-[var(--copper)]">
                        {keyword.display_name}
                      </Link>
                    </h2>
                    {keyword.description && (
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">{keyword.description}</p>
                    )}
                  </div>
                  {live.length === 0 && (
                    <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] font-bold text-[var(--ink-soft)]">
                      기록 준비 중
                    </span>
                  )}
                </div>
                {shown.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {shown.map((l) => (
                      <Link
                        key={l.path}
                        href={`/${keyword.slug}/${l.path}`}
                        className="rounded-full bg-[var(--teal-soft)] px-3 py-1 text-[13px] font-bold text-[var(--teal)] hover:bg-[var(--teal)] hover:text-white"
                      >
                        {l.dong}
                      </Link>
                    ))}
                    {hidden > 0 && (
                      <Link
                        href={`/${keyword.slug}`}
                        className="text-[13px] font-bold text-[var(--ink-soft)] hover:text-[var(--copper)]"
                      >
                        지역 전체 보기 →
                      </Link>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── 거미줄 링크: 홈 · 다른 분야 ── */}
      <section className="border-t border-[var(--line)] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <p className="eyebrow">More</p>
          <h2 className="font-serif-kr mt-2 text-xl font-black">다른 분야 둘러보기</h2>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {otherCategories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-bold hover:border-[var(--copper)] hover:text-[var(--copper)]"
              >
                {c.display_name}
              </Link>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/#services" className="btn-call">
              수리 항목 전체 보기
            </Link>
            <Link href="/" className="btn-ghost">
              홈으로
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
