import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'

export default async function HomePage() {
  const { categories, keywords, pages } = await getAllData()

  const publishedLandingKeywordIds = new Set(
    pages.filter((p) => p.page_type === 'LANDING' && isPublished(p)).map((p) => p.repair_keyword_id),
  )
  const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold">수리위키</h1>
        <p className="mt-2 text-slate-600">지역별 집수리 시세와 실제 시공 사례를 모은 정보 포털입니다.</p>
      </section>

      {sortedCategories.map((category) => {
        const categoryKeywords = keywords
          .filter((k) => k.category_id === category.id)
          .sort((a, b) => a.menu_order - b.menu_order)
        if (categoryKeywords.length === 0) return null
        return (
          <section key={category.id}>
            <Link href={`/category/${category.slug}`} className="text-lg font-semibold text-slate-800 hover:underline">
              {category.display_name}
            </Link>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {categoryKeywords.map((keyword) => {
                const published = publishedLandingKeywordIds.has(keyword.id)
                return (
                  <li key={keyword.id}>
                    {published ? (
                      <Link
                        href={`/${keyword.slug}`}
                        className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm"
                      >
                        <span className="font-medium text-slate-900">{keyword.display_name}</span>
                      </Link>
                    ) : (
                      <div className="block rounded-lg border border-dashed border-slate-200 p-4 text-slate-400">
                        <span>{keyword.display_name}</span>
                        <span className="ml-2 text-xs">(준비 중)</span>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
