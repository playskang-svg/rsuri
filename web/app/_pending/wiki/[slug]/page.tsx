import { notFound } from 'next/navigation'
import { getAllData, isPublished } from '@/lib/supabase'

export const dynamicParams = false

// ⚠ 이 라우트는 지금 비활성 상태다.
//
// `app/_pending/`은 이름이 `_`로 시작해서 Next.js가 라우팅에서 제외하는 private 폴더다.
// WIKI/TOPIC 페이지(CT2~CT4)가 아직 DB에 하나도 없는데, `output:'export'`는 동적
// 라우트마다 최소 1개 경로를 요구하기 때문에 활성 상태로 두면 빌드가 통째로 깨진다
// (Error: Page "/wiki/[slug]" returned an empty array from "generateStaticParams()").
//
// 첫 WIKI 페이지가 생기면 이 디렉터리를 `app/wiki`로 옮기기만 하면 그대로 동작한다:
//   git mv web/app/_pending/wiki web/app/wiki
//
// 코드 자체는 /case/[slug]와 같은 패턴이고 검증도 끝난 상태다.
export async function generateStaticParams() {
  const { pages } = await getAllData()
  return pages
    .filter((p) => (p.page_type === 'WIKI' || p.page_type === 'TOPIC') && isPublished(p) && p.slug)
    .map((p) => ({ slug: p.slug as string }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { pages } = await getAllData()
  const page = pages.find((p) => (p.page_type === 'WIKI' || p.page_type === 'TOPIC') && p.slug === slug)
  if (!page) return {}
  return { title: page.meta_title ?? undefined, description: page.meta_description ?? undefined }
}

export default async function WikiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { pages, sections } = await getAllData()
  const page = pages.find(
    (p) => (p.page_type === 'WIKI' || p.page_type === 'TOPIC') && p.slug === slug && isPublished(p),
  )
  if (!page) notFound()

  const pageSections = sections.filter((s) => s.page_id === page.id).sort((a, b) => a.sort_order - b.sort_order)

  return (
    <article>
      <h1 className="text-2xl font-bold text-slate-900">{page.meta_title}</h1>
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
