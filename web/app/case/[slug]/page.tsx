import { notFound } from 'next/navigation'
import { getAllData, isPublished } from '@/lib/supabase'

export const dynamicParams = false

export async function generateStaticParams() {
  const { pages } = await getAllData()
  return pages
    .filter((p) => p.page_type === 'CASE' && isPublished(p) && p.slug)
    .map((p) => ({ slug: p.slug as string }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { pages } = await getAllData()
  const page = pages.find((p) => p.page_type === 'CASE' && p.slug === slug)
  if (!page) return {}
  return { title: page.meta_title ?? undefined, description: page.meta_description ?? undefined }
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { pages, sections } = await getAllData()
  const page = pages.find((p) => p.page_type === 'CASE' && p.slug === slug && isPublished(p))
  if (!page) notFound()

  const pageSections = sections.filter((s) => s.page_id === page.id).sort((a, b) => a.sort_order - b.sort_order)

  return (
    <article>
      <p className="text-sm text-slate-500">실제 시공 사례</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">{page.meta_title}</h1>
      <div className="mt-8 space-y-8">
        {pageSections.map((section) => (
          <section key={section.id}>
            {section.heading && <h2 className="text-lg font-semibold text-slate-800">{section.heading}</h2>}
            <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">{section.body}</p>
          </section>
        ))}
      </div>
    </article>
  )
}
