import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { blueprintBg } from '@/lib/blueprint'

export const dynamicParams = false

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
            return (
              <li key={keyword.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-extrabold">
                      {live.length > 0 ? (
                        <Link href={`/${keyword.slug}`} className="hover:text-[var(--copper)]">
                          {keyword.display_name}
                        </Link>
                      ) : (
                        <span className="text-[var(--ink-soft)]">{keyword.display_name}</span>
                      )}
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
                {live.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {live.map((l) => (
                      <Link
                        key={l.path}
                        href={`/${keyword.slug}/${l.path}`}
                        className="rounded-full bg-[var(--teal-soft)] px-3 py-1 text-[13px] font-bold text-[var(--teal)] hover:bg-[var(--teal)] hover:text-white"
                      >
                        {l.dong}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
