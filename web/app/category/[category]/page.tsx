import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'

export const dynamicParams = false

export async function generateStaticParams() {
  const { categories } = await getAllData()
  return categories.map((c) => ({ category: c.slug }))
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: categorySlug } = await params
  const { categories, keywords, pages } = await getAllData()
  const category = categories.find((c) => c.slug === categorySlug)
  if (!category) notFound()

  const publishedKeywordIds = new Set(
    pages.filter((p) => p.page_type === 'LANDING' && isPublished(p)).map((p) => p.repair_keyword_id),
  )
  const categoryKeywords = keywords
    .filter((k) => k.category_id === category.id)
    .sort((a, b) => a.menu_order - b.menu_order)

  return (
    <div>
      <h1 className="text-2xl font-bold">{category.display_name}</h1>
      <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {categoryKeywords.map((keyword) => (
          <li key={keyword.id}>
            {publishedKeywordIds.has(keyword.id) ? (
              <Link
                href={`/${keyword.slug}`}
                className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm"
              >
                {keyword.display_name}
              </Link>
            ) : (
              <div className="block rounded-lg border border-dashed border-slate-200 p-4 text-slate-400">
                {keyword.display_name} <span className="text-xs">(준비 중)</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
