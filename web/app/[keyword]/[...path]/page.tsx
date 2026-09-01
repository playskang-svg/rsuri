import { notFound } from 'next/navigation'
import { getAllData, isPublished } from '@/lib/supabase'
import { resolveRegionByPath, buildRegionIndex, getAncestorChain } from '@/lib/region-tree'

export const dynamicParams = false

export async function generateStaticParams() {
  const { keywords, pages, regions } = await getAllData()
  const { byId } = buildRegionIndex(regions)
  const keywordSlugById = new Map(keywords.map((k) => [k.id, k.slug]))

  const params: { keyword: string; path: string[] }[] = []
  for (const p of pages) {
    if (p.page_type !== 'LANDING' || !isPublished(p) || !p.region_id || !p.repair_keyword_id) continue
    const keywordSlug = keywordSlugById.get(p.repair_keyword_id)
    const chain = getAncestorChain(p.region_id, byId)
    if (!keywordSlug || chain.length === 0) continue
    params.push({ keyword: keywordSlug, path: chain.map((r) => r.slug) })
  }
  return params
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ keyword: string; path: string[] }>
}) {
  const { keyword: keywordSlug, path } = await params
  const { keywords, pages, regions } = await getAllData()
  const keyword = keywords.find((k) => k.slug === keywordSlug)
  const region = resolveRegionByPath(path, regions)
  if (!keyword || !region) return {}
  const page = pages.find(
    (p) => p.page_type === 'LANDING' && p.repair_keyword_id === keyword.id && p.region_id === region.id,
  )
  return { title: page?.meta_title ?? undefined, description: page?.meta_description ?? undefined }
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ keyword: string; path: string[] }>
}) {
  const { keyword: keywordSlug, path } = await params
  const { keywords, pages, sections, regions, localPros } = await getAllData()

  const keyword = keywords.find((k) => k.slug === keywordSlug)
  const region = resolveRegionByPath(path, regions)
  if (!keyword || !region) notFound()

  const page = pages.find(
    (p) =>
      p.page_type === 'LANDING' &&
      p.repair_keyword_id === keyword.id &&
      p.region_id === region.id &&
      isPublished(p),
  )
  if (!page) notFound()

  const { byId } = buildRegionIndex(regions)
  const chain = getAncestorChain(region.id, byId)
  const breadcrumbLabel = chain.map((r) => r.display_name).join(' ')

  const pageSections = sections.filter((s) => s.page_id === page.id).sort((a, b) => a.sort_order - b.sort_order)
  const pros = localPros.filter((p) => p.region_id === region.id)

  return (
    <article>
      <p className="text-sm text-slate-500">{breadcrumbLabel}</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">
        {page.meta_title ?? `${breadcrumbLabel} ${keyword.display_name}`}
      </h1>

      <div className="mt-8 space-y-8">
        {pageSections.map((section) => (
          <section key={section.id}>
            {section.heading && <h2 className="text-lg font-semibold text-slate-800">{section.heading}</h2>}
            <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">{section.body}</p>
          </section>
        ))}
      </div>

      {pros.length > 0 && (
        <section className="mt-10 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-800">지역 마스터</h2>
          <ul className="mt-3 space-y-2">
            {pros.map((pro) => (
              <li key={pro.id} className="text-sm text-slate-700">
                <span className="font-medium">{pro.name}</span>
                {pro.shop_name && <span className="text-slate-500"> · {pro.shop_name}</span>}
                <span className="ml-2 text-indigo-600">{pro.phone}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
