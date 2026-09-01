import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { blueprintBg } from '@/lib/blueprint'

export const dynamicParams = false

export async function generateStaticParams() {
  const { keywords, pages } = await getAllData()
  const publishedKeywordIds = new Set(
    pages.filter((p) => p.page_type === 'LANDING' && isPublished(p)).map((p) => p.repair_keyword_id),
  )
  return keywords.filter((k) => publishedKeywordIds.has(k.id)).map((k) => ({ keyword: k.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ keyword: string }> }) {
  const { keyword: keywordSlug } = await params
  const { keywords } = await getAllData()
  const keyword = keywords.find((k) => k.slug === keywordSlug)
  if (!keyword) return {}
  return {
    title: `${keyword.display_name} 지역별 가이드 | 수리위키`,
    description: keyword.description ?? undefined,
  }
}

export default async function KeywordHubPage({
  params,
}: {
  params: Promise<{ keyword: string }>
}) {
  const { keyword: keywordSlug } = await params
  const { keywords, categories, pages, regions } = await getAllData()
  const keyword = keywords.find((k) => k.slug === keywordSlug)
  if (!keyword) notFound()

  const category = categories.find((c) => c.id === keyword.category_id)
  const { byId } = buildRegionIndex(regions)
  const landingPages = pages.filter(
    (p) => p.page_type === 'LANDING' && p.repair_keyword_id === keyword.id && isPublished(p),
  )

  return (
    <main>
      <section className="relative border-b border-[var(--line)] bg-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: blueprintBg(category?.slug ?? '', keyword.slug) }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <nav aria-label="현재 위치" className="text-[13px] text-[var(--ink-soft)]">
            <Link href="/" className="hover:text-[var(--ink)]">
              수리위키
            </Link>
            {category && (
              <>
                {' '}
                › {' '}
                <Link href={`/category/${category.slug}`} className="hover:text-[var(--ink)]">
                  {category.display_name}
                </Link>
              </>
            )}
          </nav>
          <h1 className="font-serif-kr mt-4 text-3xl font-black sm:text-4xl">
            {keyword.display_name}
          </h1>
          {keyword.description && (
            <p className="mt-3 max-w-2xl text-[15px] text-[var(--ink-soft)]">
              {keyword.description}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="eyebrow">Regions</p>
        <h2 className="font-serif-kr mt-2 text-xl font-black">지역별 가이드</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {landingPages.map((page) => {
            if (!page.region_id) return null
            const chain = getAncestorChain(page.region_id, byId)
            if (chain.length === 0) return null
            const path = chain.map((r) => r.slug).join('/')
            const dong = chain[chain.length - 1]
            const upper = chain
              .slice(0, -1)
              .map((r) => r.display_name)
              .join(' ')
            return (
              <li key={page.id}>
                <Link
                  href={`/${keyword.slug}/${path}`}
                  className="card group flex items-center justify-between gap-3 p-5 transition-shadow hover:shadow-lg"
                >
                  <div>
                    <p className="text-xs text-[var(--ink-soft)]">{upper}</p>
                    <p className="mt-0.5 text-lg font-extrabold">{dong.display_name}</p>
                  </div>
                  <span
                    aria-hidden
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[var(--line)] text-[var(--copper)] group-hover:border-[var(--copper)]"
                  >
                    →
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
        <p className="mt-6 text-sm text-[var(--ink-soft)]">
          다른 지역은 시공 기록이 검수되는 대로 추가됩니다.
        </p>
      </section>
    </main>
  )
}
