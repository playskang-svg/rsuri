import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'

// output:'export'는 generateStaticParams가 뱉은 조합만 존재할 수 있고, 그 외는
// 빌드 단계에서부터 404 처리되게 한다 — keyword-tree 2번.
export const dynamicParams = false

export async function generateStaticParams() {
  const { keywords, pages } = await getAllData()
  const publishedKeywordIds = new Set(
    pages.filter((p) => p.page_type === 'LANDING' && isPublished(p)).map((p) => p.repair_keyword_id),
  )
  return keywords.filter((k) => publishedKeywordIds.has(k.id)).map((k) => ({ keyword: k.slug }))
}

export default async function KeywordHubPage({ params }: { params: Promise<{ keyword: string }> }) {
  const { keyword: keywordSlug } = await params
  const { keywords, pages, regions } = await getAllData()
  const keyword = keywords.find((k) => k.slug === keywordSlug)
  if (!keyword) notFound()

  const { byId } = buildRegionIndex(regions)
  const landingPages = pages.filter(
    (p) => p.page_type === 'LANDING' && p.repair_keyword_id === keyword.id && isPublished(p),
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">{keyword.display_name}</h1>
      {keyword.description && <p className="mt-2 text-slate-600">{keyword.description}</p>}

      <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {landingPages.map((page) => {
          if (!page.region_id) return null
          const chain = getAncestorChain(page.region_id, byId)
          if (chain.length === 0) return null
          const path = chain.map((r) => r.slug).join('/')
          const label = chain.map((r) => r.display_name).join(' ')
          return (
            <li key={page.id}>
              <Link
                href={`/${keyword.slug}/${path}`}
                className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm"
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
